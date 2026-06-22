import { NextResponse } from "next/server";

import { validateEmailDeliverability } from "@/lib/email-deliverability";
import { sendEmail, verifyTurnstile } from "@/lib/email";
import { validateEmail } from "@/lib/form-security";
import { addWaitlistEmail, hasWaitlistEmail } from "@/lib/waitlist-store";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 8;

function readString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function renderWaitlistWelcomeEmail() {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to Onyx!</title>
  </head>

  <body style="margin:0; padding:0; background:#ffffff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff; margin:0; padding:0;">
      <tr>
        <td align="center" style="padding:0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:1180px; background:#000000;">
            <tr>
              <td style="padding:72px 32px 48px 32px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="width:100%; max-width:560px;">
                  <tr>
                    <td style="font-family: Cambria, Helvetica, Arial, sans-serif; color:#ffffff;">
                      <div style="margin-bottom:54px; font-size:13px; letter-spacing:7px; text-transform:uppercase; font-weight:300; color:#777777;">
                        ONYX
                      </div>

                      <h1 style="margin:0 0 36px 0; font-family:'Times New Roman', Georgia, serif; font-size:44px; line-height:1.12; font-weight:400; color:#ffffff;">
                        Thanks for joining
                        <span style="background:linear-gradient(90deg, #22d3ee, #facc15, #a855f7); -webkit-background-clip:text; background-clip:text; color:transparent;">Onyx</span>!
                      </h1>

                      <p style="margin:0 0 24px 0; font-size:18px; line-height:1.65; color:#f3f3f3;">
                        You are now on the waitlist and will be among the first to try Onyx.
                      </p>

                      <p style="margin:0 0 24px 0; font-size:18px; line-height:1.65; color:#f3f3f3;">
                        You don’t need to wait until 2029 to start preparing for post-quantum cryptography.<em> The future of security is already in your hands. </em>
                      </p>

                      <p style="margin:0 0 24px 0; font-size:18px; line-height:1.65; color:#f3f3f3;">
                        Our first beta version is expected to launch <em>between July and August 2026.</em>
                      </p>

                      <p style="margin:0 0 34px 0; font-size:18px; line-height:1.65; color:#f3f3f3;">
                        <strong>With Onyx, stay unbreakable.</strong>
                      </p>

                      <p style="margin:0 0 46px 0; font-size:17px; line-height:1.6; color:#ffffff;">
                        Best regards,<br />
                        Rolla Assad<br />
                        Co-Founder &amp; CEO, Onyx
                      </p>

                      <p style="margin:0; font-size:13px; line-height:1.8; color:#777777;">
                        We will contact you once the early beta version of
                        <span style="background:linear-gradient(90deg, #22d3ee, #facc15, #a855f7); -webkit-background-clip:text; background-clip:text; color:transparent;">Onyx</span>
                        launches. The reason you are receiving this email is because you joined the Onyx waitlist.
                      </p>

                      <p style="margin:10px 0 0 0; font-size:13px; line-height:1.8; color:#777777;">
                        For any enquiries, contact us at
                        <a href="mailto:contact@onyx-quantum.com" style="color:#58a6ff; text-decoration:underline;">contact@onyx-quantum.com</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) {
    return NextResponse.json({ detail: "Request is too large." }, { status: 413 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return NextResponse.json({ detail: "We could not read the form. Please refresh and try again." }, { status: 400 });
  }

  const website = readString(payload, "website");
  if (website) {
    return NextResponse.json({ detail: "You are on the waitlist." });
  }

  const rateLimit = checkRateLimit(request, {
    namespace: "waitlist",
    limit: MAX_ATTEMPTS_PER_WINDOW,
    windowMs: WINDOW_MS,
  });
  if (rateLimit.limited) {
    return NextResponse.json(
      { detail: "Too many waitlist attempts from this connection. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const emailValidation = validateEmail(readString(payload, "email"));
  if (!emailValidation.ok) {
    return NextResponse.json({ email: emailValidation.message }, { status: 400 });
  }
  const email = emailValidation.value;

  const deliverability = await validateEmailDeliverability(email);
  if (!deliverability.ok) {
    return NextResponse.json({ email: deliverability.message }, { status: 400 });
  }

  const turnstileToken = readString(payload, "turnstile_token");
  const remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const verification = await verifyTurnstile(turnstileToken, remoteIp);
  if (!verification.ok) {
    return NextResponse.json({ detail: verification.reason }, { status: 400 });
  }

  if (await hasWaitlistEmail(email)) {
    return NextResponse.json({ email: "This email is already on the waitlist." }, { status: 409 });
  }

  const waitlistReplyTo = process.env.WAITLIST_REPLY_TO;
  if (!waitlistReplyTo) {
    return NextResponse.json(
      {
        detail:
          "Waitlist signup is temporarily unavailable because email delivery is not configured. Please contact contact@onyx-quantum.com.",
      },
      { status: 500 },
    );
  }

  const welcome = await sendEmail({
    to: email,
    replyTo: waitlistReplyTo,
    subject: "Welcome to Onyx!",
    text: [
      "Welcome to Onyx!",
      "",
      "You are now on the waitlist and will be among the first to try Onyx.",
      "You don’t need to wait until 2029 to start preparing for post-quantum cryptography. The future of security is already in your hands.",
      "Our first beta version is expected to launch between July and August 2026.",
      "With Onyx, stay unbreakable.",
      "",
      "Best regards,",
      "Rolla Assad",
      "Co-Founder & CEO, Onyx",
      "",
      "For any enquiries, contact us at contact@onyx-quantum.com",
    ].join("\n"),
    html: renderWaitlistWelcomeEmail(),
  });

  if (!welcome.ok) {
    console.error("Waitlist welcome email failed", { reason: welcome.reason, status: welcome.status });
    return NextResponse.json(
      { detail: "We could not send the welcome email right now. Please try again shortly." },
      { status: 500 },
    );
  }

  const added = await addWaitlistEmail(email);
  if (!added) {
    return NextResponse.json({ email: "This email is already on the waitlist." }, { status: 409 });
  }

  return NextResponse.json({ detail: "You are on the waitlist!" });
}
