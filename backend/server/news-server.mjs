
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — READ-ONLY NEWS HTTP SERVER
   File: backend/server/news-server.mjs
   Version: 1.0.0

   - Node.js 22+ HTTP transport
   - Reuses the trusted news integration
   - Explicit route allowlist
   - Bounded concurrent requests
   - Read-only security headers
   - No CORS wildcard
   - No wallet, ledger or transaction access
   - No automatic network listener
   ========================================================================== */

import http from "node:http";

import {
  createNewsIntegration
} from "../news/news-integration.mjs";

const VERSION = "1.0.0";
const HEALTH_PATH = "/health/live";
const NEWS_PATH = "/api/v1/news";

const DEFAULT_MAX_ACTIVE = 32;

function sendJson(res, status, payload, extraHeaders = {}) {
  if (res.headersSent || res.destroyed) {
    return;
  }

  const body = JSON.stringify(payload);

  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=()",
    ...extraHeaders
  });

  res.end(body);
}

export function createPay54NewsServer({
  environment = {},
  fetchImpl,
  now,
  integration,
  maxActiveRequests = DEFAULT_MAX_ACTIVE
} = {}) {
  if (
    !Number.isSafeInteger(maxActiveRequests) ||
    maxActiveRequests < 1 ||
    maxActiveRequests > 256
  ) {
    throw new RangeError(
      "Invalid maximum concurrent requests"
    );
  }

  const newsIntegration = integration ??
    createNewsIntegration({
      environment,
      ...(fetchImpl === undefined ? {} : { fetchImpl }),
      ...(now === undefined ? {} : { now })
    });

  if (
    !newsIntegration ||
    typeof newsIntegration.handleRequest !== "function"
  ) {
    throw new TypeError(
      "Valid news integration required"
    );
  }

  let activeRequests = 0;

  const server = http.createServer(async (req, res) => {
    if (activeRequests >= maxActiveRequests) {
      sendJson(res, 503, {
        error: "temporarily_unavailable"
      }, {
        "Retry-After": "5"
      });

      return;
    }

    activeRequests++;

    try {
      const pathname = new URL(
        req.url || "/",
        "http://localhost"
      ).pathname;

      if (pathname === HEALTH_PATH) {
        if (req.method !== "GET") {
          sendJson(
            res,
            405,
            { error: "method_not_allowed" },
            { Allow: "GET" }
          );
          return;
        }

        sendJson(res, 200, {
          service: "pay54-news",
          version: VERSION,
          status: "running",
          financialExecution: "disabled"
        });

        return;
      }

      if (pathname !== NEWS_PATH) {
        sendJson(res, 404, {
          error: "not_found"
        });

        return;
      }

      /*
       * The existing trusted handler owns GET validation,
       * article selection, response shape and availability.
       */
      const handled =
        await newsIntegration.handleRequest(req, res);

      if (!handled && !res.headersSent) {
        sendJson(res, 404, {
          error: "not_found"
        });
      }
    } catch {
      sendJson(res, 503, {
        error: "service_unavailable"
      });
    } finally {
      activeRequests--;
    }
  });

  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 64;

  return Object.freeze({
    version: VERSION,
    server,
    integration: newsIntegration,

    health: () => Object.freeze({
      version: VERSION,
      listening: server.listening,
      activeRequests,
      maxActiveRequests,
      providerEnabled:
        newsIntegration.enabled === true
    })
  });
}
