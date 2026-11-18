"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54RenderedBalanceHtml}
 from "../governance/pay54-rendered-balance-review.mjs";

const DOM=()=>[
 '<!doctype html><html><head><title>PAY54 QA</title></head>',
 '<body class="dashboard light p54-blueprint">',
 '<div id="balanceCard" class="card balance-card p54b-balance">',
 '<div class="balance-meta p54b-balance-detail">',
 'Across wallets (converted) • FX wallets enabled (demo)</div>',
 '<div class="balance-delta pos p54b-balance-detail">',
 '↑ +₦24,500 today · sample movement (not verified)</div>',
 '<div class="identity p54b-balance-detail">',
 'Demo Acct: <strong>3001234567</strong> Demo Tag: @pay54-user</div>',
 '<div class="trust-chip p54b-balance-detail">',
 '🔒 Security &amp; financial compliance: demonstration only — not verified</div>',
 '</div></body></html>'," ".repeat(1000)
].join("");
test("Batch17 synthetic browser DOM displays all four balance sections without payments",()=>{
 const r=reviewPay54RenderedBalanceHtml(DOM());
 assert.equal(r.offlineBrowserDomAccepted,true);
 assert.deepEqual(r.findings,[]);
 assert.equal(r.authenticatedSessionUsed,false);
 assert.equal(r.realMoneyEnabled,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("Batch17 browser DOM rejects hidden identity even when its text exists",()=>{
 const changed=DOM().replace('identity p54b-balance-detail',
  'identity p54b-balance-detail p54b-conceal');
 const r=reviewPay54RenderedBalanceHtml(changed);
 assert.equal(r.offlineBrowserDomAccepted,false);
 assert.ok(r.findings.includes("CONCEALED_IDENTITY"));
});
test("Batch17 browser DOM requires actual blueprint mount",()=>{
 const changed=DOM().replace('dashboard light p54-blueprint','dashboard light');
 const r=reviewPay54RenderedBalanceHtml(changed);
 assert.ok(r.findings.includes("BLUEPRINT_NOT_MOUNTED"));
});
test("Batch17 browser fixture must not include financial execution engines",()=>{
 const changed=DOM().replace("</body>",'<script src="assets/js/ledger.js"></script></body>');
 const r=reviewPay54RenderedBalanceHtml(changed);
 assert.ok(r.findings.includes("FINANCIAL_ENGINE_LOADED_IN_FIXTURE"));
});
