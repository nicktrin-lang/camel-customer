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
function brandEmail(
  headingEN: string,
  headingES: string | null,
  bodyEN: string,
  bodyES: string | null,
  locale: "en" | "es"
): string {
  if (locale === "es" && headingES && bodyES) {
    return `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6; max-width:600px;">
        <div style="background:#000; padding:24px 32px;">
          <h2 style="color:#fff; margin:0;">${headingES}</h2>
        </div>
        <div style="background:#f8f8f8; padding:24px 32px; border:1px solid #e5e5e5;">
          ${bodyES}
          <p style="margin-top:32px; color:#888; font-size:14px;">Saludos,<br/><strong style="color:#222;">El equipo de Camel Global</strong></p>
        </div>
      </div>`;
  }
  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#222; line-height:1.6; max-width:600px;">
      <div style="background:#000; padding:24px 32px;">
        <h2 style="color:#fff; margin:0;">${headingEN}</h2>
      </div>
      <div style="background:#f8f8f8; padding:24px 32px; border:1px solid #e5e5e5;">
        ${bodyEN}
        <p style="margin-top:32px; color:#888; font-size:14px;">Best regards,<br/><strong style="color:#222;">The Camel Global Team</strong></p>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Customer emails — all accept optional locale (default "en")
// PDFs (receipt, completion statement) stay English — NTUK is a UK company
// ---------------------------------------------------------------------------

export async function sendCustomerBidReceivedEmail(
  to: string,
  jobNumber?: number | null,
  locale: "en" | "es" = "en"
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.camel-global.com";

  const subjectEN = `A new partner bid has been received${jobNumber ? ` for booking #${jobNumber}` : ""}`;
  const subjectES = `Nueva oferta recibida${jobNumber ? ` para la reserva #${jobNumber}` : ""}`;

  const bodyEN = `
    <p>A partner has submitted a bid for your booking request${jobNumber ? ` <strong>#${jobNumber}</strong>` : ""}.</p>
    <p>You can now log in and review the bid details.</p>
    <p style="margin:24px 0;">
      <a href="${baseUrl}/bookings"
        style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block;">
        View your bookings
      </a>
    </p>`;

  const bodyES = `
    <p>Un socio ha enviado una oferta para tu solicitud de reserva${jobNumber ? ` <strong>#${jobNumber}</strong>` : ""}.</p>
    <p>Ya puedes iniciar sesión y revisar los detalles de la oferta.</p>
    <p style="margin:24px 0;">
      <a href="${baseUrl}/bookings"
        style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block;">
        Ver tus reservas
      </a>
    </p>`;

  return sendEmail({
    to,
    subject: locale === "es" ? subjectES : subjectEN,
    html: brandEmail("New bid received", "Nueva oferta recibida", bodyEN, bodyES, locale),
  });
}

export async function sendCustomerBookingCompletedEmail(
  to: string,
  jobNumber?: number | null,
  locale: "en" | "es" = "en"
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.camel-global.com";

  const subjectEN = `Your booking is now completed${jobNumber ? ` — #${jobNumber}` : ""}`;
  const subjectES = `Tu reserva ha sido completada${jobNumber ? ` — #${jobNumber}` : ""}`;

  const bodyEN = `
    <p>Your booking${jobNumber ? ` <strong>#${jobNumber}</strong>` : ""} has now been marked as completed.</p>
    <p>The vehicle return has been confirmed. Your fuel deposit refund (if applicable) will be processed automatically within 5–10 working days.</p>
    <p style="margin:24px 0;">
      <a href="${baseUrl}/bookings"
        style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block;">
        View booking details
      </a>
    </p>`;

  const bodyES = `
    <p>Tu reserva${jobNumber ? ` <strong>#${jobNumber}</strong>` : ""} ha sido marcada como completada.</p>
    <p>Se ha confirmado la devolución del vehículo. El reembolso del depósito de combustible (si procede) se procesará automáticamente en 5–10 días laborables.</p>
    <p style="margin:24px 0;">
      <a href="${baseUrl}/bookings"
        style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block;">
        Ver detalles de la reserva
      </a>
    </p>`;

  return sendEmail({
    to,
    subject: locale === "es" ? subjectES : subjectEN,
    html: brandEmail("Booking completed", "Reserva completada", bodyEN, bodyES, locale),
  });
}

export async function sendReviewReminderEmail(
  to: string,
  jobNumber?: number | null,
  requestId?: string | null,
  locale: "en" | "es" = "en"
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.camel-global.com";
  const reviewUrl = requestId ? `${baseUrl}/bookings/${requestId}` : `${baseUrl}/bookings`;

  const subjectEN = `How was your car hire experience?${jobNumber ? ` (Booking #${jobNumber})` : ""}`;
  const subjectES = `¿Qué tal fue tu experiencia de alquiler?${jobNumber ? ` (Reserva #${jobNumber})` : ""}`;

  const bodyEN = `
    <p>Hi,</p>
    <p>Your Camel Global car hire booking${jobNumber ? ` <strong>#${jobNumber}</strong>` : ""} is now complete. We'd love to hear how it went.</p>
    <p>Your review helps other customers choose the right car hire company for their trip.</p>
    <p style="margin:24px 0;">
      <a href="${reviewUrl}"
        style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block;">
        Leave a Review
      </a>
    </p>
    <p style="color:#64748b; font-size:14px;">It only takes 30 seconds.</p>`;

  const bodyES = `
    <p>Hola,</p>
    <p>Tu reserva de alquiler de coches con Camel Global${jobNumber ? ` <strong>#${jobNumber}</strong>` : ""} ha finalizado. Nos encantaría saber cómo fue.</p>
    <p>Tu reseña ayuda a otros clientes a elegir la empresa de alquiler adecuada para su viaje.</p>
    <p style="margin:24px 0;">
      <a href="${reviewUrl}"
        style="background:#ff7a00; color:#fff; padding:12px 28px; text-decoration:none; font-weight:700; display:inline-block;">
        Dejar una reseña
      </a>
    </p>
    <p style="color:#64748b; font-size:14px;">Solo lleva 30 segundos.</p>`;

  return sendEmail({
    to,
    subject: locale === "es" ? subjectES : subjectEN,
    html: brandEmail(
      "How was your car hire experience? ⭐",
      "¿Qué tal fue tu experiencia de alquiler? ⭐",
      bodyEN,
      bodyES,
      locale
    ),
  });
}