
"use strict";

/**
 * PAY54 Enterprise — News Runtime Request Guard
 * File: backend/news/news-runtime-security.mjs
 * Version: 1.0.0
 * Phase: 2G-AK
 *
 * A non-provisioning, provider-independent request-listener wrapper.
 * Does not bind ports, enable news providers or accept financial instructions.
 */

const SECURITY_HEADERS = Object.freeze({
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  "x-frame-options": "DENY"
});

function reject(res, status, code, allow) {
  if (res.headersSent || res.writableEnded) return;

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'"
  );
  res.setHeader("X-Frame-Options", "DENY");

  if (allow) res.setHeader("Allow", allow);

  const payload = JSON.stringify({
    status: "unavailable",
    error: code
  });

  res.writeHead(status, {
    "Content-Length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

export function wrapNewsRequestHandler(handler, {
  maxConcurrentRequests = 32,
  maxTargetBytes = 2048
} = {}) {
  if (typeof handler !== "function") {
    throw new TypeError("A request handler function is required");
  }

  if (
    !Number.isSafeInteger(maxConcurrentRequests) ||
    maxConcurrentRequests < 1 ||
    maxConcurrentRequests > 10000
  ) {
    throw new RangeError("Invalid concurrent request limit");
  }

  if (
    !Number.isSafeInteger(maxTargetBytes) ||
    maxTargetBytes < 128 ||
    maxTargetBytes > 8192
  ) {
    throw new RangeError("Invalid request-target byte limit");
  }

  let active = 0;

  const listener = (req, res) => {
    if (res.headersSent || res.writableEnded) return;

    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      if (!res.hasHeader(key)) {
        res.setHeader(key, value);
      }
    }

    const target = req.url;

    if (
      typeof target !== "string" ||
      !target.startsWith("/") ||
      Buffer.byteLength(target, "utf8") > maxTargetBytes ||
      /[\u0000-\u0020\u007F\\]/u.test(target) ||
      target.startsWith("//") ||
      target.includes("#")
    ) {
      reject(res, 400, "invalid_request_target");
      return;
    }

    // All routes protected by this wrapper must be read-only.
    if (req.method !== "GET") {
      reject(res, 405, "method_not_allowed", "GET");
      return;
    }

    if (active >= maxConcurrentRequests) {
      reject(res, 503, "capacity_unavailable");
      return;
    }

    active += 1;

    let released = false;

    const release = () => {
      if (released) return;
      released = true;
      active -= 1;
    };

    res.once("finish", release);
    res.once("close", release);

    try {
      Promise.resolve(handler(req, res)).catch(() => {
        reject(res, 503, "service_unavailable");
      });
    } catch {
      reject(res, 503, "service_unavailable");
    }
  };

  return Object.freeze({
    listener,

    health: () => Object.freeze({
      version: "1.0.0",
      activeRequests: active,
      maxConcurrentRequests,
      readOnly: true
    })
  });
}
