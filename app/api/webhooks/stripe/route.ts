import { NextRequest, NextResponse } from "next/server";
import { currencyLocale } from "@/lib/currency";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { syncBookingStatuses } from "@/lib/portal/syncBookingStatuses";
import { sendEmail } from "@/lib/email";
import { sendBookingReceiptEmail } from "@/lib/portal/generateBookingReceiptPDF";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── GA4 Measurement Protocol ──────────────────────────────────────────────────
const GA4_MEASUREMENT_ID  = "G-1Y758X38G4";
const GA4_API_SECRET      = "m8xBZ_30QNqmKliAbvC04A";

async function sendGA4PurchaseEvent({
  bookingId,
  jobNumber,
  currency,
  carHirePrice,
  fuelPrice,
  totalPrice,
  commissionAmt,
}: {
  bookingId:     string;
  jobNumber:     number | null;
  currency:      string;
  carHirePrice:  number;
  fuelPrice:     number;
  totalPrice:    number;
  commissionAmt: number;
}) {
  try {
    const payload = {
      // client_id is required — use bookingId as a stable anonymous identifier
      client_id: bookingId,
      events: [{
        name: "purchase",
        params: {
          transaction_id: jobNumber ? String(jobNumber) : bookingId,
          value:          totalPrice,
          currency,
          // Camel's revenue (commission) — useful for GA revenue reporting
          // GA4 uses 'value' as total, and we track commission separately as a custom param
          camel_commission: commissionAmt,
          items: [
            {
              item_id:   bookingId,
              item_name: "Car Hire",
              currency,
              price:     carHirePrice,
              quantity:  1,
            },
            {
              item_id:   `${bookingId}_fuel`,
              item_name: "Fuel Deposit",
              currency,
              price:     fuelPrice,
              quantity:  1,
            },
          ],
        },
      }],
    };

    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      console.error(`GA4 purchase event failed: ${res.status} ${await res.text()}`);
    } else {
      console.log(`GA4 purchase event sent: booking ${bookingId}, value ${totalPrice} ${currency}`);
    }
  } catch (e: any) {
    // Never let GA failure break the webhook
    console.error("GA4 purchase event error:", e?.message);
  }
}

async function getStripeFeeData(chargeId: string | null): Promise<{
  stripe_fee: number | null;
  stripe_fee_currency: string | null;
}> {
  const empty = { stripe_fee: null, stripe_fee_currency: null };
  if (!chargeId) return empty;
  try {
    const charge = await stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] });
    const bt = charge.balance_transaction as Stripe.BalanceTransaction | null;
    if (!bt || typeof bt === "string") return empty;
    return {
      stripe_fee:          bt.fee != null ? bt.fee / 100 : null,
      stripe_fee_currency: bt.fee_details?.[0]?.currency?.toUpperCase() || null,
    };
  } catch (e: any) {
    console.error("getStripeFeeData error:", e?.message);
    return empty;
  }
}

// Look up customer communication_locale from customer_profiles via email match
type Locale = "en" | "es" | "fr" | "it" | "pt" | "de";
const SUPPORTED_LOCALES: Locale[] = ["en", "es", "fr", "it", "pt", "de"];
function coerceLocale(v: unknown): Locale {
  return (SUPPORTED_LOCALES as string[]).includes(String(v)) ? (v as Locale) : "en";
}
async function getCustomerLocale(customerEmail: string): Promise<Locale> {
  try {
    const { data: usersData } = await db.auth.admin.listUsers();
    const matchedUser = usersData?.users?.find(u => (u.email || "").toLowerCase() === customerEmail.toLowerCase());
    if (!matchedUser) return "en";
    const { data } = await db
      .from("customer_profiles")
      .select("communication_locale")
      .eq("user_id", matchedUser.id)
      .maybeSingle();
    return coerceLocale(data?.communication_locale);
  } catch {
    return "en";
  }
}

// Look up partner communication_locale from partner_profiles
async function getPartnerLocale(partnerUserId: string): Promise<Locale> {
  try {
    const { data } = await db
      .from("partner_profiles")
      .select("communication_locale")
      .eq("user_id", partnerUserId)
      .maybeSingle();
    return coerceLocale(data?.communication_locale);
  } catch {
    return "en";
  }
}

