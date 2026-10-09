import crypto from "crypto";

export function timingSafeStringCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  // Hash to ensure identical buffer length for constant-time comparison
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

type RateLimitRecord = {
  attempts: number;
  resetAt: number;
};

const ipAttempts = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  ip: string,
  maxAttempts = 5,
  windowMs = 10 * 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const record = ipAttempts.get(ip);

  if (!record || now > record.resetAt) {
    ipAttempts.set(ip, { attempts: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: 0 };
  }

  if (record.attempts >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  record.attempts += 1;
  return { allowed: true, remaining: maxAttempts - record.attempts, retryAfterSeconds: 0 };
}

export function resetRateLimit(ip: string): void {
  ipAttempts.delete(ip);
}
