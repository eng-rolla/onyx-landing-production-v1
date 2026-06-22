export const MAX_EMAIL_LENGTH = 254;
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 160;
export const MIN_MESSAGE_LENGTH = 10;
export const MAX_MESSAGE_LENGTH = 4000;

type ValidationResult =
  | {
      ok: true;
      value: string;
    }
  | {
      ok: false;
      message: string;
    };

const EMAIL_PATTERN =
  /^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG_PATTERN = /<\s*\/?\s*[a-z][^>]*>/i;
const EVENT_HANDLER_PATTERN = /\bon[a-z]+\s*=/i;
const SCRIPT_URI_PATTERN = /\b(?:javascript|data)\s*:/i;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function sanitizeHeaderValue(value: string, maxLength = 240) {
  return value.replace(CONTROL_CHARS_PATTERN, "").replace(/[\r\n]+/g, " ").trim().slice(0, maxLength);
}

export function normalizeSingleLineText(value: string) {
  return value.replace(CONTROL_CHARS_PATTERN, "").replace(/\s+/g, " ").trim();
}

export function normalizeMessageText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(CONTROL_CHARS_PATTERN, "").trim();
}

export function containsUnsafeMarkup(value: string) {
  return HTML_TAG_PATTERN.test(value) || EVENT_HANDLER_PATTERN.test(value) || SCRIPT_URI_PATTERN.test(value);
}

export function validateEmail(value: string): ValidationResult {
  const email = normalizeEmail(value);

  if (!email) {
    return { ok: false, message: "Enter your email address." };
  }

  if (email.length > MAX_EMAIL_LENGTH) {
    return {
      ok: false,
      message: `Email addresses can be up to ${MAX_EMAIL_LENGTH} characters. Yours is ${email.length}.`,
    };
  }

  if (containsUnsafeMarkup(email)) {
    return {
      ok: false,
      message: "Email addresses cannot include HTML, scripts, or URL code. Use the format name@example.com.",
    };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, message: "Use a valid email address in the format name@example.com." };
  }

  return { ok: true, value: email };
}

export function validateFullName(value: string): ValidationResult {
  const fullName = normalizeSingleLineText(value);

  if (fullName.length < MIN_NAME_LENGTH) {
    return { ok: false, message: `Enter your name using at least ${MIN_NAME_LENGTH} characters.` };
  }

  if (fullName.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      message: `Your name is too long. Keep it under ${MAX_NAME_LENGTH} characters; yours is ${fullName.length}.`,
    };
  }

  if (containsUnsafeMarkup(fullName)) {
    return { ok: false, message: "Name cannot include HTML, scripts, or URL code. Use plain text only." };
  }

  return { ok: true, value: fullName };
}

export function validateContactMessage(value: string): ValidationResult {
  const message = normalizeMessageText(value);

  if (message.length < MIN_MESSAGE_LENGTH) {
    return {
      ok: false,
      message: `Write at least ${MIN_MESSAGE_LENGTH} characters for your message. You entered ${message.length}.`,
    };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      message: `Your message is too long. Keep it under ${MAX_MESSAGE_LENGTH} characters; yours is ${message.length}.`,
    };
  }

  if (containsUnsafeMarkup(message)) {
    return {
      ok: false,
      message: "Message cannot include HTML tags, script URLs, or inline event handlers. Please send plain text.",
    };
  }

  return { ok: true, value: message };
}
