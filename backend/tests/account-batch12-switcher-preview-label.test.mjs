"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PAY54_SWITCHER_CONTRACT} from "../../assets/js/dashboard/account-switcher-contract.mjs";

const shell=readFileSync(new URL("../../assets/js/dashboard-blueprint-shell.js",import.meta.url),"utf8");
const selector=readFileSync(new URL("../../assets/js/ui/account-context-selector.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../../dashboard.html",import.meta.url),"utf8");

test("333: approved account selector is visible but never advertises unmounted Business switching",()=>{
 assert.match(shell,/PAY54_ACCOUNT_CONTEXT_SELECTOR/);
 assert.match(shell,/contextController\.mount\(\{/);
 assert.match(selector,/Personal account/);
 assert.match(selector,/Business/);
 assert.match(selector,/aria-disabled/);
 assert.match(selector,/Unavailable/);
 assert.match(html,/account-context-selector\.js\?v=1\.0\.0/);
 assert.doesNotMatch(shell,/Personal account · Switch unavailable/);
 assert.equal(PAY54_SWITCHER_CONTRACT.switchingEnabled,false);
 assert.equal(PAY54_SWITCHER_CONTRACT.businessAccountProvisioningEnabled,false);
});
test("333: account selection is presentation-only; never touches cross-tenant finance",()=>{
 const start=shell.indexOf("const contextController = window.PAY54_ACCOUNT_CONTEXT_SELECTOR");
 const stop=shell.indexOf("const greeting = make(",start);
 assert.ok(start>=0&&stop>start);
 const integration=shell.slice(start,stop);
 assert.doesNotMatch(integration,/fetch\(|localStorage|sessionStorage|setItem\(|PAY54_LEDGER|PAY54_WALLET/);
 assert.match(integration,/contextMounted = contextController\.mount/);
 assert.doesNotMatch(selector,/\.switchAccount\s*\(/);
 assert.doesNotMatch(selector,/\.setActiveAccount\s*\(/);
 assert.match(selector,/accountSwitchExecuted: false/);
 assert.equal(PAY54_SWITCHER_CONTRACT.previewExecutionEnabled,false);
});
