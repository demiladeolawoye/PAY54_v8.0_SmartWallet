
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — NEWS HTTP SECURITY REGRESSION TESTS

   File: backend/tests/news-http-handler-security.test.mjs
   Version: 1.0.0
   Phase: 2G-AD

   Responsibilities:
   - Verify read-only HTTP routing behaviour
   - Verify GET-only access
   - Verify defensive response headers
   - Verify unavailable-state handling
   - Prevent provider exception and credential disclosure
   - Preserve the existing HTTP handler contract

   This test suite performs no external network requests.
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";

import {
  createNewsHttpHandler
} from "../news/news-http-handler.mjs";

/* ========================================================================
   TEST RESPONSE RECORDER
   ======================================================================== */

function responseRecorder() {
  const headers = new Map();

  return {
    headers,
    statusCode: null,
    body: null,

    setHeader(name, value) {
      headers.set(
        name.toLowerCase(),
        value
      );
    },

    writeHead(status) {
      this.statusCode = status;
    },

    end(body) {
      this.body = body;
    }
  };
}

/* ========================================================================
   TEST DATA
   ======================================================================== */

const feed = Object.freeze({
  status: "fresh",

  items: [
    {
      id: "article-1",
      title: "Market news"
    }
  ],

  updatedAt: "2026-11-04T12:00:00.000Z",

  count: 1
});

/* ========================================================================
   CONFIGURATION VALIDATION
   ======================================================================== */

test(
  "rejects missing service and malformed routes",
  () => {
    assert.throws(
      () => createNewsHttpHandler(),
      /getFeed/
    );

    for (const path of [
      "api/v1/news",
      "/api/v1/news?token=x",
      "/api/v1/news#fragment"
    ]) {
      assert.throws(
        () => createNewsHttpHandler({
          service: {
            getFeed: async () => feed
          },
          path
        }),
        /Invalid news API path/
      );
    }
  }
);

/* ========================================================================
   ROUTE ISOLATION
   ======================================================================== */

test(
  "ignores unrelated routes without touching response or fetching",
  async () => {
    let calls = 0;

    const handler = createNewsHttpHandler({
      service: {
        getFeed: async () => {
          calls++;
          return feed;
        }
      }
    });

    const res = responseRecorder();

    const handled = await handler(
      {
        url: "/health",
        method: "GET"
      },
      res
    );

    assert.equal(handled, false);
    assert.equal(calls, 0);
    assert.equal(res.headers.size, 0);
    assert.equal(res.body, null);
  }
);

/* ========================================================================
   VALID GET RESPONSE
   ======================================================================== */

test(
  "GET with query returns feed and security headers",
  async () => {
    const handler = createNewsHttpHandler({
      service: {
        getFeed: async () => feed
      }
    });

    const res = responseRecorder();

    const handled = await handler(
      {
        url: "/api/v1/news?lang=en",
        method: "GET"
      },
      res
    );

    assert.equal(handled, true);
    assert.equal(res.statusCode, 200);

    assert.deepEqual(
      JSON.parse(res.body),
      feed
    );

    assert.equal(
      res.headers.get("cache-control"),
      "no-store"
    );

    assert.equal(
      res.headers.get("content-type"),
      "application/json; charset=utf-8"
    );

    assert.equal(
      res.headers.get("x-content-type-options"),
      "nosniff"
    );

    assert.equal(
      res.headers.get("referrer-policy"),
      "no-referrer"
    );
  }
);

/* ========================================================================
   METHOD RESTRICTIONS
   ======================================================================== */

test(
  "disallowed methods return 405 without invoking provider",
  async () => {
    let calls = 0;

    const handler = createNewsHttpHandler({
      service: {
        getFeed: async () => {
          calls++;
          return feed;
        }
      }
    });

    for (const method of [
      "POST",
      "HEAD",
      "OPTIONS",
      "DELETE"
    ]) {
      const res = responseRecorder();

      const handled = await handler(
        {
          url: "/api/v1/news",
          method
        },
        res
      );

      assert.equal(handled, true);
      assert.equal(res.statusCode, 405);

      assert.deepEqual(
        JSON.parse(res.body),
        {
          error: "method_not_allowed"
        }
      );

      assert.equal(
        res.headers.get("allow"),
        "GET"
      );
    }

    assert.equal(calls, 0);
  }
);

/* ========================================================================
   PROVIDER UNAVAILABLE
   ======================================================================== */

test(
  "unavailable feed returns HTTP 503",
  async () => {
    const unavailable = {
      status: "unavailable",
      items: [],
      updatedAt: null,
      count: 0
    };

    const handler = createNewsHttpHandler({
      service: {
        getFeed: async () => unavailable
      }
    });

    const res = responseRecorder();

    await handler(
      {
        url: "/api/v1/news",
        method: "GET"
      },
      res
    );

    assert.equal(res.statusCode, 503);

    assert.deepEqual(
      JSON.parse(res.body),
      unavailable
    );
  }
);

/* ========================================================================
   CREDENTIAL DISCLOSURE PREVENTION
   ======================================================================== */

test(
  "provider exceptions produce a credential-free 503",
  async () => {
    const secret = "server-only-token-123";

    const handler = createNewsHttpHandler({
      service: {
        getFeed: async () => {
          throw new Error(
            `upstream URL api_token=${secret}`
          );
        }
      }
    });

    const res = responseRecorder();

    await handler(
      {
        url: "/api/v1/news",
        method: "GET"
      },
      res
    );

    assert.equal(res.statusCode, 503);

    assert.equal(
      res.body.includes(secret),
      false
    );

    assert.deepEqual(
      JSON.parse(res.body),
      {
        status: "unavailable",
        items: [],
        updatedAt: null,
        count: 0
      }
    );
  }
);
