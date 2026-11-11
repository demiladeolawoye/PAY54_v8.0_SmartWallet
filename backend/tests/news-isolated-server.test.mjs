
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — ISOLATED NEWS SERVER TESTS
   File: backend/tests/news-isolated-server.test.mjs
   Version: 1.0.0
   Phase: 2G-AJ
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import { loadConfig } from "../src/config.mjs";
import {
  createIsolatedNewsServer
} from "../news/news-server.mjs";

function testConfig() {
  return loadConfig({
    PAY54_ENV: "test",
    PAY54_HOST: "127.0.0.1",
    PAY54_PORT: "0",
    PAY54_REAL_MONEY_MODE: "false"
  });
}

function createTestServer(environment = {}) {
  return createIsolatedNewsServer({
    config: testConfig(),
    environment
  });
}

async function withServer(callback) {
  const server = createTestServer();

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    const baseUrl =
      `http://127.0.0.1:${address.port}`;

    await callback(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

test(
  "local liveness reports disabled financial and news execution",
  async () => {
    await withServer(async baseUrl => {
      const response = await fetch(
        `${baseUrl}/health/live`
      );

      assert.equal(response.status, 200);

      const body = await response.json();

      assert.equal(body.status, "ok");
      assert.equal(body.mode, "test");
      assert.equal(body.providerEnabled, false);
      assert.equal(
        body.financialExecutionEnabled,
        false
      );
      assert.equal(
        body.cloudProvisioningEnabled,
        false
      );
    });
  }
);

test(
  "news endpoint remains unavailable",
  async () => {
    await withServer(async baseUrl => {
      const response = await fetch(
        `${baseUrl}/api/v1/news`
      );

      assert.equal(response.status, 503);

      const body = await response.json();

      assert.deepEqual(body.items, []);
      assert.equal(body.status, "unavailable");
      assert.equal(body.count, 0);
    });
  }
);

test(
  "readiness never claims provider readiness",
  async () => {
    await withServer(async baseUrl => {
      const response = await fetch(
        `${baseUrl}/health/ready`
      );

      assert.equal(response.status, 503);

      const body = await response.json();

      assert.equal(body.status, "not_ready");
    });
  }
);

test(
  "financial routes are not implemented",
  async () => {
    await withServer(async baseUrl => {
      const response = await fetch(
        `${baseUrl}/v1/financial-operations`
      );

      assert.equal(response.status, 404);
    });
  }
);

test(
  "unauthorised external provider activation is rejected",
  () => {
    assert.throws(
      () => createTestServer({
        PAY54_NEWS_ENABLED: "true"
      }),
      /not authorised/
    );
  }
);

test(
  "unauthorised cloud provisioning is rejected",
  () => {
    assert.throws(
      () => createTestServer({
        TF_VAR_authorized_provisioning: "true"
      }),
      /not authorised/
    );
  }
);

test(
  "staging and production configurations are rejected",
  () => {
    for (const mode of [
      "staging",
      "production"
    ]) {
      assert.throws(
        () => createIsolatedNewsServer({
          config: {
            ...testConfig(),
            mode
          },
          environment: {}
        }),
        /refuses staging and production/
      );
    }
  }
);

test(
  "public network binding is rejected",
  () => {
    assert.throws(
      () => createIsolatedNewsServer({
        config: {
          ...testConfig(),
          host: "0.0.0.0"
        },
        environment: {}
      }),
      /loopback/
    );
  }
);
