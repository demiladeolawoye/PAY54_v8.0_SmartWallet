"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const read=path=>readFileSync(new URL(path,"file://"+ROOT),"utf8");

test("740: account context selector loads before the approved new dashboard blueprint",()=>{
 const html=read("./dashboard.html");
 const a=html.indexOf('assets/js/ui/account-context-selector.js?v=1.0.0');
 const b=html.indexOf('assets/js/dashboard-blueprint-shell.js?v=1.2.4');
 assert.ok(a>0&&b>a);
 assert.match(html,/assets\/css\/dashboard-account-context\.css\?v=1\.0\.0/);
 assert.match(html,/dashboard-blueprint-first-paint\.css\?v=2\.0\.0/);
 assert.match(html,/id="p54bBootStatus"/);
});

test("740: dashboard replaces disabled placeholder with guarded canonical presenter",()=>{
 const shell=read("./assets/js/dashboard-blueprint-shell.js");
 assert.match(shell,/PAY54_ACCOUNT_CONTEXT_SELECTOR/);
 assert.match(shell,/contextController\.mount\(\{/);
 assert.match(shell,/headerActions: find\("\.header-actions", header\)/);
 assert.match(shell,/sidebarFooter: footer/);
 assert.doesNotMatch(shell,/accountSwitcher\.disabled\s*=\s*true/);
 assert.doesNotMatch(shell,/Personal account · Switch unavailable/);
});

test("740: account control has responsive touch targets and hidden menu semantics",()=>{
 const css=read("./assets/css/dashboard-account-context.css");
 assert.match(css,/min-height: 44px/);
 assert.match(css,/\.p54b-account-context-menu\[hidden\]/);
 assert.match(css,/@media \(max-width: 760px\)/);
 assert.match(css,/@media \(max-width: 375px\)/);
 assert.match(css,/@media \(max-width: 600px\)/);
 assert.match(css,/\.p54b-greeting \{/);
 assert.match(css,/flex: 1 1 100%/);
 assert.match(css,/:focus-visible/);
});

test("740: secure account switching is never fabricated by static Github Pages",()=>{
 const backend=read("./backend/src/server.mjs");
 const selector=read("./assets/js/ui/account-context-selector.js");
 assert.doesNotMatch(backend,/\b(?:switchAccount|changeAccountContext)\b/);
 assert.match(selector,/serverSwitchVerified: false/);
 assert.match(selector,/businessContextAvailable: false/);
 assert.match(selector,/accountSwitchExecuted: false/);
 assert.doesNotMatch(selector,/fetch\(/);
});
