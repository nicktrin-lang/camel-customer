/**
 * Booking Confirmation Receipt PDF generator — camel-customer
 * Generated server-side after payment succeeds.
 * Stored in Supabase Storage + emailed to customer as attachment.
 *
 * Uses charge_currency (what customer actually paid) throughout.
 * Email body/subject is locale-aware (EN/ES). PDF stays English — NTUK legal document.
 */

import React from "react";
import { currencyLocale } from "@/lib/currency";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

const BUCKET = "booking-receipts";

const s = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 9, color: "#222", backgroundColor: "#fff", paddingBottom: 40 },
  topBar:      { backgroundColor: "#ff7a00", height: 8 },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: "16 24 12 24", borderBottom: "1 solid #e5e5e5" },
  logo:        { width: 90, height: 28, objectFit: "contain" },
  headerRight: { alignItems: "flex-end" },
  headerTitle: { fontSize: 7, color: "#888", marginBottom: 2 },
  headerDate:  { fontSize: 8, color: "#555" },
  body:        { padding: "20 24" },
  title:       { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#111", marginBottom: 4 },
  subtitle:    { fontSize: 9, color: "#888", marginBottom: 16 },
  section:     { marginBottom: 14 },
  sectionHead: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#ff7a00", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, borderBottom: "1 solid #f0f0f0", paddingBottom: 3 },
  row:         { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottom: "1 solid #f5f5f5" },
  rowLabel:    { color: "#555", flex: 1 },
  rowValue:    { fontFamily: "Helvetica-Bold", color: "#111", textAlign: "right", flex: 1 },
  totalRow:    { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#111", padding: "8 10", marginTop: 6 },
  totalLabel:  { fontFamily: "Helvetica-Bold", color: "#fff", fontSize: 10 },
  totalValue:  { fontFamily: "Helvetica-Bold", color: "#ff7a00", fontSize: 10 },
  checklistItem:  { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 },
  checklistDot:   { width: 14, height: 14, backgroundColor: "#ff7a00", marginRight: 8, marginTop: 1, flexShrink: 0, justifyContent: "center", alignItems: "center" },
  checklistTick:  { fontSize: 7, color: "#fff", fontFamily: "Helvetica-Bold" },
  checklistText:  { flex: 1 },
  checklistTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#111" },
  checklistDesc:  { fontSize: 7.5, color: "#666", marginTop: 1, lineHeight: 1.4 },
  termsBox:     { backgroundColor: "#fff8f0", borderLeft: "3 solid #ff7a00", padding: "8 10", marginBottom: 6 },
  termsLabel:   { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#ff7a00", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  termsText:    { fontSize: 7.5, color: "#333", lineHeight: 1.4 },
  depositBox:   { backgroundColor: "#fffbeb", borderLeft: "3 solid #f59e0b", padding: "8 10", marginBottom: 6 },
  depositLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#b45309", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  depositText:  { fontSize: 7.5, color: "#333", lineHeight: 1.4 },
  // Platform intermediary notice
  platformBox:  { backgroundColor: "#f5f5f5", borderLeft: "3 solid #999", padding: "8 10", marginBottom: 6, marginTop: 4 },
  platformLabel:{ fontSize: 7, fontFamily: "Helvetica-Bold", color: "#555", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  platformText: { fontSize: 7.5, color: "#444", lineHeight: 1.5 },
  note:         { fontSize: 7.5, color: "#888", marginTop: 10, lineHeight: 1.5 },
  noteOrange:   { fontSize: 7.5, color: "#ff7a00", fontFamily: "Helvetica-Bold", marginTop: 6, lineHeight: 1.5 },
  footer:       { position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1 solid #e5e5e5", padding: "6 24", flexDirection: "row", justifyContent: "space-between" },
  footerText:   { fontSize: 7, color: "#aaa" },
});

function fmtMoney(amount: number, currency: string): string {
  const locale = currencyLocale(currency);
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch { return iso; }
}

function fmtDuration(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  if (minutes >= 1440) {
    const days = Math.ceil(minutes / 1440);
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function sportEquipmentLabel(v: string | null | undefined): string {
  if (!v || v === "none") return "None";
  const map: Record<string, string> = {
    golf_single: "Golf clubs — 1 bag", golf_two: "Golf clubs — 2 bags",
    golf_three: "Golf clubs — 3 bags", golf_four: "Golf clubs — 4+ bags",
    skis_pair: "Skis / snowboard — 1 set", skis_two: "Skis / snowboard — 2 sets",
    skis_three: "Skis / snowboard — 3+ sets",
    bikes_one: "Bikes — 1", bikes_two: "Bikes — 2", bikes_three: "Bikes — 3+",
    other: "Other large equipment",
  };
  return map[v] || v;
}

function transmissionLabel(v: string | null | undefined): string {
  if (v === "automatic") return "Automatic";
  if (v === "manual") return "Manual";
  return "-";
}

function childSeatsLabel(v: any): string {
  if (!v || typeof v !== "object") return "-";
  const parts: string[] = [];
  if (Number(v.infant)  > 0) parts.push(`${Number(v.infant)} infant`);
  if (Number(v.toddler) > 0) parts.push(`${Number(v.toddler)} toddler`);
  if (Number(v.booster) > 0) parts.push(`${Number(v.booster)} booster`);
  return parts.length ? parts.join(", ") : "-";
}

interface ReceiptData {
  jobNumber:              number | null;
  bookingId:              string;
  requestId:              string;
  customerName:           string | null;
  customerEmail:          string | null;
  pickupAddress:          string | null;
  dropoffAddress:         string | null;
  pickupAt:               string | null;
  dropoffAt:              string | null;
  durationMinutes:        number | null;
  vehicleCategory:        string | null;
  companyName:            string | null;
  chargeCurrency:         string;
  chargeCarHire:          number;
  chargeFuel:             number;
  chargeTotal:            number;
  issuedAt:               string;
  logoBase64:             string | null;
  passengers:             number | null;
  suitcases:              number | null;
  handLuggage:            number | null;
  sportEquipment:         string | null;
  driverAge:              number | null;
  additionalDrivers:      number;
  additionalDriverAges:   string | null;
  mileageLimit:           string | null;
  securityDepositNotes:   string | null;
  prefTransmission:       string | null;
  prefChildSeats:         any | null;
}

function ChecklistItem({ title, desc }: { title: string; desc: string }) {
  return (
    <View style={s.checklistItem}>
      <View style={s.checklistDot}>
        <Text style={s.checklistTick}>✓</Text>
      </View>
      <View style={s.checklistText}>
        <Text style={s.checklistTitle}>{title}</Text>
        <Text style={s.checklistDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function ReceiptDocument({ d }: { d: ReceiptData }) {
  const cur = d.chargeCurrency;
  const ref = d.jobNumber ? `#${d.jobNumber}` : d.bookingId.slice(0, 8).toUpperCase();

  const additionalDriversText = d.additionalDrivers > 0
    ? `${d.additionalDrivers}${d.additionalDriverAges ? ` (ages: ${d.additionalDriverAges})` : ""}`
    : "None";

  const hasAdditionalTerms = !!(d.mileageLimit || d.securityDepositNotes);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.topBar} />

        <View style={s.header}>
          {d.logoBase64 ? (
            <Image src={`data:image/png;base64,${d.logoBase64}`} style={s.logo} />
          ) : (
            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#ff7a00" }}>CAMEL GLOBAL</Text>
          )}
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>BOOKING CONFIRMATION RECEIPT</Text>
            <Text style={s.headerDate}>Issued: {fmtDateShort(d.issuedAt)}</Text>
            <Text style={s.headerDate}>Ref: {ref}</Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.title}>Booking Confirmation Receipt</Text>
          <Text style={s.subtitle}>Thank you for your payment. Your booking is confirmed.</Text>

          {/* Booking details */}
          <View style={s.section}>
            <Text style={s.sectionHead}>Booking Details</Text>
            <View style={s.row}>
              <Text style={s.rowLabel}>Booking reference</Text>
              <Text style={s.rowValue}>{ref}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Customer name</Text>
              <Text style={s.rowValue}>{d.customerName || "—"}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Car hire company</Text>
              <Text style={s.rowValue}>{d.companyName || "—"}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Vehicle type</Text>
              <Text style={s.rowValue}>{d.vehicleCategory || "—"}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Pickup address</Text>
              <Text style={s.rowValue}>{d.pickupAddress || "—"}</Text>
            </View>
            {d.dropoffAddress ? (
              <View style={s.row}>
                <Text style={s.rowLabel}>Drop-off address</Text>
                <Text style={s.rowValue}>{d.dropoffAddress}</Text>
              </View>
            ) : null}
            <View style={s.row}>
              <Text style={s.rowLabel}>Pickup date &amp; time</Text>
              <Text style={s.rowValue}>{fmtDate(d.pickupAt)}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Drop-off date &amp; time</Text>
              <Text style={s.rowValue}>{fmtDate(d.dropoffAt)}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Duration</Text>
              <Text style={s.rowValue}>{fmtDuration(d.durationMinutes)}</Text>
            </View>
          </View>

          {/* Journey details */}
          <View style={s.section}>
            <Text style={s.sectionHead}>Journey Details</Text>
            {d.passengers != null && (
              <View style={s.row}>
                <Text style={s.rowLabel}>Passengers</Text>
                <Text style={s.rowValue}>{d.passengers}</Text>
              </View>
            )}
            {d.suitcases != null && (
              <View style={s.row}>
                <Text style={s.rowLabel}>Suitcases</Text>
                <Text style={s.rowValue}>{d.suitcases}</Text>
              </View>
            )}
            {d.handLuggage != null && d.handLuggage > 0 && (
              <View style={s.row}>
                <Text style={s.rowLabel}>Hand luggage</Text>
                <Text style={s.rowValue}>{d.handLuggage}</Text>
              </View>
            )}
            <View style={s.row}>
              <Text style={s.rowLabel}>Sport equipment</Text>
              <Text style={s.rowValue}>{sportEquipmentLabel(d.sportEquipment)}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Main driver age</Text>
              <Text style={s.rowValue}>{d.driverAge ?? "—"}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Additional drivers</Text>
              <Text style={s.rowValue}>{additionalDriversText}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Transmission</Text>
              <Text style={s.rowValue}>{transmissionLabel(d.prefTransmission)}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Child seats</Text>
              <Text style={s.rowValue}>{childSeatsLabel(d.prefChildSeats)}</Text>
            </View>
          </View>

          {/* Payment */}
          <View style={s.section}>
            <Text style={s.sectionHead}>Payment to Camel Global ({cur})</Text>
            <View style={s.row}>
              <Text style={s.rowLabel}>Car hire</Text>
              <Text style={s.rowValue}>{fmtMoney(d.chargeCarHire, cur)}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Full tank deposit (refundable)</Text>
              <Text style={s.rowValue}>{fmtMoney(d.chargeFuel, cur)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total paid to Camel Global</Text>
              <Text style={s.totalValue}>{fmtMoney(d.chargeTotal, cur)}</Text>
            </View>
          </View>

          {/* Platform intermediary notice */}
          <View style={s.platformBox}>
            <Text style={s.platformLabel}>Platform Payment Notice</Text>
            <Text style={s.platformText}>
              This document confirms payment received by NTUK Ltd (trading as Camel Global) as a marketplace
              intermediary and technology platform. It is not a VAT invoice for car hire services.
              The car hire service is provided directly by {d.companyName || "the car hire company"}, who is the
              supplier of those services. If you require a VAT invoice for the car hire, please request one
              directly from {d.companyName || "the car hire company"}.
            </Text>
          </View>

          {/* Additional terms */}
          {hasAdditionalTerms && (
            <View style={s.section}>
              <Text style={s.sectionHead}>Additional Terms from Car Hire Company</Text>
              {d.mileageLimit && (
                <View style={[s.termsBox, { marginBottom: 6 }]}>
                  <Text style={s.termsLabel}>Mileage limit</Text>
                  <Text style={s.termsText}>{d.mileageLimit}</Text>
                  <Text style={[s.termsText, { marginTop: 3, color: "#888" }]}>Any excess mileage charges are payable directly to the car hire company at collection. Credit card required.</Text>
                </View>
              )}
              {d.securityDepositNotes && (
                <View style={s.depositBox}>
                  <Text style={s.depositLabel}>Security deposit required</Text>
                  <Text style={s.depositText}>{d.securityDepositNotes}</Text>
                  <Text style={[s.depositText, { marginTop: 3, color: "#888" }]}>Payable directly to the car hire company at collection. Credit card only — debit cards cannot be used for deposit blocking.</Text>
                </View>
              )}
            </View>
          )}

          {/* What to bring checklist */}
          <View style={s.section}>
            <Text style={s.sectionHead}>What to Bring When Collecting Your Car</Text>
            <ChecklistItem
              title="Driving licence — all drivers"
              desc="A full EU driving licence in Roman alphabet is required for every driver. If your licence does not meet this requirement, you must also bring an international driving permit alongside your original licence."
            />
            <ChecklistItem
              title="Passport or national identity document — all drivers"
              desc="A valid passport or national ID card must be presented for every driver named on this booking."
            />
            <ChecklistItem
              title="Photocopies recommended"
              desc="Bring a photocopy of your driving licence and passport for all drivers. Some car hire companies require these for their records. All documents must be originals — digital copies and mobile photos are not accepted."
            />
            {d.securityDepositNotes && (
              <ChecklistItem
                title="Credit card required at collection"
                desc={`This car hire company requires a security deposit. Credit card only — debit cards cannot be used for deposit blocking. ${d.securityDepositNotes}`}
              />
            )}
          </View>

          <Text style={s.note}>
            The fuel deposit will be refunded at the end of your hire based on the fuel level recorded at collection
            and return. Any unused fuel will be refunded to your original payment method within 5–10 business days
            of booking completion.
          </Text>
          <Text style={s.note}>
            To view your booking, visit camel-global.com/bookings/{d.requestId}
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Camel Global · NTUK Ltd · Office 7, 35-37 Ludgate Hill, London EC4M 7JN · Company No. 08765474</Text>
          <Text style={s.footerText}>camel-global.com</Text>
        </View>
      </Page>
    </Document>
  );
}

export interface GenerateBookingReceiptParams {
  jobNumber:              number | null;
  bookingId:              string;
  requestId:              string;
  customerName:           string | null;
  customerEmail:          string | null;
  pickupAddress:          string | null;
  dropoffAddress:         string | null;
  pickupAt:               string | null;
  dropoffAt?:             string | null;
  durationMinutes?:       number | null;
  vehicleCategory:        string | null;
  companyName:            string | null;
  chargeCurrency:         string;
  chargeCarHire:          number;
  chargeFuel:             number;
  chargeTotal:            number;
  passengers?:            number | null;
  suitcases?:             number | null;
  handLuggage?:           number | null;
  sportEquipment?:        string | null;
  driverAge?:             number | null;
  additionalDrivers?:     number;
  additionalDriverAges?:  string | null;
  mileageLimit?:          string | null;
  securityDepositNotes?:  string | null;
  prefTransmission?:      string | null;
  prefChildSeats?:        any | null;
  locale?:                "en" | "es" | "fr" | "it" | "pt" | "de";
}

export async function generateBookingReceiptPDF(params: GenerateBookingReceiptParams): Promise<{
  storagePath: string;
  base64: string;
}> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const issuedAt = new Date().toISOString();
  const ref = params.jobNumber ? params.jobNumber : params.bookingId.slice(0, 8).toUpperCase();

  let logoBase64: string | null = null;
  try {
    const logoUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com"}/camel-invoice-logo.png`;
    const logoRes = await fetch(logoUrl);
    if (logoRes.ok) {
      const buf = await logoRes.arrayBuffer();
      logoBase64 = Buffer.from(buf).toString("base64");
    }
  } catch (e) {
    console.warn("generateBookingReceiptPDF: logo fetch failed", e);
  }

  const data: ReceiptData = {
    ...params,
    issuedAt,
    logoBase64,
    dropoffAt:            params.dropoffAt ?? null,
    durationMinutes:      params.durationMinutes ?? null,
    passengers:           params.passengers ?? null,
    suitcases:            params.suitcases ?? null,
    handLuggage:          params.handLuggage ?? null,
    sportEquipment:       params.sportEquipment ?? null,
    driverAge:            params.driverAge ?? null,
    additionalDrivers:    params.additionalDrivers ?? 0,
    additionalDriverAges: params.additionalDriverAges ?? null,
    mileageLimit:         params.mileageLimit ?? null,
    securityDepositNotes: params.securityDepositNotes ?? null,
    prefTransmission:     params.prefTransmission ?? null,
    prefChildSeats:       params.prefChildSeats ?? null,
  };

  const pdfBuffer = await renderToBuffer(<ReceiptDocument d={data} />);
  const base64 = pdfBuffer.toString("base64");

  const storagePath = `${params.requestId}/booking-receipt-${ref}.pdf`;
  const { error: uploadErr } = await db.storage
    .from(BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadErr) {
    console.error("generateBookingReceiptPDF: storage upload failed", uploadErr);
  }

  await db
    .from("partner_bookings")
    .update({ receipt_storage_path: storagePath })
    .eq("id", params.bookingId);

  return { storagePath, base64 };
}

export async function sendBookingReceiptEmail(params: GenerateBookingReceiptParams): Promise<void> {
  const { base64 } = await generateBookingReceiptPDF(params);

  if (!params.customerEmail) {
    console.warn("sendBookingReceiptEmail: no customer email, skipping");
    return;
  }

  const locale = params.locale ?? "en";
  const jobNo = params.jobNumber ? `#${params.jobNumber}` : "";
  const cur = params.chargeCurrency;
  const fmtCharge = (n: number) =>
    new Intl.NumberFormat(currencyLocale(cur), {
      style: "currency", currency: cur,
    }).format(n);

  const companyName = params.companyName || (locale === "es" ? "tu empresa de alquiler" : "your car hire partner");

  type RcptLocale = "en" | "es" | "fr" | "it" | "pt" | "de";
  const RC: Record<RcptLocale, Record<string, string>> = {
  en: {"lbl_booking_ref": "Booking reference", "lbl_car_hire_partner": "Car hire partner", "lbl_company": "Car hire partner", "lbl_customer": "Customer", "lbl_pickup_time": "Pickup time", "lbl_pickup_address": "Pickup address", "lbl_dropoff_address": "Drop-off address", "lbl_car_hire": "Car hire", "lbl_fuel_deposit": "Fuel deposit", "lbl_total_paid": "Total paid", "cc_subject": "Booking confirmed {JOB} — payment received", "cc_heading": "Booking Confirmed ✅", "cc_hi": "Hi {NAME},", "cc_p1": "Your payment has been received and your booking is confirmed with <strong>{CO}</strong>.", "cc_summary": "Booking Summary", "cc_fuel_note": "The fuel deposit will be refunded at the end of your hire based on fuel used.", "cc_receipt_note": "Your booking confirmation receipt will arrive in a separate email shortly.", "cc_cta": "View Booking", "cc_fallback_name": "there", "pn_subject": "New booking confirmed {JOB}", "pn_heading": "New Booking Confirmed", "pn_hi": "Hi {NAME},", "pn_p1": "A customer has paid and confirmed booking {JOB}. Please prepare for collection.", "pn_details": "Booking Details", "pn_cta": "View Booking", "rc_subject": "Booking Confirmation Receipt {JOB} — Camel Global", "rc_h2": "Booking Confirmation Receipt", "rc_booking_label": "Booking {JOB}", "rc_hi": "Hi {NAME},", "rc_p1": "Please find your booking confirmation receipt attached. Your booking with <strong>{CO}</strong> is confirmed.", "rc_attached_note": "Your receipt is attached as a PDF. You can also download it any time from your booking page at", "rc_bring_title": "What to bring when collecting your car:", "rc_li_licence": "<strong>Driving licence</strong> — full EU licence in Roman alphabet required for all drivers. If your licence does not meet this, bring an international driving permit alongside your original.", "rc_li_passport": "<strong>Passport or national ID</strong> — valid for every driver on this booking.", "rc_li_photocopy": "<strong>Photocopies recommended</strong> — bring a photocopy of your driving licence and passport for all drivers. All documents must be originals — digital copies are not accepted.", "rc_li_card": "<strong>Credit card required</strong> — {DEP} Credit card only, debit cards cannot be used for deposit blocking.", "pn_notice_title": "Platform Payment Notice", "pn_notice_body": "This email and the attached PDF confirm payment received by NTUK Ltd (trading as Camel Global) as a marketplace intermediary. They are not a VAT invoice for car hire services. The car hire service is provided directly by <strong>{CO}</strong>. If you require a VAT invoice, please request one directly from {CO}.", "sig_regards": "Best regards,", "sig_team": "The Camel Global Team"},
  es: {"lbl_booking_ref": "Referencia de reserva", "lbl_car_hire_partner": "Empresa de alquiler", "lbl_company": "Empresa de alquiler", "lbl_customer": "Cliente", "lbl_pickup_time": "Hora de recogida", "lbl_pickup_address": "Dirección de recogida", "lbl_dropoff_address": "Dirección de devolución", "lbl_car_hire": "Alquiler", "lbl_fuel_deposit": "Depósito de combustible", "lbl_total_paid": "Total pagado", "cc_subject": "Reserva confirmada {JOB} — pago recibido", "cc_heading": "Reserva confirmada ✅", "cc_hi": "Hola {NAME},", "cc_p1": "Tu pago ha sido recibido y tu reserva está confirmada con <strong>{CO}</strong>.", "cc_summary": "Resumen de la reserva", "cc_fuel_note": "El depósito de combustible se reembolsará al finalizar el alquiler según el combustible utilizado.", "cc_receipt_note": "El recibo de confirmación de tu reserva llegará en un correo aparte en breve.", "cc_cta": "Ver reserva", "cc_fallback_name": "hola", "pn_subject": "Nueva reserva confirmada {JOB}", "pn_heading": "Nueva reserva confirmada", "pn_hi": "Hola {NAME},", "pn_p1": "Un cliente ha pagado y confirmado la reserva {JOB}. Por favor, prepárate para la recogida.", "pn_details": "Detalles de la reserva", "pn_cta": "Ver reserva", "rc_subject": "Recibo de confirmación de reserva {JOB} — Camel Global", "rc_h2": "Recibo de confirmación de reserva", "rc_booking_label": "Reserva {JOB}", "rc_hi": "Hola {NAME},", "rc_p1": "Adjunto encontrarás tu recibo de confirmación de reserva. Tu reserva con <strong>{CO}</strong> está confirmada.", "rc_attached_note": "Tu recibo está adjunto en PDF. También puedes descargarlo en cualquier momento desde tu página de reserva en", "rc_bring_title": "Qué traer al recoger tu coche:", "rc_li_licence": "<strong>Permiso de conducir</strong> — permiso completo de la UE en alfabeto latino para todos los conductores. Si no cumple este requisito, trae también un permiso de conducir internacional.", "rc_li_passport": "<strong>Pasaporte o DNI</strong> — válido para todos los conductores de esta reserva.", "rc_li_photocopy": "<strong>Fotocopias recomendadas</strong> — trae una fotocopia del permiso de conducir y pasaporte para todos los conductores. Los documentos deben ser originales — no se aceptan copias digitales.", "rc_li_card": "<strong>Tarjeta de crédito obligatoria</strong> — {DEP} Solo tarjeta de crédito, las tarjetas de débito no se aceptan para el bloqueo del depósito.", "pn_notice_title": "Aviso de pago de plataforma", "pn_notice_body": "Este correo y el PDF adjunto confirman el pago recibido por NTUK Ltd (que opera como Camel Global) como intermediario de la plataforma. No constituyen una factura de IVA por servicios de alquiler de vehículos. El servicio de alquiler es prestado directamente por <strong>{CO}</strong>. Si necesitas una factura de IVA, solicítala directamente a {CO}.", "sig_regards": "Saludos,", "sig_team": "El equipo de Camel Global"},
  fr: {"lbl_booking_ref": "Référence de réservation", "lbl_car_hire_partner": "Partenaire de location de voiture", "lbl_company": "Partenaire de location de voiture", "lbl_customer": "Client", "lbl_pickup_time": "Heure de prise en charge", "lbl_pickup_address": "Adresse de prise en charge", "lbl_dropoff_address": "Adresse de restitution", "lbl_car_hire": "Location de voiture", "lbl_fuel_deposit": "Dépôt de carburant", "lbl_total_paid": "Total payé", "cc_subject": "Réservation confirmée {JOB} — paiement reçu", "cc_heading": "Réservation confirmée ✅", "cc_hi": "Bonjour {NAME},", "cc_p1": "Votre paiement a bien été reçu et votre réservation est confirmée auprès de <strong>{CO}</strong>.", "cc_summary": "Récapitulatif de la réservation", "cc_fuel_note": "Le dépôt de carburant vous sera remboursé à la fin de votre location en fonction du carburant consommé.", "cc_receipt_note": "Votre reçu de confirmation de réservation vous parviendra dans un e-mail séparé sous peu.", "cc_cta": "Voir la réservation", "cc_fallback_name": "cher client", "pn_subject": "Nouvelle réservation confirmée {JOB}", "pn_heading": "Nouvelle réservation confirmée", "pn_hi": "Bonjour {NAME},", "pn_p1": "Un client a payé et confirmé la réservation {JOB}. Veuillez préparer le véhicule pour la collecte.", "pn_details": "Détails de la réservation", "pn_cta": "Voir la réservation", "rc_subject": "Reçu de confirmation de réservation {JOB} — Camel Global", "rc_h2": "Reçu de confirmation de réservation", "rc_booking_label": "Réservation {JOB}", "rc_hi": "Bonjour {NAME},", "rc_p1": "Veuillez trouver ci-joint votre reçu de confirmation de réservation. Votre réservation auprès de <strong>{CO}</strong> est confirmée.", "rc_attached_note": "Votre reçu est joint en PDF. Vous pouvez également le télécharger à tout moment depuis votre page de réservation sur", "rc_bring_title": "Ce qu'il faut apporter lors de la récupération de votre véhicule :", "rc_li_licence": "<strong>Permis de conduire</strong> — permis EU complet en alphabet romain obligatoire pour tous les conducteurs. Si votre permis ne remplit pas ces conditions, veuillez apporter un permis de conduire international accompagné de votre permis original.", "rc_li_passport": "<strong>Passeport ou carte d'identité nationale</strong> — en cours de validité pour chaque conducteur figurant sur cette réservation.", "rc_li_photocopy": "<strong>Photocopies recommandées</strong> — apportez une photocopie de votre permis de conduire et de votre passeport pour tous les conducteurs. Tous les documents doivent être des originaux — les copies numériques ne sont pas acceptées.", "rc_li_card": "<strong>Carte de crédit obligatoire</strong> — {DEP} Carte de crédit uniquement, les cartes de débit ne peuvent pas être utilisées pour le blocage du dépôt.", "pn_notice_title": "Avis de paiement sur la plateforme", "pn_notice_body": "Cet e-mail et le PDF joint confirment la réception du paiement par NTUK Ltd (exerçant sous le nom de Camel Global) en tant qu'intermédiaire de marché. Ils ne constituent pas une facture VAT pour les services de location de voiture. Le service de location de voiture est fourni directement par <strong>{CO}</strong>. Si vous avez besoin d'une facture VAT, veuillez en faire la demande directement auprès de {CO}.", "sig_regards": "Cordialement,", "sig_team": "L'équipe Camel Global"},
  it: {"lbl_booking_ref": "Riferimento prenotazione", "lbl_car_hire_partner": "Partner noleggio auto", "lbl_company": "Partner noleggio auto", "lbl_customer": "Cliente", "lbl_pickup_time": "Orario di ritiro", "lbl_pickup_address": "Indirizzo di ritiro", "lbl_dropoff_address": "Indirizzo di consegna", "lbl_car_hire": "Noleggio auto", "lbl_fuel_deposit": "Deposito carburante", "lbl_total_paid": "Totale pagato", "cc_subject": "Prenotazione confermata {JOB} — pagamento ricevuto", "cc_heading": "Prenotazione Confermata ✅", "cc_hi": "Salve {NAME},", "cc_p1": "Il tuo pagamento è stato ricevuto e la tua prenotazione è confermata con <strong>{CO}</strong>.", "cc_summary": "Riepilogo Prenotazione", "cc_fuel_note": "Il deposito carburante verrà rimborsato al termine del noleggio in base al carburante utilizzato.", "cc_receipt_note": "La ricevuta di conferma della tua prenotazione arriverà a breve in un'email separata.", "cc_cta": "Visualizza Prenotazione", "cc_fallback_name": "cliente", "pn_subject": "Nuova prenotazione confermata {JOB}", "pn_heading": "Nuova Prenotazione Confermata", "pn_hi": "Salve {NAME},", "pn_p1": "Un cliente ha effettuato il pagamento e confermato la prenotazione {JOB}. Si prega di prepararsi per il ritiro.", "pn_details": "Dettagli Prenotazione", "pn_cta": "Visualizza Prenotazione", "rc_subject": "Ricevuta di Conferma Prenotazione {JOB} — Camel Global", "rc_h2": "Ricevuta di Conferma Prenotazione", "rc_booking_label": "Prenotazione {JOB}", "rc_hi": "Salve {NAME},", "rc_p1": "In allegato trovi la ricevuta di conferma della tua prenotazione. La tua prenotazione con <strong>{CO}</strong> è confermata.", "rc_attached_note": "La tua ricevuta è allegata in formato PDF. Puoi scaricarla in qualsiasi momento anche dalla pagina della tua prenotazione su", "rc_bring_title": "Cosa portare al momento del ritiro dell'auto:", "rc_li_licence": "<strong>Patente di guida</strong> — è richiesta una patente EU completa in alfabeto romano per tutti i conducenti. Se la tua patente non soddisfa questo requisito, porta un permesso di guida internazionale insieme all'originale.", "rc_li_passport": "<strong>Passaporto o documento d'identità nazionale</strong> — valido per ogni conducente indicato in questa prenotazione.", "rc_li_photocopy": "<strong>Fotocopie consigliate</strong> — porta una fotocopia della patente di guida e del passaporto per tutti i conducenti. Tutti i documenti devono essere originali — le copie digitali non sono accettate.", "rc_li_card": "<strong>Carta di credito obbligatoria</strong> — {DEP} È accettata solo la carta di credito; le carte di debito non possono essere utilizzate per il blocco del deposito.", "pn_notice_title": "Avviso di Pagamento sulla Piattaforma", "pn_notice_body": "Questa email e il PDF allegato confermano il pagamento ricevuto da NTUK Ltd (che opera come Camel Global) in qualità di intermediario marketplace. Non costituiscono una fattura VAT per i servizi di noleggio auto. Il servizio di noleggio auto è fornito direttamente da <strong>{CO}</strong>. Per richiedere una fattura VAT, ti invitiamo a contattare direttamente {CO}.", "sig_regards": "Cordiali saluti,", "sig_team": "Il team di Camel Global"},
  pt: {"lbl_booking_ref": "Referência da reserva", "lbl_car_hire_partner": "Parceiro de aluguer de viatura", "lbl_company": "Parceiro de aluguer de viatura", "lbl_customer": "Cliente", "lbl_pickup_time": "Hora de recolha", "lbl_pickup_address": "Morada de recolha", "lbl_dropoff_address": "Morada de entrega", "lbl_car_hire": "Aluguer de viatura", "lbl_fuel_deposit": "Depósito de combustível", "lbl_total_paid": "Total pago", "cc_subject": "Reserva confirmada {JOB} — pagamento recebido", "cc_heading": "Reserva Confirmada ✅", "cc_hi": "Olá {NAME},", "cc_p1": "O seu pagamento foi recebido e a sua reserva está confirmada com <strong>{CO}</strong>.", "cc_summary": "Resumo da Reserva", "cc_fuel_note": "O depósito de combustível será reembolsado no final do seu aluguer com base no combustível utilizado.", "cc_receipt_note": "O recibo de confirmação da sua reserva será enviado em breve num email separado.", "cc_cta": "Ver Reserva", "cc_fallback_name": "Cliente", "pn_subject": "Nova reserva confirmada {JOB}", "pn_heading": "Nova Reserva Confirmada", "pn_hi": "Olá {NAME},", "pn_p1": "Um cliente efetuou o pagamento e confirmou a reserva {JOB}. Por favor, prepare-se para a recolha.", "pn_details": "Detalhes da Reserva", "pn_cta": "Ver Reserva", "rc_subject": "Recibo de Confirmação de Reserva {JOB} — Camel Global", "rc_h2": "Recibo de Confirmação de Reserva", "rc_booking_label": "Reserva {JOB}", "rc_hi": "Olá {NAME},", "rc_p1": "Encontra em anexo o recibo de confirmação da sua reserva. A sua reserva com <strong>{CO}</strong> está confirmada.", "rc_attached_note": "O seu recibo está anexado em formato PDF. Pode também transferi-lo a qualquer momento a partir da sua página de reserva em", "rc_bring_title": "O que trazer ao levantar a sua viatura:", "rc_li_licence": "<strong>Carta de condução</strong> — é obrigatória uma carta de condução EU completa em alfabeto romano para todos os condutores. Se a sua carta não cumprir este requisito, traga também uma licença internacional de condução juntamente com o documento original.", "rc_li_passport": "<strong>Passaporte ou cartão de cidadão</strong> — válido para todos os condutores incluídos nesta reserva.", "rc_li_photocopy": "<strong>Fotocópias recomendadas</strong> — traga uma fotocópia da carta de condução e do passaporte de todos os condutores. Todos os documentos têm de ser originais — cópias digitais não são aceites.", "rc_li_card": "<strong>Cartão de crédito obrigatório</strong> — {DEP} Apenas cartão de crédito; cartões de débito não podem ser utilizados para bloqueio de depósito.", "pn_notice_title": "Aviso de Pagamento na Plataforma", "pn_notice_body": "Este email e o PDF em anexo confirmam o pagamento recebido pela NTUK Ltd (a operar como Camel Global) na qualidade de intermediário de marketplace. Não constituem uma fatura com VAT pelos serviços de aluguer de viatura. O serviço de aluguer de viatura é prestado diretamente pela <strong>{CO}</strong>. Caso necessite de uma fatura com VAT, solicite-a diretamente à {CO}.", "sig_regards": "Com os melhores cumprimentos,", "sig_team": "A equipa Camel Global"},
  de: {"lbl_booking_ref": "Buchungsreferenz", "lbl_car_hire_partner": "Mietwagenpartner", "lbl_company": "Mietwagenpartner", "lbl_customer": "Kunde", "lbl_pickup_time": "Abholzeit", "lbl_pickup_address": "Abholadresse", "lbl_dropoff_address": "Rückgabeadresse", "lbl_car_hire": "Mietwagengebühr", "lbl_fuel_deposit": "Kraftstoffkaution", "lbl_total_paid": "Gesamtbetrag bezahlt", "cc_subject": "Buchung bestätigt {JOB} — Zahlung eingegangen", "cc_heading": "Buchung bestätigt ✅", "cc_hi": "Hallo {NAME},", "cc_p1": "Ihre Zahlung ist eingegangen und Ihre Buchung bei <strong>{CO}</strong> ist bestätigt.", "cc_summary": "Buchungsübersicht", "cc_fuel_note": "Die Kraftstoffkaution wird am Ende Ihrer Mietzeit entsprechend dem Kraftstoffverbrauch zurückerstattet.", "cc_receipt_note": "Ihre Buchungsbestätigung erhalten Sie in Kürze in einer separaten E-Mail.", "cc_cta": "Buchung ansehen", "cc_fallback_name": "dort", "pn_subject": "Neue Buchung bestätigt {JOB}", "pn_heading": "Neue Buchung bestätigt", "pn_hi": "Hallo {NAME},", "pn_p1": "Ein Kunde hat Buchung {JOB} bezahlt und bestätigt. Bitte bereiten Sie die Abholung vor.", "pn_details": "Buchungsdetails", "pn_cta": "Buchung ansehen", "rc_subject": "Buchungsbestätigung {JOB} — Camel Global", "rc_h2": "Buchungsbestätigung", "rc_booking_label": "Buchung {JOB}", "rc_hi": "Hallo {NAME},", "rc_p1": "Anbei finden Sie Ihre Buchungsbestätigung. Ihre Buchung bei <strong>{CO}</strong> ist bestätigt.", "rc_attached_note": "Ihre Bestätigung ist als PDF beigefügt. Sie können diese auch jederzeit über Ihre Buchungsseite herunterladen unter", "rc_bring_title": "Was Sie bei der Fahrzeugabholung mitbringen müssen:", "rc_li_licence": "<strong>Führerschein</strong> — ein vollständiger EU-Führerschein in lateinischer Schrift ist für alle Fahrer erforderlich. Sollte Ihr Führerschein diese Anforderung nicht erfüllen, bringen Sie bitte zusätzlich einen internationalen Führerschein im Original mit.", "rc_li_passport": "<strong>Reisepass oder Personalausweis</strong> — gültig für jeden Fahrer, der in dieser Buchung eingetragen ist.", "rc_li_photocopy": "<strong>Kopien empfohlen</strong> — bringen Sie eine Fotokopie Ihres Führerscheins und Reisepasses für alle Fahrer mit. Alle Dokumente müssen im Original vorliegen — digitale Kopien werden nicht akzeptiert.", "rc_li_card": "<strong>Kreditkarte erforderlich</strong> — {DEP} Nur Kreditkarte; Debitkarten können nicht für die Kautionsblockierung verwendet werden.", "pn_notice_title": "Hinweis zur Plattformzahlung", "pn_notice_body": "Diese E-Mail und das beigefügte PDF bestätigen den Zahlungseingang bei NTUK Ltd (handelnd als Camel Global) als Marktplatzvermittler. Sie stellen keine VAT-Rechnung für Mietwagendienstleistungen dar. Die Mietwagendienstleistung wird direkt von <strong>{CO}</strong> erbracht. Sollten Sie eine VAT-Rechnung benötigen, wenden Sie sich bitte direkt an {CO}.", "sig_regards": "Mit freundlichen Grüßen,", "sig_team": "Das Camel Global Team"}
};
  const RC_PREF: Record<RcptLocale, Record<string, string>> = {
    en: { lbl_transmission: "Transmission", lbl_child_seats: "Child seats", val_automatic: "Automatic", val_manual: "Manual", w_infant: "infant", w_toddler: "toddler", w_booster: "booster" },
    es: { lbl_transmission: "Transmisión", lbl_child_seats: "Sillas infantiles", val_automatic: "Automático", val_manual: "Manual", w_infant: "bebé", w_toddler: "niño", w_booster: "elevador" },
    fr: { lbl_transmission: "Boîte de vitesses", lbl_child_seats: "Sièges enfant", val_automatic: "Automatique", val_manual: "Manuelle", w_infant: "bébé", w_toddler: "enfant", w_booster: "rehausseur" },
    it: { lbl_transmission: "Cambio", lbl_child_seats: "Seggiolini per bambini", val_automatic: "Automatico", val_manual: "Manuale", w_infant: "neonato", w_toddler: "bimbo", w_booster: "rialzo" },
    pt: { lbl_transmission: "Transmissão", lbl_child_seats: "Cadeiras de criança", val_automatic: "Automático", val_manual: "Manual", w_infant: "bebé", w_toddler: "criança", w_booster: "elevador" },
    de: { lbl_transmission: "Getriebe", lbl_child_seats: "Kindersitze", val_automatic: "Automatik", val_manual: "Schaltgetriebe", w_infant: "Babyschale", w_toddler: "Kleinkind", w_booster: "Sitzerhöhung" },
  };
  const rL: RcptLocale = (["en","es","fr","it","pt","de"] as string[]).includes(locale) ? (locale as RcptLocale) : "en";
  const r = RC[rL];
  const co = String(companyName);
  const custNm = params.customerName || (rL === "en" ? "there" : "");

  const subject = r["rc_subject"].replace("{JOB}", jobNo);

  const rp = RC_PREF[rL];
  const transVal = params.prefTransmission === "automatic" ? rp["val_automatic"]
                 : params.prefTransmission === "manual" ? rp["val_manual"] : "";
  const csObj: any = params.prefChildSeats;
  const csParts: string[] = [];
  if (csObj && typeof csObj === "object") {
    if (Number(csObj.infant)  > 0) csParts.push(`${Number(csObj.infant)} ${rp["w_infant"]}`);
    if (Number(csObj.toddler) > 0) csParts.push(`${Number(csObj.toddler)} ${rp["w_toddler"]}`);
    if (Number(csObj.booster) > 0) csParts.push(`${Number(csObj.booster)} ${rp["w_booster"]}`);
  }
  const csVal = csParts.join(", ");
  const prefsRows = [
    transVal ? `<tr><td style="padding:4px 0;color:#666;">${rp["lbl_transmission"]}</td><td style="text-align:right;">${transVal}</td></tr>` : "",
    csVal ? `<tr><td style="padding:4px 0;color:#666;">${rp["lbl_child_seats"]}</td><td style="text-align:right;">${csVal}</td></tr>` : "",
  ].join("");
  const prefsBlock = prefsRows
    ? `<div style="background:#f8f8f8;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;"><table style="width:100%;font-size:14px;border-collapse:collapse;">${prefsRows}</table></div>`
    : "";

  const platformNotice = `
    <div style="background:#f5f5f5;border-left:3px solid #999;padding:10px 14px;margin:16px 0;font-size:12px;color:#555;line-height:1.5;">
      <strong style="display:block;margin-bottom:4px;color:#333;">${r["pn_notice_title"]}</strong>
      ${r["pn_notice_body"].replace(/\{CO\}/g, co)}
    </div>`;

  const cardLi = params.securityDepositNotes
    ? `<li>${r["rc_li_card"].replace("{DEP}", String(params.securityDepositNotes))}</li>`
    : "";

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
      <div style="background:#000;padding:20px 28px;">
        <h2 style="color:#fff;margin:0;">${r["rc_h2"]}</h2>
        <p style="color:#999;margin:4px 0 0;font-size:13px;">${r["rc_booking_label"].replace("{JOB}", jobNo)}</p>
      </div>
      <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
        <p>${r["rc_hi"].replace("{NAME}", custNm)}</p>
        <p>${r["rc_p1"].replace(/\{CO\}/g, co)}</p>
        <div style="background:#f8f8f8;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:#666;">${r["lbl_booking_ref"]}</td><td style="text-align:right;font-weight:700;">${jobNo}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">${r["lbl_car_hire"]}</td><td style="text-align:right;">${fmtCharge(params.chargeCarHire)}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">${r["lbl_fuel_deposit"]}</td><td style="text-align:right;">${fmtCharge(params.chargeFuel)}</td></tr>
            <tr style="border-top:1px solid #ddd;">
              <td style="padding:8px 0 4px;font-weight:700;">${r["lbl_total_paid"]}</td>
              <td style="text-align:right;font-weight:700;">${fmtCharge(params.chargeTotal)}</td>
            </tr>
          </table>
        </div>
        ${prefsBlock}
        ${platformNotice}
        <p style="font-size:13px;color:#666;">${r["rc_attached_note"]} <a href="https://camel-global.com/bookings/${params.requestId}" style="color:#ff7a00;">camel-global.com</a>.</p>
        <p style="font-size:13px;color:#333;font-weight:700;border-left:4px solid #ff7a00;padding-left:12px;margin:16px 0;">${r["rc_bring_title"]}</p>
        <ul style="font-size:13px;color:#333;margin:0 0 16px;padding-left:20px;line-height:1.8;">
          <li>${r["rc_li_licence"]}</li>
          <li>${r["rc_li_passport"]}</li>
          <li>${r["rc_li_photocopy"]}</li>
          ${cardLi}
        </ul>
        <p style="margin-top:24px;color:#999;font-size:13px;">${r["sig_regards"]}<br/><strong style="color:#222;">${r["sig_team"]}</strong></p>
      </div>
    </div>`;

  await sendEmail({
    to: params.customerEmail,
    subject: subject,
    html: html,
    attachments: [
      {
        filename: `Camel-Receipt-${params.jobNumber ?? params.bookingId.slice(0, 8)}.pdf`,
        content: base64,
        encoding: "base64",
      },
    ],
  });
}
