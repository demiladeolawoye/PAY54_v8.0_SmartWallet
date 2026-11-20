"use strict";
/** Batch26/1041 — staged DB certificate identity policy, no connection. */
import {isIP} from "node:net";
const HOST=/^[a-z0-9][a-z0-9.-]{3,252}$/;
const deny=()=>{throw Error("PAY54_STAGING_TLS_IDENTITY_DENIED");};
export function inspectPay54StagingTlsIdentity({host,
 tlsServerName,verifyFullCertificateChain,allowInsecure,
 encryptedPort}={}){
 if(typeof host!=="string"||!HOST.test(host)||
    isIP(host)!==0 ||host.includes("..")||
    host!==tlsServerName ||
    !Number.isInteger(encryptedPort)||encryptedPort<1||
    encryptedPort>65535 ||
    verifyFullCertificateChain!==true ||
    allowInsecure!==false)deny();
 return Object.freeze({
  schema:"pay54.staging-db-tls-identity-v1",
  hostnamePinMatches:true,certificateValidationRequired:true,
  actualServerCertificateObserved:false,
  databaseConnectionAttempted:false,
  stagingProvisioningAuthorised:false
 });
}
