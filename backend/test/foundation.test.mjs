
"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../src/server.mjs";
import { loadConfig } from "../src/config.mjs";

test(
  "configuration blocks public and real-money deployment",
  () => {
    assert.throws(
      () => loadConfig({
        PAY54_ENV: "production"
      }),
      /not production-ready/
    );

    assert.throws(
      () => loadConfig({
        PAY54_REAL_MONEY_MODE: "true"
      }),
      /must be false/
    );

    assert.throws(
      () => loadConfig({
        PAY54_HOST: "0.0.0.0"
      }),
      /loopback/
    );
  }
);

test(
  "liveness is readable while readiness and payment paths fail closed",
  async () => {
    const app = createApp(
      loadConfig({
        PAY54_PORT: "0"
      })
    );

    app.listen(0, "127.0.0.1");

    await once(app, "listening");

    try {
      const base =
        `http://127.0.0.1:${app.address().port}`;

      const live = await fetch(
        `${base}/health/live`
      );

      assert.equal(
        live.status,
        200
      );

      assert.equal(
        (await live.json()).status,
        "ok"
      );

      const ready = await fetch(
        `${base}/health/ready`
      );

      assert.equal(
        ready.status,
        503
      );

      const financial = await fetch(
        `${base}/v1/financial-operations`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key":
              "testing-key-0000001"
          },
          body: "{}"
        }
      );

      assert.equal(
        financial.status,
        503
      );

      assert.equal(
        (await financial.json()).code,
        "FINANCIAL_EXECUTION_UNAVAILABLE"
      );

      const unknown = await fetch(
        `${base}/unknown`
      );

      assert.equal(
        unknown.status,
        404
      );
    } finally {
      await new Promise(
        (resolve, reject) =>
          app.close(
            error =>
              error
                ? reject(error)
                : resolve()
          )
      );
    }
  }
);
