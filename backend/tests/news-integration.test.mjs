
"use strict";

/* ==========================================================================
   PAY54 FINANCIAL NEWS — END-TO-END INTEGRATION TESTS
   File: backend/tests/news-integration.test.mjs
   Version: 1.0.0

   Tests:
   - Disabled-by-default behaviour
   - Rights and credential enforcement
   - Provider → policy → cache → HTTP
   - Five newest approved articles
   - Concurrent request deduplication
   - Invalid article rejection
   - Bounded stale-cache behaviour
   - Provider recovery
   - Safe API responses and credential redaction

   No real provider requests or financial-data mutations.
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";

import {
  createNewsIntegration
} from "../news/news-integration.mjs";

const BASE_TIME = Date.parse(
  "2026-11-04T18:00:00.000Z"
);

const TEST_TOKEN =
  "synthetic-test-token-not-a-real-secret";

function environment(overrides = {}) {
  return {
    PAY54_NEWS_ENABLED: "true",
    PAY54_NEWS_RIGHTS_VERIFIED: "true",
    PAY54_NEWS_API_TOKEN: TEST_TOKEN,
    PAY54_NEWS_PUBLISHER_HOSTS:
      "news.example.com",
    ...overrides
  };
}

function article(id) {
  return {
    uuid: `synthetic-${id}`,
    title: `Synthetic financial report ${id}`,
    description:
      `Verified test summary for report ${id}`,
    source: "news.example.com",
    url:
      `https://news.example.com/articles/${id}`,
    published_at: new Date(
      BASE_TIME - id * 60_000
    ).toISOString()
  };
}

function providerResponse(records) {
  return new Response(
    JSON.stringify({
      data: records
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json"
      }
    }
  );
}

function createResponseRecorder() {
  return {
    headers: {},
    status: null,
    body: "",

    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },

    writeHead(status) {
      this.status = status;
    },

    end(body = "") {
      this.body = body;
    }
  };
}

async function request(handler, method = "GET") {
  const response = createResponseRecorder();

  const handled = await handler(
    {
      url: "/api/v1/news",
      method
    },
    response
  );

  return {
    handled,
    response,
    payload: JSON.parse(response.body)
  };
}

test(
  "disabled integration makes no provider requests",
  async () => {
    let calls = 0;

    const integration = createNewsIntegration({
      environment: {},
      fetchImpl: async () => {
        calls++;
        throw new Error(
          "Network access must remain disabled"
        );
      }
    });

    const result = await request(
      integration.handleRequest
    );

    assert.equal(
      integration.enabled,
      false
    );

    assert.equal(
      result.handled,
      true
    );

    assert.equal(
      result.response.status,
      503
    );

    assert.deepEqual(
      result.payload.items,
      []
    );

    assert.equal(calls, 0);
  }
);

test(
  "unverified rights prevent activation",
  () => {
    assert.throws(
      () => createNewsIntegration({
        environment: environment({
          PAY54_NEWS_RIGHTS_VERIFIED: "false"
        })
      }),
      /rights are not approved/
    );
  }
);

test(
  "invalid credentials and configuration fail closed",
  () => {
    assert.throws(
      () => createNewsIntegration({
        environment: environment({
          PAY54_NEWS_API_TOKEN: ""
        })
      }),
      /credentials/
    );

    assert.throws(
      () => createNewsIntegration({
        environment: environment({
          PAY54_NEWS_PUBLISHER_HOSTS:
            "*.example.com"
        })
      }),
      TypeError
    );

    assert.throws(
      () => createNewsIntegration({
        environment: environment({
          PAY54_NEWS_ENABLED: "yes"
        })
      }),
      TypeError
    );
  }
);

test(
  "end-to-end pipeline returns the five newest articles",
  async () => {
    let requests = 0;

    const records = [
      article(7),
      article(2),
      article(5),
      article(1),
      article(6),
      article(3),
      article(4)
    ];

    const integration = createNewsIntegration({
      environment: environment(),
      now: () => BASE_TIME,
      fetchImpl: async (url, options) => {
        requests++;

        const parsed = new URL(url);

        assert.equal(
          parsed.origin,
          "https://api.marketaux.com"
        );

        assert.equal(
          parsed.searchParams.get("api_token"),
          TEST_TOKEN
        );

        assert.equal(
          options.redirect,
          "manual"
        );

        assert.equal(
          options.credentials,
          "omit"
        );

        return providerResponse(records);
      }
    });

    const result = await request(
      integration.handleRequest
    );

    assert.equal(
      result.response.status,
      200
    );

    assert.equal(
      result.payload.status,
      "fresh"
    );

    assert.equal(
      result.payload.count,
      5
    );

    assert.deepEqual(
      result.payload.items.map(
        item => item.id
      ),
      [
        "synthetic-1",
        "synthetic-2",
        "synthetic-3",
        "synthetic-4",
        "synthetic-5"
      ]
    );

    assert.equal(requests, 1);

    assert.equal(
      result.response.headers[
        "cache-control"
      ],
      "no-store"
    );

    assert.equal(
      result.response.headers[
        "x-content-type-options"
      ],
      "nosniff"
    );

    assert.equal(
      result.response.body.includes(TEST_TOKEN),
      false
    );
  }
);

test(
  "concurrent readers share a single provider request",
  async () => {
    let calls = 0;

    const integration = createNewsIntegration({
      environment: environment(),
      now: () => BASE_TIME,
      fetchImpl: async () => {
        calls++;
        await Promise.resolve();

        return providerResponse([
          article(1)
        ]);
      }
    });

    const responses = await Promise.all([
      integration.getFeed(),
      integration.getFeed(),
      integration.getFeed()
    ]);

    assert.equal(calls, 1);

    assert.ok(
      responses.every(
        result =>
          result.status === "fresh"
      )
    );
  }
);

test(
  "rejects unsafe articles while preserving approved items",
  async () => {
    const integration = createNewsIntegration({
      environment: environment(),
      now: () => BASE_TIME,
      fetchImpl: async () =>
        providerResponse([
          article(1),
          {
            ...article(2),
            url:
              "https://attacker.example/2"
          },
          {
            ...article(3),
            title:
              "<script>alert(1)</script>"
          },
          {
            ...article(4),
            published_at:
              "2027-11-04T12:00:00Z"
          },
          {
            ...article(5),
            description:
              "&lt;img src=x&gt;"
          }
        ])
    });

    const result =
      await integration.getFeed();

    assert.equal(
      result.status,
      "fresh"
    );

    assert.equal(
      result.count,
      1
    );

    assert.equal(
      result.items[0].id,
      "synthetic-1"
    );
  }
);

test(
  "provider failure uses bounded stale cache then becomes unavailable",
  async () => {
    let current = BASE_TIME;
    let fail = false;

    const integration = createNewsIntegration({
      environment: environment(),
      now: () => current,
      ttlMs: 1000,
      staleMs: 4000,

      fetchImpl: async () => {
        if (fail) {
          throw new Error(
            `Simulated upstream secret ${TEST_TOKEN}`
          );
        }

        return providerResponse([
          article(1)
        ]);
      }
    });

    assert.equal(
      (await integration.getFeed()).status,
      "fresh"
    );

    fail = true;
    current += 1500;

    const stale =
      await integration.getFeed();

    assert.equal(
      stale.status,
      "stale"
    );

    assert.equal(
      stale.count,
      1
    );

    current += 4000;

    const unavailable =
      await integration.getFeed();

    assert.equal(
      unavailable.status,
      "unavailable"
    );

    assert.deepEqual(
      unavailable.items,
      []
    );

    assert.equal(
      JSON.stringify(unavailable)
        .includes(TEST_TOKEN),
      false
    );

    fail = false;
    current += 1000;

    const recovered =
      await integration.getFeed();

    assert.equal(
      recovered.status,
      "fresh"
    );

    assert.equal(
      recovered.count,
      1
    );
  }
);

test(
  "upstream redirects and failures do not leak credentials",
  async () => {
    const integration = createNewsIntegration({
      environment: environment(),
      now: () => BASE_TIME,
      fetchImpl: async () =>
        new Response("", {
          status: 302,
          headers: {
            location:
              "https://attacker.example/"
          }
        })
    });

    const result = await request(
      integration.handleRequest
    );

    assert.equal(
      result.response.status,
      503
    );

    assert.equal(
      result.payload.status,
      "unavailable"
    );

    assert.equal(
      result.response.body.includes(TEST_TOKEN),
      false
    );

    assert.equal(
      JSON.stringify(integration.health())
        .includes(TEST_TOKEN),
      false
    );
  }
);

test(
  "news API rejects write methods",
  async () => {
    const integration = createNewsIntegration({
      environment: {}
    });

    const result = await request(
      integration.handleRequest,
      "POST"
    );

    assert.equal(
      result.response.status,
      405
    );

    assert.equal(
      result.payload.error,
      "method_not_allowed"
    );
  }
);
