"use strict";
/** Batch26/1033 — do not convert speculative HEAD status into breach closure. */
const deny=()=>{throw Error("PAY54_PAGES_INCIDENT_POLICY_DENIED");};
const SIGNALS=new Set([
 "NOT_VERIFIED","POTENTIAL_PUBLIC_SOURCE_EXPOSURE",
 "SOURCE_BYTES_CONFIRMED","PUBLIC_ARTIFACT_CONFIRMED_CLEAN"
]);
export function assessPay54PagesIncident({
 signal,effectivePublicDeploymentAuthenticated,
 independentSourceHashMatch,
 operatorIncidentTicket
}={}){
 if(!SIGNALS.has(signal) ||
    typeof effectivePublicDeploymentAuthenticated!=="boolean" ||
    typeof independentSourceHashMatch!=="boolean" ||
    typeof operatorIncidentTicket!=="string" ||
    !/^PAY54-SEC-[1-9][0-9]{3,9}$/.test(operatorIncidentTicket))deny();
 const confirmed=signal==="SOURCE_BYTES_CONFIRMED" &&
   effectivePublicDeploymentAuthenticated&&independentSourceHashMatch;
 return Object.freeze({
  schema:"pay54.pages-security-incident-triage.v1",
  incidentTicket:operatorIncidentTicket,
  confirmedSourceExposure:confirmed,
  securityEscalationRequired:confirmed ||
    signal==="POTENTIAL_PUBLIC_SOURCE_EXPOSURE",
  emergencyCredentialRotationRequiresSecurityApproval:confirmed,
  falseSafeStatusProhibited:true,
  incidentIndependentlyReviewed:false,
  operationalContainmentConfirmed:false,
  productionReleaseAuthorised:false
 });
}
