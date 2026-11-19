"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/server.mjs";

test("812: unprovisioned account directory and switch routes deny all methods without leaking IDs", async t => {
  const server = createApp({ mode: "test" });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve, reject) =>
    server.close(error => error ? reject(error) : resolve())));

  const base = "http://127.0.0.1:" + server.address().port;
  for (const [method, path] of [
    ["GET", "/v1/accounts"],
    ["POST", "/v1/accounts"],
    ["POST", "/v1/account-context"],
    ["PUT", "/v1/account-context/switch"],
    ["DELETE", "/v1/account-context/current"],
    ["GET", "/v1/account-context?requestedAccountId=secret-cross-tenant"]
  ]) {
    const response = await fetch(base + path, {
      method, redirect: "manual",
      headers: { "content-type": "application/json" },
      ...(method === "GET" ? {} : { body: JSON.stringify({
        requestedAccountId: "33333333-3333-4333-8333-333333333333",
        role: "BUSINESS_OWNER"
      }) })
    });
    assert.equal(response.status, 503, method + " " + path);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.ok(response.headers.get("x-correlation-id"));
    const body = await response.json();
    assert.equal(body.code, "ACCOUNT_CONTEXT_SERVICE_UNAVAILABLE");
    assert.equal(body.status, 503);
    assert.equal(JSON.stringify(body).includes("secret-cross-tenant"), false);
    assert.equal(JSON.stringify(body).includes("BUSINESS_OWNER"), false);
  }
});
