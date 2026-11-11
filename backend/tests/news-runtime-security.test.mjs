
"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";

import {
  wrapNewsRequestHandler
} from "../news/news-runtime-security.mjs";

async function withServer(handler, action, options) {
  const guard = wrapNewsRequestHandler(handler, options);
  const server = createServer(guard.listener);

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const { port } = server.address();

    return await action(
      `http://127.0.0.1:${port}`,
      guard
    );
  } finally {
    server.closeAllConnections();

    await new Promise((resolve, reject) =>
      server.close(error =>
        error ? reject(error) : resolve()
      )
    );
  }
}

test(
  "read-only GET delegates and supplies security headers",
  async () => {
    await withServer(
      (_req, res) => res.end('{"status":"ok"}'),
      async base => {
        const response = await fetch(
          `${base}/health/live`
        );

        assert.equal(response.status, 200);
        assert.equal(
          (await response.json()).status,
          "ok"
        );
        assert.equal(
          response.headers.get("cache-control"),
          "no-store"
        );
        assert.equal(
          response.headers.get("x-content-type-options"),
          "nosniff"
        );
        assert.equal(
          response.headers.get("x-frame-options"),
          "DENY"
        );
      }
    );
  }
);

test(
  "POST is rejected without invoking the protected handler",
  async () => {
    let called = false;

    await withServer(
      (_req, res) => {
        called = true;
        res.end();
      },
      async base => {
        const response = await fetch(
          `${base}/api/v1/news`,
          { method: "POST" }
        );

        assert.equal(response.status, 405);
        assert.equal(
          response.headers.get("allow"),
          "GET"
        );
        assert.equal(called, false);
      }
    );
  }
);

test(
  "rejects oversized targets without invoking handler",
  async () => {
    let called = false;

    await withServer(
      (_req, res) => {
        called = true;
        res.end();
      },
      async base => {
        const response = await fetch(
          `${base}/?${"a".repeat(250)}`
        );

        assert.equal(response.status, 400);
        assert.equal(called, false);
      },
      { maxTargetBytes: 128 }
    );
  }
);

test(
  "bounded concurrency rejects excess requests and releases capacity",
  async () => {
    let unblock;
    let started;

    const firstStarted = new Promise(resolve => {
      started = resolve;
    });

    const gate = new Promise(resolve => {
      unblock = resolve;
    });

    let calls = 0;

    await withServer(
      async (_req, res) => {
        calls += 1;

        if (calls === 1) {
          started();
          await gate;
        }

        res.end('{"status":"ok"}');
      },
      async (base, guard) => {
        const first = fetch(
          `${base}/api/v1/news`
        );

        await firstStarted;

        const excess = await fetch(
          `${base}/api/v1/news`
        );

        assert.equal(excess.status, 503);
        assert.equal(
          guard.health().activeRequests,
          1
        );

        unblock();

        assert.equal(
          (await first).status,
          200
        );

        await new Promise(resolve =>
          setImmediate(resolve)
        );

        assert.equal(
          (await fetch(`${base}/api/v1/news`)).status,
          200
        );
      },
      { maxConcurrentRequests: 1 }
    );
  }
);

test(
  "handler failures produce generic 503 without exposing error details",
  async () => {
    const secret = "private-token-not-for-clients";

    await withServer(
      async () => {
        throw new Error(secret);
      },
      async base => {
        const response = await fetch(
          `${base}/api/v1/news`
        );

        const body = await response.text();

        assert.equal(response.status, 503);
        assert.equal(body.includes(secret), false);
      }
    );
  }
);

test("invalid options fail closed", () => {
  assert.throws(
    () => wrapNewsRequestHandler(null),
    TypeError
  );

  assert.throws(
    () => wrapNewsRequestHandler(
      () => {},
      { maxConcurrentRequests: 0 }
    ),
    RangeError
  );

  assert.throws(
    () => wrapNewsRequestHandler(
      () => {},
      { maxTargetBytes: 99999 }
    ),
    RangeError
  );
});
