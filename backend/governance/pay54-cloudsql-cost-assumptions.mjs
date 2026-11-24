"use strict";

/**
 * PAY54 Cloud SQL staging cost MODEL, not a quote or deployment authority.
 * November 2026 London indicative USD compute catalogue:
 * https://instances.usage.ai/gcp/sql/region/europe-west2
 * Storage/backup planning rates: https://cloud.google.com/sql/pricing
 * Validate SKUs in actual GBP Billing Pricing Calculator before approval.
 */
const DENIED="PAY54_CLOUDSQL_COST_INPUT_DENIED";
const fail=()=>{throw Error(DENIED);};
const rates=Object.freeze({
  micro:0.0126,small:0.042,dedicated_2vcpu_8gib:0.1664
});
export const PAY54_CLOUDSQL_COST_RATES= rates;
export function estimatePay54CloudSqlStaging({
 tier="micro", computeHours=80, monthHours=730,
 allocatedStorageGiB=10, backupUsedGiB=10,
 storageUsdPerGiBHour=0.000232877,
 backupUsdPerGiBHour=0.000109589,
 networkAndOpsUsd=0, billingCurrency="USD"
}={}){
 if(!Object.hasOwn(rates,tier)||billingCurrency!=="USD"||
  ![computeHours,monthHours,allocatedStorageGiB,backupUsedGiB,
    storageUsdPerGiBHour,backupUsdPerGiBHour,networkAndOpsUsd]
   .every(v=>typeof v==="number"&&Number.isFinite(v)&&v>=0)||
  !Number.isInteger(monthHours)||monthHours<672||monthHours>744||
  !Number.isInteger(computeHours)||computeHours>monthHours||
  !Number.isInteger(allocatedStorageGiB)||allocatedStorageGiB<10||
  !Number.isInteger(backupUsedGiB)||
  storageUsdPerGiBHour===0||backupUsdPerGiBHour===0)fail();
 const computeUsd=computeHours*rates[tier];
 // Allocated storage and retained backups may bill while instance is stopped.
 const storageUsd=allocatedStorageGiB*monthHours*storageUsdPerGiBHour;
 const backupsUsd=backupUsedGiB*monthHours*backupUsdPerGiBHour;
 const estimatedUsd=computeUsd+storageUsd+backupsUsd+networkAndOpsUsd;
 const round=x=>Math.round((x+Number.EPSILON)*100)/100;
 return Object.freeze({
  schema:"pay54.cloudsql-staging-cost-assumption.v1",
  region:"europe-west2",
  database:"PostgreSQL 16",
  cloudSqlEdition:"Enterprise",
  availability:"ZONAL_NO_HA",
  tier,computeHours,monthHours,allocatedStorageGiB,backupUsedGiB,
  currency:"USD",
  computeUsd:round(computeUsd),storageUsd:round(storageUsd),
  backupsUsd:round(backupsUsd),networkAndOpsUsd:round(networkAndOpsUsd),
  subtotalUsd:round(estimatedUsd),
  actualGbpBillingQuoteVerified:false,
  ukTaxIncluded:false,
  reservedAddressOrVpcCostsVerified:false,
  trialOrPromotionalCreditsAssumed:false,
  costCeilingEnforced:false,
  spendingAuthorized:false,
  cloudResourceCreated:false,
  stagingDeploymentAuthorized:false,
  productionAuthorized:false
 });
}
