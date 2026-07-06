/**
 * Booking Completion Statement PDF generator — camel-customer
 * Server-side only. Uses @react-pdf/renderer.
 * Supports post-completion refunds — shows amended statement when refunds exist.
 */

import React from "react";
import { currencyLocale } from "@/lib/currency";
import {
  Document, Page, Text, View, Image,
  StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";

const QUARTER_LABELS: Record<number, string> = {
  0: "Empty", 1: "¼ Tank", 2: "½ Tank", 3: "¾ Tank", 4: "Full Tank",
};

function fuelLabel(v: string | null | undefined): string {
  switch (String(v || "").toLowerCase()) {
    case "empty":   return "Empty";
    case "quarter": return "¼ Tank";
    case "half":    return "½ Tank";
    case "3/4":     return "¾ Tank";
    case "full":    return "Full Tank";
    default:        return v || "—";
  }
}

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

const s = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 9, color: "#222", backgroundColor: "#fff", paddingBottom: 40 },
  topBar:      { backgroundColor: "#ff7a00", height: 8 },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: "16 24 12 24", borderBottom: "1 solid #e5e5e5" },
  logo:        { width: 90, height: 28, objectFit: "contain" },
  headerRight: { alignItems: "flex-end" },
  headerSub:   { fontSize: 7, color: "#888", marginBottom: 2 },
  headerDate:  { fontSize: 8, color: "#555" },
  headerAmend: { fontSize: 7, color: "#cc5500", marginTop: 2 },
  body:        { padding: "20 24" },
  title:       { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#111", marginBottom: 4 },
  subtitle:    { fontSize: 9, color: "#888", marginBottom: 16 },
  section:     { marginBottom: 14 },
  sectionHead: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#ff7a00", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, borderBottom: "1 solid #f0f0f0", paddingBottom: 3 },
  sectionHeadAmend: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#cc5500", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, borderBottom: "1 solid #ffe0cc", paddingBottom: 3 },
  row:         { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottom: "1 solid #f5f5f5" },
  rowLabel:    { color: "#555", flex: 1 },
  rowValue:    { fontFamily: "Helvetica-Bold", color: "#111", textAlign: "right", flex: 1 },
  rowAmendLabel: { color: "#cc5500", flex: 1 },
  rowAmendValue: { fontFamily: "Helvetica-Bold", color: "#cc5500", textAlign: "right", flex: 1 },
  totalRow:    { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#111", padding: "8 10", marginTop: 6 },
  totalLabel:  { fontFamily: "Helvetica-Bold", color: "#fff", fontSize: 10 },
  totalValue:  { fontFamily: "Helvetica-Bold", color: "#ff7a00", fontSize: 10 },
  amendRow:    { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#fff3e0", padding: "8 10", marginTop: 6, borderLeft: "3 solid #ff7a00" },
  amendLabel:  { fontFamily: "Helvetica-Bold", color: "#cc5500", fontSize: 10 },
  amendValue:  { fontFamily: "Helvetica-Bold", color: "#cc5500", fontSize: 10 },
  note:        { fontSize: 7.5, color: "#888", marginTop: 10, lineHeight: 1.5 },
  amendNote:   { fontSize: 7.5, color: "#cc5500", marginTop: 8, lineHeight: 1.5, backgroundColor: "#fff3e0", padding: "4 6" },
  footer:      { position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1 solid #e5e5e5", padding: "6 24", flexDirection: "row", justifyContent: "space-between" },
  footerText:  { fontSize: 7, color: "#aaa" },
});

export type PostCompletionRefund = {
  id: string;
  amount: number;
  reason: string | null;
  stripe_refund_id: string | null;
  created_at: string;
};

export interface CompletionStatementParams {
  jobNumber:              number | null;
  bookingId:              string;
  customerName:           string | null;
  pickupAddress:          string | null;
  dropoffAddress:         string | null;
  pickupAt:               string | null;
  dropoffAt?:             string | null;
  durationMinutes?:       number | null;
  vehicleCategory:        string | null;
  companyName:            string | null;
  currency:               string;
  carHire:                number;
  fuelDeposit:            number;
  totalPaid:              number;
  collectionFuel:         string | null;
  returnFuel:             string | null;
  usedQuarters:           number;
  fuelCharge:             number;
  fuelRefund:             number;
  prefTransmission?:      string | null;
  prefChildSeats?:        any | null;
  issuedAt:               string;
  postCompletionRefunds?: PostCompletionRefund[];
}

function StatementDocument({ p, logoBase64 }: { p: CompletionStatementParams; logoBase64: string | null }) {
  const cur           = p.currency;
  const fmt           = (n: number) => fmtMoney(n, cur);
  const ref           = p.jobNumber ? `#${p.jobNumber}` : p.bookingId.slice(0, 8).toUpperCase();
  const finalAmount   = p.carHire + p.fuelCharge;
  const refunds       = p.postCompletionRefunds ?? [];
  const totalRefunded = refunds.reduce((s, r) => s + r.amount, 0);
  const netFinal      = finalAmount - totalRefunded;
  const isAmended     = refunds.length > 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.topBar} />

        <View style={s.header}>
          {logoBase64
            ? <Image src={`data:image/png;base64,${logoBase64}`} style={s.logo} />
            : <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#ff7a00" }}>CAMEL GLOBAL</Text>
          }
          <View style={s.headerRight}>
            <Text style={s.headerSub}>
              {isAmended ? "AMENDED BOOKING COMPLETION STATEMENT" : "BOOKING COMPLETION STATEMENT"}
            </Text>
            <Text style={s.headerDate}>Issued: {fmtDateShort(p.issuedAt)}</Text>
            <Text style={s.headerDate}>Ref: {ref}</Text>
            {isAmended && (
              <Text style={s.headerAmend}>AMENDED — supersedes previous statement</Text>
            )}
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.title}>
            {isAmended ? "Amended Booking Completion Statement" : "Booking Completion Statement"}
          </Text>
          <Text style={s.subtitle}>
            {ref}{p.pickupAddress ? ` · ${p.pickupAddress}` : ""} · Settled in {cur}
          </Text>

          <View style={s.section}>
            <Text style={s.sectionHead}>Booking Details</Text>
            <View style={s.row}><Text style={s.rowLabel}>Booking reference</Text><Text style={s.rowValue}>{ref}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Status</Text><Text style={s.rowValue}>Completed</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Car hire company</Text><Text style={s.rowValue}>{p.companyName || "—"}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Pickup address</Text><Text style={s.rowValue}>{p.pickupAddress || "—"}</Text></View>
            {p.dropoffAddress ? (
              <View style={s.row}><Text style={s.rowLabel}>Drop-off address</Text><Text style={s.rowValue}>{p.dropoffAddress}</Text></View>
            ) : null}
            <View style={s.row}><Text style={s.rowLabel}>Pickup time</Text><Text style={s.rowValue}>{fmtDate(p.pickupAt)}</Text></View>
            {p.dropoffAt ? (
              <View style={s.row}><Text style={s.rowLabel}>Drop-off time</Text><Text style={s.rowValue}>{fmtDate(p.dropoffAt)}</Text></View>
            ) : null}
            {p.durationMinutes ? (
              <View style={s.row}><Text style={s.rowLabel}>Duration</Text><Text style={s.rowValue}>{fmtDuration(p.durationMinutes)}</Text></View>
            ) : null}
            {p.vehicleCategory ? (
              <View style={s.row}><Text style={s.rowLabel}>Vehicle</Text><Text style={s.rowValue}>{p.vehicleCategory}</Text></View>
            ) : null}
            <View style={s.row}><Text style={s.rowLabel}>Transmission</Text><Text style={s.rowValue}>{transmissionLabel(p.prefTransmission)}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Child seats</Text><Text style={s.rowValue}>{childSeatsLabel(p.prefChildSeats)}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Settlement currency</Text><Text style={s.rowValue}>{cur}</Text></View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionHead}>Payment Breakdown</Text>
            <View style={s.row}><Text style={s.rowLabel}>Car hire</Text><Text style={s.rowValue}>{fmt(p.carHire)}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Full tank deposit paid</Text><Text style={s.rowValue}>{fmt(p.fuelDeposit)}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Total paid</Text><Text style={s.rowValue}>{fmt(p.totalPaid)}</Text></View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionHead}>Fuel Settlement</Text>
            <View style={s.row}><Text style={s.rowLabel}>Delivery fuel level</Text><Text style={s.rowValue}>{fuelLabel(p.collectionFuel)}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Collection fuel level</Text><Text style={s.rowValue}>{fuelLabel(p.returnFuel)}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Fuel used</Text><Text style={s.rowValue}>{QUARTER_LABELS[p.usedQuarters] ?? `${p.usedQuarters}/4 tank`}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Fuel charge to you</Text><Text style={s.rowValue}>{fmt(p.fuelCharge)}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Fuel refund to you</Text><Text style={s.rowValue}>{p.fuelRefund > 0 ? fmt(p.fuelRefund) : "None"}</Text></View>
          </View>

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Final amount (car hire + fuel charge)</Text>
            <Text style={s.totalValue}>{fmt(finalAmount)}</Text>
          </View>

          {isAmended && (
            <View style={s.section}>
              <Text style={[s.sectionHeadAmend, { marginTop: 12 }]}>Post-Completion Adjustments</Text>
              {refunds.map((r, i) => (
                <View key={r.id} style={s.row}>
                  <Text style={s.rowAmendLabel}>
                    Refund {i + 1}{r.reason ? ` — ${r.reason}` : ""}
                    {r.created_at ? ` (${new Date(r.created_at).toLocaleDateString("en-GB")})` : ""}
                  </Text>
                  <Text style={s.rowAmendValue}>− {fmt(r.amount)}</Text>
                </View>
              ))}
              <View style={s.amendRow}>
                <Text style={s.amendLabel}>Net amount after adjustments</Text>
                <Text style={s.amendValue}>{fmt(netFinal)}</Text>
              </View>
              <Text style={s.amendNote}>
                This is an amended statement. Post-completion refunds totalling {fmt(totalRefunded)} have been issued to your original payment method.
                Please allow 5–10 business days for refunds to appear. This statement supersedes any previously issued statement for this booking.
              </Text>
            </View>
          )}

          {p.fuelRefund > 0 && (
            <Text style={s.note}>
              A fuel deposit refund of {fmt(p.fuelRefund)} has been issued to your original payment method.
              Please allow 5–10 business days for it to appear.
            </Text>
          )}
          <Text style={[s.note, { marginTop: 8 }]}>
            To view your booking, visit camel-global.com/bookings/{p.bookingId}
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

export async function generateCompletionStatementPDF(params: CompletionStatementParams): Promise<Buffer> {
  const LOGO_URL = "https://portal.camel-global.com/camel-invoice-logo.png";
  let logoBase64: string | null = null;
  try {
    const logoRes = await fetch(LOGO_URL);
    if (logoRes.ok) {
      const buf = await logoRes.arrayBuffer();
      logoBase64 = Buffer.from(buf).toString("base64");
    }
  } catch (e) {
    console.warn("generateCompletionStatementPDF: logo fetch failed", e);
  }
  return renderToBuffer(<StatementDocument p={params} logoBase64={logoBase64} />);
}
