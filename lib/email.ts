function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type EmailAttachment = {
  filename: string;
  content: string;
  encoding: "base64";
};

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  const cleanTo = String(to || "").trim().toLowerCase();

  console.log("📧 Raw email input:", to);
  console.log("📧 Clean email:", cleanTo);

  if (!cleanTo || !isValidEmail(cleanTo)) {
    console.error("❌ Invalid email detected:", cleanTo);
    throw new Error(`Invalid email address: ${cleanTo}`);
  }

  if (!apiKey) {
    console.error("❌ Missing RESEND_API_KEY");
    throw new Error("Missing RESEND_API_KEY");
  }

  if (!from) {
    console.error("❌ Missing EMAIL_FROM");
    throw new Error("Missing EMAIL_FROM");
  }

  console.log("📧 Sending email to:", cleanTo);

  const body: Record<string, unknown> = { from, to: cleanTo, subject, html };
  if (attachments?.length) body.attachments = attachments;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Resend failed:", res.status, text);
    throw new Error(`Resend failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  console.log("✅ Email sent successfully:", json?.id || json);
  return json;
}

// ---------------------------------------------------------------------------
// Shared brand email wrapper — mirrors portal pattern exactly
// ---------------------------------------------------------------------------

export type Locale = "en" | "es" | "fr" | "it" | "pt" | "de";

const LOCALES: Locale[] = ["en", "es", "fr", "it", "pt", "de"];

export function coerceLocale(v: unknown): Locale {
  return typeof v === "string" && (LOCALES as string[]).includes(v) ? (v as Locale) : "en";
}

const SIG: Record<Locale, { regards: string; team: string }> = {
  en: { regards: "Best regards,", team: "The Camel Global Team" },
  es: { regards: "Saludos,", team: "El equipo de Camel Global" },
  fr: { regards: "Cordialement,", team: "L'équipe Camel Global" },
  it: { regards: "Cordiali saluti,", team: "Il team di Camel Global" },
  pt: { regards: "Com os melhores cumprimentos,", team: "A equipa Camel Global" },
  de: { regards: "Mit freundlichen Grüßen,", team: "Das Camel Global Team" }
};

function brandEmail(
  headings: Record<Locale, string>,
  bodies: Record<Locale, string>,
  locale: Locale
): string {
  const heading = headings[locale] ?? headings.en;
  const body = bodies[locale] ?? bodies.en;
  const sig = SIG[locale] ?? SIG.en;
  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6; max-width:600px;">
      <div style="background:#000; padding:24px 32px;">
        <h2 style="color:#fff; margin:0;">${heading}</h2>
      </div>
      <div style="background:#f8f8f8; padding:24px 32px; border:1px solid #e5e5e5;">
        ${body}
        <p style="margin-top:32px; color:#888; font-size:14px;">${sig.regards}<br/><strong style="color:#222;">${sig.team}</strong></p>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Booking cancellation emails (customer-initiated) — localized. Company name,
// money amounts and the 48hr rule outcome are values, not translated copy.
// ---------------------------------------------------------------------------

function wrapBrand(heading: string, body: string, locale: Locale): string {
  const sig = SIG[locale] ?? SIG.en;
  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6; max-width:600px;">
      <div style="background:#000; padding:24px 32px;">
        <h2 style="color:#fff; margin:0;">${heading}</h2>
      </div>
      <div style="background:#f8f8f8; padding:24px 32px; border:1px solid #e5e5e5;">
        ${body}
        <p style="margin-top:32px; color:#888; font-size:14px;">${sig.regards}<br/><strong style="color:#222;">${sig.team}</strong></p>
      </div>
    </div>`;
}

