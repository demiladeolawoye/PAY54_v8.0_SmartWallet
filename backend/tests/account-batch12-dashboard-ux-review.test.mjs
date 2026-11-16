"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(
 new URL("../../assets/js/dashboard-blueprint-shell.js",import.meta.url),"utf8"
);
const css=readFileSync(
 new URL("../../assets/css/dashboard-blueprint-refinements.css",import.meta.url),"utf8"
);
const feed=readFileSync(
 new URL("../../assets/js/dashboard-feed-preview.js",import.meta.url),"utf8"
);
const html=readFileSync(new URL("../../dashboard.html",import.meta.url),"utf8");
test("325: recipient widget moved, not cloned or converted into a second full-size card",()=>{
 assert.match(source,/const recipientWidget = find\("#recipientDashboardWidget", recipients\)/);
 assert.match(source,/details\.append\(make\("summary", "", "Frequent people"\), recipientWidget\)/);
 assert.match(source,/moves\.append\(details\)/);
 assert.doesNotMatch(source,/main\.append\(details\)/);
 assert.doesNotMatch(source,/details\.append\(make\("summary", "", "Recipients"\), recipients\)/);
 assert.match(html,/id="recipientDashboardWidget"/);
});
test("325: accessible keyboard disclosure styling and cache-bust loads exist",()=>{
 assert.match(css,/\.p54b-frequent-people > summary:focus-visible/);
 assert.match(css,/\.p54b-frequent-people\[open\] #recipientDashboardWidget/);
 assert.match(html,/dashboard-blueprint-shell\.js\?v=1\.2\.2/);
 assert.match(html,/dashboard-blueprint-refinements\.css\?v=1\.5\.1/);
 assert.match(html,/dashboard-feed-preview\.js\?v=1\.0\.1/);
});
test("325: false rising arrow and fake balance movement have been removed",()=>{
 assert.match(feed,/Movement unavailable · Verified history required/);
 assert.doesNotMatch(feed,/Balance movement · Not yet calculated/);
 assert.doesNotMatch(feed,/arrow\.textContent = "↗"/);
 assert.match(feed,/arrow\.textContent = "—"/);
});
