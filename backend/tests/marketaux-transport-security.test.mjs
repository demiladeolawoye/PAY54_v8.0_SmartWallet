
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — MARKETAUX TRANSPORT SECURITY REGRESSION TESTS
   File: backend/tests/marketaux-transport-security.test.mjs
   Version: 1.0.0
   Phase: 2G-AE

   Purpose:
   - Verify disabled-by-default operation
   - Verify provider rights and credential requirements
   - Verify fixed HTTPS provider destination
   - Verify request security options
   - Reject redirects and unexpected provider responses
   - Enforce response content and size boundaries
   - Verify request cancellation
   - Prevent credential disclosure in returned errors
   - Preserve licensed publisher filtering

   This suite uses an injected mock transport.

   It performs:
   - No live network calls
   - No cloud provisioning
   - No external provider activation
   - No financial transactions
   - No database writes
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";

import {
  createMarketauxAdapter
} from "../news/marketaux-adapter.mjs";

const TOKEN = "pay54-mock-server-token-2026";

const CONFIG = Object.freeze({
  enabled: true,
  rightsVerified: true,
  apiToken: TOKEN,
  publisherHosts: ["news.example.com"]
});

const ARTICLE = Object.freeze({
  uuid: "marketaux-article-001",
  title: "PAY54 test financial news",
  description: "A permitted mock financial news summary.",
  source: "news.example.com",
  url: "https://news.example.com/article/001",
  published_at: "2026-11-11T12:00:00Z"
});

function jsonResponse(records, options = {}) {
  return new Response(
    JSON.stringify({
      data: records
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json"
      },
      ...options
    }
  );
}

function createAdapter(fetchImpl, overrides = {}) {
  return createMarketauxAdapter({
    ...CONFIG,
    fetchImpl,
    ...overrides
  });
}

async function expectUnavailable(adapter) {
  await assert.rejects(
    adapter.loadCandidates(),
    error => {
      assert.equal(
        error.message,
        "Financial news provider unavailable"
      );

      assert.equal(
        error.message.includes(TOKEN),
        false
      );

      return true;
    }
  );
}

/* ========================================================================
   DISABLED-BY-DEFAULT BOUNDARY
   ======================================================================== */

test(
  "disabled adapter cannot invoke external transport",
  async () => {
    let requests = 0;

    const adapter = createMarketauxAdapter({
      fetchImpl: async () => {
        requests++;
        throw new Error("Network must remain disabled");
      }
    });

    assert.equal(adapter.enabled, false);

    assert.deepEqual(
      await adapter.loadCandidates(),
      []
    );

    assert.equal(requests, 0);
  }
);

/* ========================================================================
   LICENSING AND CREDENTIALS
   ======================================================================== */

test(
  "activation requires rights and server credentials",
  () => {
    assert.throws(
      () => createMarketauxAdapter({
        ...CONFIG,
        rightsVerified: false
      }),
      /rights/
    );

    assert.throws(
      () => createMarketauxAdapter({
        ...CONFIG,
        apiToken: ""
      }),
      /credential/
    );

    assert.throws(
      () => createMarketauxAdapter({
        ...CONFIG,
        apiToken: "invalid token"
      }),
      /credential/
    );
  }
);

/* ========================================================================
   FIXED PROVIDER DESTINATION
   ======================================================================== */

test(
  "requests use the fixed HTTPS Marketaux endpoint",
  async () => {
    let requests = 0;

    const adapter = createAdapter(
      async (requestUrl, options) => {
        requests++;

        const url = new URL(requestUrl);

        assert.equal(
          url.protocol,
          "https:"
        );

        assert.equal(
          url.hostname,
          "api.marketaux.com"
        );

        assert.equal(
          url.pathname,
          "/v1/news/all"
        );

        assert.equal(
          url.searchParams.get("domains"),
          "news.example.com"
        );

        assert.equal(
          url.searchParams.get("language"),
          "en"
        );

        assert.equal(
          url.searchParams.get("api_token"),
          TOKEN
        );

        assert.equal(
          options.method,
          "GET"
        );

        assert.equal(
          options.redirect,
          "manual"
        );

        assert.equal(
          options.credentials,
          "omit"
        );

        assert.equal(
          options.cache,
          "no-store"
        );

        assert.equal(
          options.headers.accept,
          "application/json"
        );

        assert.ok(
          options.signal instanceof AbortSignal
        );

        return jsonResponse([ARTICLE]);
      }
    );

    const records = await adapter.loadCandidates();

    assert.equal(requests, 1);
    assert.equal(records.length, 1);
  }
);

/* ========================================================================
   REDIRECT REJECTION
   ======================================================================== */

