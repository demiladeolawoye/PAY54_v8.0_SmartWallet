"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {verifyPay54NonfinancialPreviewSource as verify}
 from "../release/pay54-static-preview-policy.mjs";
const html=readFileSync(new URL("../../public-preview/index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../../public-preview/assets/css/preview.css",import.meta.url),"utf8");
test("1200: actual source preview has only internal CSS, skip anchor and no financial actions",()=>{
 const r=verify({html,css});
 assert.equal(r.linkedResourceCount,2);
 assert.equal(r.customerTransactionsAvailable,false);
 assert.equal(r.scriptsAndFormsForbidden,true);
 assert.equal(r.deploymentAuthorised,false);
});
test("1200: external images, scripts, login forms and CSS remote imports denied",()=>{
 const attacks=[
  {html:html.replace("</body>",'<script src="wallet.js"></script></body>')},
  {html:html.replace("</body>",'<form action="/pay"></form></body>')},
  {html:html.replace("</body>",'<img src="https://evil.example/x"></body>')},
  {html:html.replace("default-src 'none'","default-src *")},
  {html:html.replace("assets/css/preview.css","assets/css/other.css")},
  {css:css+'@import "https://evil.example/steal.css";'},
  {css:css+"body{background:url(https://evil.example)}"},
  {html:html.replace('href="#main-content"','href="javascript:alert(1)"')}
 ];
 for(const change of attacks){
  assert.throws(()=>verify({html,css,...change}),
   /NONFINANCIAL_PREVIEW_POLICY_DENIED/);
 }
});
