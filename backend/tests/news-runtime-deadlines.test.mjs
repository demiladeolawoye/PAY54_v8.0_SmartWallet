
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — NEWS RUNTIME DEADLINE TESTS
   File: backend/tests/news-runtime-deadlines.test.mjs
   Version: 1.0.0
   Phase: 2G-AL

   Uses local HTTP only.
   No external providers, credentials or financial execution.
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { connect } from "node:net";

import {
  wrapNewsRequestHandler
} from "../news/news-runtime-security.mjs";

import {
  createIsolatedNewsServer
} from "../news/news-server.mjs";

import {
  loadConfig
} from "../src/config.mjs";

async function withGuard(handler, callback, options = {}) {
  const guard = wrapNewsRequestHandler(
    handler,
    options
  );

  const server = createServer(
    guard.listener
  );

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    return await callback(
      `http://127.0.0.1:${server.address().port}`,
      guard
    );
  } finally {
    server.closeAllConnections();

    await new Promise((resolve, reject) => {
      server.close(error =>
        error ? reject(error) : resolve()
      );
    });
  }
}

test(
  "unfinished handlers receive 503 and release capacity",
  async () => {
    await withGuard(
      () => new Promise(() => {}),
      async (base, guard) => {
        const response = await fetch(
          `${base}/api/v1/news`
        );

        assert.equal(response.status, 503);

        const body = await response.json();

        assert.equal(
          body.error,
          "request_deadline_exceeded"
        );

        assert.equal(
          guard.health().activeRequests,
          0
        );
      },
      {
        requestDeadlineMs: 100,
        maxConcurrentRequests: 1
      }
    );
  }
);

test(
  "completed requests release capacity before deadline",
  async () => {
    await withGuard(
      (_req, res) => {
        res.end('{"status":"ok"}');
      },
      async (base, guard) => {
        const response = await fetch(
          `${base}/health/live`
        );

        assert.equal(response.status, 200);
        await response.text();

        assert.equal(
          guard.health().activeRequests,
          0
        );
      },
      {
        requestDeadlineMs: 100
      }
    );
  }
);

test(
  "late asynchronous failures cannot overwrite timed-out responses",
  async () => {
    let fail;

    await withGuard(
      () => new Promise((_resolve, reject) => {
        fail = reject;
      }),
      async (base, guard) => {
        const response = await fetch(
          `${base}/api/v1/news`
        );

        assert.equal(response.status, 503);

        const body = await response.json();

        assert.equal(
          body.error,
          "request_deadline_exceeded"
        );

        fail(
          new Error("private upstream details")
        );

        await new Promise(resolve =>
          setImmediate(resolve)
        );

        assert.equal(
          guard.health().activeRequests,
          0
        );
      },
      {
        requestDeadlineMs: 100
      }
    );
  }
);

test(
  "client disconnection releases concurrency capacity",
  async () => {
    let entered;

    const started = new Promise(resolve => {
      entered = resolve;
    });

    await withGuard(
      () => {
        entered();
        return new Promise(() => {});
      },
      async (base, guard) => {
        const port = Number(
          new URL(base).port
        );

        const socket = connect({
          host: "127.0.0.1",
          port
        });

        await once(socket, "connect");

        socket.write(
          "GET /api/v1/news HTTP/1.1\r\n" +
          "Host: localhost\r\n" +
          "Connection: keep-alive\r\n\r\n"
        );

        await started;

        assert.equal(
          guard.health().activeRequests,
          1
        );

        const closed = once(
          socket,
          "close"
        );

        socket.destroy();
        await closed;

        const limit = Date.now() + 1000;

        while (
          guard.health().activeRequests !== 0 &&
          Date.now() < limit
        ) {
          await new Promise(resolve =>
            setTimeout(resolve, 10)
          );
        }

        assert.equal(
          guard.health().activeRequests,
          0
        );
      },
      {
        requestDeadlineMs: 500,
        maxConcurrentRequests: 1
      }
    );
  }
);

test(
  "isolated server closes incomplete idle HTTP requests",
  async () => {
    const config = loadConfig({
      PAY54_ENV: "test",
      PAY54_HOST: "127.0.0.1",
      PAY54_PORT: "0",
      PAY54_REAL_MONEY_MODE: "false"
    });

    const server = createIsolatedNewsServer({
      config,
      environment: {}
    });

    assert.equal(
      server.timeout,
      10000
    );

    server.listen(
      0,
      "127.0.0.1"
    );

    await once(server, "listening");

    try {
      const socket = connect({
        host: "127.0.0.1",
        port: server.address().port
      });

      await once(socket, "connect");

      socket.on("error", () => {});

      // Accelerate the configured idle timeout for this test.
      server.setTimeout(
        100,
        peer => peer.destroy()
      );

      const closed = once(
        socket,
        "close"
      );

      // Deliberately incomplete request headers.
      socket.write(
        "GET /health/live HTTP/1.1\r\n" +
        "Host: localhost\r\n"
      );

      await closed;

      assert.equal(
        socket.destroyed,
        true
      );
    } finally {
      server.closeAllConnections();

      await new Promise((resolve, reject) => {
        server.close(error =>
          error ? reject(error) : resolve()
        );
      });
    }
  }
);

test(
  "invalid deadline configurations fail closed",
  () => {
    for (const value of [
      0,
      99,
      60001,
      1.5,
      NaN,
      "100"
    ]) {
      assert.throws(
        () => wrapNewsRequestHandler(
          () => {},
          {
            requestDeadlineMs: value
          }
        ),
        RangeError
      );
    }
  }
);
