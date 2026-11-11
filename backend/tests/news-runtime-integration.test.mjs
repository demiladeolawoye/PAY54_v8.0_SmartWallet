
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — NEWS RUNTIME INTEGRATION TESTS
   File: backend/tests/news-runtime-integration.test.mjs
   Version: 1.0.0
   Phase: 2G-AK

   Local-only integration checks.
   No external providers, cloud access or financial operations.
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import { loadConfig } from "../src/config.mjs";
import {
  createIsolatedNewsServer
} from "../news/news-server.mjs";

async function withNewsServer(callback) {
  const config = loadConfig({
    PAY54_ENV: "test",
    PAY54_HOST: "127.0.0.1",
    PAY54_PORT: "0",
    PAY54_REAL_MONEY_MODE: "false"
  });

  const server = createIsolatedNewsServer({
    config,
    environment: {
      PAY54_NEWS_ENABLED: "false",
      PAY54_REAL_MONEY_MODE: "false",
      TF_VAR_authorized_provisioning: "false"
    }
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();

    assert.ok(address);
    assert.equal(address.address, "127.0.0.1");

    return await callback(
      `http://127.0.0.1:${address.port}`,
      server
    );
  } finally {
    server.closeAllConnections();

    await new Promise((resolve, reject) => {
      server.close(error => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

test(
  "isolated news runtime enforces read-only HTTP methods",
  async () => {
    await withNewsServer(async baseUrl => {
      const response = await fetch(
        `${baseUrl}/api/v1/news`,
        { method: "POST" }
      );

      assert.equal(response.status, 405);
      assert.equal(
        response.headers.get("allow"),
        "GET"
      );

      const body = await response.json();

      assert.equal(
        body.error,
        "method_not_allowed"
      );
    });
  }
);

test(
  "isolated news runtime rejects oversized request targets",
  async () => {
    await withNewsServer(async baseUrl => {
      const response = await fetch(
        `${baseUrl}/api/v1/news?value=${"x".repeat(2200)}`
      );

      assert.equal(response.status, 400);

      const body = await response.json();

      assert.equal(
        body.error,
        "invalid_request_target"
      );
    });
  }
);

test(
  "isolated news runtime retains disabled provider and security headers",
  async () => {
    await withNewsServer(async baseUrl => {
      const live = await fetch(
        `${baseUrl}/health/live`
      );

      assert.equal(live.status, 200);
      assert.equal(
        live.headers.get("x-content-type-options"),
        "nosniff"
      );
      assert.equal(
        live.headers.get("cache-control"),
        "no-store"
      );
      assert.equal(
        live.headers.get("x-frame-options"),
        "DENY"
      );

      const health = await live.json();

      assert.equal(health.providerEnabled, false);
      assert.equal(
        health.financialExecutionEnabled,
        false
      );

      const feed = await fetch(
        `${baseUrl}/api/v1/news`
      );

      assert.equal(feed.status, 503);

      const result = await feed.json();

      assert.equal(result.status, "unavailable");
      assert.deepEqual(result.items, []);

      const ready = await fetch(
        `${baseUrl}/health/ready`
      );

      assert.equal(ready.status, 503);
    });
  }
);