export async function sendCustomerCancellationEmail(to: string, opts: {
  locale?: Locale;
  jobNo: string;
  customerName?: string | null;
  companyName: string;           // proper noun, not translated
  reason?: string | null;
  pickupTime?: string | null;
  pickupAddress?: string | null;
  isWithin48: boolean;
  refundAmountText: string;
  carHireText: string;
  siteUrl: string;
}) {
  const locale = opts.locale ?? "en";
  const t = <T,>(m: Record<Locale, T>) => m[locale] ?? m.en;
  const JOB = opts.jobNo;
  const generic: Record<Locale, string> = { en: "there", es: "cliente", fr: "client", it: "cliente", pt: "cliente", de: "Kunde" };
  const name = (opts.customerName && opts.customerName.trim()) || t(generic);

  const subject: Record<Locale, string> = {
    en: `Your Camel Global booking ${JOB} has been cancelled`,
    es: `Tu reserva de Camel Global ${JOB} ha sido cancelada`,
    fr: `Votre réservation Camel Global ${JOB} a été annulée`,
    it: `La tua prenotazione Camel Global ${JOB} è stata annullata`,
    pt: `A sua reserva Camel Global ${JOB} foi cancelada`,
    de: `Ihre Camel Global Buchung ${JOB} wurde storniert`,
  };
  const heading: Record<Locale, string> = { en: "Booking Cancelled", es: "Reserva cancelada", fr: "Réservation annulée", it: "Prenotazione annullata", pt: "Reserva cancelada", de: "Buchung storniert" };
  const hi: Record<Locale, string> = { en: `Hi ${name},`, es: `Hola ${name},`, fr: `Bonjour ${name},`, it: `Ciao ${name},`, pt: `Olá ${name},`, de: `Hallo ${name},` };
  const line: Record<Locale, string> = {
    en: `Your booking ${JOB} with ${opts.companyName} has been cancelled.`,
    es: `Tu reserva ${JOB} con ${opts.companyName} ha sido cancelada.`,
    fr: `Votre réservation ${JOB} avec ${opts.companyName} a été annulée.`,
    it: `La tua prenotazione ${JOB} con ${opts.companyName} è stata annullata.`,
    pt: `A sua reserva ${JOB} com ${opts.companyName} foi cancelada.`,
    de: `Ihre Buchung ${JOB} bei ${opts.companyName} wurde storniert.`,
  };
  const reasonLbl: Record<Locale, string> = { en: "Reason:", es: "Motivo:", fr: "Motif :", it: "Motivo:", pt: "Motivo:", de: "Grund:" };
  const pickupLbl: Record<Locale, string> = { en: "Pickup was:", es: "Recogida:", fr: "Prise en charge :", it: "Ritiro:", pt: "Recolha:", de: "Abholung:" };
  const locLbl: Record<Locale, string> = { en: "Location:", es: "Ubicación:", fr: "Lieu :", it: "Luogo:", pt: "Local:", de: "Ort:" };
  const boxLabel: Record<Locale, string> = opts.isWithin48
    ? { en: "⚠ Partial Refund", es: "⚠ Reembolso parcial", fr: "⚠ Remboursement partiel", it: "⚠ Rimborso parziale", pt: "⚠ Reembolso parcial", de: "⚠ Teilweise Rückerstattung" }
    : { en: "✅ Full Refund", es: "✅ Reembolso completo", fr: "✅ Remboursement intégral", it: "✅ Rimborso completo", pt: "✅ Reembolso total", de: "✅ Vollständige Rückerstattung" };
  const note: Record<Locale, string> = opts.isWithin48
    ? {
        en: `As this cancellation is within 48 hours of your pickup time, the car hire fee of ${opts.carHireText} is non-refundable. Your fuel deposit of ${opts.refundAmountText} will be refunded in full.`,
        es: `Como esta cancelación se realiza dentro de las 48 horas previas a la recogida, la tarifa de alquiler de ${opts.carHireText} no es reembolsable. Tu depósito de combustible de ${opts.refundAmountText} se reembolsará íntegramente.`,
        fr: `Cette annulation ayant lieu moins de 48 heures avant l'heure de prise en charge, les frais de location de ${opts.carHireText} ne sont pas remboursables. Votre dépôt de carburant de ${opts.refundAmountText} sera intégralement remboursé.`,
        it: `Poiché questa cancellazione avviene entro 48 ore dall'orario di ritiro, la tariffa di noleggio di ${opts.carHireText} non è rimborsabile. Il tuo deposito carburante di ${opts.refundAmountText} sarà rimborsato per intero.`,
        pt: `Como este cancelamento ocorre dentro das 48 horas anteriores à recolha, a taxa de aluguer de ${opts.carHireText} não é reembolsável. O seu depósito de combustível de ${opts.refundAmountText} será totalmente reembolsado.`,
        de: `Da diese Stornierung innerhalb von 48 Stunden vor Ihrer Abholzeit erfolgt, ist die Mietgebühr von ${opts.carHireText} nicht erstattungsfähig. Ihre Kraftstoffkaution von ${opts.refundAmountText} wird vollständig erstattet.`,
      }
    : {
        en: `As this cancellation is more than 48 hours before your pickup time, a full refund of ${opts.refundAmountText} will be processed.`,
        es: `Como esta cancelación se realiza con más de 48 horas de antelación a la recogida, se procesará un reembolso completo de ${opts.refundAmountText}.`,
        fr: `Cette annulation ayant lieu plus de 48 heures avant l'heure de prise en charge, un remboursement intégral de ${opts.refundAmountText} sera effectué.`,
        it: `Poiché questa cancellazione avviene più di 48 ore prima dell'orario di ritiro, verrà elaborato un rimborso completo di ${opts.refundAmountText}.`,
        pt: `Como este cancelamento ocorre com mais de 48 horas de antecedência em relação à recolha, será processado um reembolso total de ${opts.refundAmountText}.`,
        de: `Da diese Stornierung mehr als 48 Stunden vor Ihrer Abholzeit erfolgt, wird eine vollständige Rückerstattung von ${opts.refundAmountText} veranlasst.`,
      };
  const totalLbl: Record<Locale, string> = { en: "Refund total:", es: "Total del reembolso:", fr: "Total du remboursement :", it: "Totale rimborso:", pt: "Total do reembolso:", de: "Erstattungsbetrag:" };
  const allow: Record<Locale, string> = {
    en: "Please allow 5–10 business days for the refund to appear on your statement.",
    es: "El reembolso puede tardar de 5 a 10 días hábiles en aparecer en tu extracto.",
    fr: "Comptez 5 à 10 jours ouvrés pour que le remboursement apparaisse sur votre relevé.",
    it: "Il rimborso può richiedere da 5 a 10 giorni lavorativi per comparire sul tuo estratto conto.",
    pt: "O reembolso pode demorar 5 a 10 dias úteis a aparecer no seu extrato.",
    de: "Bitte rechnen Sie mit 5–10 Werktagen, bis die Rückerstattung auf Ihrem Kontoauszug erscheint.",
  };
  const questions: Record<Locale, string> = { en: "Questions? Email", es: "¿Preguntas? Escribe a", fr: "Des questions ? Écrivez à", it: "Domande? Scrivi a", pt: "Dúvidas? Escreva para", de: "Fragen? Schreiben Sie an" };
  const cta: Record<Locale, string> = { en: "View My Bookings", es: "Ver mis reservas", fr: "Voir mes réservations", it: "Vedi le mie prenotazioni", pt: "Ver as minhas reservas", de: "Meine Buchungen ansehen" };

  const borderCol = opts.isWithin48 ? "#ff7a00" : "#22c55e";
  const bgCol = opts.isWithin48 ? "#fff8f4" : "#f0fff4";
  const body = `
    <p>${t(hi)}</p>
    <p>${t(line)}</p>
    ${opts.reason ? `<p><strong>${t(reasonLbl)}</strong> ${opts.reason}</p>` : ""}
    <p><strong>${t(pickupLbl)}</strong> ${opts.pickupTime || "—"}<br/><strong>${t(locLbl)}</strong> ${opts.pickupAddress || "—"}</p>
    <div style="background:${bgCol};border:1px solid ${borderCol};padding:16px;margin:16px 0;">
      <p style="margin:0;font-weight:700;">${t(boxLabel)}</p>
      <p style="margin:8px 0 0;font-size:14px;">${t(note)}</p>
      <p style="margin:8px 0 0;font-weight:700;">${t(totalLbl)} ${opts.refundAmountText}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#666;">${t(allow)}</p>
    </div>
    <p>${t(questions)} <a href="mailto:contact@camel-global.com" style="color:#ff7a00;">contact@camel-global.com</a></p>
    <a href="${opts.siteUrl}/bookings" style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;text-decoration:none;font-weight:700;margin-top:8px;">${t(cta)}</a>`;

  return sendEmail({ to, subject: t(subject), html: wrapBrand(t(heading), body, locale) });
}

