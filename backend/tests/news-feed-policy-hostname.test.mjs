
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — NEWS HOSTNAME SECURITY REGRESSION TESTS
   File: backend/tests/news-feed-policy-hostname.test.mjs
   Version: 1.0.0
   Phase: 2G-AD

   Purpose:
   Verify strict hostname configuration and article URL validation
   while preserving human-readable publisher identity compatibility.

   No network, credentials, provider activation or financial execution.
   ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";

import {
  selectApprovedNews
} from "../news/news-feed-policy.mjs";

const NOW = new Date(
  "2026-11-11T12:00:00.000Z"
);

const ARTICLE = Object.freeze({
  id: "news-001",
  title: "Financial markets update",
  summary: "Approved financial news summary.",
  publisher: "Example Financial News",
  url: "https://news.example.com/articles/1",
  publishedAt: "2026-11-11T11:00:00Z",
  displayRights: true
});

function select(
  records,
  allowedHosts = ["news.example.com"]
) {
  return selectApprovedNews(records, {
    allowedHosts,
    now: NOW
  });
}

test(
  "preserves human-readable publisher display names",
  () => {
    const result = select([ARTICLE]);

    assert.equal(result.items.length, 1);

    assert.equal(
      result.items[0].publisher,
      "Example Financial News"
    );
  }
);

test(
  "normalizes approved host case without widening scope",
  () => {
    const result = select(
      [ARTICLE],
      ["NEWS.EXAMPLE.COM"]
    );

    assert.equal(result.items.length, 1);
  }
);

test(
  "rejects malformed DNS hostname configuration",
  () => {
    const invalidHosts = [
      "-news.example.com",
      "news-.example.com",
      "news..example.com",
      ".news.example.com",
      "news.example.com.",
      "news_example.com",
      "*.example.com",
      "https://news.example.com",
      "news.example.com/path",
      "localhost",
      "127.0.0.1",
      "news.example.123",
      " news.example.com",
      "news.example.com ",
      "nëws.example.com",
      "a".repeat(64) + ".example.com"
    ];

    for (const host of invalidHosts) {
      assert.throws(
        () => select([ARTICLE], [host]),
        TypeError,
        `Expected invalid hostname rejection: ${host}`
      );
    }
  }
);

test(
  "rejects oversized publisher hostname collections",
  () => {
    const hosts = Array.from(
      { length: 101 },
      (_, index) => `news${index}.example.com`
    );

    assert.throws(
      () => select([ARTICLE], hosts),
      TypeError
    );
  }
);

test(
  "retains compatible case-insensitive duplicate host normalization",
  () => {
    const result = select(
      [ARTICLE],
      [
        "news.example.com",
        "NEWS.EXAMPLE.COM"
      ]
    );

    assert.equal(result.items.length, 1);
  }
);

test(
  "rejects unapproved subdomains and lookalike domains",
  () => {
    const urls = [
      "https://other.news.example.com/article",
      "https://news.example.com.evil.test/article",
      "https://example.com/article",
      "https://evil.test/article"
    ];

    const result = select(
      urls.map((url, index) => ({
        ...ARTICLE,
        id: `unsafe-${index}`,
        url
      }))
    );

    assert.equal(result.items.length, 0);
    assert.equal(result.rejected, urls.length);
  }
);

test(
  "rejects ambiguous URL whitespace and backslash forms",
  () => {
    const urls = [
      " https://news.example.com/article",
      "https://news.example.com/article ",
      "https://news.example.com/article\n",
      "https://news.example.com\\@evil.test/article",
      "https:\\\\news.example.com\\article"
    ];

    const result = select(
      urls.map((url, index) => ({
        ...ARTICLE,
        id: `ambiguous-${index}`,
        url
      }))
    );

    assert.equal(result.items.length, 0);
    assert.equal(result.rejected, urls.length);
  }
);

test(
  "preserves approved article URL query parameters",
  () => {
    const result = select([
      {
        ...ARTICLE,
        url: "https://news.example.com/article?section=markets"
      }
    ]);

    assert.equal(result.items.length, 1);

    assert.equal(
      result.items[0].url,
      "https://news.example.com/article?section=markets"
    );
  }
);

test(
  "removes URL fragments from approved articles",
  () => {
    const result = select([
      {
        ...ARTICLE,
        url: "https://news.example.com/article#section"
      }
    ]);

    assert.equal(result.items.length, 1);

    assert.equal(
      result.items[0].url,
      "https://news.example.com/article"
    );
  }
);

test(
  "rejects excess-length article URLs",
  () => {
    const result = select([
      {
        ...ARTICLE,
        url:
          "https://news.example.com/article?" +
          "a".repeat(2100)
      }
    ]);

    assert.equal(result.items.length, 0);
    assert.equal(result.rejected, 1);
  }
);

test(
  "rejects URLs with user information or unsafe ports",
  () => {
    const urls = [
      "https://user@news.example.com/article",
      "https://user:pass@news.example.com/article",
      "https://news.example.com:8080/article",
      "http://news.example.com/article"
    ];

    const result = select(
      urls.map((url, index) => ({
        ...ARTICLE,
        id: `invalid-${index}`,
        url
      }))
    );

    assert.equal(result.items.length, 0);
    assert.equal(result.rejected, urls.length);
  }
);
