
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — NEWS RUNTIME INTEGRATION SECURITY TESTS
   File: backend/tests/news-integration-security.test.mjs
   Version: 1.0.0
   Phase: 2G-AG

   Responsibilities:
   - Verify disabled-by-default integration
   - Reject invalid server configuration
   - Require publication-rights approval
   - Protect server credentials from public responses
   - Verify fixed news API routing
   - Reject unsupported HTTP methods
   - Verify approved article metadata delivery
   - Confirm no financial execution or cloud activation

   All provider requests use injected in-memory test transports.
   No live network calls, cloud resources or financial operations.
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";

import {
  createNewsIntegration
} from "../news/news-integration.mjs";

const TOKEN = "pay54-runtime-test-secret-2026";

const NOW = Date.parse(
  "2026-11-11T12:00:00.000Z"
);

const ENABLED_ENVIRONMENT = Object.freeze({
  PAY54_NEWS_ENABLED: "true",
  PAY54_NEWS_RIGHTS_VERIFIED: "true",
  PAY54_NEWS_API_TOKEN: TOKEN,
  PAY54_NEWS_PUBLISHER_HOSTS: "news.example.com"
});

const ARTICLE = Object.freeze({
  uuid: "pay54-news-test-001",
  title: "Financial markets update",
  description: "Permitted test news summary.",
  source: "news.example.com",
  url: "https://news.example.com/articles/001",
  published_at: "2026-11-11T11:00:00Z"
});

function createMockResponse() {
  const headers = new Map();

  return {
    statusCode: 200,
    body: "",
    headers,

    setHeader(name, value) {
      headers.set(
        String(name).toLowerCase(),
        String(value)
      );
    },

    writeHead(status) {
      this.statusCode = status;
      return this;
    },

    end(data = "") {
      this.body = String(data);
      return this;
    }
  };
}

function providerResponse(records) {
  return new Response(
    JSON.stringify({ data: records }),
    {
      status: 200,
      headers: {
        "content-type": "application/json"
      }
    }
  );
}

async function request(
  integration,
  method = "GET",
  url = "/api/v1/news"
) {
  const response = createMockResponse();

  const handled = await integration.handleRequest(
    { method, url },
    response
  );

  return {
    handled,
    status: response.statusCode,
    headers: response.headers,
    body: response.body,
    json: response.body
      ? JSON.parse(response.body)
      : null
  };
}

test(
  "default integration cannot contact a provider",
  async () => {
    let calls = 0;

    const integration = createNewsIntegration({
      fetchImpl: async () => {
        calls++;
        throw new Error("Unexpected network access");
      }
    });

    assert.equal(integration.enabled, false);
    assert.equal(integration.route, "/api/v1/news");

    const result = await request(integration);

    assert.equal(result.handled, true);
    assert.equal(result.status, 503);
    assert.equal(result.json.status, "unavailable");
    assert.deepEqual(result.json.items, []);
    assert.equal(calls, 0);
  }
);

test(
  "disabled integration ignores unused provider credentials",
  async () => {
    let calls = 0;

    const integration = createNewsIntegration({
      environment: {
        PAY54_NEWS_ENABLED: "false",
        PAY54_NEWS_RIGHTS_VERIFIED: "true",
        PAY54_NEWS_API_TOKEN: TOKEN
      },
      fetchImpl: async () => {
        calls++;
        return providerResponse([ARTICLE]);
      }
    });

    const feed = await integration.getFeed();

    assert.equal(integration.enabled, false);
    assert.equal(feed.status, "unavailable");
    assert.equal(calls, 0);
  }
);

test(
  "rejects invalid activation switches",
  () => {
    for (const value of [
      "TRUE",
      "1",
      "yes",
      true
    ]) {
      assert.throws(
        () => createNewsIntegration({
          environment: {
            PAY54_NEWS_ENABLED: value
          }
        }),
        TypeError
      );
    }

    assert.throws(
      () => createNewsIntegration({
        environment: []
      }),
      TypeError
    );
  }
);

test(
  "cannot activate without publication-rights approval",
  () => {
    assert.throws(
      () => createNewsIntegration({
        environment: {
          ...ENABLED_ENVIRONMENT,
          PAY54_NEWS_RIGHTS_VERIFIED: "false"
        }
      }),
      /rights are not approved/
    );

    assert.throws(
      () => createNewsIntegration({
        environment: {
          ...ENABLED_ENVIRONMENT,
          PAY54_NEWS_RIGHTS_VERIFIED: ""
        }
      }),
      /rights are not approved/
    );
  }
);

