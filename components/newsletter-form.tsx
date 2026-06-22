"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { MAX_EMAIL_LENGTH, validateEmail } from "@/lib/form-security";
import { TurnstileWidget } from "./turnstile-widget";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

function extractApiMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;

  for (const key of ["detail", "message", "email"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }

  return "";
}

export function NewsletterForm() {
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [feedback, setFeedback] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastLeaving, setToastLeaving] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [widgetNonce, setWidgetNonce] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const verificationPending = Boolean(TURNSTILE_SITE_KEY && !turnstileToken);

  useEffect(() => {
    if (!toastVisible) return;

    const leaveTimer = window.setTimeout(() => setToastLeaving(true), 4600);
    const hideTimer = window.setTimeout(() => {
      setToastVisible(false);
      setToastLeaving(false);
    }, 5000);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, [toastVisible]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const emailValidation = validateEmail(emailRef.current?.value ?? "");
    if (!emailValidation.ok) {
      setStatus("error");
      setFeedback(emailValidation.message);
      return;
    }
    const email = emailValidation.value;

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setStatus("error");
      setFeedback("Please complete the verification challenge.");
      return;
    }

    setStatus("submitting");
    setFeedback("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          turnstile_token: turnstileToken,
          website: honeypotRef.current?.value ?? "",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { detail?: string };

      if (!response.ok) {
        throw new Error(extractApiMessage(payload) || "Could not subscribe. Please try again.");
      }

      setStatus("success");
      setFeedback("");
      setToastLeaving(false);
      setToastVisible(true);
      if (emailRef.current) {
        emailRef.current.value = "";
      }
    } catch (error) {
      setStatus("error");
      setFeedback(error instanceof Error ? error.message : "Could not subscribe. Please try again.");
    } finally {
      setTurnstileToken("");
      if (TURNSTILE_SITE_KEY) setWidgetNonce((nonce) => nonce + 1);
    }
  }

  return (
    <>
      {toastVisible ? (
        <div
          className={`newsletter-toast${toastLeaving ? " newsletter-toast--leaving" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span className="newsletter-toast__check" aria-hidden="true">
            ✓
          </span>
          <strong>Thanks for subscribing!</strong>
          <button
            className="newsletter-toast__close"
            type="button"
            aria-label="Dismiss newsletter confirmation"
            onClick={() => {
              setToastVisible(false);
              setToastLeaving(false);
            }}
          >
            ×
          </button>
        </div>
      ) : null}

      <form className="newsletter-form" onSubmit={handleSubmit} noValidate>
        <div className="newsletter-form__row">
          <div className="newsletter-form__field">
            <label htmlFor="newsletter-email">Email</label>
            <input
              id="newsletter-email"
              name="newsletterEmail"
              type="email"
              placeholder="Enter your email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={MAX_EMAIL_LENGTH}
              aria-invalid={status === "error" && Boolean(feedback)}
              aria-describedby={status === "error" && feedback ? "newsletter-email-error" : undefined}
              ref={emailRef}
              required
            />
            {status === "error" && feedback ? (
              <p id="newsletter-email-error" className="newsletter-form__error" role="alert">
                {feedback}
              </p>
            ) : null}
          </div>
        </div>

        <div className="contact-form__hp" aria-hidden="true">
          <label htmlFor="newsletter-website">Website</label>
          <input id="newsletter-website" name="website" type="text" tabIndex={-1} autoComplete="off" ref={honeypotRef} />
        </div>

        {TURNSTILE_SITE_KEY ? (
          <TurnstileWidget
            key={widgetNonce}
            siteKey={TURNSTILE_SITE_KEY}
            onVerify={setTurnstileToken}
            onExpire={() => setTurnstileToken("")}
            onError={() => {
              setTurnstileToken("");
              setStatus("error");
              setFeedback("Verification could not load. Check your connection and try again.");
            }}
          />
        ) : null}

        <button className="btn-outline" type="submit" disabled={status === "submitting" || verificationPending}>
          {status === "submitting" ? "Subscribing..." : verificationPending ? "Checking security..." : "Subscribe"}
        </button>
      </form>
    </>
  );
}