type EmailLocale = "en" | "es" | "fr" | "it" | "pt" | "de";
const EM_STRINGS: Record<EmailLocale, Record<string, string>> = {
  en: {"lbl_booking_ref": "Booking reference", "lbl_car_hire_partner": "Car hire partner", "lbl_company": "Car hire partner", "lbl_customer": "Customer", "lbl_pickup_time": "Pickup time", "lbl_pickup_address": "Pickup address", "lbl_dropoff_address": "Drop-off address", "lbl_car_hire": "Car hire", "lbl_fuel_deposit": "Fuel deposit", "lbl_total_paid": "Total paid", "cc_subject": "Booking confirmed {JOB} — payment received", "cc_heading": "Booking Confirmed ✅", "cc_hi": "Hi {NAME},", "cc_p1": "Your payment has been received and your booking is confirmed with <strong>{CO}</strong>.", "cc_summary": "Booking Summary", "cc_fuel_note": "The fuel deposit will be refunded at the end of your hire based on fuel used.", "cc_receipt_note": "Your booking confirmation receipt will arrive in a separate email shortly.", "cc_cta": "View Booking", "cc_fallback_name": "there", "pn_subject": "New booking confirmed {JOB}", "pn_heading": "New Booking Confirmed", "pn_hi": "Hi {NAME},", "pn_p1": "A customer has paid and confirmed booking {JOB}. Please prepare for collection.", "pn_details": "Booking Details", "pn_cta": "View Booking", "rc_subject": "Booking Confirmation Receipt {JOB} — Camel Global", "rc_h2": "Booking Confirmation Receipt", "rc_booking_label": "Booking {JOB}", "rc_hi": "Hi {NAME},", "rc_p1": "Please find your booking confirmation receipt attached. Your booking with <strong>{CO}</strong> is confirmed.", "rc_attached_note": "Your receipt is attached as a PDF. You can also download it any time from your booking page at", "rc_bring_title": "What to bring when collecting your car:", "rc_li_licence": "<strong>Driving licence</strong> — full EU licence in Roman alphabet required for all drivers. If your licence does not meet this, bring an international driving permit alongside your original.", "rc_li_passport": "<strong>Passport or national ID</strong> — valid for every driver on this booking.", "rc_li_photocopy": "<strong>Photocopies recommended</strong> — bring a photocopy of your driving licence and passport for all drivers. All documents must be originals — digital copies are not accepted.", "rc_li_card": "<strong>Credit card required</strong> — {DEP} Credit card only, debit cards cannot be used for deposit blocking.", "pn_notice_title": "Platform Payment Notice", "pn_notice_body": "This email and the attached PDF confirm payment received by NTUK Ltd (trading as Camel Global) as a marketplace intermediary. They are not a VAT invoice for car hire services. The car hire service is provided directly by <strong>{CO}</strong>. If you require a VAT invoice, please request one directly from {CO}.", "sig_regards": "Best regards,", "sig_team": "The Camel Global Team"},
  es: {"lbl_booking_ref": "Referencia de reserva", "lbl_car_hire_partner": "Empresa de alquiler", "lbl_company": "Empresa de alquiler", "lbl_customer": "Cliente", "lbl_pickup_time": "Hora de recogida", "lbl_pickup_address": "Dirección de recogida", "lbl_dropoff_address": "Dirección de devolución", "lbl_car_hire": "Alquiler", "lbl_fuel_deposit": "Depósito de combustible", "lbl_total_paid": "Total pagado", "cc_subject": "Reserva confirmada {JOB} — pago recibido", "cc_heading": "Reserva confirmada ✅", "cc_hi": "Hola {NAME},", "cc_p1": "Tu pago ha sido recibido y tu reserva está confirmada con <strong>{CO}</strong>.", "cc_summary": "Resumen de la reserva", "cc_fuel_note": "El depósito de combustible se reembolsará al finalizar el alquiler según el combustible utilizado.", "cc_receipt_note": "El recibo de confirmación de tu reserva llegará en un correo aparte en breve.", "cc_cta": "Ver reserva", "cc_fallback_name": "hola", "pn_subject": "Nueva reserva confirmada {JOB}", "pn_heading": "Nueva reserva confirmada", "pn_hi": "Hola {NAME},", "pn_p1": "Un cliente ha pagado y confirmado la reserva {JOB}. Por favor, prepárate para la recogida.", "pn_details": "Detalles de la reserva", "pn_cta": "Ver reserva", "rc_subject": "Recibo de confirmación de reserva {JOB} — Camel Global", "rc_h2": "Recibo de confirmación de reserva", "rc_booking_label": "Reserva {JOB}", "rc_hi": "Hola {NAME},", "rc_p1": "Adjunto encontrarás tu recibo de confirmación de reserva. Tu reserva con <strong>{CO}</strong> está confirmada.", "rc_attached_note": "Tu recibo está adjunto en PDF. También puedes descargarlo en cualquier momento desde tu página de reserva en", "rc_bring_title": "Qué traer al recoger tu coche:", "rc_li_licence": "<strong>Permiso de conducir</strong> — permiso completo de la UE en alfabeto latino para todos los conductores. Si no cumple este requisito, trae también un permiso de conducir internacional.", "rc_li_passport": "<strong>Pasaporte o DNI</strong> — válido para todos los conductores de esta reserva.", "rc_li_photocopy": "<strong>Fotocopias recomendadas</strong> — trae una fotocopia del permiso de conducir y pasaporte para todos los conductores. Los documentos deben ser originales — no se aceptan copias digitales.", "rc_li_card": "<strong>Tarjeta de crédito obligatoria</strong> — {DEP} Solo tarjeta de crédito, las tarjetas de débito no se aceptan para el bloqueo del depósito.", "pn_notice_title": "Aviso de pago de plataforma", "pn_notice_body": "Este correo y el PDF adjunto confirman el pago recibido por NTUK Ltd (que opera como Camel Global) como intermediario de la plataforma. No constituyen una factura de IVA por servicios de alquiler de vehículos. El servicio de alquiler es prestado directamente por <strong>{CO}</strong>. Si necesitas una factura de IVA, solicítala directamente a {CO}.", "sig_regards": "Saludos,", "sig_team": "El equipo de Camel Global"},
  fr: {"lbl_booking_ref": "Référence de réservation", "lbl_car_hire_partner": "Partenaire de location de voiture", "lbl_company": "Partenaire de location de voiture", "lbl_customer": "Client", "lbl_pickup_time": "Heure de prise en charge", "lbl_pickup_address": "Adresse de prise en charge", "lbl_dropoff_address": "Adresse de restitution", "lbl_car_hire": "Location de voiture", "lbl_fuel_deposit": "Dépôt de carburant", "lbl_total_paid": "Total payé", "cc_subject": "Réservation confirmée {JOB} — paiement reçu", "cc_heading": "Réservation confirmée ✅", "cc_hi": "Bonjour {NAME},", "cc_p1": "Votre paiement a bien été reçu et votre réservation est confirmée auprès de <strong>{CO}</strong>.", "cc_summary": "Récapitulatif de la réservation", "cc_fuel_note": "Le dépôt de carburant vous sera remboursé à la fin de votre location en fonction du carburant consommé.", "cc_receipt_note": "Votre reçu de confirmation de réservation vous parviendra dans un e-mail séparé sous peu.", "cc_cta": "Voir la réservation", "cc_fallback_name": "cher client", "pn_subject": "Nouvelle réservation confirmée {JOB}", "pn_heading": "Nouvelle réservation confirmée", "pn_hi": "Bonjour {NAME},", "pn_p1": "Un client a payé et confirmé la réservation {JOB}. Veuillez préparer le véhicule pour la collecte.", "pn_details": "Détails de la réservation", "pn_cta": "Voir la réservation", "rc_subject": "Reçu de confirmation de réservation {JOB} — Camel Global", "rc_h2": "Reçu de confirmation de réservation", "rc_booking_label": "Réservation {JOB}", "rc_hi": "Bonjour {NAME},", "rc_p1": "Veuillez trouver ci-joint votre reçu de confirmation de réservation. Votre réservation auprès de <strong>{CO}</strong> est confirmée.", "rc_attached_note": "Votre reçu est joint en PDF. Vous pouvez également le télécharger à tout moment depuis votre page de réservation sur", "rc_bring_title": "Ce qu'il faut apporter lors de la récupération de votre véhicule :", "rc_li_licence": "<strong>Permis de conduire</strong> — permis EU complet en alphabet romain obligatoire pour tous les conducteurs. Si votre permis ne remplit pas ces conditions, veuillez apporter un permis de conduire international accompagné de votre permis original.", "rc_li_passport": "<strong>Passeport ou carte d'identité nationale</strong> — en cours de validité pour chaque conducteur figurant sur cette réservation.", "rc_li_photocopy": "<strong>Photocopies recommandées</strong> — apportez une photocopie de votre permis de conduire et de votre passeport pour tous les conducteurs. Tous les documents doivent être des originaux — les copies numériques ne sont pas acceptées.", "rc_li_card": "<strong>Carte de crédit obligatoire</strong> — {DEP} Carte de crédit uniquement, les cartes de débit ne peuvent pas être utilisées pour le blocage du dépôt.", "pn_notice_title": "Avis de paiement sur la plateforme", "pn_notice_body": "Cet e-mail et le PDF joint confirment la réception du paiement par NTUK Ltd (exerçant sous le nom de Camel Global) en tant qu'intermédiaire de marché. Ils ne constituent pas une facture VAT pour les services de location de voiture. Le service de location de voiture est fourni directement par <strong>{CO}</strong>. Si vous avez besoin d'une facture VAT, veuillez en faire la demande directement auprès de {CO}.", "sig_regards": "Cordialement,", "sig_team": "L'équipe Camel Global"},
  it: {"lbl_booking_ref": "Riferimento prenotazione", "lbl_car_hire_partner": "Partner noleggio auto", "lbl_company": "Partner noleggio auto", "lbl_customer": "Cliente", "lbl_pickup_time": "Orario di ritiro", "lbl_pickup_address": "Indirizzo di ritiro", "lbl_dropoff_address": "Indirizzo di consegna", "lbl_car_hire": "Noleggio auto", "lbl_fuel_deposit": "Deposito carburante", "lbl_total_paid": "Totale pagato", "cc_subject": "Prenotazione confermata {JOB} — pagamento ricevuto", "cc_heading": "Prenotazione Confermata ✅", "cc_hi": "Salve {NAME},", "cc_p1": "Il tuo pagamento è stato ricevuto e la tua prenotazione è confermata con <strong>{CO}</strong>.", "cc_summary": "Riepilogo Prenotazione", "cc_fuel_note": "Il deposito carburante verrà rimborsato al termine del noleggio in base al carburante utilizzato.", "cc_receipt_note": "La ricevuta di conferma della tua prenotazione arriverà a breve in un'email separata.", "cc_cta": "Visualizza Prenotazione", "cc_fallback_name": "cliente", "pn_subject": "Nuova prenotazione confermata {JOB}", "pn_heading": "Nuova Prenotazione Confermata", "pn_hi": "Salve {NAME},", "pn_p1": "Un cliente ha effettuato il pagamento e confermato la prenotazione {JOB}. Si prega di prepararsi per il ritiro.", "pn_details": "Dettagli Prenotazione", "pn_cta": "Visualizza Prenotazione", "rc_subject": "Ricevuta di Conferma Prenotazione {JOB} — Camel Global", "rc_h2": "Ricevuta di Conferma Prenotazione", "rc_booking_label": "Prenotazione {JOB}", "rc_hi": "Salve {NAME},", "rc_p1": "In allegato trovi la ricevuta di conferma della tua prenotazione. La tua prenotazione con <strong>{CO}</strong> è confermata.", "rc_attached_note": "La tua ricevuta è allegata in formato PDF. Puoi scaricarla in qualsiasi momento anche dalla pagina della tua prenotazione su", "rc_bring_title": "Cosa portare al momento del ritiro dell'auto:", "rc_li_licence": "<strong>Patente di guida</strong> — è richiesta una patente EU completa in alfabeto romano per tutti i conducenti. Se la tua patente non soddisfa questo requisito, porta un permesso di guida internazionale insieme all'originale.", "rc_li_passport": "<strong>Passaporto o documento d'identità nazionale</strong> — valido per ogni conducente indicato in questa prenotazione.", "rc_li_photocopy": "<strong>Fotocopie consigliate</strong> — porta una fotocopia della patente di guida e del passaporto per tutti i conducenti. Tutti i documenti devono essere originali — le copie digitali non sono accettate.", "rc_li_card": "<strong>Carta di credito obbligatoria</strong> — {DEP} È accettata solo la carta di credito; le carte di debito non possono essere utilizzate per il blocco del deposito.", "pn_notice_title": "Avviso di Pagamento sulla Piattaforma", "pn_notice_body": "Questa email e il PDF allegato confermano il pagamento ricevuto da NTUK Ltd (che opera come Camel Global) in qualità di intermediario marketplace. Non costituiscono una fattura VAT per i servizi di noleggio auto. Il servizio di noleggio auto è fornito direttamente da <strong>{CO}</strong>. Per richiedere una fattura VAT, ti invitiamo a contattare direttamente {CO}.", "sig_regards": "Cordiali saluti,", "sig_team": "Il team di Camel Global"},
  pt: {"lbl_booking_ref": "Referência da reserva", "lbl_car_hire_partner": "Parceiro de aluguer de viatura", "lbl_company": "Parceiro de aluguer de viatura", "lbl_customer": "Cliente", "lbl_pickup_time": "Hora de recolha", "lbl_pickup_address": "Morada de recolha", "lbl_dropoff_address": "Morada de entrega", "lbl_car_hire": "Aluguer de viatura", "lbl_fuel_deposit": "Depósito de combustível", "lbl_total_paid": "Total pago", "cc_subject": "Reserva confirmada {JOB} — pagamento recebido", "cc_heading": "Reserva Confirmada ✅", "cc_hi": "Olá {NAME},", "cc_p1": "O seu pagamento foi recebido e a sua reserva está confirmada com <strong>{CO}</strong>.", "cc_summary": "Resumo da Reserva", "cc_fuel_note": "O depósito de combustível será reembolsado no final do seu aluguer com base no combustível utilizado.", "cc_receipt_note": "O recibo de confirmação da sua reserva será enviado em breve num email separado.", "cc_cta": "Ver Reserva", "cc_fallback_name": "Cliente", "pn_subject": "Nova reserva confirmada {JOB}", "pn_heading": "Nova Reserva Confirmada", "pn_hi": "Olá {NAME},", "pn_p1": "Um cliente efetuou o pagamento e confirmou a reserva {JOB}. Por favor, prepare-se para a recolha.", "pn_details": "Detalhes da Reserva", "pn_cta": "Ver Reserva", "rc_subject": "Recibo de Confirmação de Reserva {JOB} — Camel Global", "rc_h2": "Recibo de Confirmação de Reserva", "rc_booking_label": "Reserva {JOB}", "rc_hi": "Olá {NAME},", "rc_p1": "Encontra em anexo o recibo de confirmação da sua reserva. A sua reserva com <strong>{CO}</strong> está confirmada.", "rc_attached_note": "O seu recibo está anexado em formato PDF. Pode também transferi-lo a qualquer momento a partir da sua página de reserva em", "rc_bring_title": "O que trazer ao levantar a sua viatura:", "rc_li_licence": "<strong>Carta de condução</strong> — é obrigatória uma carta de condução EU completa em alfabeto romano para todos os condutores. Se a sua carta não cumprir este requisito, traga também uma licença internacional de condução juntamente com o documento original.", "rc_li_passport": "<strong>Passaporte ou cartão de cidadão</strong> — válido para todos os condutores incluídos nesta reserva.", "rc_li_photocopy": "<strong>Fotocópias recomendadas</strong> — traga uma fotocópia da carta de condução e do passaporte de todos os condutores. Todos os documentos têm de ser originais — cópias digitais não são aceites.", "rc_li_card": "<strong>Cartão de crédito obrigatório</strong> — {DEP} Apenas cartão de crédito; cartões de débito não podem ser utilizados para bloqueio de depósito.", "pn_notice_title": "Aviso de Pagamento na Plataforma", "pn_notice_body": "Este email e o PDF em anexo confirmam o pagamento recebido pela NTUK Ltd (a operar como Camel Global) na qualidade de intermediário de marketplace. Não constituem uma fatura com VAT pelos serviços de aluguer de viatura. O serviço de aluguer de viatura é prestado diretamente pela <strong>{CO}</strong>. Caso necessite de uma fatura com VAT, solicite-a diretamente à {CO}.", "sig_regards": "Com os melhores cumprimentos,", "sig_team": "A equipa Camel Global"},
  de: {"lbl_booking_ref": "Buchungsreferenz", "lbl_car_hire_partner": "Mietwagenpartner", "lbl_company": "Mietwagenpartner", "lbl_customer": "Kunde", "lbl_pickup_time": "Abholzeit", "lbl_pickup_address": "Abholadresse", "lbl_dropoff_address": "Rückgabeadresse", "lbl_car_hire": "Mietwagengebühr", "lbl_fuel_deposit": "Kraftstoffkaution", "lbl_total_paid": "Gesamtbetrag bezahlt", "cc_subject": "Buchung bestätigt {JOB} — Zahlung eingegangen", "cc_heading": "Buchung bestätigt ✅", "cc_hi": "Hallo {NAME},", "cc_p1": "Ihre Zahlung ist eingegangen und Ihre Buchung bei <strong>{CO}</strong> ist bestätigt.", "cc_summary": "Buchungsübersicht", "cc_fuel_note": "Die Kraftstoffkaution wird am Ende Ihrer Mietzeit entsprechend dem Kraftstoffverbrauch zurückerstattet.", "cc_receipt_note": "Ihre Buchungsbestätigung erhalten Sie in Kürze in einer separaten E-Mail.", "cc_cta": "Buchung ansehen", "cc_fallback_name": "dort", "pn_subject": "Neue Buchung bestätigt {JOB}", "pn_heading": "Neue Buchung bestätigt", "pn_hi": "Hallo {NAME},", "pn_p1": "Ein Kunde hat Buchung {JOB} bezahlt und bestätigt. Bitte bereiten Sie die Abholung vor.", "pn_details": "Buchungsdetails", "pn_cta": "Buchung ansehen", "rc_subject": "Buchungsbestätigung {JOB} — Camel Global", "rc_h2": "Buchungsbestätigung", "rc_booking_label": "Buchung {JOB}", "rc_hi": "Hallo {NAME},", "rc_p1": "Anbei finden Sie Ihre Buchungsbestätigung. Ihre Buchung bei <strong>{CO}</strong> ist bestätigt.", "rc_attached_note": "Ihre Bestätigung ist als PDF beigefügt. Sie können diese auch jederzeit über Ihre Buchungsseite herunterladen unter", "rc_bring_title": "Was Sie bei der Fahrzeugabholung mitbringen müssen:", "rc_li_licence": "<strong>Führerschein</strong> — ein vollständiger EU-Führerschein in lateinischer Schrift ist für alle Fahrer erforderlich. Sollte Ihr Führerschein diese Anforderung nicht erfüllen, bringen Sie bitte zusätzlich einen internationalen Führerschein im Original mit.", "rc_li_passport": "<strong>Reisepass oder Personalausweis</strong> — gültig für jeden Fahrer, der in dieser Buchung eingetragen ist.", "rc_li_photocopy": "<strong>Kopien empfohlen</strong> — bringen Sie eine Fotokopie Ihres Führerscheins und Reisepasses für alle Fahrer mit. Alle Dokumente müssen im Original vorliegen — digitale Kopien werden nicht akzeptiert.", "rc_li_card": "<strong>Kreditkarte erforderlich</strong> — {DEP} Nur Kreditkarte; Debitkarten können nicht für die Kautionsblockierung verwendet werden.", "pn_notice_title": "Hinweis zur Plattformzahlung", "pn_notice_body": "Diese E-Mail und das beigefügte PDF bestätigen den Zahlungseingang bei NTUK Ltd (handelnd als Camel Global) als Marktplatzvermittler. Sie stellen keine VAT-Rechnung für Mietwagendienstleistungen dar. Die Mietwagendienstleistung wird direkt von <strong>{CO}</strong> erbracht. Sollten Sie eine VAT-Rechnung benötigen, wenden Sie sich bitte direkt an {CO}.", "sig_regards": "Mit freundlichen Grüßen,", "sig_team": "Das Camel Global Team"}
};
const EM_SIG: Record<EmailLocale, { regards: string; team: string }> = {
  en: { regards: "Best regards,", team: "The Camel Global Team" },
  es: { regards: "Saludos,", team: "El equipo de Camel Global" },
  fr: { regards: "Cordialement,", team: "L'équipe Camel Global" },
  it: { regards: "Cordiali saluti,", team: "Il team di Camel Global" },
  pt: { regards: "Com os melhores cumprimentos,", team: "A equipa Camel Global" },
  de: { regards: "Mit freundlichen Grüßen,", team: "Das Camel Global Team" },
};
function pickEM(locale: string): Record<string, string> {
  return EM_STRINGS[(["en","es","fr","it","pt","de"] as string[]).includes(locale) ? (locale as EmailLocale) : "en"];
}
function brandEmail(
  heading: string,
  body: string,
  locale: EmailLocale
): string {
  const sig = EM_SIG[locale] ?? EM_SIG.en;
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#222;line-height:1.6;max-width:600px;">
      <div style="background:#000;padding:24px 32px;">
        <h2 style="color:#fff;margin:0;">${heading}</h2>
      </div>
      <div style="background:#f8f8f8;padding:24px 32px;border:1px solid #e5e5e5;">
        ${body}
        <p style="margin-top:32px;color:#888;font-size:14px;">${sig.regards}<br/><strong style="color:#222;">${sig.team}</strong></p>
      </div>
    </div>`;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    console.error("Webhook signature error:", e.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const m  = pi.metadata;

      const bidId         = m.bid_id;
      const requestId     = m.request_id;
      const partnerUserId = m.partner_user_id;
      const jobNumber     = m.job_number ? Number(m.job_number) : null;
      const chargeId      = typeof pi.latest_charge === "string" ? pi.latest_charge : null;

      const currency       = (m.currency || "EUR").toUpperCase();
      const carHirePrice   = Number(m.car_hire_price    || 0);
      const fuelPrice      = Number(m.fuel_price        || 0);
      const commissionAmt  = Number(m.commission_amount || 0);
      const commissionRate = Number((m.commission_rate  || "20").replace("%", ""));
      const totalPrice     = carHirePrice + fuelPrice;
      const partnerNet     = Math.max(0, carHirePrice - commissionAmt);

      const { data: bid } = await db
        .from("partner_bids")
        .select("currency, notes, car_hire_price, fuel_price, total_price, vehicle_category_name, mileage_limit, security_deposit_notes")
        .eq("id", bidId)
        .maybeSingle();

      const bidCarHire    = Number(bid?.car_hire_price || 0);
      const bidFuel       = Number(bid?.fuel_price     || 0);
      const bidTotalPrice = Number(bid?.total_price    || bidCarHire + bidFuel);
      const notes         = bid?.notes || null;
      const vehicleCategory = bid?.vehicle_category_name || null;

      const { data: request } = await db
        .from("customer_requests")
        .select(`
          status, customer_name, customer_email,
          pickup_address, dropoff_address, pickup_at, dropoff_at,
          journey_duration_minutes,
          vehicle_category_name,
          passengers, suitcases, hand_luggage, sport_equipment,
          driver_age, additional_drivers, additional_driver_ages
        `)
        .eq("id", requestId)
        .maybeSingle();

      if (request?.status !== "open") {
        console.log(`Payment succeeded but request ${requestId} is ${request?.status} — skipping`);
        return NextResponse.json({ received: true });
      }

      await db.from("partner_bids").update({ status: "accepted" }).eq("id", bidId);
      await db.from("partner_bids").update({ status: "unsuccessful" }).eq("request_id", requestId).neq("id", bidId);
      await db.from("customer_requests").update({ status: "confirmed" }).eq("id", requestId);
      await db.from("request_partner_matches").update({ match_status: "accepted" }).eq("request_id", requestId).eq("partner_user_id", partnerUserId);
      await db.from("request_partner_matches").update({ match_status: "closed" }).eq("request_id", requestId).neq("partner_user_id", partnerUserId);

      const { data: existing } = await db
        .from("partner_bookings")
        .select("id")
        .eq("winning_bid_id", bidId)
        .maybeSingle();

      let bookingId = existing?.id;

      if (!bookingId) {
        const { data: inserted, error: bookingErr } = await db
          .from("partner_bookings")
          .insert({
            request_id:            requestId,
            winning_bid_id:        bidId,
            partner_user_id:       partnerUserId,
            booking_status:        "confirmed",
            currency,
            charge_currency:       currency,
            conversion_rate:       1,
            amount:                bidTotalPrice,
            car_hire_price:        bidCarHire,
            fuel_price:            bidFuel,
            commission_rate:       commissionRate,
            commission_amount:     commissionAmt,
            partner_payout_amount: partnerNet,
            notes,
            job_number:            jobNumber,
            payout_status:         "held",
          })
          .select("id")
          .single();

        if (bookingErr) {
          console.error("Booking insert error:", bookingErr);
          return NextResponse.json({ error: bookingErr.message }, { status: 500 });
        }
        bookingId = inserted.id;
      }

      const feeData = await getStripeFeeData(chargeId);

      await db.from("payments").insert({
        booking_id:               bookingId,
        customer_id:              null,
        stripe_payment_intent_id: pi.id,
        stripe_charge_id:         chargeId,
        amount_total:             totalPrice,
        amount_car_hire:          carHirePrice,
        amount_fuel_deposit:      fuelPrice,
        amount_commission:        commissionAmt,
        amount_partner_net:       partnerNet,
        currency,
        status:                   "succeeded",
        payout_status:            "held",
        stripe_fee:               feeData.stripe_fee,
        stripe_fee_currency:      feeData.stripe_fee_currency,
        exchange_rate:            null,
      });

      const { data: payment } = await db
        .from("payments")
        .select("id")
        .eq("stripe_payment_intent_id", pi.id)
        .maybeSingle();

      if (payment?.id) {
        await db.from("partner_bookings").update({ payment_id: payment.id }).eq("id", bookingId);
      }

      await syncBookingStatuses(bookingId);

      // ── GA4 purchase event (Measurement Protocol) ─────────────────────────
      // Fired server-side after booking is confirmed — tracks revenue per booking
      await sendGA4PurchaseEvent({
        bookingId,
        jobNumber,
        currency,
        carHirePrice:  bidCarHire,
        fuelPrice:     bidFuel,
        totalPrice:    bidTotalPrice,
        commissionAmt,
      });

      const { data: partnerProfile } = await db
        .from("partner_profiles")
        .select("company_name, contact_name")
        .eq("user_id", partnerUserId)
        .maybeSingle();

      const { data: partnerAuthData } = await db.auth.admin.getUserById(partnerUserId);
      const partnerEmail = partnerAuthData?.user?.email || null;

      const jobNo       = jobNumber ? `#${jobNumber}` : "";
      const companyName = partnerProfile?.company_name || "your car hire partner";
      const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com";
      const portalUrl   = process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.camel-global.com";
      const fmtAmt      = (n: number) => new Intl.NumberFormat(
        currencyLocale(currency),
        { style: "currency", currency }
      ).format(n);
      const pickupTime  = request?.pickup_at
        ? new Date(request.pickup_at).toLocaleString("en-GB", { timeZone: "Europe/Madrid" })
        : "—";
      const adminEmails = String(process.env.CAMEL_ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);

      // Look up locales for customer and partner
      const [customerLocale, partnerLocale] = await Promise.all([
        request?.customer_email ? getCustomerLocale(request.customer_email) : Promise.resolve<Locale>("en"),
        getPartnerLocale(partnerUserId),
      ]);

      // ── Booking receipt PDF email (customer) ──────────────────────────────
      if (request?.customer_email) {
        sendBookingReceiptEmail({
          jobNumber,
          bookingId,
          requestId,
          customerName:         request.customer_name || null,
          customerEmail:        request.customer_email,
          pickupAddress:        request.pickup_address || null,
          dropoffAddress:       request.dropoff_address || null,
          pickupAt:             request.pickup_at || null,
          dropoffAt:            request.dropoff_at || null,
          durationMinutes:      request.journey_duration_minutes ?? null,
          vehicleCategory:      request.vehicle_category_name || vehicleCategory || null,
          companyName,
          locale:               customerLocale,
          chargeCurrency:       currency,
          chargeCarHire:        bidCarHire,
          chargeFuel:           bidFuel,
          chargeTotal:          bidTotalPrice,
          passengers:           request.passengers ?? null,
          suitcases:            request.suitcases ?? null,
          handLuggage:          request.hand_luggage ?? null,
          sportEquipment:       request.sport_equipment ?? null,
          driverAge:            request.driver_age ?? null,
          additionalDrivers:    request.additional_drivers ?? 0,
          additionalDriverAges: request.additional_driver_ages ?? null,
          mileageLimit:         bid?.mileage_limit ?? null,
          securityDepositNotes: bid?.security_deposit_notes ?? null,
        }).catch(e => console.error("Booking receipt PDF email failed:", e?.message));
      }

      // ── Customer booking confirmed email (locale-aware) ───────────────────
      if (request?.customer_email) {
        const cL: EmailLocale = (["en","es","fr","it","pt","de"] as string[]).includes(customerLocale) ? (customerLocale as EmailLocale) : "en";
        const ct = pickEM(cL);
        const co = String(companyName);
        const custName = request.customer_name || ct["cc_fallback_name"];
        const priceTable = `
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:#666;">${ct["lbl_booking_ref"]}</td><td style="text-align:right;font-weight:700;">${jobNo}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">${ct["lbl_car_hire_partner"]}</td><td style="text-align:right;">${companyName}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">${ct["lbl_pickup_time"]}</td><td style="text-align:right;">${pickupTime}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">${ct["lbl_pickup_address"]}</td><td style="text-align:right;">${request.pickup_address || "—"}</td></tr>
            ${request.dropoff_address ? `<tr><td style="padding:4px 0;color:#666;">${ct["lbl_dropoff_address"]}</td><td style="text-align:right;">${request.dropoff_address}</td></tr>` : ""}
            <tr style="border-top:1px solid #ddd;"><td style="padding:8px 0 4px;color:#666;">${ct["lbl_car_hire"]}</td><td style="text-align:right;">${fmtAmt(bidCarHire)}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">${ct["lbl_fuel_deposit"]}</td><td style="text-align:right;">${fmtAmt(bidFuel)}</td></tr>
            <tr style="border-top:1px solid #ddd;"><td style="padding:8px 0 4px;font-weight:700;">${ct["lbl_total_paid"]}</td><td style="text-align:right;font-weight:700;">${fmtAmt(bidTotalPrice)}</td></tr>
          </table>
          <p style="margin:8px 0 0;font-size:13px;color:#666;">${ct["cc_fuel_note"]}</p>`;
        const custBody = `
          <p>${ct["cc_hi"].replace("{NAME}", custName)}</p>
          <p>${ct["cc_p1"].replace("{CO}", co)}</p>
          <div style="background:#fff;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
            <p style="margin:0 0 8px;font-weight:700;">${ct["cc_summary"]}</p>
            ${priceTable}
          </div>
          <p style="font-size:13px;color:#666;">${ct["cc_receipt_note"]}</p>
          <p style="margin:24px 0;">
            <a href="${siteUrl}/bookings/${requestId}" style="background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;display:inline-block;">${ct["cc_cta"]}</a>
          </p>`;
        await sendEmail({
          to: request.customer_email,
          subject: ct["cc_subject"].replace("{JOB}", jobNo),
          html: brandEmail(ct["cc_heading"], custBody, cL),
        }).catch(e => console.error("Customer booking confirmed email failed:", e?.message));
      }

      // ── Partner new booking email (locale-aware) ──────────────────────────
      if (partnerEmail) {
        const partnerName = partnerProfile?.contact_name || companyName;
        const pL: EmailLocale = (["en","es","fr","it","pt","de"] as string[]).includes(partnerLocale) ? (partnerLocale as EmailLocale) : "en";
        const pt = pickEM(pL);
        const partnerBody = `
          <p>${pt["pn_hi"].replace("{NAME}", String(partnerName))}</p>
          <p>${pt["pn_p1"].replace("{JOB}", jobNo)}</p>
          <div style="background:#fff;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
            <p style="margin:0 0 8px;font-weight:700;">${pt["pn_details"]}</p>
            <table style="width:100%;font-size:14px;border-collapse:collapse;">
              <tr><td style="padding:4px 0;color:#666;">${pt["lbl_booking_ref"]}</td><td style="text-align:right;font-weight:700;">${jobNo}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">${pt["lbl_customer"]}</td><td style="text-align:right;">${request?.customer_name || "—"}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">${pt["lbl_pickup_time"]}</td><td style="text-align:right;">${pickupTime}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">${pt["lbl_pickup_address"]}</td><td style="text-align:right;">${request?.pickup_address || "—"}</td></tr>
              ${request?.dropoff_address ? `<tr><td style="padding:4px 0;color:#666;">${pt["lbl_dropoff_address"]}</td><td style="text-align:right;">${request.dropoff_address}</td></tr>` : ""}
              <tr style="border-top:1px solid #ddd;"><td style="padding:8px 0 4px;color:#666;">${pt["lbl_car_hire"]}</td><td style="text-align:right;">${fmtAmt(bidCarHire)}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">${pt["lbl_fuel_deposit"]}</td><td style="text-align:right;">${fmtAmt(bidFuel)}</td></tr>
            </table>
          </div>
          <p style="margin:24px 0;">
            <a href="${portalUrl}/partner/bookings/${bookingId}" style="background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;display:inline-block;">${pt["pn_cta"]}</a>
          </p>`;
        await sendEmail({
          to: partnerEmail,
          subject: pt["pn_subject"].replace("{JOB}", jobNo),
          html: brandEmail(pt["pn_heading"], partnerBody, pL),
        }).catch(e => console.error("Partner new booking email failed:", e?.message));
      }

      // ── Admin email (always English, full details) ────────────────────────
      for (const adminEmail of adminEmails) {
        await sendEmail({
          to: adminEmail,
          subject: `[Admin] New booking ${jobNo} — ${companyName}`,
          html: `
            <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
              <p>New booking confirmed.</p>
              <p>
                <strong>Booking:</strong> ${jobNo}<br/>
                <strong>Partner:</strong> ${companyName}<br/>
                <strong>Customer:</strong> ${request?.customer_name || "—"} (${request?.customer_email || "—"})<br/>
                <strong>Customer email locale:</strong> ${customerLocale}<br/>
                <strong>Partner email locale:</strong> ${partnerLocale}<br/>
                <strong>Pickup:</strong> ${pickupTime}<br/>
                <strong>Pickup address:</strong> ${request?.pickup_address || "—"}<br/>
                <strong>Currency:</strong> ${currency}<br/>
                <strong>Car hire:</strong> ${fmtAmt(bidCarHire)}<br/>
                <strong>Fuel deposit:</strong> ${fmtAmt(bidFuel)}<br/>
                <strong>Total:</strong> ${fmtAmt(bidTotalPrice)}<br/>
                <strong>Commission:</strong> ${fmtAmt(commissionAmt)} (${commissionRate}%)<br/>
                <strong>Partner net:</strong> ${fmtAmt(partnerNet)}<br/>
                <strong>Stripe fee:</strong> ${feeData.stripe_fee != null ? `${feeData.stripe_fee} ${feeData.stripe_fee_currency}` : "pending"}
              </p>
            </div>
          `,
        }).catch(e => console.error("Admin new booking email failed:", e?.message));
      }

      console.log(`payment_intent.succeeded: booking ${bookingId} — currency ${currency}, fee ${feeData.stripe_fee} ${feeData.stripe_fee_currency}, customer locale ${customerLocale}, partner locale ${partnerLocale}`);
    }
  } catch (e: any) {
    console.error("Webhook handler error:", e.message);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
