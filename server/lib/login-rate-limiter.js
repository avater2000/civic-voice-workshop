const DEFAULT_MAX_FAILURES = 5;
const DEFAULT_WINDOW_MS = 60_000;

export function createLoginRateLimiter({
  maxFailures = DEFAULT_MAX_FAILURES,
  windowMs = DEFAULT_WINDOW_MS,
  now = () => Date.now(),
} = {}) {
  const attempts = new Map();

  function getActiveAttempt(key) {
    const attempt = attempts.get(key);
    if (!attempt || attempt.resetAt <= now()) {
      attempts.delete(key);
      return null;
    }
    return attempt;
  }

  return {
    isLimited(key) {
      const attempt = getActiveAttempt(key);
      if (!attempt || attempt.failures < maxFailures) return false;
      return Math.ceil((attempt.resetAt - now()) / 1000);
    },
    recordFailure(key) {
      const attempt = getActiveAttempt(key) ?? { failures: 0, resetAt: now() + windowMs };
      attempt.failures += 1;
      attempts.set(key, attempt);
    },
    clear(key) {
      attempts.delete(key);
    },
  };
}
