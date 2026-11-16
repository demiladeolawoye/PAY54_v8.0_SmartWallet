"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {projectPay54HtmlResourceMarkup}
 from "../governance/pay54-html-resource-markup.mjs";
test("699: preserve script and stylesheet tag attributes but remove JavaScript/CSS bodies",()=>{
 const html='<script src="assets/js/app.js">const href="secret.js";</script>'+
 '<style>body{content:"href=secret.css"}</style>';
 const out=projectPay54HtmlResourceMarkup(html);
 assert.match(out,/<script src="assets\/js\/app\.js"><\/script>/);
 assert.doesNotMatch(out,/secret\.js/);
 assert.doesNotMatch(out,/secret\.css/);
});
test("699: remove comments containing resources while keeping real image markup",()=>{
 const input='<!-- <img src="backend/private.svg"> --><img src="assets/img/logo.svg">';
 const out=projectPay54HtmlResourceMarkup(input);
 assert.doesNotMatch(out,/backend\/private\.svg/);
 assert.match(out,/assets\/img\/logo\.svg/);
});
test("699: preserve inline HTML event handlers for independent safety checks",()=>{
 const out=projectPay54HtmlResourceMarkup(
  '<button onclick="alert(1)">Press</button>');
 assert.match(out,/onclick="alert\(1\)"/);
});
test("699: unsafe nonstring and oversized HTML inputs fail closed",()=>{
 assert.throws(()=>projectPay54HtmlResourceMarkup(null),/MARKUP_REQUIRED/);
 assert.throws(()=>projectPay54HtmlResourceMarkup("x".repeat(3_000_001)),/MARKUP_REQUIRED/);
});