test(
  "rejects HTTP redirect responses",
  async () => {
    for (const status of [
      301,
      302,
      307,
      308
    ]) {
      const adapter = createAdapter(
        async () => new Response(null, {
          status,
          headers: {
            location: "https://attacker.example/collect"
          }
        })
      );

      await expectUnavailable(adapter);
    }
  }
);

test(
  "rejects a transport reporting a followed redirect",
  async () => {
    const adapter = createAdapter(
      async () => ({
        status: 200,
        redirected: true
      })
    );

    await expectUnavailable(adapter);
  }
);

/* ========================================================================
   PROVIDER STATUS VALIDATION
   ======================================================================== */

test(
  "rejects non-success provider statuses",
  async () => {
    for (const status of [
      400,
      401,
      403,
      429,
      500,
      503
    ]) {
      const adapter = createAdapter(
        async () => new Response(
          "Provider error",
          { status }
        )
      );

      await expectUnavailable(adapter);
    }
  }
);

/* ========================================================================
   RESPONSE CONTENT VALIDATION
   ======================================================================== */

test(
  "rejects unexpected provider content types",
  async () => {
    const adapter = createAdapter(
      async () => new Response(
        "<html>Unexpected response</html>",
        {
          status: 200,
          headers: {
            "content-type": "text/html"
          }
        }
      )
    );

    await expectUnavailable(adapter);
  }
);

test(
  "rejects malformed JSON",
  async () => {
    const adapter = createAdapter(
      async () => new Response(
        "{invalid-json",
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );

    await expectUnavailable(adapter);
  }
);

/* ========================================================================
   RESPONSE SIZE LIMITS
   ======================================================================== */

test(
  "rejects oversized declared content length",
  async () => {
    const adapter = createAdapter(
      async () => new Response(
        JSON.stringify({
          data: []
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "content-length": "999999"
          }
        }
      ),
      {
        maxResponseBytes: 1024
      }
    );

    await expectUnavailable(adapter);
  }
);

test(
  "rejects oversized streamed response bodies",
  async () => {
    const oversized = JSON.stringify({
      data: [
        {
          description: "x".repeat(3000)
        }
      ]
    });

    const adapter = createAdapter(
      async () => new Response(
        oversized,
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      ),
      {
        maxResponseBytes: 1024
      }
    );

    await expectUnavailable(adapter);
  }
);

/* ========================================================================
   TIMEOUT AND CANCELLATION
   ======================================================================== */

test(
  "aborts a slow provider transport",
  async () => {
    let aborted = false;

    const adapter = createAdapter(
      async (_url, options) => {
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener(
            "abort",
            () => {
              aborted = true;
              reject(new Error("Transport aborted"));
            },
            { once: true }
          );
        });
      },
      {
        timeoutMs: 100
      }
    );

    await expectUnavailable(adapter);

    assert.equal(aborted, true);
  }
);

/* ========================================================================
   PUBLISHER FILTERING
   ======================================================================== */

test(
  "accepts only records from configured publisher hosts",
  async () => {
    const adapter = createAdapter(
      async () => jsonResponse([
        ARTICLE,
        {
          ...ARTICLE,
          uuid: "unapproved-1",
          url: "https://attacker.example/story"
        },
        {
          ...ARTICLE,
          uuid: "unapproved-2",
          source: "attacker.example"
        },
        {
          ...ARTICLE,
          uuid: "unapproved-3",
          url: "http://news.example.com/story"
        }
      ])
    );

    const records = await adapter.loadCandidates();

    assert.equal(records.length, 1);

    assert.equal(
      records[0].id,
      ARTICLE.uuid
    );

    assert.equal(
      records[0].publisher,
      "news.example.com"
    );

    assert.equal(
      records[0].displayRights,
      true
    );
  }
);

/* ========================================================================
   CREDENTIAL-SAFE ERRORS
   ======================================================================== */

test(
  "transport exceptions never disclose provider credentials",
  async () => {
    const adapter = createAdapter(
      async () => {
        throw new Error(
          `Sensitive upstream URL api_token=${TOKEN}`
        );
      }
    );

    await expectUnavailable(adapter);
  }
);

/* ========================================================================
   CONFIGURATION LIMITS
   ======================================================================== */

test(
  "rejects unsafe transport configuration",
  () => {
    for (const timeoutMs of [
      0,
      99,
      15001
    ]) {
      assert.throws(
        () => createAdapter(
          async () => jsonResponse([]),
          { timeoutMs }
        ),
        RangeError
      );
    }

    for (const limit of [
      0,
      26,
      1.5
    ]) {
      assert.throws(
        () => createAdapter(
          async () => jsonResponse([]),
          { limit }
        ),
        RangeError
      );
    }

    assert.throws(
      () => createAdapter(
        async () => jsonResponse([]),
        {
          publisherHosts: [
            "*.example.com"
          ]
        }
      ),
      TypeError
    );
  }
);