export async function sendPartnerBookingCancelledByCustomerEmail(to: string, opts: {
  locale?: Locale;
  jobNo: string;
  customerName?: string | null;
  reason?: string | null;
  pickupTime?: string | null;
  isWithin48: boolean;
  refundAmountText: string;
}) {
  const locale = opts.locale ?? "en";
  const t = <T,>(m: Record<Locale, T>) => m[locale] ?? m.en;
  const JOB = opts.jobNo;

  const subject: Record<Locale, string> = {
    en: `Booking ${JOB} cancelled by customer`,
    es: `Reserva ${JOB} cancelada por el cliente`,
    fr: `Réservation ${JOB} annulée par le client`,
    it: `Prenotazione ${JOB} annullata dal cliente`,
    pt: `Reserva ${JOB} cancelada pelo cliente`,
    de: `Buchung ${JOB} vom Kunden storniert`,
  };
  const heading: Record<Locale, string> = {
    en: "Booking Cancelled by Customer", es: "Reserva cancelada por el cliente", fr: "Réservation annulée par le client",
    it: "Prenotazione annullata dal cliente", pt: "Reserva cancelada pelo cliente", de: "Buchung vom Kunden storniert",
  };
  const line: Record<Locale, string> = {
    en: `Booking ${JOB} has been cancelled by the customer.`,
    es: `La reserva ${JOB} ha sido cancelada por el cliente.`,
    fr: `La réservation ${JOB} a été annulée par le client.`,
    it: `La prenotazione ${JOB} è stata annullata dal cliente.`,
    pt: `A reserva ${JOB} foi cancelada pelo cliente.`,
    de: `Buchung ${JOB} wurde vom Kunden storniert.`,
  };
  const custLbl: Record<Locale, string> = { en: "Customer:", es: "Cliente:", fr: "Client :", it: "Cliente:", pt: "Cliente:", de: "Kunde:" };
  const pickupLbl: Record<Locale, string> = { en: "Pickup was:", es: "Recogida:", fr: "Prise en charge :", it: "Ritiro:", pt: "Recolha:", de: "Abholung:" };
  const refundLbl: Record<Locale, string> = { en: "Refund:", es: "Reembolso:", fr: "Remboursement :", it: "Rimborso:", pt: "Reembolso:", de: "Rückerstattung:" };
  const refundKind: Record<Locale, string> = opts.isWithin48
    ? { en: "Partial refund (fuel deposit only — within 48hrs)", es: "Reembolso parcial (solo depósito de combustible — dentro de 48 h)", fr: "Remboursement partiel (dépôt de carburant uniquement — moins de 48 h)", it: "Rimborso parziale (solo deposito carburante — entro 48 h)", pt: "Reembolso parcial (apenas depósito de combustível — dentro de 48 h)", de: "Teilweise Rückerstattung (nur Kraftstoffkaution — innerhalb von 48 Std.)" }
    : { en: "Full refund", es: "Reembolso completo", fr: "Remboursement intégral", it: "Rimborso completo", pt: "Reembolso total", de: "Vollständige Rückerstattung" };
  const reasonLbl: Record<Locale, string> = { en: "Reason:", es: "Motivo:", fr: "Motif :", it: "Motivo:", pt: "Motivo:", de: "Grund:" };
  const noAction: Record<Locale, string> = {
    en: "No action required from you.", es: "No es necesario que hagas nada.", fr: "Aucune action n'est requise de votre part.",
    it: "Non è richiesta alcuna azione da parte tua.", pt: "Não é necessária qualquer ação da sua parte.", de: "Von Ihnen ist keine Aktion erforderlich.",
  };

  const body = `
    <p>${t(line)}</p>
    <p>
      <strong>${t(custLbl)}</strong> ${opts.customerName || "—"}<br/>
      <strong>${t(pickupLbl)}</strong> ${opts.pickupTime || "—"}<br/>
      <strong>${t(refundLbl)}</strong> ${t(refundKind)} — ${opts.refundAmountText}
    </p>
    ${opts.reason ? `<p><strong>${t(reasonLbl)}</strong> ${opts.reason}</p>` : ""}
    <p>${t(noAction)}</p>`;

  return sendEmail({ to, subject: t(subject), html: wrapBrand(t(heading), body, locale) });
}

