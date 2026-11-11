
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — ISOLATED FINANCIAL NEWS SERVER
   File: backend/news/news-server.mjs
   Version: 1.0.0
   Phase: 2G-AJ

   Local development and test runtime only.

   Security boundaries:
   - No staging or production startup
   - Loopback binding only
   - Provider activation explicitly prohibited
   - No external news requests
   - No financial operations
   - No cloud provisioning
   - No credentials exposed through HTTP
   ========================================================================== */

import { createServer } from "node:http";
import { isIP } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "../src/config.mjs";
import { createNewsIntegration } from "./news-integration.mjs";

const VERSION = "1.0.0";
const SERVICE_NAME = "pay54-isolated-news";

const RESPONSE_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'none'; frame-ancestors 'none'",
  "X-Frame-Options": "DENY"
});

function writeResponse(res, statusCode, payload) {
  const body = JSON.stringify(payload);

  res.writeHead(statusCode, {
    ...RESPONSE_HEADERS,
    "Content-Length": Buffer.byteLength(body)
  });

  res.end(body);
}

function validateRuntime(config, environment) {
  if (
    !config ||
    typeof config !== "object" ||
    !environment ||
    typeof environment !== "object"
  ) {
    throw new TypeError(
      "Valid runtime configuration is required"
    );
  }

  if (
    config.mode !== "development" &&
    config.mode !== "test"
  ) {
    throw new Error(
      "PAY54 news runtime refuses staging and production"
    );
  }

  if (
    config.host !== "127.0.0.1" &&
    config.host !== "::1"
  ) {
    throw new Error(
      "PAY54 news runtime requires loopback binding"
    );
  }

  if (!isIP(config.host)) {
    throw new Error(
      "PAY54 news runtime requires a valid loopback IP"
    );
  }

  if (
    !Number.isInteger(config.port) ||
    config.port < 0 ||
    config.port > 65535
  ) {
    throw new RangeError(
      "Invalid local news server port"
    );
  }

  if (config.realMoneyMode !== false) {
    throw new Error(
      "Financial execution must remain disabled"
    );
  }

  if (
    environment.PAY54_NEWS_ENABLED !== undefined &&
    environment.PAY54_NEWS_ENABLED !== "false" &&
    environment.PAY54_NEWS_ENABLED !== ""
  ) {
    throw new Error(
      "External news activation is not authorised"
    );
  }

  if (
    environment.PAY54_REAL_MONEY_MODE !== undefined &&
    environment.PAY54_REAL_MONEY_MODE !== "false"
  ) {
    throw new Error(
      "Financial execution is not authorised"
    );
  }

  if (
    environment.TF_VAR_authorized_provisioning !== undefined &&
    environment.TF_VAR_authorized_provisioning !== "false"
  ) {
    throw new Error(
      "Cloud provisioning is not authorised"
    );
  }
}

export function createIsolatedNewsServer({
  config = loadConfig(),
  environment = process.env
} = {}) {
  validateRuntime(config, environment);

  const integration = createNewsIntegration({
    environment: {
      PAY54_NEWS_ENABLED: "false",
      PAY54_NEWS_RIGHTS_VERIFIED: "false"
    }
  });

  if (integration.enabled !== false) {
    throw new Error(
      "News integration must remain disabled"
    );
  }

  const server = createServer((req, res) => {
    const pathname = (req.url ?? "").split("?", 1)[0];

    if (pathname === "/health/live") {
      if (req.method !== "GET") {
        writeResponse(res, 405, {
          error: "method_not_allowed"
        });
        return;
      }

      writeResponse(res, 200, {
        status: "ok",
        service: SERVICE_NAME,
        version: VERSION,
        mode: config.mode,
        providerEnabled: false,
        financialExecutionEnabled: false,
        cloudProvisioningEnabled: false
      });

      return;
    }

    if (pathname === "/health/ready") {
      writeResponse(res, 503, {
        status: "not_ready",
        service: SERVICE_NAME,
        reason: "PROVIDER_ACTIVATION_NOT_AUTHORISED"
      });

      return;
    }

    if (pathname === integration.route) {
      Promise.resolve()
        .then(() => integration.handleRequest(req, res))
        .catch(() => {
          if (!res.headersSent) {
            writeResponse(res, 503, {
              status: "unavailable",
              items: [],
              updatedAt: null,
              count: 0
            });
          } else if (!res.writableEnded) {
            res.end();
          }
        });

      return;
    }

    writeResponse(res, 404, {
      error: "route_not_found"
    });
  });

  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 100;

  return server;
}

export async function startIsolatedNewsServer({
  config = loadConfig(),
  environment = process.env
} = {}) {
  const server = createIsolatedNewsServer({
    config,
    environment
  });

  await new Promise((resolveStart, rejectStart) => {
    const onError = error => {
      server.off("listening", onListening);
      rejectStart(error);
    };

    const onListening = () => {
      server.off("error", onError);
      resolveStart();
    };

    server.once("error", onError);
    server.once("listening", onListening);

    server.listen(config.port, config.host);
  });

  console.info(
    "[PAY54_NEWS] Local isolated runtime started; " +
    "provider disabled; financial execution disabled"
  );

  return server;
}

const isDirectExecution =
  typeof process.argv[1] === "string" &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  startIsolatedNewsServer().catch(error => {
    console.error(
      "[PAY54_NEWS] Startup refused:",
      error.message
    );

    process.exitCode = 1;
  });
}
