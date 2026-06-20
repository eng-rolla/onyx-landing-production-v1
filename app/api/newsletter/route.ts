import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email";
import { validateEmail } from "@/lib/form-security";
import { addNewsletterEmail, hasNewsletterEmail } from "@/lib/newsletter-store";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 10;

function readString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function renderNewsletterConfirmationEmail() {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>You have joined the Onyx newsletter</title>
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
                        You have joined the
                        <span style="background:linear-gradient(90deg, #22d3ee, #facc15, #a855f7); -webkit-background-clip:text; background-clip:text; color:transparent;">Onyx</span>
                        newsletter.
                      </h1>

                      <p style="margin:0 0 24px 0; font-size:18px; line-height:1.65; color:#f3f3f3;">
                        Thanks for subscribing. You will receive Onyx launch updates, product notes, and post-quantum security insights.
                      </p>

                      <p style="margin:0 0 24px 0; font-size:18px; line-height:1.65; color:#f3f3f3;">
                        You don’t need to wait until 2029 to start preparing for post-quantum cryptography.<em> The future of security is already in your hands. </em>
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
                        The reason you are receiving this email is because you subscribed to the
                        <span style="background:linear-gradient(90deg, #22d3ee, #facc15, #a855f7); -webkit-background-clip:text; background-clip:text; color:transparent;">Onyx</span>
                        newsletter.
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
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return NextResponse.json({ detail: "We could not read the form. Please refresh and try again." }, { status: 400 });
  }

  const website = readString(payload, "website");
  if (website) {
    return NextResponse.json({ detail: "Thanks. You are subscribed." });
  }

  const rateLimit = checkRateLimit(request, {
    namespace: "newsletter",
    limit: MAX_ATTEMPTS_PER_WINDOW,
    windowMs: WINDOW_MS,
  });
  if (rateLimit.limited) {
    return NextResponse.json(
      { detail: "Too many newsletter attempts from this connection. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const emailValidation = validateEmail(readString(payload, "email"));
  if (!emailValidation.ok) {
    return NextResponse.json({ email: emailValidation.message }, { status: 400 });
  }
  const email = emailValidation.value;

  if (await hasNewsletterEmail(email)) {
    return NextResponse.json({ email: "This email is already subscribed to the newsletter." }, { status: 409 });
  }

  const newsletterFrom = process.env.NEWSLETTER_FROM;
  const newsletterReplyTo = process.env.NEWSLETTER_REPLY_TO;
  if (!newsletterFrom || !newsletterReplyTo) {
    return NextResponse.json(
      {
        detail:
          "Newsletter signup is temporarily unavailable because email delivery is not configured. Please contact contact@onyx-quantum.com.",
      },
      { status: 500 },
    );
  }

  const sent = await sendEmail({
    to: email,
    from: newsletterFrom,
    replyTo: newsletterReplyTo,
    subject: "You have joined the Onyx newsletter",
    text: [
      "You have joined the Onyx newsletter.",
      "",
      "Thanks for subscribing. You will receive Onyx launch updates, product notes, and post-quantum security insights.",

      "",
      "Best regards,",
      "Rolla Assad",
      "Co-Founder & CEO, Onyx",
      "",
      "For any enquiries, contact us at contact@onyx-quantum.com",
    ].join("\n"),
    html: renderNewsletterConfirmationEmail(),
  });

  if (!sent.ok) {
    console.error("Newsletter confirmation email failed", { reason: sent.reason, status: sent.status });
    return NextResponse.json(
      { detail: "We could not send the confirmation email right now. Please try again shortly." },
      { status: 500 },
    );
  }

  const added = await addNewsletterEmail(email);
  if (!added) {
    return NextResponse.json({ email: "This email is already subscribed to the newsletter." }, { status: 409 });
  }

  return NextResponse.json({ detail: "Thanks for subscribing!" });
}
