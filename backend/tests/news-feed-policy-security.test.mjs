
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — NEWS FEED POLICY SECURITY REGRESSION TESTS
   File: backend/tests/news-feed-policy-security.test.mjs
   Version: 1.0.0
   Phase: 2G-AD

   Purpose:
   Verify the existing provider-independent article validation contract.

   Security boundaries:
   - No network requests
   - No external credentials
   - No database or filesystem writes
   - No financial execution
   - No provider activation
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";

import {
  NEWS_FEED_LIMIT,
  selectApprovedNews
} from "../news/news-feed-policy.mjs";

const NOW = new Date("2026-11-11T12:00:00.000Z");

const HOST = "news.example.com";

const OPTIONS = Object.freeze({
  allowedHosts: [HOST],
  now: NOW
});

function article(overrides = {}) {
  return {
    id: "article-001",
    title: "Financial markets update",
    summary: "An approved financial news summary.",
    publisher: HOST,
    url: "https://news.example.com/markets/001",
    publishedAt: "2026-11-11T11:00:00Z",
    displayRights: true,
    ...overrides
  };
}

function select(candidates, options = {}) {
  return selectApprovedNews(candidates, {
    ...OPTIONS,
    ...options
  });
}

test("requires an array of candidates", () => {
  for (const value of [
    null,
    undefined,
    {},
    "invalid"
  ]) {
    assert.throws(
      () => select(value),
      TypeError
    );
  }
});

test("accepts a correctly licensed article", () => {
  const result = select([article()]);

  assert.equal(result.items.length, 1);
  assert.equal(result.received, 1);
  assert.equal(result.rejected, 0);

  assert.equal(
    result.items[0].title,
    "Financial markets update"
  );

  assert.equal(
    result.items[0].url,
    "https://news.example.com/markets/001"
  );

  assert.equal(
    result.items[0].publishedAt,
    "2026-11-11T11:00:00.000Z"
  );

  assert.equal(
    Object.isFrozen(result),
    true
  );

  assert.equal(
    Object.isFrozen(result.items),
    true
  );

  assert.equal(
    Object.isFrozen(result.items[0]),
    true
  );
});

test("rejects candidates without explicit display rights", () => {
  const result = select([
    article({ id: "a", displayRights: false }),
    article({ id: "b", displayRights: undefined }),
    article({ id: "c", displayRights: "true" }),
    article({ id: "d", displayRights: true })
  ]);

  assert.equal(result.received, 4);
  assert.equal(result.rejected, 3);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, "d");
});

test("rejects unsafe or unapproved article URLs", () => {
  const unsafe = [
    "http://news.example.com/article",
    "https://attacker.example/article",
    "https://news.example.com.attacker.example/article",
    "javascript:alert(1)",
    "https://user:pass@news.example.com/article",
    "https://news.example.com:8443/article",
    "not-a-url"
  ];

  const result = select(
    unsafe.map((url, index) =>
      article({
        id: `unsafe-${index}`,
        url
      })
    )
  );

  assert.equal(result.items.length, 0);
  assert.equal(result.rejected, unsafe.length);
});

test("removes article URL fragments", () => {
  const result = select([
    article({
      url: "https://news.example.com/article#tracking"
    })
  ]);

  assert.equal(result.items.length, 1);

  assert.equal(
    result.items[0].url,
    "https://news.example.com/article"
  );
});

test("rejects markup, excessive text and invalid article fields", () => {
  const candidates = [
    article({ id: "a", title: "<script>alert(1)</script>" }),
    article({ id: "b", summary: "News &lt;unsafe&gt;" }),
    article({ id: "c", title: "x".repeat(161) }),
    article({ id: "d", summary: "" }),
    article({ id: "e", publisher: "" }),
    article({ id: "f", title: "Invalid\u0001text" }),
    article({ id: "g", id: "" })
  ];

  const result = select(candidates);

  assert.equal(result.received, candidates.length);
  assert.equal(result.rejected, candidates.length);
  assert.equal(result.items.length, 0);
});

test("rejects invalid and excessively future-dated timestamps", () => {
  const candidates = [
    article({ id: "a", publishedAt: "not-a-date" }),
    article({ id: "b", publishedAt: "1999-12-31T23:59:59Z" }),
    article({ id: "c", publishedAt: "2026-11-11T12:06:00Z" }),
    article({ id: "d", publishedAt: "2026-11-11" })
  ];

  const result = select(candidates);

  assert.equal(result.items.length, 0);
  assert.equal(result.rejected, candidates.length);
});

test("deduplicates article IDs within a publisher", () => {
  const result = select([
    article(),
    article({
      id: "ARTICLE-001",
      title: "Duplicate"
    }),
    article({
      id: "article-002",
      title: "Second article"
    })
  ]);

  assert.equal(result.items.length, 2);
  assert.equal(result.rejected, 1);
});

test("returns newest approved articles first", () => {
  const result = select([
    article({
      id: "older",
      publishedAt: "2026-11-10T10:00:00Z"
    }),
    article({
      id: "newer",
      publishedAt: "2026-11-11T11:30:00Z"
    }),
    article({
      id: "middle",
      publishedAt: "2026-11-11T09:00:00Z"
    })
  ]);

  assert.deepEqual(
    result.items.map(item => item.id),
    ["newer", "middle", "older"]
  );
});

test("never returns more than the configured feed limit", () => {
  const candidates = Array.from(
    { length: 12 },
    (_, index) =>
      article({
        id: `article-${index}`,
        url: `https://news.example.com/article/${index}`
      })
  );

  const result = select(candidates);

  assert.equal(NEWS_FEED_LIMIT, 5);
  assert.equal(result.received, 12);
  assert.equal(result.items.length, 5);
});

test("rejects invalid feed limits and publisher configurations", () => {
  for (const limit of [0, 6, -1, 1.5]) {
    assert.throws(
      () => select([article()], { limit }),
      RangeError
    );
  }

  for (const host of [
    "https://news.example.com",
    "*.example.com",
    "news.example.com/path"
  ]) {
    assert.throws(
      () => select([article()], {
        allowedHosts: [host]
      }),
      TypeError
    );
  }
});

test("normalizes article text without changing the original input", () => {
  const input = article({
    title: "  Financial   markets   update  ",
    summary: "  Approved   news summary.  "
  });

  const originalTitle = input.title;
  const originalSummary = input.summary;

  const result = select([input]);

  assert.equal(
    result.items[0].title,
    "Financial markets update"
  );

  assert.equal(
    result.items[0].summary,
    "Approved news summary."
  );

  assert.equal(input.title, originalTitle);
  assert.equal(input.summary, originalSummary);
});
