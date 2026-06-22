"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";
import { HiOutlineEnvelope } from "react-icons/hi2";

import { MAX_EMAIL_LENGTH, validateEmail } from "@/lib/form-security";
import { TurnstileWidget } from "./turnstile-widget";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

const STORAGE_KEY = "onyx_waitlist_email_hashes";
const MIN_SUBMIT_INTERVAL_MS = 1800;
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

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function readStoredHashes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function storeEmailHash(hash: string) {
  const hashes = new Set(readStoredHashes());
  hashes.add(hash);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(hashes).slice(-40)));
}

export function WaitlistDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const lastSubmitAtRef = useRef(0);
  const pendingSubmitRef = useRef(false);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [feedback, setFeedback] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [widgetNonce, setWidgetNonce] = useState(0);

  useEffect(() => {
    if (!turnstileToken || !pendingSubmitRef.current) return;
    pendingSubmitRef.current = false;
    formRef.current?.requestSubmit();
  }, [turnstileToken]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setStatus("idle");
    setFeedback("");
    setTurnstileToken("");
    setWidgetNonce((nonce) => nonce + 1);
    window.setTimeout(() => emailRef.current?.focus(), 40);

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

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
      pendingSubmitRef.current = true;
      setStatus("idle");
      setFeedback("");
      return;
    }

    const emailHash = await sha256(email);
    if (readStoredHashes().includes(emailHash)) {
      setStatus("error");
      setFeedback("This email is already on the waitlist.");
      return;
    }

    const now = Date.now();
    if (now - lastSubmitAtRef.current < MIN_SUBMIT_INTERVAL_MS) {
      setStatus("error");
      setFeedback("Please wait a moment before trying again.");
      return;
    }
    lastSubmitAtRef.current = now;

    setStatus("submitting");
    setFeedback("");

    try {
      const response = await fetch("/api/waitlist", {
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
        throw new Error(extractApiMessage(payload) || "Could not join the waitlist. Please try again.");
      }

      storeEmailHash(emailHash);
      setStatus("success");
      setFeedback(payload.detail ?? "You are on the waitlist.");
      if (emailRef.current) emailRef.current.value = "";
    } catch (error) {
      setStatus("error");
      setFeedback(error instanceof Error ? error.message : "Could not join the waitlist. Please try again.");
    } finally {
      pendingSubmitRef.current = false;
      setTurnstileToken("");
      if (TURNSTILE_SITE_KEY) setWidgetNonce((nonce) => nonce + 1);
    }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onClose();
    }
  }

  function handleBackdropPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleClosePointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onClose();
  }

  return (
    <div
      className="waitlist-modal"
      role="presentation"
      onPointerDown={handleBackdropPointerDown}
      onKeyDown={handleDialogKeyDown}
    >
      <div
        ref={dialogRef}
        className="waitlist-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="waitlist-modal-title"
      >
        <button
          className="waitlist-modal__close"
          type="button"
          onPointerDown={handleClosePointerDown}
          aria-label="Close waitlist dialog"
        >
          <span aria-hidden="true">×</span>
        </button>

        <div className="waitlist-modal__copy">
          <h2 id="waitlist-modal-title">
            Join <span>Waitlist</span>
          </h2>
          <p>
            Be among the first to access <span>Onyx</span> when we launch.
          </p>
        </div>

        <form ref={formRef} className="waitlist-form" onSubmit={handleSubmit} noValidate>
          <div className="newsletter-form__field">
            <div className="waitlist-form__input-wrap">
              <HiOutlineEnvelope className="waitlist-form__email-icon" aria-hidden="true" />
              <input
                ref={emailRef}
                id="waitlist-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={MAX_EMAIL_LENGTH}
                placeholder="you@gmail.com"
                aria-label="Email address"
                aria-invalid={status === "error" && Boolean(feedback)}
                aria-describedby={feedback ? "waitlist-feedback" : undefined}
                required
              />
            </div>
          </div>

          <div className="contact-form__hp" aria-hidden="true">
            <label htmlFor="waitlist-website">Website</label>
            <input id="waitlist-website" name="website" type="text" tabIndex={-1} autoComplete="off" ref={honeypotRef} />
          </div>

          {TURNSTILE_SITE_KEY ? (
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
            className="btn-grad waitlist-form__submit"
            type="submit"
            disabled={status === "submitting"}
          >
            <span>{status === "submitting" ? "Joining..." : "Join Waitlist"}</span>
          </button>

          {feedback ? (
            <p
              className={`contact-form__feedback contact-form__feedback--${status === "success" ? "success" : "error"}`}
              id="waitlist-feedback"
              role="status"
              aria-live="polite"
            >
              {feedback}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
