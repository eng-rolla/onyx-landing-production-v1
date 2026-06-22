import { sanitizeHeaderValue, validateEmail } from "@/lib/form-security";

type EmailInput = {
  subject: string;
  text: string;
  html?: string;
  to?: string;
  from?: string;
  replyTo?: string;
};

type ServiceResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: string;
      status?: number;
    };

const RESEND_API_URL = "https://api.resend.com/emails";

export function isValidEmail(value: string) {
  return validateEmail(value).ok;
}

export async function verifyTurnstile(token: string, remoteIp?: string): Promise<ServiceResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, reason: "Security verification is temporarily unavailable." };
    }
    return { ok: true };
  }
  if (!token) return { ok: false, reason: "Please complete the verification challenge." };

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  if (remoteIp) formData.append("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => ({}))) as { success?: boolean };

  if (!response.ok || !payload.success) {
    return {
      ok: false,
      reason: "Verification failed. Please try again.",
      status: response.status,
    };
  }

  return { ok: true };
}

export async function sendEmail({ subject, text, html, to: recipient, from: sender, replyTo }: EmailInput): Promise<ServiceResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = sanitizeHeaderValue(recipient ?? process.env.CONTACT_TO_EMAIL ?? process.env.EMAIL_TO ?? "");
  const from = sanitizeHeaderValue(sender ?? process.env.EMAIL_FROM ?? "Onyx Landing <onboarding@resend.dev>");
  const safeReplyTo = replyTo ? sanitizeHeaderValue(replyTo) : "";
  const safeSubject = sanitizeHeaderValue(subject, 180);

  if (!apiKey || !to) {
    return {
      ok: false,
      reason: "Email delivery is not configured yet. Set RESEND_API_KEY and CONTACT_TO_EMAIL.",
    };
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: safeSubject,
      text,
      html,
      reply_to: safeReplyTo ? [safeReplyTo] : undefined,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
    return {
      ok: false,
      reason: payload.message ?? payload.error ?? "Email provider rejected the message.",
      status: response.status,
    };
  }

  return { ok: true };
}