test(
  "requires server credentials and approved publisher hosts",
  () => {
    assert.throws(
      () => createNewsIntegration({
        environment: {
          ...ENABLED_ENVIRONMENT,
          PAY54_NEWS_API_TOKEN: ""
        }
      }),
      TypeError
    );

    assert.throws(
      () => createNewsIntegration({
        environment: {
          ...ENABLED_ENVIRONMENT,
          PAY54_NEWS_PUBLISHER_HOSTS: ""
        }
      }),
      TypeError
    );

    assert.throws(
      () => createNewsIntegration({
        environment: {
          ...ENABLED_ENVIRONMENT,
          PAY54_NEWS_PUBLISHER_HOSTS:
            "news.example.com,news.example.com"
        }
      }),
      TypeError
    );
  }
);

test(
  "provider errors cannot disclose credentials through HTTP",
  async () => {
    let calls = 0;

    const integration = createNewsIntegration({
      environment: ENABLED_ENVIRONMENT,
      now: () => NOW,
      fetchImpl: async () => {
        calls++;

        throw new Error(
          `Provider failed: api_token=${TOKEN}`
        );
      }
    });

    const result = await request(integration);

    assert.equal(calls, 1);
    assert.equal(result.status, 503);
    assert.equal(result.json.status, "unavailable");

    assert.equal(
      result.body.includes(TOKEN),
      false
    );

    assert.equal(
      result.body.includes("api_token"),
      false
    );

    assert.equal(
      result.headers.get("cache-control"),
      "no-store"
    );

    assert.equal(
      result.headers.get("x-content-type-options"),
      "nosniff"
    );
  }
);

test(
  "approved mock news is served without credentials",
  async () => {
    let calls = 0;

    const integration = createNewsIntegration({
      environment: ENABLED_ENVIRONMENT,
      now: () => NOW,

      fetchImpl: async (requestUrl, options) => {
        calls++;

        const parsed = new URL(requestUrl);

        assert.equal(
          parsed.origin,
          "https://api.marketaux.com"
        );

        assert.equal(
          parsed.pathname,
          "/v1/news/all"
        );

        assert.equal(
          parsed.searchParams.get("api_token"),
          TOKEN
        );

        assert.equal(options.redirect, "manual");

        return providerResponse([ARTICLE]);
      }
    });

    const result = await request(integration);

    assert.equal(result.status, 200);
    assert.equal(result.json.status, "fresh");
    assert.equal(result.json.count, 1);
    assert.equal(calls, 1);

    assert.equal(
      result.json.items[0].title,
      ARTICLE.title
    );

    assert.equal(
      result.json.items[0].url,
      ARTICLE.url
    );

    assert.equal(
      result.body.includes(TOKEN),
      false
    );

    assert.equal(
      result.body.includes("api_token"),
      false
    );

    assert.equal(
      result.headers.get("referrer-policy"),
      "no-referrer"
    );

    assert.equal(
      result.headers.get("cache-control"),
      "no-store"
    );
  }
);

test(
  "unsupported methods never contact the provider",
  async () => {
    let calls = 0;

    const integration = createNewsIntegration({
      environment: ENABLED_ENVIRONMENT,
      fetchImpl: async () => {
        calls++;
        return providerResponse([ARTICLE]);
      }
    });

    for (const method of [
      "POST",
      "PUT",
      "PATCH",
      "DELETE"
    ]) {
      const result = await request(
        integration,
        method
      );

      assert.equal(result.handled, true);
      assert.equal(result.status, 405);

      assert.equal(
        result.headers.get("allow"),
        "GET"
      );

      assert.equal(
        result.json.error,
        "method_not_allowed"
      );
    }

    assert.equal(calls, 0);
  }
);

test(
  "unmatched routes are not handled or fetched",
  async () => {
    let calls = 0;

    const integration = createNewsIntegration({
      environment: ENABLED_ENVIRONMENT,
      fetchImpl: async () => {
        calls++;
        return providerResponse([ARTICLE]);
      }
    });

    const result = await request(
      integration,
      "GET",
      "/api/v1/unknown"
    );

    assert.equal(result.handled, false);
    assert.equal(calls, 0);
    assert.equal(result.body, "");
  }
);

test(
  "health reporting never exposes provider credentials",
  () => {
    const integration = createNewsIntegration({
      environment: ENABLED_ENVIRONMENT,
      fetchImpl: async () =>
        providerResponse([ARTICLE])
    });

    const health = integration.health();
    const serialized = JSON.stringify(health);

    assert.equal(health.enabled, true);

    assert.equal(
      health.publicEndpointDeployed,
      false
    );

    assert.equal(
      serialized.includes(TOKEN),
      false
    );

    assert.equal(
      serialized.includes("api_token"),
      false
    );
  }
);
