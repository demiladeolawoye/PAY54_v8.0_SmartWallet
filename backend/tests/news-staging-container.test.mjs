
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — STAGING CONTAINER READINESS TESTS
   File: backend/tests/news-staging-container.test.mjs
   Version: 1.0.0

   Synthetic, local tests only.
   No external provider calls or financial record changes.
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";

import {
  validateStagingEnvironment,
  startStagingNewsServer
} from "../server/start-staging-news-server.mjs";

function environment(overrides = {}) {
  return {
    PAY54_DEPLOYMENT_ENV: "staging",
    PAY54_NEWS_ENABLED: "false",
    PAY54_NEWS_RIGHTS_VERIFIED: "false",
    PAY54_FINANCIAL_EXECUTION_ENABLED: "false",
    PAY54_CUSTOMER_DATA_ENABLED: "false",
    PORT: "8080",
    ...overrides
  };
}

async function unusedPort() {
  const listener = net.createServer();

  await new Promise((resolve, reject) => {
    listener.once("error", reject);

    listener.listen(
      0,
      "127.0.0.1",
      resolve
    );
  });

  const port = listener.address().port;

  await new Promise((resolve, reject) => {
    listener.close(error => {
      if (error) reject(error);
      else resolve();
    });
  });

  return port;
}

test(
  "accepts explicit isolated staging settings",
  () => {
    const result =
      validateStagingEnvironment(
        environment()
      );

    assert.equal(
      result.environment,
      "staging"
    );

    assert.equal(
      result.host,
      "0.0.0.0"
    );

    assert.equal(
      result.port,
      8080
    );

    assert.equal(
      result.newsEnabled,
      false
    );
  }
);

test(
  "rejects production and undeclared environments",
  () => {
    for (const deployment of [
      "production",
      "development",
      "",
      undefined
    ]) {
      assert.throws(
        () => validateStagingEnvironment(
          environment({
            PAY54_DEPLOYMENT_ENV:
              deployment
          })
        ),
        /staging environment required/
      );
    }
  }
);

test(
  "rejects enabled provider and financial capabilities",
  () => {
    for (const name of [
      "PAY54_NEWS_ENABLED",
      "PAY54_NEWS_RIGHTS_VERIFIED",
      "PAY54_FINANCIAL_EXECUTION_ENABLED",
      "PAY54_CUSTOMER_DATA_ENABLED"
    ]) {
      assert.throws(
        () => validateStagingEnvironment(
          environment({
            [name]: "true"
          })
        ),
        /must remain disabled/
      );
    }
  }
);

test(
  "rejects malformed and unsafe ports",
  () => {
    for (const port of [
      "0",
      "65536",
      "-1",
      "abc",
      "8080.5",
      "80 80",
      ""
    ]) {
      assert.throws(
        () => validateStagingEnvironment(
          environment({ PORT: port })
        )
      );
    }
  }
);

test(
  "staging starts a real read-only HTTP server",
  async () => {
    const port = await unusedPort();

    const application =
      await startStagingNewsServer(
        environment({
          PORT: String(port)
        })
      );

    try {
      assert.equal(
        application.host,
        "0.0.0.0"
      );

      assert.equal(
        application.runtime.server.listening,
        true
      );

      const health = await fetch(
        `http://127.0.0.1:${port}/health/live`
      );

      assert.equal(
        health.status,
        200
      );

      const healthBody =
        await health.json();

      assert.equal(
        healthBody.service,
        "pay54-news"
      );

      assert.equal(
        healthBody.financialExecution,
        "disabled"
      );

      const news = await fetch(
        `http://127.0.0.1:${port}/api/v1/news`
      );

      assert.equal(
        news.status,
        503
      );

      const newsBody =
        await news.json();

      assert.equal(
        newsBody.status,
        "unavailable"
      );

      assert.deepEqual(
        newsBody.items,
        []
      );
    } finally {
      await application.stop();
    }

    assert.equal(
      application.runtime.server.listening,
      false
    );
  }
);

test(
  "staging does not expose financial mutation routes",
  async () => {
    const port = await unusedPort();

    const application =
      await startStagingNewsServer(
        environment({
          PORT: String(port)
        })
      );

    try {
      for (const path of [
        "/api/v1/wallets",
        "/api/v1/transfers",
        "/api/v1/ledger",
        "/api/v1/cards",
        "/admin"
      ]) {
        const response = await fetch(
          `http://127.0.0.1:${port}${path}`
        );

        assert.equal(
          response.status,
          404
        );
      }
    } finally {
      await application.stop();
    }
  }
);

test(
  "staging launcher rejects provider activation before listening",
  async () => {
    await assert.rejects(
      startStagingNewsServer(
        environment({
          PAY54_NEWS_ENABLED: "true"
        })
      ),
      /must remain disabled/
    );
  }
);
