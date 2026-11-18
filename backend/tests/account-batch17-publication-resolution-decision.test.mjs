"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const source=fileURLToPath(new URL(
 "../../docs/engineering/pay54-batch17-publication-resolution-decision.md",
 import.meta.url
));
const read=()=>readFileSync(source,"utf8");
test("615: production publication document requires real source and settings evidence",()=>{
 const s=read();
 for(const phrase of [
  "Settings → Pages","run ID","commit SHA","artifact ID",
  "deployment environment","read-only","NO-GO"
 ])assert.ok(s.includes(phrase),phrase);
 assert.match(s,/current active deployment's source.*not independently established/);
});
test("615: linked-card infrastructure must not be silently moved or disabled",()=>{
 const s=read();
 assert.match(s,/linked-card-development\.js/);
 assert.match(s,/explicit approval to disable that funding pathway/);
 assert.match(s,/do not remove or relocate its development provider/i);
 assert.match(s,/Preserve every unrelated working payment feature/);
});
test("615: historical artifact leak is not asserted as proven customer compromise",()=>{
 const s=read();
 assert.match(s,/confirmed \*artifact packaging failure\*/);
 assert.match(s,/No credential compromise can be asserted/);
 assert.match(s,/any real public-file retrieval.*not independently established/);
});
test("615: frontend preview and live money are separate release boundaries",()=>{
 const s=read();
 assert.match(s,/Production money movement requires entirely separate partner/);
 assert.match(s,/KYC\/AML/);
 assert.match(s,/account RLS/);
 assert.match(s,/not.*permission to bypass security policy/i);
});
