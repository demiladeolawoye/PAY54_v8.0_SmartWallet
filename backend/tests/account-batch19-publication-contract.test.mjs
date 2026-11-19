"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const DOC=fileURLToPath(new URL("../../docs/engineering/pay54-batch19-source-publication-contract.md",import.meta.url));
const read=()=>readFileSync(DOC,"utf8");
test("714: release guide lists fail-closed resource and navigation checks",()=>{
 const s=read();
 for(const text of ["data-src","srcset","form actions","base URL",
  "meta-refresh","object/embed","double-encoded","inline executable"]){
  assert.ok(s.includes(text),text);
 }
 assert.match(s,/not a complete HTML5 parser/);
 assert.match(s,/not.*a JavaScript AST/);
});
test("714: Pages and linked-card decisions require operational evidence",()=>{
 const s=read();
 assert.match(s,/historical Pages build artifact/);
 assert.match(s,/current artifact contents, public reachability/);
 assert.match(s,/no silent simulator relocation/);
 assert.match(s,/NO-GO/);
});
test("714: source CI and offline founder preview never authorise banking",()=>{
 const s=read();
 assert.match(s,/seven-day inert offline founder dashboard/);
 assert.match(s,/No original application JavaScript, customer account secrets/);
 assert.match(s,/No GitHub settings, secrets, live deployment/);
});
