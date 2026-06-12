/**
 * Booking Confirmation Receipt PDF generator — camel-customer
 * Generated server-side after payment succeeds.
 * Stored in Supabase Storage + emailed to customer as attachment.
 *
 * Uses charge_currency (what customer actually paid) throughout.
 * Email body/subject is locale-aware (EN/ES). PDF stays English — NTUK legal document.
 */

import React from "react";
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
  const locale = currency === "GBP" ? "en-GB" : currency === "USD" ? "en-US" : "es-ES";
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
  locale?:                "en" | "es";
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
    new Intl.NumberFormat(cur === "GBP" ? "en-GB" : cur === "USD" ? "en-US" : "es-ES", {
      style: "currency", currency: cur,
    }).format(n);

  const companyName = params.companyName || (locale === "es" ? "tu empresa de alquiler" : "your car hire partner");

  const subjectEN = `Booking Confirmation Receipt ${jobNo} — Camel Global`;
  const subjectES = `Recibo de confirmación de reserva ${jobNo} — Camel Global`;

  // Platform notice shown in email body
  const platformNoticeEN = `
    <div style="background:#f5f5f5;border-left:3px solid #999;padding:10px 14px;margin:16px 0;font-size:12px;color:#555;line-height:1.5;">
      <strong style="display:block;margin-bottom:4px;color:#333;">Platform Payment Notice</strong>
      This email and the attached PDF confirm payment received by NTUK Ltd (trading as Camel Global) as a marketplace intermediary. They are not a VAT invoice for car hire services. The car hire service is provided directly by <strong>${companyName}</strong>. If you require a VAT invoice, please request one directly from ${companyName}.
    </div>`;

  const platformNoticeES = `
    <div style="background:#f5f5f5;border-left:3px solid #999;padding:10px 14px;margin:16px 0;font-size:12px;color:#555;line-height:1.5;">
      <strong style="display:block;margin-bottom:4px;color:#333;">Aviso de pago de plataforma</strong>
      Este correo y el PDF adjunto confirman el pago recibido por NTUK Ltd (que opera como Camel Global) como intermediario de la plataforma. No constituyen una factura de IVA por servicios de alquiler de vehículos. El servicio de alquiler es prestado directamente por <strong>${companyName}</strong>. Si necesitas una factura de IVA, solicítala directamente a ${companyName}.
    </div>`;

  const htmlEN = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
      <div style="background:#000;padding:20px 28px;">
        <h2 style="color:#fff;margin:0;">Booking Confirmation Receipt</h2>
        <p style="color:#999;margin:4px 0 0;font-size:13px;">Booking ${jobNo}</p>
      </div>
      <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
        <p>Hi ${params.customerName || "there"},</p>
        <p>Please find your booking confirmation receipt attached. Your booking with <strong>${companyName}</strong> is confirmed.</p>
        <div style="background:#f8f8f8;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:#666;">Booking reference</td><td style="text-align:right;font-weight:700;">${jobNo}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Car hire</td><td style="text-align:right;">${fmtCharge(params.chargeCarHire)}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Fuel deposit</td><td style="text-align:right;">${fmtCharge(params.chargeFuel)}</td></tr>
            <tr style="border-top:1px solid #ddd;">
              <td style="padding:8px 0 4px;font-weight:700;">Total paid</td>
              <td style="text-align:right;font-weight:700;">${fmtCharge(params.chargeTotal)}</td>
            </tr>
          </table>
        </div>
        ${platformNoticeEN}
        <p style="font-size:13px;color:#666;">Your receipt is attached as a PDF. You can also download it any time from your booking page at <a href="https://camel-global.com/bookings/${params.requestId}" style="color:#ff7a00;">camel-global.com</a>.</p>
        <p style="font-size:13px;color:#333;font-weight:700;border-left:4px solid #ff7a00;padding-left:12px;margin:16px 0;">What to bring when collecting your car:</p>
        <ul style="font-size:13px;color:#333;margin:0 0 16px;padding-left:20px;line-height:1.8;">
          <li><strong>Driving licence</strong> — full EU licence in Roman alphabet required for all drivers. If your licence does not meet this, bring an international driving permit alongside your original.</li>
          <li><strong>Passport or national ID</strong> — valid for every driver on this booking.</li>
          <li><strong>Photocopies recommended</strong> — bring a photocopy of your driving licence and passport for all drivers. All documents must be originals — digital copies are not accepted.</li>
          ${params.securityDepositNotes ? `<li><strong>Credit card required</strong> — ${params.securityDepositNotes} Credit card only, debit cards cannot be used for deposit blocking.</li>` : ""}
        </ul>
        <p style="margin-top:24px;color:#999;font-size:13px;">Best regards,<br/><strong style="color:#222;">The Camel Global Team</strong></p>
      </div>
    </div>`;

  const htmlES = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
      <div style="background:#000;padding:20px 28px;">
        <h2 style="color:#fff;margin:0;">Recibo de confirmación de reserva</h2>
        <p style="color:#999;margin:4px 0 0;font-size:13px;">Reserva ${jobNo}</p>
      </div>
      <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
        <p>Hola ${params.customerName || ""},</p>
        <p>Adjunto encontrarás tu recibo de confirmación de reserva. Tu reserva con <strong>${companyName}</strong> está confirmada.</p>
        <div style="background:#f8f8f8;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:#666;">Referencia de reserva</td><td style="text-align:right;font-weight:700;">${jobNo}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Alquiler</td><td style="text-align:right;">${fmtCharge(params.chargeCarHire)}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Depósito de combustible</td><td style="text-align:right;">${fmtCharge(params.chargeFuel)}</td></tr>
            <tr style="border-top:1px solid #ddd;">
              <td style="padding:8px 0 4px;font-weight:700;">Total pagado</td>
              <td style="text-align:right;font-weight:700;">${fmtCharge(params.chargeTotal)}</td>
            </tr>
          </table>
        </div>
        ${platformNoticeES}
        <p style="font-size:13px;color:#666;">Tu recibo está adjunto en PDF. También puedes descargarlo en cualquier momento desde tu página de reserva en <a href="https://camel-global.com/bookings/${params.requestId}" style="color:#ff7a00;">camel-global.com</a>.</p>
        <p style="font-size:13px;color:#333;font-weight:700;border-left:4px solid #ff7a00;padding-left:12px;margin:16px 0;">Qué traer al recoger tu coche:</p>
        <ul style="font-size:13px;color:#333;margin:0 0 16px;padding-left:20px;line-height:1.8;">
          <li><strong>Permiso de conducir</strong> — permiso completo de la UE en alfabeto latino para todos los conductores. Si no cumple este requisito, trae también un permiso de conducir internacional.</li>
          <li><strong>Pasaporte o DNI</strong> — válido para todos los conductores de esta reserva.</li>
          <li><strong>Fotocopias recomendadas</strong> — trae una fotocopia del permiso de conducir y pasaporte para todos los conductores. Los documentos deben ser originales — no se aceptan copias digitales.</li>
          ${params.securityDepositNotes ? `<li><strong>Tarjeta de crédito obligatoria</strong> — ${params.securityDepositNotes} Solo tarjeta de crédito, las tarjetas de débito no se aceptan para el bloqueo del depósito.</li>` : ""}
        </ul>
        <p style="margin-top:24px;color:#999;font-size:13px;">Saludos,<br/><strong style="color:#222;">El equipo de Camel Global</strong></p>
      </div>
    </div>`;

  await sendEmail({
    to: params.customerEmail,
    subject: locale === "es" ? subjectES : subjectEN,
    html: locale === "es" ? htmlES : htmlEN,
    attachments: [
      {
        filename: `Camel-Receipt-${params.jobNumber ?? params.bookingId.slice(0, 8)}.pdf`,
        content: base64,
        encoding: "base64",
      },
    ],
  });
}