// ---------------------------------------------------------------------------
// Customer emails — all accept optional locale (default "en")
// PDFs (receipt, completion statement) stay English — NTUK is a UK company
// ---------------------------------------------------------------------------

export async function sendCustomerBidReceivedEmail(
  to: string,
  jobNumber?: number | null,
  locale: Locale = "en"
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.camel-global.com";
  const sfx = (s: string) => (jobNumber ? s.replace("{N}", String(jobNumber)) : "");
  const job = jobNumber ? ` <strong>#${jobNumber}</strong>` : "";
  const subjects: Record<Locale, string> = { en: "A new partner bid has been received", es: "Nueva oferta recibida", fr: "Une nouvelle offre partenaire a été reçue", it: "È stata ricevuta una nuova offerta da un partner", pt: "Foi recebida uma nova proposta de parceiro", de: "Ein neues Partnerangebot wurde eingereicht" };
  const suffixes: Record<Locale, string> = { en: " for booking #{N}", es: " para la reserva #{N}", fr: " pour la réservation #{N}", it: " per la prenotazione #{N}", pt: " para a reserva #{N}", de: " für Buchung #{N}" };
  const cta: Record<Locale, string> = { en: "View your bookings", es: "Ver tus reservas", fr: "Voir vos réservations", it: "Visualizza le tue prenotazioni", pt: "Ver as suas reservas", de: "Meine Buchungen anzeigen" };
  const bodiesRaw: Record<Locale, string> = { en: "\n    <p>A partner has submitted a bid for your booking request{JOB}.</p>\n    <p>You can now log in and review the bid details.</p>", es: "\n    <p>Un socio ha enviado una oferta para tu solicitud de reserva{JOB}.</p>\n    <p>Ya puedes iniciar sesión y revisar los detalles de la oferta.</p>", fr: "\n    <p>Un partenaire a soumis une offre pour votre demande de réservation{JOB}.</p>\n    <p>Vous pouvez dès maintenant vous connecter et consulter les détails de l'offre.</p>", it: "\n    <p>Un partner ha inviato un'offerta per la tua richiesta di prenotazione{JOB}.</p>\n    <p>Puoi ora accedere al tuo account e consultare i dettagli dell'offerta.</p>", pt: "\n    <p>Um parceiro submeteu uma proposta para o seu pedido de reserva{JOB}.</p>\n    <p>Pode agora iniciar sessão e consultar os detalhes da proposta.</p>", de: "\n    <p>Ein Partner hat ein Angebot für Ihre Buchungsanfrage{JOB} eingereicht.</p>\n    <p>Sie können sich jetzt anmelden und die Angebotsdetails einsehen.</p>" };
  const headings: Record<Locale, string> = { en: "New bid received", es: "Nueva oferta recibida", fr: "Nouvelle offre reçue", it: "Nuova offerta ricevuta", pt: "Nova proposta recebida", de: "Neues Angebot eingegangen" };
  const bodies = Object.fromEntries(
    (Object.keys(bodiesRaw) as Locale[]).map(L => [L, `${bodiesRaw[L].replace("{JOB}", job)}
    <p style="margin:24px 0;">
      <a href="${baseUrl}/bookings" style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block;">${cta[L] ?? cta.en}</a>
    </p>`])
  ) as Record<Locale, string>;
  return sendEmail({
    to,
    subject: (subjects[locale] ?? subjects.en) + sfx(suffixes[locale] ?? suffixes.en),
    html: brandEmail(headings, bodies, locale),
  });
}

