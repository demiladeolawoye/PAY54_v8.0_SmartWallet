
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — NEWS SERVER STARTUP
   File: backend/server/start-news-server.mjs
   Version: 1.0.0

   Current release: isolated development/runtime readiness.
   Real provider activation and public network binding prohibited.
   ========================================================================== */

import {
  createPay54NewsServer
} from "./news-server.mjs";

const HOST = "127.0.0.1";

function readPort(value) {
  const text = value ?? "8080";

  if (!/^[0-9]{1,5}$/.test(text)) {
    throw new TypeError(
      "PAY54_NEWS_PORT must be an integer from 1 to 65535"
    );
  }

  const port = Number(text);

  if (port < 1 || port > 65535) {
    throw new RangeError(
      "PAY54_NEWS_PORT is outside the valid range"
    );
  }

  return port;
}

export async function startNewsServer(
  environment = process.env
) {
  if (
    environment.PAY54_NEWS_ENABLED !== undefined &&
    environment.PAY54_NEWS_ENABLED !== "false"
  ) {
    throw new Error(
      "Live provider activation is not permitted by this startup entry point"
    );
  }

  const port = readPort(
    environment.PAY54_NEWS_PORT
  );

  const runtime = createPay54NewsServer({
    environment: {
      PAY54_NEWS_ENABLED: "false",
      PAY54_NEWS_RIGHTS_VERIFIED: "false"
    }
  });

  await new Promise((resolve, reject) => {
    runtime.server.once("error", reject);

    runtime.server.listen(port, HOST, () => {
      runtime.server.off("error", reject);
      resolve();
    });
  });

  console.info(
    `[PAY54 NEWS] Isolated read-only service listening on ${HOST}:${port}`
  );

  console.info(
    "[PAY54 NEWS] External provider disabled. No live article delivery."
  );

  return runtime;
}

if (
  process.argv[1] &&
  import.meta.url === new URL(
    `file://${process.argv[1]}`
  ).href
) {
  startNewsServer().catch(() => {
    console.error(
      "[PAY54 NEWS] Startup refused or unavailable"
    );

    process.exitCode = 1;
  });
}
