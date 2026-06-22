"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  MAX_EMAIL_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  validateContactMessage,
  validateEmail,
  validateFullName,
} from "@/lib/form-security";

import { TurnstileWidget } from "./turnstile-widget";

type SubmitStatus = "idle" | "submitting" | "success" | "error";
type FieldErrors = Partial<Record<"fullName" | "email" | "message", string>>;

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

function extractApiMessage(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["detail", "non_field_errors", "message", "full_name", "email"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }

  return "";
}

function describeApiError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong sending your message. Please try again.";
}

export function ContactForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [feedback, setFeedback] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [toastVisible, setToastVisible] = useState(false);
  const [toastLeaving, setToastLeaving] = useState(false);
  // Bumping this remounts the Turnstile widget so each submit gets a fresh,
  // single-use token.
  const [widgetNonce, setWidgetNonce] = useState(0);
  // Honeypot: uncontrolled on purpose. Real users never see/fill it, but bots
  // that blindly populate every field will — and we read the raw DOM value (not
  // React state) so headless form-fillers can't evade it.
  const honeypotRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingSubmitRef = useRef(false);

  const captchaRequired = Boolean(TURNSTILE_SITE_KEY);

  useEffect(() => {
    if (!turnstileToken || !pendingSubmitRef.current) return;
    pendingSubmitRef.current = false;
    formRef.current?.requestSubmit();
  }, [turnstileToken]);

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

    // Client-side checks mirror the server so the user gets instant, specific
    // feedback instead of a round-trip 400.
    const fullNameValidation = validateFullName(fullName);
    const emailValidation = validateEmail(email);
    const messageValidation = validateContactMessage(message);

    if (!fullNameValidation.ok || !emailValidation.ok || !messageValidation.ok) {
      const nextFieldErrors: FieldErrors = {};

      if (!fullNameValidation.ok) nextFieldErrors.fullName = fullNameValidation.message;
      if (!emailValidation.ok) nextFieldErrors.email = emailValidation.message;
      if (!messageValidation.ok) nextFieldErrors.message = messageValidation.message;

      setStatus("error");
      setFieldErrors(nextFieldErrors);
      setFeedback("Please fix the highlighted fields and try again.");
      return;
    }

    if (captchaRequired && !turnstileToken) {
      pendingSubmitRef.current = true;
      setStatus("idle");
      setFieldErrors({});
      setFeedback("");
      return;
    }

    setStatus("submitting");
    setFieldErrors({});
    setFeedback("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullNameValidation.value,
          email: emailValidation.value,
          message: messageValidation.value,
          turnstile_token: turnstileToken,
          website: honeypotRef.current?.value ?? "",
        }),
      });
      const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(extractApiMessage(result) || "Something went wrong sending your message. Please try again.");
      }

      setStatus("success");
      setFieldErrors({});
      setFeedback("");
      setToastLeaving(false);
      setToastVisible(true);
      setFullName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      setStatus("error");
      setFieldErrors({});
      setFeedback(describeApiError(error));
    } finally {
      // Reset the captcha after every attempt — the token can only be used once.
      pendingSubmitRef.current = false;
      setTurnstileToken("");
      if (captchaRequired) setWidgetNonce((nonce) => nonce + 1);
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
          <strong>Message sent!</strong>
          <button
            className="newsletter-toast__close"
            type="button"
            aria-label="Dismiss contact confirmation"
            onClick={() => {
              setToastVisible(false);
              setToastLeaving(false);
            }}
          >
            ×
          </button>
        </div>
      ) : null}

      <form ref={formRef} className="contact-form" onSubmit={handleSubmit} noValidate>
        <div className="contact-form__grid">
          <div className="contact-form__field contact-form__field--full">
            <label htmlFor="contact-full-name">Name</label>
            <input
              id="contact-full-name"
              name="fullName"
              type="text"
              placeholder="Your name"
              autoComplete="name"
              maxLength={MAX_NAME_LENGTH}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              aria-invalid={Boolean(fieldErrors.fullName)}
              aria-describedby={fieldErrors.fullName ? "contact-full-name-error" : undefined}
              required
            />
            {fieldErrors.fullName ? (
              <p id="contact-full-name-error" className="contact-form__error" role="alert">
                {fieldErrors.fullName}
              </p>
            ) : null}
          </div>
          <div className="contact-form__field contact-form__field--full">
            <label htmlFor="contact-email">Email</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={MAX_EMAIL_LENGTH}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
              required
            />
            {fieldErrors.email ? (
              <p id="contact-email-error" className="contact-form__error" role="alert">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>
          <div className="contact-form__field contact-form__field--full">
            <label htmlFor="contact-message">Message</label>
            <textarea
              id="contact-message"
              name="message"
              placeholder="Write your message here"
              maxLength={MAX_MESSAGE_LENGTH}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-invalid={Boolean(fieldErrors.message)}
              aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
              required
            />
            {fieldErrors.message ? (
              <p id="contact-message-error" className="contact-form__error" role="alert">
                {fieldErrors.message}
              </p>
            ) : null}
          </div>
        </div>

        {/* Honeypot — hidden from real users; a filled value flags a bot. */}
        <div className="contact-form__hp" aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            ref={honeypotRef}
          />
        </div>

        {captchaRequired ? (
          <TurnstileWidget
            key={widgetNonce}
            siteKey={TURNSTILE_SITE_KEY}
            onVerify={setTurnstileToken}
            onExpire={() => {
              pendingSubmitRef.current = false;
              setTurnstileToken("");
            }}
            onError={() => {
              pendingSubmitRef.current = false;
              setTurnstileToken("");
              setStatus("error");
              setFeedback("Verification could not load. Check your connection and try again.");
            }}
          />
        ) : null}

        <button
          className="btn-grad contact-form__submit"
          type="submit"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Sending…" : "Send message"}
        </button>

        {status === "error" && feedback ? (
          <p className="contact-form__feedback contact-form__feedback--error" role="alert" aria-live="polite">
            {feedback}
          </p>
        ) : null}
      </form>
    </>
  );
}