export async function sendCustomerBookingCompletedEmail(
  to: string,
  jobNumber?: number | null,
  locale: Locale = "en"
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.camel-global.com";
  const sfx = (s: string) => (jobNumber ? s.replace("{N}", String(jobNumber)) : "");
  const job = jobNumber ? ` <strong>#${jobNumber}</strong>` : "";
  const subjects: Record<Locale, string> = { en: "Your booking is now completed", es: "Tu reserva ha sido completada", fr: "Votre réservation est maintenant finalisée", it: "La tua prenotazione è ora completata", pt: "A sua reserva foi concluída", de: "Ihre Buchung ist nun abgeschlossen" };
  const suffixes: Record<Locale, string> = { en: " — #{N}", es: " — #{N}", fr: " — #{N}", it: " — #{N}", pt: " — #{N}", de: " — #{N}" };
  const cta: Record<Locale, string> = { en: "View booking details", es: "Ver detalles de la reserva", fr: "Voir les détails de la réservation", it: "Visualizza i dettagli della prenotazione", pt: "Ver detalhes da reserva", de: "Buchungsdetails anzeigen" };
  const bodiesRaw: Record<Locale, string> = { en: "\n    <p>Your booking{JOB} has now been marked as completed.</p>\n    <p>The vehicle return has been confirmed. Your fuel deposit refund (if applicable) will be processed automatically within 5–10 working days.</p>", es: "\n    <p>Tu reserva{JOB} ha sido marcada como completada.</p>\n    <p>Se ha confirmado la devolución del vehículo. El reembolso del depósito de combustible (si procede) se procesará automáticamente en 5–10 días laborables.</p>", fr: "\n    <p>Votre réservation{JOB} a été marquée comme finalisée.</p>\n    <p>Le retour du véhicule a été confirmé. Le remboursement de votre dépôt carburant (le cas échéant) sera traité automatiquement dans un délai de 5–10 jours ouvrés.</p>", it: "\n    <p>La tua prenotazione{JOB} è stata contrassegnata come completata.</p>\n    <p>La restituzione del veicolo è stata confermata. Il rimborso del deposito carburante (se applicabile) verrà elaborato automaticamente entro 5–10 giorni lavorativi.</p>", pt: "\n    <p>A sua reserva{JOB} foi marcada como concluída.</p>\n    <p>A devolução do veículo foi confirmada. O reembolso do depósito de combustível (se aplicável) será processado automaticamente dentro de 5–10 dias úteis.</p>", de: "\n    <p>Ihre Buchung{JOB} wurde als abgeschlossen markiert.</p>\n    <p>Die Fahrzeugrückgabe wurde bestätigt. Ihre Kraftstoffkautionserstattung (sofern zutreffend) wird automatisch innerhalb von 5–10 Werktagen bearbeitet.</p>" };
  const headings: Record<Locale, string> = { en: "Booking completed", es: "Reserva completada", fr: "Réservation finalisée", it: "Prenotazione completata", pt: "Reserva concluída", de: "Buchung abgeschlossen" };
  const bodies = Object.fromEntries(
    (Object.keys(bodiesRaw) as Locale[]).map(L => [L, `${bodiesRaw[L].replace("{JOB}", job)}
    <p style="margin:24px 0;">
      <a href="${baseUrl}/bookings" style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block;">${cta[L] ?? cta.en}</a>
    </p>`])
  ) as Record<Locale, string>;
  return sendEmail({
    to,
    subject: (subjects[locale] ?? subjects.en) + sfx(suffixes[locale] ?? suffixes.en),
    html: brandEmail(headings, bodies, locale),
  });
}

