import { type NextRequest, NextResponse } from "next/server";

import { sendEmail, verifyTurnstile } from "@/lib/email";
import { validateContactMessage, validateEmail, validateFullName } from "@/lib/form-security";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 6;

function readString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return NextResponse.json({ detail: "We could not read the form. Please refresh and try again." }, { status: 400 });
  }

  const website = readString(payload, "website");
  if (website) {
    return NextResponse.json({ detail: "Thanks for reaching out. Your message has been sent." });
  }

  const rateLimit = checkRateLimit(request, {
    namespace: "contact",
    limit: MAX_ATTEMPTS_PER_WINDOW,
    windowMs: WINDOW_MS,
  });
  if (rateLimit.limited) {
    return NextResponse.json(
      { detail: "Too many contact form attempts from this connection. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const fullNameValidation = validateFullName(readString(payload, "full_name"));
  if (!fullNameValidation.ok) {
    return NextResponse.json({ full_name: fullNameValidation.message }, { status: 400 });
  }
  const fullName = fullNameValidation.value;

  const emailValidation = validateEmail(readString(payload, "email"));
  if (!emailValidation.ok) {
    return NextResponse.json({ email: emailValidation.message }, { status: 400 });
  }
  const email = emailValidation.value;

  const messageValidation = validateContactMessage(readString(payload, "message"));
  if (!messageValidation.ok) {
    return NextResponse.json({ message: messageValidation.message }, { status: 400 });
  }
  const message = messageValidation.value;
  const turnstileToken = readString(payload, "turnstile_token");

  const remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const verification = await verifyTurnstile(turnstileToken, remoteIp);
  if (!verification.ok) {
    return NextResponse.json({ detail: verification.reason }, { status: 400 });
  }

  const sent = await sendEmail({
    subject: `New Onyx contact message from ${fullName}`,
    replyTo: email,
    text: [
      "New contact form message from the Onyx landing page.",
      "",
      `Name: ${fullName}`,
      `Email: ${email}`,
      "",
      "Message:",
      message,
    ].join("\n"),
  });

  if (!sent.ok) {
    console.error("Contact email failed", { reason: sent.reason, status: sent.status });
    return NextResponse.json(
      { detail: "We could not send your message right now. Please try again shortly." },
      { status: 500 },
    );
  }

  return NextResponse.json({ detail: "Thanks for reaching out. Your message has been sent." });
}
