
"use strict";

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.mjs";

const NO_STORE = Object.freeze({
  "cache-control": "no-store",
  "content-type": "application/problem+json; charset=utf-8",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "content-security-policy":
    "default-src 'none'; frame-ancestors 'none'",
  "x-frame-options": "DENY"
});

function writeJson(
  res,
  status,
  object,
  contentType = "application/problem+json; charset=utf-8"
) {
  const body = JSON.stringify(object);

  res.writeHead(status, {
    ...NO_STORE,
    "content-type": contentType,
    "content-length": Buffer.byteLength(body)
  });

  res.end(body);
}

function problem(status, code, title, correlationId) {
  return {
    type: "about:blank",
    title,
    status,
    code,
    correlationId
  };
}

export function createApp(config = loadConfig()) {
  const server = createServer((req, res) => {
    const correlationId = randomUUID();

    res.setHeader(
      "x-correlation-id",
      correlationId
    );

    /*
     * This foundation intentionally does not accept,
     * validate, store or execute financial instructions.
     */

    if (
      req.url === "/health/live" &&
      req.method === "GET"
    ) {
      writeJson(
        res,
        200,
        {
          status: "ok",
          service: "pay54-backend",
          mode: config.mode
        },
        "application/json; charset=utf-8"
      );

      return;
    }

    if (
      req.url === "/health/ready" &&
      req.method === "GET"
    ) {
      writeJson(
        res,
        503,
        problem(
          503,
          "BACKEND_NOT_READY",
          "Financial dependencies are not provisioned",
          correlationId
        )
      );

      return;
    }

    if (
      req.url
        ?.split("?")[0]
        ?.startsWith("/v1/financial-operations")
    ) {
      writeJson(
        res,
        503,
        problem(
          503,
          "FINANCIAL_EXECUTION_UNAVAILABLE",
          "Financial operations are not available",
          correlationId
        )
      );

      return;
    }

    writeJson(
      res,
      404,
      problem(
        404,
        "ROUTE_NOT_FOUND",
        "Route not found",
        correlationId
      )
    );
  });

  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 100;

  return server;
}

export async function start(
  config = loadConfig()
) {
  const server = createApp(config);

  await new Promise((resolve, reject) => {
    server.once("error", reject);

    server.listen(
      config.port,
      config.host,
      resolve
    );
  });

  console.info(
    "[PAY54_BACKEND] Foundation listening on loopback; financial execution disabled"
  );

  return server;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1]
) {
  start().catch(error => {
    console.error(
      "[PAY54_BACKEND] Startup refused:",
      error.message
    );

    process.exitCode = 1;
  });
}
