"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {ACCOUNT_RLS_METADATA_QUERY,validateAccountRlsMetadata} from "../governance/account-rls-metadata.mjs";
const entries=[
 ["pay54_reader_account_deny","account_contexts"],
 ["pay54_reader_membership_deny","account_memberships"],
 ["pay54_reader_wallet_binding_deny","personal_wallet_bindings"]
];
const rows=entries.map(([polname,relname])=>({polname,relname,nspname:"pay54",
 polpermissive:false,polcmd:"r",expression:"false",
 roles:["pay54_account_reader_role"],relrowsecurity:true,relforcerowsecurity:true}));
test("three exact forced restrictive denial policies pass offline metadata validation",()=>{
 assert.equal(validateAccountRlsMetadata(rows).passed,true);
 assert.equal(validateAccountRlsMetadata(rows).liveAttested,false);
 assert.match(ACCOUNT_RLS_METADATA_QUERY,/pg_policy/);
});
test("permissive, wrong roles, missing or disabled RLS policy fail",()=>{
 for(const change of [
  [rows[0],{...rows[1],polpermissive:true},rows[2]],
  [rows[0],{...rows[1],roles:["PUBLIC"]},rows[2]],
  [rows[0],{...rows[1],relforcerowsecurity:false},rows[2]],
  [rows[0],rows[0],rows[2]],
  rows.slice(0,2),
  [rows[0],{...rows[1],expression:"true"},rows[2]]
 ])assert.equal(validateAccountRlsMetadata(change).passed,false);
});
