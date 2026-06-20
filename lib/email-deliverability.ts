import { resolveMx } from "node:dns/promises";

type DeliverabilityResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

const DNS_TIMEOUT_MS = 2500;
const BLOCKED_DOMAINS = new Set(["example.com", "example.net", "example.org", "localhost"]);

function getEmailDomain(email: string) {
  return email.split("@").pop()?.toLowerCase() ?? "";
}

function withTimeout<T>(task: Promise<T>, timeoutMs: number) {
  return Promise.race([
    task,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("DNS lookup timed out")), timeoutMs);
    }),
  ]);
}

export async function validateEmailDeliverability(email: string): Promise<DeliverabilityResult> {
  const domain = getEmailDomain(email);

  if (!domain || BLOCKED_DOMAINS.has(domain)) {
    return {
      ok: false,
      message: "Use a real email address that can receive mail.",
    };
  }

  try {
    const records = await withTimeout(resolveMx(domain), DNS_TIMEOUT_MS);
    const hasMailExchange = records.some((record) => record.exchange && record.exchange !== ".");

    if (hasMailExchange) {
      return { ok: true };
    }
  } catch {
    return {
      ok: false,
      message: "Use an email address with a domain that can receive mail.",
    };
  }

  return {
    ok: false,
    message: "Use an email address with a domain that can receive mail.",
  };
}
