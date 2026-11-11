
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — NEWS RUNTIME REQUEST GUARD
   File: backend/news/news-runtime-security.mjs
   Version: 1.1.0
   Phase: 2G-AL

   Responsibilities:
   - Enforce read-only HTTP methods
   - Reject malformed request targets
   - Bound concurrent requests
   - Enforce request completion deadlines
   - Release capacity on completion or disconnection
   - Return safe, credential-free errors

   This module does not bind a network port, activate providers,
   provision infrastructure or execute financial operations.
   ========================================================================== */

const VERSION = "1.1.0";

const SECURITY_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'none'; frame-ancestors 'none'",
  "X-Frame-Options": "DENY"
});

function reject(res, status, code, allow) {
  if (res.writableEnded || res.destroyed) {
    return;
  }

  if (res.headersSent) {
    res.destroy();
    return;
  }

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(name, value);
  }

  if (allow) {
    res.setHeader("Allow", allow);
  }

  const payload = JSON.stringify({
    status: "unavailable",
    error: code
  });

  res.writeHead(status, {
    "Content-Length": Buffer.byteLength(payload)
  });

  res.end(payload);
}

export function wrapNewsRequestHandler(
  handler,
  {
    maxConcurrentRequests = 32,
    maxTargetBytes = 2048,
    requestDeadlineMs = 8000
  } = {}
) {
  if (typeof handler !== "function") {
    throw new TypeError(
      "A request handler function is required"
    );
  }

  if (
    !Number.isSafeInteger(maxConcurrentRequests) ||
    maxConcurrentRequests < 1 ||
    maxConcurrentRequests > 10000
  ) {
    throw new RangeError(
      "Invalid concurrent request limit"
    );
  }

  if (
    !Number.isSafeInteger(maxTargetBytes) ||
    maxTargetBytes < 128 ||
    maxTargetBytes > 8192
  ) {
    throw new RangeError(
      "Invalid request-target byte limit"
    );
  }

  if (
    !Number.isSafeInteger(requestDeadlineMs) ||
    requestDeadlineMs < 100 ||
    requestDeadlineMs > 60000
  ) {
    throw new RangeError(
      "Invalid request deadline"
    );
  }

  let active = 0;

  const listener = (req, res) => {
    if (
      res.headersSent ||
      res.writableEnded ||
      res.destroyed
    ) {
      return;
    }

    for (
      const [name, value] of
      Object.entries(SECURITY_HEADERS)
    ) {
      if (!res.hasHeader(name)) {
        res.setHeader(name, value);
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
      reject(
        res,
        400,
        "invalid_request_target"
      );

      return;
    }

    if (req.method !== "GET") {
      reject(
        res,
        405,
        "method_not_allowed",
        "GET"
      );

      return;
    }

    if (active >= maxConcurrentRequests) {
      reject(
        res,
        503,
        "capacity_unavailable"
      );

      return;
    }

    active += 1;

    let released = false;
    let deadline;

    const release = () => {
      if (released) {
        return;
      }

      released = true;

      clearTimeout(deadline);

      active -= 1;
    };

    res.once("finish", release);
    res.once("close", release);

    deadline = setTimeout(() => {
      if (released) {
        return;
      }

      reject(
        res,
        503,
        "request_deadline_exceeded"
      );
    }, requestDeadlineMs);

    deadline.unref?.();

    try {
      Promise.resolve(
        handler(req, res)
      ).catch(() => {
        if (!released) {
          reject(
            res,
            503,
            "service_unavailable"
          );
        }
      });
    } catch {
      if (!released) {
        reject(
          res,
          503,
          "service_unavailable"
        );
      }
    }
  };

  return Object.freeze({
    listener,

    health: () => Object.freeze({
      version: VERSION,
      activeRequests: active,
      maxConcurrentRequests,
      requestDeadlineMs,
      readOnly: true
    })
  });
}
