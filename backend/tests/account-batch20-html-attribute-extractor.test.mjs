"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {extractPay54HtmlStartTagAttributes}
 from "../governance/pay54-batch20-html-attribute-extractor.mjs";

test("719: only real tag attributes are inventoried, not text looking like src",()=>{
 const r=extractPay54HtmlStartTagAttributes(
  'Content says src="backend/exposed.js". <img src="assets/img/logo.svg" data-src="inactive">'
 );
 assert.deepEqual(r.attributes.map(x=>[x.tag,x.name,x.value]),[
  ["img","src","assets/img/logo.svg"],["img","data-src","inactive"]
 ]);
 assert.equal(r.syntaxSafe,true);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("719: quoted greater-than characters cannot change tag ownership",()=>{
 const r=extractPay54HtmlStartTagAttributes(
  '<a title="greater > value" href="assets/css/app.css">PAY54</a>'
 );
 assert.equal(r.scannedTags,1);
 assert.deepEqual(r.attributes.map(x=>x.name),["title","href"]);
 assert.equal(r.attributes[0].value,"greater > value");
});
test("719: duplicate src cannot hide an alternative network dependency",()=>{
 const r=extractPay54HtmlStartTagAttributes(
  '<script src="assets/js/app.js" src="https://other.invalid/js"></script>'
 );
 assert.equal(r.syntaxSafe,false);
 assert.ok(r.issues.some(x=>x.kind==="DUPLICATE_ATTRIBUTE"&&x.name==="src"));
});
test("719: malformed tags and truncated quoted attributes fail closed",()=>{
 assert.throws(()=>extractPay54HtmlStartTagAttributes('<a href="unterminated'),
  /UNTERMINATED/);
 assert.throws(()=>extractPay54HtmlStartTagAttributes('<div title="bad>'),
  /UNTERMINATED/);
 assert.throws(()=>extractPay54HtmlStartTagAttributes(null),/SOURCE_INVALID/);
});