export async function sendReviewReminderEmail(
  to: string,
  jobNumber?: number | null,
  requestId?: string | null,
  locale: Locale = "en"
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.camel-global.com";
  const reviewUrl = requestId ? `${baseUrl}/bookings/${requestId}` : `${baseUrl}/bookings`;
  const sfx = (s: string) => (jobNumber ? s.replace("{N}", String(jobNumber)) : "");
  const job = jobNumber ? ` <strong>#${jobNumber}</strong>` : "";
  const subjects: Record<Locale, string> = { en: "How was your car hire experience?", es: "¿Qué tal fue tu experiencia de alquiler?", fr: "Comment s'est passée votre location de voiture ?", it: "Com'è stata la tua esperienza di noleggio auto?", pt: "Como foi a sua experiência de aluguer de automóvel?", de: "Wie war Ihre Mietwagenerfahrung?" };
  const suffixes: Record<Locale, string> = { en: " (Booking #{N})", es: " (Reserva #{N})", fr: " (Réservation #{N})", it: " (Prenotazione #{N})", pt: " (Reserva #{N})", de: " (Buchung #{N})" };
  const cta: Record<Locale, string> = { en: "Leave a Review", es: "Dejar una reseña", fr: "Laisser un avis", it: "Lascia una recensione", pt: "Deixar uma Avaliação", de: "Bewertung abgeben" };
  const footer: Record<Locale, string> = { en: "It only takes 30 seconds.", es: "Solo lleva 30 segundos.", fr: "Cela ne prend que 30 secondes.", it: "Bastano solo 30 secondi.", pt: "Demora apenas 30 segundos.", de: "Es dauert nur 30 Sekunden." };
  const bodiesRaw: Record<Locale, string> = { en: "\n    <p>Hi,</p>\n    <p>Your Camel Global car hire booking{JOB} is now complete. We'd love to hear how it went.</p>\n    <p>Your review helps other customers choose the right car hire company for their trip.</p>", es: "\n    <p>Hola,</p>\n    <p>Tu reserva de alquiler de coches con Camel Global{JOB} ha finalizado. Nos encantaría saber cómo fue.</p>\n    <p>Tu reseña ayuda a otros clientes a elegir la empresa de alquiler adecuada para su viaje.</p>", fr: "\n    <p>Bonjour,</p>\n    <p>Votre réservation de location de voiture Camel Global{JOB} est maintenant terminée. Nous serions ravis de savoir comment cela s'est passé.</p>\n    <p>Votre avis aide d'autres clients à choisir la bonne société de location de voiture pour leur voyage.</p>", it: "\n    <p>Salve,</p>\n    <p>La tua prenotazione di noleggio auto Camel Global{JOB} è ora completata. Ci farebbe molto piacere sapere com'è andata.</p>\n    <p>La tua recensione aiuta altri clienti a scegliere la società di noleggio auto più adatta al loro viaggio.</p>", pt: "\n    <p>Olá,</p>\n    <p>A sua reserva de aluguer de automóvel Camel Global{JOB} está agora concluída. Gostaríamos muito de saber como correu.</p>\n    <p>A sua avaliação ajuda outros clientes a escolher a empresa de aluguer de automóveis certa para a sua viagem.</p>", de: "\n    <p>Hallo,</p>\n    <p>Ihre Camel Global Mietwagebuchung{JOB} ist nun abgeschlossen. Wir würden gerne wissen, wie alles verlaufen ist.</p>\n    <p>Ihre Bewertung hilft anderen Kunden, das richtige Mietwagenunternehmen für ihre Reise zu finden.</p>" };
  const headings: Record<Locale, string> = { en: "How was your car hire experience? ⭐", es: "¿Qué tal fue tu experiencia de alquiler? ⭐", fr: "Comment s'est passée votre location de voiture ? ⭐", it: "Com'è stata la tua esperienza di noleggio auto? ⭐", pt: "Como foi a sua experiência de aluguer de automóvel? ⭐", de: "Wie war Ihre Mietwagenerfahrung? ⭐" };
  const bodies = Object.fromEntries(
    (Object.keys(bodiesRaw) as Locale[]).map(L => [L, `${bodiesRaw[L].replace("{JOB}", job)}
    <p style="margin:24px 0;">
      <a href="${reviewUrl}" style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block;">${cta[L] ?? cta.en}</a>
    </p>
    <p style="color:#64748b; font-size:14px;">${footer[L] ?? footer.en}</p>`])
  ) as Record<Locale, string>;
  return sendEmail({
    to,
    subject: (subjects[locale] ?? subjects.en) + sfx(suffixes[locale] ?? suffixes.en),
    html: brandEmail(headings, bodies, locale),
  });
}

