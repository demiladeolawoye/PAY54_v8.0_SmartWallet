
"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  createNewsService
} from "../news/news-service.mjs";

import {
  createNewsHttpHandler
} from "../news/news-http-handler.mjs";

const nowValue = Date.parse(
  "2026-11-04T12:00:00Z"
);

const article = id => ({
  id: `a-${id}`,
  title: `Report ${id}`,
  summary: `Summary ${id}`,
  publisher: "Licensed Example",
  url: `https://news.example.com/${id}`,
  publishedAt: new Date(
    nowValue - id * 1000
  ).toISOString(),
  displayRights: true
});

const configuration = (
  loadCandidates,
  now = () => nowValue
) => ({
  loadCandidates,
  allowedHosts: ["news.example.com"],
  now,
  ttlMs: 1000,
  staleMs: 4000
});

test(
  "returns five validated records without modifying upstream data",
  async () => {
    const original = [
      article(6),
      article(1),
      article(3),
      article(2),
      article(4),
      article(5)
    ];

    const ids = original.map(x => x.id);

    const service = createNewsService(
      configuration(async () => original)
    );

    const result = await service.getFeed();

    assert.equal(result.status, "fresh");
    assert.equal(result.count, 5);

    assert.deepEqual(
      result.items.map(x => x.id),
      ["a-1", "a-2", "a-3", "a-4", "a-5"]
    );

    assert.deepEqual(
      original.map(x => x.id),
      ids
    );
  }
);

test(
  "coalesces simultaneous fetches and respects TTL",
  async () => {
    let at = nowValue;
    let calls = 0;

    const service = createNewsService(
      configuration(async () => {
        calls += 1;
        await Promise.resolve();
        return [article(1)];
      }, () => at)
    );

    const [a, b] = await Promise.all([
      service.getFeed(),
      service.getFeed()
    ]);

    assert.equal(a.status, "fresh");
    assert.equal(b.status, "fresh");
    assert.equal(calls, 1);

    await service.getFeed();
    assert.equal(calls, 1);

    at += 1001;
    await service.getFeed();
    assert.equal(calls, 2);
  }
);

test(
  "serves bounded stale data and then fails closed",
  async () => {
    let at = nowValue;
    let fail = false;

    const service = createNewsService(
      configuration(async () => {
        if (fail) {
          throw new Error("upstream unavailable");
        }

        return [article(2)];
      }, () => at)
    );

    assert.equal(
      (await service.getFeed()).status,
      "fresh"
    );

    fail = true;
    at += 1500;

    assert.equal(
      (await service.getFeed()).status,
      "stale"
    );

    at += 4000;

    const expired = await service.getFeed();

    assert.equal(
      expired.status,
      "unavailable"
    );

    assert.deepEqual(expired.items, []);
  }
);

test(
  "rejects disallowed and unlicensed articles",
  async () => {
    const service = createNewsService(
      configuration(async () => [
        {
          ...article(1),
          displayRights: false
        },
        {
          ...article(2),
          url: "https://untrusted.example/2"
        }
      ])
    );

    const result = await service.getFeed();

    assert.equal(
      result.status,
      "unavailable"
    );

    assert.deepEqual(result.items, []);
  }
);

test(
  "rejects excessive responses without erasing valid cache",
  async () => {
    let at = nowValue;
    let many = false;

    const service = createNewsService({
      ...configuration(
        async () =>
          many
            ? Array(101).fill(article(1))
            : [article(1)],
        () => at
      ),
      maxCandidates: 100
    });

    await service.getFeed();

    many = true;
    at += 1200;

    assert.equal(
      (await service.getFeed()).status,
      "stale"
    );
  }
);

test(
  "validates configuration",
  async () => {
    assert.throws(
      () => createNewsService({
        allowedHosts: ["news.example.com"]
      }),
      TypeError
    );

    await assert.rejects(
      createNewsService(
        configuration(
          async () => [],
          () => -1
        )
      ).getFeed(),
      TypeError
    );

    assert.throws(
      () => createNewsService({
        ...configuration(async () => []),
        ttlMs: 0
      }),
      RangeError
    );
  }
);

function mockResponse() {
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

    end(body) {
      this.body = body;
    }
  };
}

test(
  "HTTP route returns approved JSON with safe headers",
  async () => {
    const service = createNewsService(
      configuration(async () => [
        article(1)
      ])
    );

    const handler = createNewsHttpHandler({
      service
    });

    const res = mockResponse();

    assert.equal(
      await handler({
        url: "/api/v1/news?foo=bar",
        method: "GET"
      }, res),
      true
    );

    assert.equal(res.status, 200);

    assert.equal(
      res.headers["x-content-type-options"],
      "nosniff"
    );

    assert.equal(
      res.headers["cache-control"],
      "no-store"
    );

    assert.equal(
      JSON.parse(res.body).items.length,
      1
    );
  }
);

test(
  "HTTP handler rejects writes and ignores unrelated paths",
  async () => {
    const handler = createNewsHttpHandler({
      service: {
        getFeed: async () => ({
          status: "fresh",
          items: []
        })
      }
    });

    const rejected = mockResponse();

    assert.equal(
      await handler({
        url: "/api/v1/news",
        method: "POST"
      }, rejected),
      true
    );

    assert.equal(rejected.status, 405);

    const unrelated = mockResponse();

    assert.equal(
      await handler({
        url: "/api/other",
        method: "GET"
      }, unrelated),
      false
    );

    assert.equal(unrelated.status, null);
  }
);

test(
  "HTTP handler returns 503 without leaking provider exceptions",
  async () => {
    const handler = createNewsHttpHandler({
      service: {
        getFeed: async () => {
          throw new Error("secret-error");
        }
      }
    });

    const res = mockResponse();

    await handler({
      url: "/api/v1/news",
      method: "GET"
    }, res);

    assert.equal(res.status, 503);

    assert.equal(
      res.body.includes("secret-error"),
      false
    );
  }
);
