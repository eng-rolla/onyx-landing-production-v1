type RateLimitOptions = {
  namespace: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult =
  | {
      limited: false;
    }
  | {
      limited: true;
      retryAfterSeconds: number;
    };

const attempts = new Map<string, number[]>();

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("cf-connecting-ip") ||
    forwardedFor ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkRateLimit(request: Request, { namespace, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const key = `${namespace}:${getClientKey(request)}`;
  const recentAttempts = (attempts.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
  const oldestAttempt = recentAttempts[0] ?? now;

  recentAttempts.push(now);
  attempts.set(key, recentAttempts);

  if (recentAttempts.length <= limit) {
    return { limited: false };
  }

  return {
    limited: true,
    retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldestAttempt)) / 1000)),
  };
}
