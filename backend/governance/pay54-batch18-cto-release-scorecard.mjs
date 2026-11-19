"use strict";

/**
 * PAY54 item 651 — source-only CTO Pages release scorecard.
 * Consolidates existing canonical evidence without leaking credentials or
 * attempting an active GitHub Pages settings action.
 */
import {fileURLToPath} from "node:url";
import {inspectPay54FirstPartyHtmlDependencies}
 from "./pay54-firstparty-html-dependency-audit.mjs";
import {inventoryPay54BrowserDevelopmentScripts}
 from "./pay54-batch18-development-script-inventory.mjs";
import {inspectPay54DeclaredPagesWorkflows}
 from "./pay54-batch18-pages-workflow-inventory.mjs";
import {assessPay54Batch18ReleaseMatrix}
 from "./pay54-batch18-release-matrix.mjs";

import {inspectPay54InlineScripts}
 from "./pay54-batch19-inline-script-inventory.mjs";
import {inspectPay54StaticJsImports}
 from "./pay54-batch19-static-js-import-review.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
export function createPay54Batch18ReleaseScorecard(root=ROOT){
 const refs=inspectPay54FirstPartyHtmlDependencies(root);
 const dev=inventoryPay54BrowserDevelopmentScripts(root);
 const workflows=inspectPay54DeclaredPagesWorkflows(root);
 const inlineScripts=inspectPay54InlineScripts(root);
 const modules=inspectPay54StaticJsImports(root);
 const release=assessPay54Batch18ReleaseMatrix({sourceRoot:root});
 return Object.freeze({
  schema:"pay54.batch18-cto-release-scorecard.v1",
  siteCandidateCount:refs.candidateCount,
  publicScriptAndStylesheetReferencesChecked:refs.checkedReferences,
  blockedFirstPartyReferences:refs.findings.length,
  developmentRuntimeScriptMentions:dev.matches.length,
  declaredPagesWorkflowMentions:workflows.candidateWorkflowMentions.length,
  repoWorkflowSourceChecked:workflows.scannedYamlFiles,
  executableInlineScripts: inlineScripts.executableInlineScriptCount,
  inlineScriptReviewRequired: inlineScripts.manualInlineScriptReviewRequired,
  staticJsImportReviewFindings: modules.findings.length,
  dynamicJsImportExpressions: modules.dynamicImportExpressions,
  fullRuntimeDependencyGraphVerified: false,
  releaseSourceStatus:release.categories.restrictedSource,
  activePagesSettings:"NOT_INDEPENDENTLY_VERIFIED",
  publicContentReachability:"NOT_INDEPENDENTLY_VERIFIED",
  protectedDeployer:"NOT_INDEPENDENTLY_VERIFIED",
  rollbackAcceptance:"NOT_INDEPENDENTLY_VERIFIED",
  sourceOnly:true,
  pagesSettingsChanged:false,
  deployed:false,
  financialExecutionEnabled:false,
  releaseApproved:false,
  productionRelease:"BLOCKED"
 });
}