// ---------------------------------------------------------------------------
// Partner emails — localized to the partner's communication_locale
// ---------------------------------------------------------------------------

// Sent to LIVE partners within radius when a matching customer request is created.
// Links to the portal so the partner can review the request and submit a bid.
export async function sendPartnerNewRequestEmail(
  to: string,
  opts: {
    jobNumber?: number | null;
    vehicleCategory?: string | null;
    pickupArea?: string | null;
    expiresAt?: string | null;
    locale?: Locale;
  } = {}
) {
  const { jobNumber, vehicleCategory, pickupArea, expiresAt } = opts;
  const locale = opts.locale ?? "en";

  const portalUrl   = process.env.PORTAL_BASE_URL || "https://portal.camel-global.com";
  const requestsUrl = `${portalUrl}/partner/requests`;
  const vehicle = vehicleCategory ? String(vehicleCategory) : "—";
  const pickup  = pickupArea ? String(pickupArea) : "—";

  const dtLocale: Record<Locale, string> = { en: "en-GB", es: "es-ES", fr: "fr-FR", it: "it-IT", pt: "pt-PT", de: "de-DE" };
  const fmtDeadline = (L: Locale): string => {
    if (!expiresAt) return "—";
    try {
      return new Intl.DateTimeFormat(dtLocale[L] ?? "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(expiresAt));
    } catch {
      return "—";
    }
  };

  const subjectsBase: Record<Locale, string> = {
    en: "New booking request in your area",
    es: "Nueva solicitud de reserva en tu zona",
    fr: "Nouvelle demande de réservation dans votre secteur",
    it: "Nuova richiesta di prenotazione nella tua zona",
    pt: "Novo pedido de reserva na sua zona",
    de: "Neue Buchungsanfrage in Ihrer Umgebung",
  };

  const headings: Record<Locale, string> = {
    en: "New booking request ⭐",
    es: "Nueva solicitud de reserva ⭐",
    fr: "Nouvelle demande de réservation ⭐",
    it: "Nuova richiesta di prenotazione ⭐",
    pt: "Novo pedido de reserva ⭐",
    de: "Neue Buchungsanfrage ⭐",
  };

  const greet: Record<Locale, string> = {
    en: "Hello,", es: "Hola,", fr: "Bonjour,", it: "Salve,", pt: "Olá,", de: "Hallo,",
  };

  const intro: Record<Locale, string> = {
    en: "A new customer booking request matches your fleet and service area. Log in to review the details and submit your bid before it expires.",
    es: "Una nueva solicitud de reserva de un cliente coincide con tu flota y tu zona de servicio. Inicia sesión para revisar los detalles y enviar tu oferta antes de que expire.",
    fr: "Une nouvelle demande de réservation correspond à votre flotte et à votre zone de service. Connectez-vous pour consulter les détails et soumettre votre offre avant son expiration.",
    it: "Una nuova richiesta di prenotazione corrisponde alla tua flotta e alla tua zona di servizio. Accedi per consultare i dettagli e inviare la tua offerta prima che scada.",
    pt: "Um novo pedido de reserva corresponde à sua frota e à sua zona de serviço. Inicie sessão para consultar os detalhes e enviar a sua proposta antes que expire.",
    de: "Eine neue Buchungsanfrage passt zu Ihrer Flotte und Ihrem Servicebereich. Melden Sie sich an, um die Details zu prüfen und Ihr Angebot abzugeben, bevor sie abläuft.",
  };

  const lblRequest:  Record<Locale, string> = { en: "Request",     es: "Solicitud",         fr: "Demande",                  it: "Richiesta",       pt: "Pedido",            de: "Anfrage" };
  const lblVehicle:  Record<Locale, string> = { en: "Vehicle",     es: "Vehículo",          fr: "Véhicule",                 it: "Veicolo",         pt: "Veículo",           de: "Fahrzeug" };
  const lblPickup:   Record<Locale, string> = { en: "Pickup area", es: "Zona de recogida",  fr: "Zone de prise en charge",  it: "Zona di ritiro",  pt: "Zona de recolha",   de: "Abholbereich" };
  const lblDeadline: Record<Locale, string> = { en: "Respond before", es: "Responde antes del", fr: "Répondez avant le",    it: "Rispondi entro",  pt: "Responda antes de", de: "Antworten bis" };

  const cta: Record<Locale, string> = {
    en: "View request & bid",
    es: "Ver solicitud y ofertar",
    fr: "Voir la demande et faire une offre",
    it: "Visualizza la richiesta e fai un'offerta",
    pt: "Ver pedido e licitar",
    de: "Anfrage ansehen & Angebot abgeben",
  };

  const bodies = Object.fromEntries(
    LOCALES.map((L) => {
      const rows = `
    <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:14px;">
      <tr><td style="padding:6px 0; color:#666;">${lblRequest[L]}</td><td style="padding:6px 0; text-align:right; font-weight:700;">${jobNumber ? `#${jobNumber}` : "—"}</td></tr>
      <tr><td style="padding:6px 0; color:#666;">${lblVehicle[L]}</td><td style="padding:6px 0; text-align:right; font-weight:700;">${vehicle}</td></tr>
      <tr><td style="padding:6px 0; color:#666;">${lblPickup[L]}</td><td style="padding:6px 0; text-align:right; font-weight:700;">${pickup}</td></tr>
      <tr><td style="padding:6px 0; color:#666;">${lblDeadline[L]}</td><td style="padding:6px 0; text-align:right; font-weight:700;">${fmtDeadline(L)}</td></tr>
    </table>`;
      return [L, `
    <p>${greet[L]}</p>
    <p>${intro[L]}</p>
    ${rows}
    <p style="margin:24px 0;">
      <a href="${requestsUrl}" style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block;">${cta[L]}</a>
    </p>`];
    })
  ) as Record<Locale, string>;

  return sendEmail({
    to,
    subject: (subjectsBase[locale] ?? subjectsBase.en) + (jobNumber ? ` — #${jobNumber}` : ""),
    html: brandEmail(headings, bodies, locale),
  });
}
