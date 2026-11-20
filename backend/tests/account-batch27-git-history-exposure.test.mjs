"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54GitHistoryPaths as inspect}
 from "../governance/pay54-batch27-git-history-exposure.mjs";
test("1121: historical private filenames trigger review, never breach declaration",()=>{
 const r=inspect({paths:["index.html","index.html",
  "backend/src/server.mjs","docs/engineering/architecture.md",
  "secrets/prod.pem"]});
 assert.equal(r.historicFilePathCount,4);
 assert.ok(r.sensitiveHistoricPathCount>=3);
 assert.equal(r.gitPagesHistoryProvenPublic,false);
 assert.equal(r.publicationIncidentClosed,false);
});
test("1121: malformed, unbounded and traversal names fail closed",()=>{
 for(const paths of [["../secrets"],["/root/private"],["folder//file"]])
 assert.throws(()=>inspect({paths}),/GIT_HISTORY_EXPOSURE_AUDIT_DENIED/);
});
