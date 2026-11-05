
"use strict";

/* ==========================================================================
   PAY54 NEWS SERVER TESTS
   File: backend/tests/news-server.test.mjs
   Version: 1.0.0

   All HTTP requests use a temporary local loopback server.
   No real provider, credentials, or financial data are used.
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";

import {
  createPay54NewsServer
} from "../server/news-server.mjs";

import {
  startNewsServer
} from "../server/start-news-server.mjs";

async function withServer(options, execute) {
  const runtime = createPay54NewsServer(options);

  await new Promise((resolve, reject) => {
    runtime.server.once("error", reject);

    runtime.server.listen(
      0,
      "127.0.0.1",
      () => {
        runtime.server.off("error", reject);
        resolve();
      }
    );
  });

  const address = runtime.server.address();
  const base = `http://127.0.0.1:${address.port}`;

  try {
    await execute(base, runtime);
  } finally {
    runtime.server.closeAllConnections();

    await new Promise((resolve, reject) => {
      runtime.server.close(error => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

test(
  "default startup keeps news integration disabled",
  async () => {
    await withServer(
      { environment: {} },
      async (base, runtime) => {
        assert.equal(
          runtime.health().providerEnabled,
          false
        );

        const response = await fetch(
          `${base}/api/v1/news`
        );

        assert.equal(response.status, 503);

        const body = await response.json();

        assert.equal(
          body.status,
          "unavailable"
        );

        assert.deepEqual(body.items, []);
      }
    );
  }
);

test(
  "health endpoint is read-only and discloses no secrets",
  async () => {
    await withServer(
      { environment: {} },
      async base => {
        const response = await fetch(
          `${base}/health/live`
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.service, "pay54-news");
        assert.equal(body.status, "running");
        assert.equal(
          body.financialExecution,
          "disabled"
        );

        assert.equal(
          response.headers.get(
            "cache-control"
          ),
          "no-store"
        );

        assert.equal(
          response.headers.get(
            "x-content-type-options"
          ),
          "nosniff"
        );

        assert.equal(
          response.headers.get(
            "access-control-allow-origin"
          ),
          null
        );
      }
    );
  }
);

test(
  "non-approved routes return 404",
  async () => {
    await withServer(
      { environment: {} },
      async base => {
        for (const path of [
          "/api/v1/wallets",
          "/api/v1/transfers",
          "/api/v1/news/other",
          "/admin"
        ]) {
          const response = await fetch(
            `${base}${path}`
          );

          assert.equal(response.status, 404);
        }
      }
    );
  }
);

test(
  "news and health routes reject write methods",
  async () => {
    await withServer(
      { environment: {} },
      async base => {
        for (const path of [
          "/health/live",
          "/api/v1/news"
        ]) {
          const response = await fetch(
            `${base}${path}`,
            { method: "POST" }
          );

          assert.equal(response.status, 405);
          assert.equal(
            response.headers.get("allow"),
            "GET"
          );
        }
      }
    );
  }
);

test(
  "provider errors return safe unavailable responses",
  async () => {
    const integration = {
      enabled: false,

      handleRequest: async () => {
        throw new Error(
          "private-upstream-credential"
        );
      }
    };

    await withServer(
      { integration },
      async base => {
        const response = await fetch(
          `${base}/api/v1/news`
        );

        assert.equal(response.status, 503);

        const body = await response.text();

        assert.equal(
          body.includes(
            "private-upstream-credential"
          ),
          false
        );
      }
    );
  }
);

test(
  "rejects invalid concurrency configuration",
  () => {
    assert.throws(
      () => createPay54NewsServer({
        environment: {},
        maxActiveRequests: 0
      }),
      RangeError
    );

    assert.throws(
      () => createPay54NewsServer({
        environment: {},
        maxActiveRequests: 257
      }),
      RangeError
    );
  }
);

test(
  "excess concurrent requests receive 503",
  async () => {
    let unblock;
    let entered;

    const enteredPromise = new Promise(
      resolve => { entered = resolve; }
    );

    const releasePromise = new Promise(
      resolve => { unblock = resolve; }
    );

    const integration = {
      enabled: false,

      handleRequest: async (_req, res) => {
        entered();
        await releasePromise;

        res.writeHead(200, {
          "Content-Type": "application/json"
        });

        res.end(
          JSON.stringify({ status: "fresh" })
        );

        return true;
      }
    };

    await withServer(
      {
        integration,
        maxActiveRequests: 1
      },
      async base => {
        const first = fetch(
          `${base}/api/v1/news`
        );

        await enteredPromise;

        try {
          const second = await fetch(
            `${base}/api/v1/news`
          );

          assert.equal(second.status, 503);

          assert.equal(
            second.headers.get("retry-after"),
            "5"
          );
        } finally {
          unblock();
        }

        const firstResponse = await first;

        assert.equal(firstResponse.status, 200);
      }
    );
  }
);

test(
  "production-style activation is refused by isolated launcher",
  async () => {
    await assert.rejects(
      startNewsServer({
        PAY54_NEWS_ENABLED: "true",
        PAY54_NEWS_PORT: "8080"
      }),
      /not permitted/
    );

    await assert.rejects(
      startNewsServer({
        PAY54_NEWS_ENABLED: "false",
        PAY54_NEWS_PORT: "invalid"
      }),
      /PORT/
    );
  }
);
