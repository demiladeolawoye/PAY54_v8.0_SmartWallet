
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — MARKETAUX RESPONSE DESTINATION TESTS
   File: backend/tests/marketaux-response-destination.test.mjs
   Version: 1.0.0
   Phase: 2G-AH

   Verifies:
   - A matching final response URL is accepted
   - A different final response URL is rejected
   - Credential-safe failure reporting
   - Existing in-memory response compatibility
   - Explicit redirect rejection
   - Disabled-by-default behaviour

   No real network calls or financial operations.
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";

import {
  createMarketauxAdapter
} from "../news/marketaux-adapter.mjs";

const TOKEN = "pay54-test-provider-token-2026";

const BASE = Object.freeze({
  enabled: true,
  rightsVerified: true,
  apiToken: TOKEN,
  publisherHosts: ["news.example.com"]
});

const ARTICLE = Object.freeze({
  uuid: "pay54-response-test-001",
  title: "Market update",
  description: "Mock licensed news summary.",
  source: "news.example.com",
  url: "https://news.example.com/articles/001",
  published_at: "2026-11-11T12:00:00Z"
});

function createResponse(finalUrl, redirected = false) {
  const response = new Response(
    JSON.stringify({
      data: [ARTICLE]
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json"
      }
    }
  );

  Object.defineProperty(
    response,
    "url",
    {
      configurable: true,
      value: finalUrl
    }
  );

  Object.defineProperty(
    response,
    "redirected",
    {
      configurable: true,
      value: redirected
    }
  );

  return response;
}

function adapter(fetchImpl) {
  return createMarketauxAdapter({
    ...BASE,
    fetchImpl
  });
}

async function expectUnavailable(instance) {
  await assert.rejects(
    instance.loadCandidates(),
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

test(
  "accepts a response with the exact requested final URL",
  async () => {
    const instance = adapter(
      async requestedUrl =>
        createResponse(requestedUrl)
    );

    const records = await instance.loadCandidates();

    assert.equal(records.length, 1);
    assert.equal(records[0].id, ARTICLE.uuid);
  }
);

test(
  "rejects a response resolved to another hostname",
  async () => {
    const instance = adapter(
      async () =>
        createResponse(
          "https://attacker.example/news"
        )
    );

    await expectUnavailable(instance);
  }
);

test(
  "rejects an alternate path on the provider hostname",
  async () => {
    const instance = adapter(
      async () =>
        createResponse(
          "https://api.marketaux.com/other"
        )
    );

    await expectUnavailable(instance);
  }
);

test(
  "rejects final URLs missing the expected token query",
  async () => {
    const instance = adapter(
      async () =>
        createResponse(
          "https://api.marketaux.com/v1/news/all"
        )
    );

    await expectUnavailable(instance);
  }
);

test(
  "rejects final URLs with modified request parameters",
  async () => {
    const instance = adapter(
      async requestedUrl => {
        const url = new URL(requestedUrl);

        url.searchParams.set(
          "language",
          "fr"
        );

        return createResponse(
          url.toString()
        );
      }
    );

    await expectUnavailable(instance);
  }
);

test(
  "rejects explicitly redirected responses",
  async () => {
    const instance = adapter(
      async requestedUrl =>
        createResponse(
          requestedUrl,
          true
        )
    );

    await expectUnavailable(instance);
  }
);

test(
  "preserves existing in-memory Response compatibility",
  async () => {
    const instance = adapter(
      async () => new Response(
        JSON.stringify({
          data: [ARTICLE]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    );

    const records = await instance.loadCandidates();

    assert.equal(records.length, 1);
  }
);

test(
  "rejects invalid non-string response URL metadata",
  async () => {
    const instance = adapter(
      async () =>
        createResponse(null)
    );

    await expectUnavailable(instance);
  }
);

test(
  "remains network-inactive when disabled",
  async () => {
    let calls = 0;

    const instance = createMarketauxAdapter({
      fetchImpl: async () => {
        calls++;
        throw new Error("Unexpected request");
      }
    });

    assert.equal(instance.enabled, false);

    assert.deepEqual(
      await instance.loadCandidates(),
      []
    );

    assert.equal(calls, 0);
  }
);
