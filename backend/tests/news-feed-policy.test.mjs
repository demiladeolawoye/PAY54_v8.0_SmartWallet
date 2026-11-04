
"use strict";

/**
 * PAY54 News Feed Policy Tests v1.0.0
 * Uses the built-in Node.js test runner.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  NEWS_FEED_LIMIT,
  selectApprovedNews
} from "../news/news-feed-policy.mjs";

const NOW = new Date(
  "2026-11-04T18:00:00.000Z"
);

const allowedHosts = [
  "news.example.com"
];

const article = (
  id,
  timestamp =
    `2026-11-04T${String(10 + id)
      .padStart(2, "0")}:00:00Z`
) => ({
  id: `news-${id}`,
  title: `Market update ${id}`,
  summary: `Example summary ${id}`,
  publisher: "Example Financial News",
  url: `https://news.example.com/articles/${id}`,
  publishedAt: timestamp,
  displayRights: true
});

const select = (items, opts = {}) =>
  selectApprovedNews(items, {
    allowedHosts,
    now: NOW,
    ...opts
  });

test(
  "keeps latest five, newest first, without mutating records",
  () => {
    const records = [
      1, 4, 2, 7, 3, 6, 5
    ].map(id => article(id));

    const original = records.map(
      item => item.id
    );

    const result = select(records);

    assert.equal(
      NEWS_FEED_LIMIT,
      5
    );

    assert.deepEqual(
      result.items.map(item => item.id),
      [
        "news-7",
        "news-6",
        "news-5",
        "news-4",
        "news-3"
      ]
    );

    assert.deepEqual(
      records.map(item => item.id),
      original
    );

    assert.equal(result.received, 7);
  }
);

test(
  "rejects unsafe URLs and unapproved hosts",
  () => {
    const attacks = [
      "javascript:alert(1)",
      "http://news.example.com/articles/1",
      "https://news.example.com.evil.test/articles/1",
      "https://evil.test/articles/1",
      "https://user:password@news.example.com/articles/1"
    ];

    for (const url of attacks) {
      assert.equal(
        select([
          {
            ...article(1),
            url
          }
        ]).items.length,
        0
      );
    }
  }
);

test(
  "rejects HTML and encoded markup",
  () => {
    assert.equal(
      select([
        {
          ...article(1),
          title:
            "<img src=x onerror=alert(1)>"
        }
      ]).items.length,
      0
    );

    assert.equal(
      select([
        {
          ...article(1),
          summary: "&lt;script&gt;"
        }
      ]).items.length,
      0
    );
  }
);

test(
  "rejects missing rights and unverified dates",
  () => {
    assert.equal(
      select([
        {
          ...article(1),
          displayRights: false
        }
      ]).items.length,
      0
    );

    assert.equal(
      select([
        {
          ...article(1),
          publishedAt: "Yesterday"
        }
      ]).items.length,
      0
    );

    assert.equal(
      select([
        {
          ...article(1),
          publishedAt:
            "2027-11-04T12:00:00Z"
        }
      ]).items.length,
      0
    );
  }
);

test(
  "deduplicates publisher and article ID",
  () => {
    const result = select([
      article(1),
      {
        ...article(1),
        title: "Changed"
      }
    ]);

    assert.equal(
      result.items.length,
      1
    );

    assert.equal(
      result.rejected,
      1
    );
  }
);

test(
  "rejects wildcard hosts and limits above five",
  () => {
    assert.throws(
      () =>
        select(
          [article(1)],
          {
            allowedHosts: [
              "*.example.com"
            ]
          }
        ),
      TypeError
    );

    assert.throws(
      () =>
        select(
          [article(1)],
          { limit: 6 }
        ),
      RangeError
    );
  }
);

test(
  "returns an honest empty feed",
  () => {
    const result = select([]);

    assert.deepEqual(
      result.items,
      []
    );

    assert.equal(
      result.generatedAt,
      NOW.toISOString()
    );
  }
);
