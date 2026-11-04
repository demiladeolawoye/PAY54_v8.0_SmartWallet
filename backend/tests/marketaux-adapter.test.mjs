
"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { createMarketauxAdapter } from "../news/marketaux-adapter.mjs";

const token = "server-only-token-123";
const base = {
  enabled: true,
  rightsVerified: true,
  apiToken: token,
  publisherHosts: ["news.example.com"]
};

const article = {
  uuid: "a1",
  title: "Verified market report",
  description: "Permitted short financial news summary.",
  source: "news.example.com",
  url: "https://news.example.com/a1",
  published_at: "2026-11-04T12:00:00Z"
};

const asResponse = (data, options) => new Response(
  JSON.stringify({ data }),
  { status: 200, headers: { "content-type": "application/json" }, ...options }
);

test("disabled by default and never sends a network request", async () => {
  let called = false;
  const adapter = createMarketauxAdapter({
    fetchImpl: async () => { called = true; throw new Error("network"); }
  });
  assert.equal(adapter.enabled, false);
  assert.deepEqual(await adapter.loadCandidates(), []);
  assert.equal(called, false);
});

test("requires verified rights, secret and approved publisher", () => {
  assert.throws(() => createMarketauxAdapter({ ...base, rightsVerified: false }));
  assert.throws(() => createMarketauxAdapter({ ...base, apiToken: "" }));
  assert.throws(() => createMarketauxAdapter({ ...base, publisherHosts: ["*.example.com"] }));
});

test("maps approved Marketaux fields and enforces fixed request options", async () => {
  let checked = false;
  const adapter = createMarketauxAdapter({
    ...base,
    fetchImpl: async (urlText, options) => {
      const url = new URL(urlText);
      assert.equal(url.origin, "https://api.marketaux.com");
      assert.equal(url.pathname, "/v1/news/all");
      assert.equal(url.searchParams.get("api_token"), token);
      assert.equal(url.searchParams.get("domains"), "news.example.com");
      assert.equal(options.redirect, "manual");
      assert.equal(options.credentials, "omit");
      assert.equal(options.method, "GET");
      checked = true;
      return asResponse([article]);
    }
  });
  const results = await adapter.loadCandidates();
  assert.equal(checked, true);
  assert.deepEqual(results, [{
    id: "a1",
    title: article.title,
    summary: article.description,
    publisher: article.source,
    url: article.url,
    publishedAt: article.published_at,
    displayRights: true
  }]);
});

test("drops unapproved article URLs and mismatched sources", async () => {
  const adapter = createMarketauxAdapter({
    ...base,
    fetchImpl: async () => asResponse([
      article,
      { ...article, uuid: "a2", url: "https://attacker.example/a2" },
      { ...article, uuid: "a3", source: "attacker.example" },
      { ...article, uuid: "a4", url: "http://news.example.com/a4" }
    ])
  });
  assert.equal((await adapter.loadCandidates()).length, 1);
});

test("rejects redirects, provider failures and non-JSON responses", async () => {
  for (const response of [
    new Response("", { status: 302, headers: { location: "https://attacker.example" } }),
    new Response("error", { status: 429 }),
    new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } })
  ]) {
    const adapter = createMarketauxAdapter({ ...base, fetchImpl: async () => response });
    await assert.rejects(adapter.loadCandidates(), /provider unavailable/);
  }
});

test("rejects oversized streamed provider response", async () => {
  const adapter = createMarketauxAdapter({
    ...base,
    maxResponseBytes: 1024,
    fetchImpl: async () => asResponse(Array(40).fill({ description: "x".repeat(200) }))
  });
  await assert.rejects(adapter.loadCandidates(), /provider unavailable/);
});

test("rejects malformed JSON and excessive record counts", async () => {
  const invalid = new Response("{bad", {
    headers: { "content-type": "application/json" }
  });
  await assert.rejects(
    createMarketauxAdapter({ ...base, fetchImpl: async () => invalid }).loadCandidates(),
    /provider unavailable/
  );
  await assert.rejects(
    createMarketauxAdapter({ ...base, limit: 1, fetchImpl: async () => asResponse([article, article]) }).loadCandidates(),
    /provider unavailable/
  );
});

test("enforces timeouts via abort signal", async () => {
  const adapter = createMarketauxAdapter({
    ...base,
    timeoutMs: 100,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    })
  });
  await assert.rejects(adapter.loadCandidates(), /provider unavailable/);
});

test("errors never disclose the API token", async () => {
  const adapter = createMarketauxAdapter({
    ...base,
    fetchImpl: async () => { throw new Error(`upstream logged ${token}`); }
  });
  await assert.rejects(adapter.loadCandidates(), error => {
    assert.equal(error.message.includes(token), false);
    return true;
  });
});
