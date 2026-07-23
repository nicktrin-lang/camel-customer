import { NextResponse } from "next/server";
import { verifyHCaptcha } from "@/lib/hcaptcha";
import { rateLimit, getIp } from "@/lib/rateLimit";
import { coerceLocale, Locale } from "@/lib/email";

const FROM_EMAIL = "Camel Global <noreply@camel-global.com>";

// Route each subject to the right inbox with a clean email subject prefix
const SUBJECT_ROUTING: Record<string, { to: string; prefix: string }> = {
  "General enquiry":               { to: "contact@camel-global.com",     prefix: "General Enquiry" },
  "Booking question":              { to: "contact@camel-global.com",     prefix: "Booking Question" },
  "Partnership / become a partner":{ to: "partners@camel-global.com",    prefix: "Partnership Enquiry" },
  "Press or media":                { to: "press@camel-global.com",       prefix: "Press & Media" },
  "Technical issue":               { to: "contact@camel-global.com",     prefix: "Technical Issue" },
  "Other":                         { to: "contact@camel-global.com",     prefix: "General Enquiry" },
};

const FALLBACK_TO = "contact@camel-global.com";

async function sendContactEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function POST(req: Request) {
  const ip = getIp(req);
  const { allowed } = rateLimit(ip, "contact-form");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait 15 minutes before trying again." },
      { status: 429 }
    );
  }

  let body: {
    name?: string; company?: string; email?: string;
    subject?: string; message?: string; captchaToken?: string; source?: string;
    locale?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { name, email, subject, message, captchaToken, source, company } = body;
  // Auto-reply language = the language the sender was using on the site (they
  // may have no account, so no communication_locale). Routed-inbox email stays English.
  const replyLocale = coerceLocale(body.locale);
  const safeCompany = company ? company.trim().slice(0, 100) : null;

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!captchaToken) {
    return NextResponse.json({ error: "CAPTCHA token is required." }, { status: 400 });
  }

  const captchaOk = await verifyHCaptcha(captchaToken);
  if (!captchaOk) {
    return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const safeName    = name.trim().slice(0, 100);
  const safeEmail   = email.trim().toLowerCase().slice(0, 200);
  const safeSubject = subject.trim().slice(0, 200);
  const safeMessage = message.trim().slice(0, 5000);

  // Determine routing
  const routing = SUBJECT_ROUTING[safeSubject] ?? { to: FALLBACK_TO, prefix: "Contact Form" };
  const inboxTo  = routing.to;
  const emailSubjectLine = source === "partner-portal"
    ? `[Partner] ${routing.prefix}: ${safeName}`
    : `${routing.prefix}: ${safeName}`;

  try {
    // Email to routed inbox
    await sendContactEmail({
      to: inboxTo,
      subject: emailSubjectLine,
      html: `
        <div style="font-family:system-ui,-apple-system,Arial;color:#222;line-height:1.6;max-width:600px;">
          <div style="background:#000;padding:20px 28px;">
            <h2 style="color:#fff;margin:0;font-size:18px;">${routing.prefix}</h2>
            <p style="color:#ff7a00;margin:4px 0 0;font-size:13px;">Routed to: ${inboxTo}</p>
          </div>
          <div style="background:#f8fafc;padding:24px 28px;border:1px solid #e2e8f0;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:6px 0;color:#64748b;width:100px;">Name</td><td style="padding:6px 0;font-weight:600;">${safeName}</td></tr>
              ${safeCompany ? `<tr><td style="padding:6px 0;color:#64748b;">Company</td><td style="padding:6px 0;font-weight:600;">${safeCompany}</td></tr>` : ""}
              <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;font-weight:600;"><a href="mailto:${safeEmail}" style="color:#ff7a00;">${safeEmail}</a></td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Subject</td><td style="padding:6px 0;font-weight:600;">${safeSubject}</td></tr>
            </table>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />
            <p style="color:#64748b;font-size:13px;margin:0 0 8px;">Message:</p>
            <p style="background:#fff;border:1px solid #e2e8f0;padding:14px;font-size:14px;white-space:pre-wrap;">${safeMessage}</p>
            <p style="margin-top:20px;font-size:12px;color:#94a3b8;">
              Sent from Camel Global contact form · IP: ${ip ?? "unknown"}
            </p>
          </div>
        </div>
      `,
    });

    // Auto-reply to sender (localized to the sender's site language)
    const tL = <T,>(m: Record<Locale, T>) => m[replyLocale] ?? m.en;
    const arSubject: Record<Locale, string> = {
      en: "We've received your message — Camel Global", es: "Hemos recibido tu mensaje — Camel Global", fr: "Nous avons bien reçu votre message — Camel Global",
      it: "Abbiamo ricevuto il tuo messaggio — Camel Global", pt: "Recebemos a sua mensagem — Camel Global", de: "Wir haben Ihre Nachricht erhalten — Camel Global",
    };
    const arHead: Record<Locale, string> = { en: "Thanks for getting in touch", es: "Gracias por ponerte en contacto", fr: "Merci de nous avoir contactés", it: "Grazie per averci contattato", pt: "Obrigado pelo seu contacto", de: "Danke für Ihre Nachricht" };
    const arHi: Record<Locale, string> = { en: `Hi ${safeName},`, es: `Hola ${safeName},`, fr: `Bonjour ${safeName},`, it: `Ciao ${safeName},`, pt: `Olá ${safeName},`, de: `Hallo ${safeName},` };
    const arGot: Record<Locale, string> = {
      en: "We've received your message and will get back to you as soon as we can.",
      es: "Hemos recibido tu mensaje y te responderemos lo antes posible.",
      fr: "Nous avons bien reçu votre message et vous répondrons dès que possible.",
      it: "Abbiamo ricevuto il tuo messaggio e ti risponderemo il prima possibile.",
      pt: "Recebemos a sua mensagem e responderemos assim que possível.",
      de: "Wir haben Ihre Nachricht erhalten und melden uns so bald wie möglich.",
    };
    const arYourMsg: Record<Locale, string> = { en: "Your message:", es: "Tu mensaje:", fr: "Votre message :", it: "Il tuo messaggio:", pt: "A sua mensagem:", de: "Ihre Nachricht:" };
    const arUrgent: Record<Locale, string> = {
      en: "In the meantime, if your enquiry is urgent you can reply directly to this email.",
      es: "Mientras tanto, si tu consulta es urgente, puedes responder directamente a este correo.",
      fr: "Entre-temps, si votre demande est urgente, vous pouvez répondre directement à cet e-mail.",
      it: "Nel frattempo, se la tua richiesta è urgente, puoi rispondere direttamente a questa email.",
      pt: "Entretanto, se o seu pedido for urgente, pode responder diretamente a este email.",
      de: "Wenn Ihre Anfrage dringend ist, können Sie in der Zwischenzeit direkt auf diese E-Mail antworten.",
    };
    const arRegards: Record<Locale, string> = { en: "Best regards,", es: "Saludos,", fr: "Cordialement,", it: "Cordiali saluti,", pt: "Com os melhores cumprimentos,", de: "Mit freundlichen Grüßen," };
    const arTeam: Record<Locale, string> = { en: "The Camel Global Team", es: "El equipo de Camel Global", fr: "L'équipe Camel Global", it: "Il team di Camel Global", pt: "A equipa Camel Global", de: "Das Camel Global Team" };
    await sendContactEmail({
      to: safeEmail,
      subject: tL(arSubject),
      html: `
        <div style="font-family:system-ui,-apple-system,Arial;color:#222;line-height:1.6;max-width:600px;">
          <div style="background:#000;padding:20px 28px;">
            <h2 style="color:#fff;margin:0;font-size:18px;">${tL(arHead)}</h2>
          </div>
          <div style="background:#f8fafc;padding:24px 28px;border:1px solid #e2e8f0;">
            <p>${tL(arHi)}</p>
            <p>${tL(arGot)}</p>
            <p style="background:#fff;border:1px solid #e2e8f0;padding:14px;font-size:13px;color:#475569;">
              <strong>${tL(arYourMsg)}</strong><br /><br />
              <em>${safeMessage.slice(0, 500)}${safeMessage.length > 500 ? "…" : ""}</em>
            </p>
            <p>${tL(arUrgent)}</p>
            <p style="margin-top:24px;">${tL(arRegards)}<br /><strong>${tL(arTeam)}</strong></p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("Contact form email error:", err);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}