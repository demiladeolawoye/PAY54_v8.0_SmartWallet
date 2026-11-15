"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { createAccountContextReader } from "../domain/account-context-reader.mjs";

const P = "11111111-1111-4111-8111-111111111111";
const OTHER = "66666666-6666-4666-8666-666666666666";
const A = "22222222-2222-4222-8222-222222222222";
const B = "33333333-3333-4333-8333-333333333333";
const row = (type, id, principal = P) => ({
  account_id: id,
  legal_owner_id: P,
  type,
  display_name: type === "PERSONAL" ? "Personal account" : "Business account",
  status: "ACTIVE",
  verification_status: "VERIFIED",
  principal_id: principal,
  role: type === "PERSONAL" ? "PERSONAL_OWNER" : "BUSINESS_VIEWER",
  membership_status: "ACTIVE"
});

test("reader restricts SQL to a backend-resolved principal and parameterized account ID", async () => {
  const calls = [];
  const reader = createAccountContextReader({
    resolveAuthenticatedPrincipal: async request => request.sessionSubject,
    query: async (sql, values) => {
      calls.push({ sql, values });
      return { rows: [row("BUSINESS", B)] };
    }
  });
  const selected = await reader.selectForRequest({ sessionSubject: P }, B);
  assert.equal(selected.accountId, B);
  assert.deepEqual(calls[0].values, [P, B]);
  assert.match(calls[0].sql, /m\.principal_subject = \$1::uuid/);
  assert.match(calls[0].sql, /a\.id = \$2::uuid/);
  assert.doesNotMatch(calls[0].sql, /11111111-1111|33333333-3333/);
});

test("missing authentication never queries the account database", async () => {
  let called = false;
  const reader = createAccountContextReader({
    resolveAuthenticatedPrincipal: async () => null,
    query: async () => { called = true; return { rows: [] }; }
  });
  await assert.rejects(() => reader.listForRequest({}), /ACCOUNT_AUTH_REQUIRED/);
  assert.equal(called, false);
});

test("forged and cross-tenant results cannot escape domain authorisation", async () => {
  const reader = createAccountContextReader({
    resolveAuthenticatedPrincipal: async () => P,
    query: async () => ({ rows: [
      row("PERSONAL", A),
      row("BUSINESS", B, OTHER)
    ] })
  });
  const result = await reader.listForRequest({});
  assert.equal(result.length, 1);
  assert.equal(result[0].accountId, A);
  assert.ok(Object.isFrozen(result));
  await assert.rejects(() => reader.selectForRequest({}, B), /ACCOUNT_NOT_AVAILABLE/);
});

test("invalid account IDs and unavailable accounts fail closed", async () => {
  const reader = createAccountContextReader({
    resolveAuthenticatedPrincipal: async () => P,
    query: async () => ({ rows: [] })
  });
  await assert.rejects(() => reader.selectForRequest({}, "any' OR 1=1 --"), /INVALID_ACCOUNT_ID/);
  await assert.rejects(() => reader.selectForRequest({}, B), /ACCOUNT_NOT_AVAILABLE/);
});

test("unverified account cannot be returned even if database adapter leaks a row", async () => {
  const reader = createAccountContextReader({
    resolveAuthenticatedPrincipal: async () => P,
    query: async () => ({ rows: [{...row("BUSINESS", B),status:"PENDING_VERIFICATION",verification_status:"NOT_VERIFIED"}] })
  });
  const accounts = await reader.listForRequest({});
  assert.deepEqual(accounts, []);
});

test("reader requires an explicit trusted identity resolver and query adapter", () => {
  assert.throws(() => createAccountContextReader({query: async () => ({rows:[]})}),TypeError);
  assert.throws(() => createAccountContextReader({resolveAuthenticatedPrincipal: async () => P}),TypeError);
});
