
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — ISOLATED STAGING NEWS LAUNCHER
   File: backend/server/start-staging-news-server.mjs
   Version: 1.0.0

   Cloud Run-compatible HTTP listener.
   News provider, financial execution and customer data disabled.
   Does not create infrastructure or grant public access.
   ========================================================================== */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createPay54NewsServer
} from "./news-server.mjs";

const VERSION = "1.0.0";
const HOST = "0.0.0.0";
const DEFAULT_PORT = 8080;

function assertDisabled(environment, name) {
  const value = environment[name];

  if (
    value !== undefined &&
    value !== "false"
  ) {
    throw new Error(
      `${name} must remain disabled in staging`
    );
  }
}

export function validateStagingEnvironment(
  environment
) {
  if (
    !environment ||
    typeof environment !== "object" ||
    Array.isArray(environment)
  ) {
    throw new TypeError(
      "A staging environment is required"
    );
  }

  if (
    environment.PAY54_DEPLOYMENT_ENV !==
    "staging"
  ) {
    throw new Error(
      "PAY54 staging environment required"
    );
  }

  for (const name of [
    "PAY54_NEWS_ENABLED",
    "PAY54_NEWS_RIGHTS_VERIFIED",
    "PAY54_FINANCIAL_EXECUTION_ENABLED",
    "PAY54_CUSTOMER_DATA_ENABLED"
  ]) {
    assertDisabled(environment, name);
  }

  const rawPort = environment.PORT ??
    String(DEFAULT_PORT);

  if (
    typeof rawPort !== "string" ||
    !/^[0-9]{1,5}$/u.test(rawPort)
  ) {
    throw new TypeError(
      "Invalid staging PORT"
    );
  }

  const port = Number(rawPort);

  if (
    !Number.isSafeInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new RangeError(
      "Staging PORT must be between 1 and 65535"
    );
  }

  return Object.freeze({
    environment: "staging",
    host: HOST,
    port,
    newsEnabled: false,
    financialExecutionEnabled: false
  });
}

export async function startStagingNewsServer(
  environment = process.env
) {
  const configuration =
    validateStagingEnvironment(environment);

  const runtime = createPay54NewsServer({
    environment: {
      PAY54_NEWS_ENABLED: "false",
      PAY54_NEWS_RIGHTS_VERIFIED: "false"
    }
  });

  try {
    await new Promise((resolveStartup, reject) => {
      function onError(error) {
        runtime.server.off(
          "listening",
          onListening
        );
        reject(error);
      }

      function onListening() {
        runtime.server.off(
          "error",
          onError
        );
        resolveStartup();
      }

      runtime.server.once(
        "error",
        onError
      );

      runtime.server.once(
        "listening",
        onListening
      );

      runtime.server.listen(
        configuration.port,
        configuration.host
      );
    });
  } catch {
    if (runtime.server.listening) {
      runtime.server.close();
    }

    throw new Error(
      "PAY54 staging news server startup failed"
    );
  }

  return Object.freeze({
    version: VERSION,
    runtime,
    host: configuration.host,
    port: configuration.port,

    async stop() {
      if (!runtime.server.listening) {
        return;
      }

      runtime.server.closeIdleConnections();

      await new Promise((resolveStop, reject) => {
        runtime.server.close(error => {
          if (error) {
            reject(error);
          } else {
            resolveStop();
          }
        });
      });
    }
  });
}

async function main() {
  const application =
    await startStagingNewsServer();

  console.info(
    `[PAY54 NEWS] Staging listener ready on port ${application.port}`
  );

  console.info(
    "[PAY54 NEWS] Provider, financial execution and customer data disabled"
  );

  let shuttingDown = false;

  async function shutdown() {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    const emergencyExit = setTimeout(() => {
      process.exit(1);
    }, 8000);

    emergencyExit.unref();

    try {
      await application.stop();
      clearTimeout(emergencyExit);
      process.exitCode = 0;
    } catch {
      clearTimeout(emergencyExit);
      process.exitCode = 1;
    }
  }

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

const isEntryPoint =
  typeof process.argv[1] === "string" &&
  resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url);

if (isEntryPoint) {
  main().catch(() => {
    console.error(
      "[PAY54 NEWS] Staging startup rejected"
    );

    process.exitCode = 1;
  });
}
