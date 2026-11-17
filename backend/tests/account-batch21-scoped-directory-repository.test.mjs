"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { createPay54ScopedDirectoryRepository as createRepository }
  from "../src/account-scoped-directory-repository.mjs";

const actor = "11111111-1111-4111-8111-111111111111";
const other = "99999999-9999-4999-8999-999999999999";

test("781: scoped read passes server actor and returns immutable collections", async () => {
  const called = [];
  const repository = createRepository({
    withScopedReadTransaction: async (id, callback) => {
      called.push(id);
      return callback({
        actorId: id, readOnly: true, rlsEnforced: true,
        listAccounts: async () => { called.push("accounts"); return []; },
        listMemberships: async () => { called.push("memberships"); return []; }
      });
    }
  });
  const value = await repository.loadPrincipalAccountDirectory(actor);
  assert.deepEqual(called, [actor, "accounts", "memberships"]);
  assert.deepEqual(value, { accounts: [], memberships: [] });
  assert.ok(Object.isFrozen(value.accounts));
  assert.ok(Object.isFrozen(value.memberships));
});

test("781: wrong actor, mutable transaction and missing RLS fail closed", async () => {
  const cases = [
    { actorId: other, readOnly: true, rlsEnforced: true },
    { actorId: actor, readOnly: false, rlsEnforced: true },
    { actorId: actor, readOnly: true, rlsEnforced: false },
    { actorId: actor, readOnly: true },
    { actorId: actor, readOnly: true, rlsEnforced: true }
  ];
  for (const row of cases) {
    const repository = createRepository({
      withScopedReadTransaction: async (_, callback) => callback({
        ...row,
        ...(row.rlsEnforced === true && row.actorId === actor && row.readOnly === true
          ? {} : { listAccounts: async () => [], listMemberships: async () => [] })
      })
    });
    await assert.rejects(repository.loadPrincipalAccountDirectory(actor), /SCOPED_DIRECTORY_UNAVAILABLE/);
  }
});

test("781: transaction exceptions, bad result and malformed principal fail closed", async () => {
  const failures = [
    async () => { throw Error("database disconnected"); },
    async () => ({ accounts: {}, memberships: [] }),
    async (_id, cb) => cb({ actorId: actor, readOnly: true, rlsEnforced: true,
      listAccounts: async () => [], listMemberships: async () => ({}) })
  ];
  for (const withScopedReadTransaction of failures) {
    const repository = createRepository({ withScopedReadTransaction });
    await assert.rejects(repository.loadPrincipalAccountDirectory(actor), /SCOPED_DIRECTORY_UNAVAILABLE/);
  }
  assert.throws(() => createRepository({}), /SCOPED_DIRECTORY_UNAVAILABLE/);
  const repository = createRepository({ withScopedReadTransaction: async () => ({ accounts: [], memberships: [] }) });
  await assert.rejects(repository.loadPrincipalAccountDirectory("from-browser"), /SCOPED_DIRECTORY_UNAVAILABLE/);
});
