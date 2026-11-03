/**
 * Tiny fixed-window rate limiter for Express, keyed by client IP.
 * Owner: Razee Nepal
 *
 * In-memory only: counts reset when the server restarts and are not shared
 * between processes. That is fine for the single-process backend we run
 * today; swap for a shared store if the backend is ever scaled out.
 *
 * Behind a reverse proxy, set `app.set("trust proxy", ...)` so req.ip is the
 * real client and not the proxy, otherwise everyone shares one bucket.
 */

/**
 * @param {Object} options
 * @param {number} options.windowMs  length of each window
 * @param {number} options.max       requests allowed per key per window
 * @param {string} [options.error]   value for the response's `error` field
 * @param {string} [options.message] human-readable message for the response
 * @param {() => number} [options.now] clock, injectable for tests
 */
export function createRateLimiter({ windowMs, max, error = "rate_limited", message, now = Date.now }) {
  const hits = new Map(); // key -> { count, resetAt }

  function sweep(t) {
    for (const [key, entry] of hits) {
      if (entry.resetAt <= t) hits.delete(key);
    }
  }

  return function rateLimit(req, res, next) {
    const t = now();
    // Bound memory: drop expired entries whenever the table gets large.
    if (hits.size > 5000) sweep(t);

    const key = req.ip ?? "unknown";
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - t) / 1000));
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        error,
        message: message ?? "Too many requests. Please try again later.",
        retryAfterSeconds,
      });
    }
    next();
  };
}
