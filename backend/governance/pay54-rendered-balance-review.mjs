"use strict";

/**
 * PAY54 — offline Chromium rendered-markup acceptance.
 * Validates the actual blueprint DOM after the browser runs the isolated
 * synthetic fixture. No authentication, payment or production API is used.
 */
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";

const DETAILS=Object.freeze([
  {name:"balance-meta",match:/Across wallets \(converted\)/},
  {name:"balance-delta",match:/\+₦24,500 today/},
  {name:"identity",match:/Demo Acct:/},
  {name:"trust-chip",match:/demonstration only — not verified/}
]);

export function reviewPay54RenderedBalanceHtml(html){
 if(typeof html!=="string"||html.length<1000||html.length>1_000_000){
  throw new TypeError("PAY54_RENDERED_BALANCE_HTML_REQUIRED");
 }
 const findings=[];
 if(!/<body\b[^>]*class="[^"]*p54-blueprint/.test(html)){
  findings.push("BLUEPRINT_NOT_MOUNTED");
 }
 const card=html.match(/<div\b[^>]*id="balanceCard"[^>]*>/i)?.[0]??"";
 if(!/\bp54b-balance\b/.test(card)){
  findings.push("BALANCE_CARD_NOT_MOUNTED");
 }
 for(const detail of DETAILS){
  // Keep this restricted to the static fixture's ordinary div elements.
  const tag=(html.match(new RegExp(
   "<div\\b(?=[^>]*class=\\\"[^\\\"]*\\b"+detail.name+
   "\\b)[^>]*>", "i"
  ))??[])[0];
  if(!tag){
   findings.push("MISSING_"+detail.name.toUpperCase().replace(/-/g,"_"));
   continue;
  }
  if(/\bp54b-conceal\b|\shidden(?:\s|=|>)/i.test(tag)||
     !/\bp54b-balance-detail\b/.test(tag)){
   findings.push("CONCEALED_"+detail.name.toUpperCase().replace(/-/g,"_"));
  }
 }
 for(const test of DETAILS){
  if(!test.match.test(html)){
   findings.push("MISSING_DISCLOSURE_"+test.name.toUpperCase().replace(/-/g,"_"));
  }
 }
 if(/<script\b[^>]*src="(?:assets\/js\/)?(?:ledger|transactions|dashboard-core|services|login)/i.test(html)){
  findings.push("FINANCIAL_ENGINE_LOADED_IN_FIXTURE");
 }
 return Object.freeze({
  schema:"pay54.batch17.rendered-balance-visual-qa.v1",
  findings:Object.freeze(findings),
  offlineBrowserDomAccepted:findings.length===0,
  authenticatedSessionUsed:false,
  realMoneyEnabled:false,
  productionRelease:"BLOCKED"
 });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const file=process.argv[2];
 if(typeof file!=="string"||!file.trim()){
  process.stderr.write("PAY54_RENDERED_BALANCE_FILE_REQUIRED\n");
  process.exitCode=1;
 }else{
  const report=reviewPay54RenderedBalanceHtml(readFileSync(resolve(file),"utf8"));
  process.stdout.write(JSON.stringify(report)+"\n");
  if(!report.offlineBrowserDomAccepted)process.exitCode=1;
 }
}
