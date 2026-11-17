"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,symlinkSync,rmSync}
 from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {parsePay54UntrustedEvidenceBytes as parse,
 loadPay54OperatorEvidenceFile as load}
 from "../governance/pay54-batch27-evidence-ingestion.mjs";
test("1084: operator file stays untrusted even when valid JSON parses",t=>{
 const dir=mkdtempSync(join(tmpdir(),"pay54-operator-evidence-"));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const filename=join(dir,"pages.json");
 writeFileSync(filename,JSON.stringify({status:"built",source:"workflow"}));
 const r=load({filename});
 assert.equal(r.contentsIndependentlyAuthenticated,false);
 assert.equal(r.releaseAuthorised,false);
 symlinkSync(filename,join(dir,"alias.json"));
 assert.throws(()=>load({filename:join(dir,"alias.json")}),
  /EVIDENCE_INGESTION_DENIED/);
});
test("1084: malformed UTF8, proto poisoning, giant and array JSON refused",()=>{
 for(const bytes of [
  Buffer.from([0xff,0xfe]),
  Buffer.from('{"__proto__":{"isAdmin":true}}'),
  Buffer.from("[]"),
  Buffer.from(" ".repeat(256*1024+1))
 ])assert.throws(()=>parse({bytes}),/EVIDENCE_INGESTION_DENIED/);
});
