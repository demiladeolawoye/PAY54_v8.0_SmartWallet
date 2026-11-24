"use strict";

/**
 * PAY54 Batch 42 — offline quote evidence readiness check.
 * Does not verify external evidence, approve expenditure or call cloud APIs.
 * Submission of complete fields only permits independent review.
 */
const REQUIRED = Object.freeze([
  "quoteReference", "issuedOn", "currency", "region", "databaseVersion",
  "edition", "machineType", "availability", "computeHours",
  "ssdGiB", "backupGiB", "backupRetentionDays", "computeGbp",
  "storageGbp", "backupGbp", "networkGbp", "operationsGbp",
  "taxGbp", "totalGbp", "quoteEvidenceUrl", "operator",
  "teardownDate", "reviewer"
]);
const MONEY = Object.freeze([
  "computeGbp", "storageGbp", "backupGbp", "networkGbp",
  "operationsGbp", "taxGbp", "totalGbp"
]);
const TEXT = Object.freeze([
  "quoteReference", "machineType", "quoteEvidenceUrl", "operator", "reviewer"
]);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const finiteNonNegative = value =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const validDate = value => typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
const pounds = value => Math.round(value * 100);
export const PAY54_QUOTE_EVIDENCE_FIELDS = REQUIRED;
export function assessPay54GbpQuoteEvidence(evidence) {
  if (evidence === null || typeof evidence !== "object" ||
      Array.isArray(evidence)) {
    throw new TypeError("PAY54_QUOTE_EVIDENCE_OBJECT_REQUIRED");
  }
  const missing = REQUIRED.filter(key => !own(evidence, key));
  const invalid = [];
  for (const key of TEXT) {
    if (own(evidence, key) &&
        (typeof evidence[key] !== "string" || !evidence[key].trim())) {
      invalid.push(key);
    }
  }
  for (const key of MONEY) {
    if (own(evidence, key) &&
        (!finiteNonNegative(evidence[key]) ||
         !Number.isSafeInteger(pounds(evidence[key])) ||
         Math.abs(pounds(evidence[key]) - evidence[key] * 100) > 1e-7)) {
      invalid.push(key);
    }
  }
  if (own(evidence,"quoteEvidenceUrl") &&
      (typeof evidence.quoteEvidenceUrl !== "string" ||
       !/^https:\/\//i.test(evidence.quoteEvidenceUrl))) {
    invalid.push("quoteEvidenceUrl");
  }
  for (const key of ["issuedOn","teardownDate"]) {
    if (own(evidence,key) && !validDate(evidence[key])) invalid.push(key);
  }
  if (validDate(evidence.issuedOn) && validDate(evidence.teardownDate) &&
      evidence.teardownDate < evidence.issuedOn) invalid.push("teardownDate");
  for (const [key, expected] of Object.entries({
    currency:"GBP", region:"europe-west2", databaseVersion:"PostgreSQL 16",
    edition:"Enterprise", availability:"ZONAL_NO_HA"
  })) {
    if (own(evidence,key) && evidence[key] !== expected) invalid.push(key);
  }
  for (const key of ["computeHours","ssdGiB","backupGiB","backupRetentionDays"]) {
    if (own(evidence,key) &&
        (!Number.isSafeInteger(evidence[key]) || evidence[key] < 0)) invalid.push(key);
  }
  if (own(evidence,"computeHours") && evidence.computeHours > 744) invalid.push("computeHours");
  if (own(evidence,"ssdGiB") && evidence.ssdGiB < 10) invalid.push("ssdGiB");
  if (missing.length === 0 && MONEY.every(key => finiteNonNegative(evidence[key]))) {
    const components = MONEY.filter(key => key !== "totalGbp")
      .reduce((sum,key) => sum + pounds(evidence[key]), 0);
    if (components !== pounds(evidence.totalGbp)) invalid.push("totalGbp");
  }
  const uniqueInvalid = Object.freeze([...new Set(invalid)].sort());
  const completeForIndependentReview = missing.length === 0 && uniqueInvalid.length === 0;
  return Object.freeze({
    schema:"pay54.gbp-quote-evidence-readiness.v1",
    completeForIndependentReview,
    status:completeForIndependentReview ?
      "INDEPENDENT_REVIEW_REQUIRED" : "EVIDENCE_INCOMPLETE",
    missing:Object.freeze(missing),
    invalid:uniqueInvalid,
    externallyVerified:false,
    financeApproved:false,
    spendingAuthorized:false,
    cloudProvisioningAuthorized:false,
    stagingDeploymentAuthorized:false,
    productionAuthorized:false
  });
}
