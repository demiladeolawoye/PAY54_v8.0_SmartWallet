"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PAY54_SWITCHER_CONTRACT} from "../../assets/js/dashboard/account-switcher-contract.mjs";
const shell=readFileSync(new URL("../../assets/js/dashboard-blueprint-shell.js",import.meta.url),"utf8");

test("333: public dashboard never advertises a functional unmounted account switch",()=>{
 assert.match(shell,/const accountSwitcher = make\(/);
 assert.match(shell,/Personal account · Switch unavailable/);
 assert.match(shell,/accountSwitcher\.disabled = true/);
 assert.match(shell,/accountSwitcher\.setAttribute\(\s*"aria-label"/);
 assert.doesNotMatch(shell,/make\("div", "p54b-side-muted", "Switch Profile · Personal"\)/);
 assert.equal(PAY54_SWITCHER_CONTRACT.switchingEnabled,false);
 assert.equal(PAY54_SWITCHER_CONTRACT.businessAccountProvisioningEnabled,false);
});
test("333: no account switch controls invoke ledger or cross-account data",()=>{
 const start=shell.indexOf("const accountSwitcher = make(");
 const stop=shell.indexOf("sidebar.append(footer);",start);
 assert.ok(start>=0 && stop>start);
 const switchCode=shell.slice(start,stop);
 assert.doesNotMatch(switchCode,/fetch\(|localStorage|sessionStorage|setItem\(|PAY54_LEDGER|PAY54_WALLET|addEventListener\(/);
 assert.match(switchCode,/accountSwitcher\.disabled = true/);
});
