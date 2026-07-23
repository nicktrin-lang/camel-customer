import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, coerceLocale, Locale } from "@/lib/email";
import { rateLimit, getIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip = getIp(req);
  const { allowed } = rateLimit(ip, "send-customer-reset-email");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait 15 minutes before trying again." },
      { status: 429 }
    );
  }

  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // FIX: was falling back to portal.camel-global.com and pointing to /test-booking/reset-password
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://camel-global.com";
  const redirect = siteUrl + "/reset-password";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_URL!,
    process.env.CUSTOMER_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: redirect },
  });

  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ error: error?.message ?? "Failed to generate link" }, { status: 400 });
  }

  const actionUrl = new URL(data.properties.action_link);
  actionUrl.searchParams.set("redirect_to", redirect);
  const resetLink = actionUrl.toString();

  // Best-effort localization: generateLink returns the matched user, so we can
  // resolve their stored communication_locale. Falls back to English.
  let locale: Locale = "en";
  if (data.user?.id) {
    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("communication_locale")
      .eq("user_id", data.user.id)
      .maybeSingle();
    locale = coerceLocale(profile?.communication_locale);
  }
  const tL = <T,>(m: Record<Locale, T>) => m[locale] ?? m.en;
  const subjectL: Record<Locale, string> = {
    en: "Reset your Camel Global password", es: "Restablece tu contraseña de Camel Global", fr: "Réinitialisez votre mot de passe Camel Global",
    it: "Reimposta la tua password Camel Global", pt: "Redefina a sua palavra-passe Camel Global", de: "Setzen Sie Ihr Camel Global Passwort zurück",
  };
  const h2L: Record<Locale, string> = { en: "Reset your password", es: "Restablece tu contraseña", fr: "Réinitialisez votre mot de passe", it: "Reimposta la tua password", pt: "Redefina a sua palavra-passe", de: "Passwort zurücksetzen" };
  const introL: Record<Locale, string> = {
    en: "Click below to reset your password. This link expires in 1 hour.",
    es: "Haz clic a continuación para restablecer tu contraseña. Este enlace caduca en 1 hora.",
    fr: "Cliquez ci-dessous pour réinitialiser votre mot de passe. Ce lien expire dans 1 heure.",
    it: "Fai clic qui sotto per reimpostare la tua password. Questo link scade tra 1 ora.",
    pt: "Clique abaixo para redefinir a sua palavra-passe. Este link expira dentro de 1 hora.",
    de: "Klicken Sie unten, um Ihr Passwort zurückzusetzen. Dieser Link läuft in 1 Stunde ab.",
  };
  const btnL: Record<Locale, string> = { en: "Reset Password", es: "Restablecer contraseña", fr: "Réinitialiser le mot de passe", it: "Reimposta password", pt: "Redefinir palavra-passe", de: "Passwort zurücksetzen" };
  const ignoreL: Record<Locale, string> = {
    en: "If you did not request this, ignore this email.", es: "Si no solicitaste esto, ignora este correo.", fr: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    it: "Se non hai richiesto questa operazione, ignora questa email.", pt: "Se não solicitou isto, ignore este email.", de: "Wenn Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.",
  };
  const regardsL: Record<Locale, string> = { en: "Best regards,", es: "Saludos,", fr: "Cordialement,", it: "Cordiali saluti,", pt: "Com os melhores cumprimentos,", de: "Mit freundlichen Grüßen," };
  const teamL: Record<Locale, string> = { en: "The Camel Global Team", es: "El equipo de Camel Global", fr: "L'équipe Camel Global", it: "Il team di Camel Global", pt: "A equipa Camel Global", de: "Das Camel Global Team" };

  await sendEmail({
    to: email,
    subject: tL(subjectL),
    html: `<div style='font-family:Arial;color:#222;line-height:1.6'><h2>${tL(h2L)}</h2><p>${tL(introL)}</p><p><a href='${resetLink}' style='display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600'>${tL(btnL)}</a></p><p style='margin-top:16px;font-size:13px;color:#666'>${tL(ignoreL)}</p><p style='margin-top:24px'>${tL(regardsL)}<br>${tL(teamL)}</p></div>`,
  });

  return NextResponse.json({ ok: true });
}