"use strict";

/**
 * PAY54 PR67: disposable-only database connection generation fencing.
 * This is an operational lifecycle primitive, not a real secret-store client,
 * provider attestation, DB role grant or deployment authorisation.
 *
 * No credential values enter this module. Only independently generated opaque
 * generation identifiers and physically checked out clients are accepted.
 */
const DENIED="PAY54_PAYTAG_CONNECTION_LIFECYCLE_DENIED";
const deny=()=>{throw Error(DENIED);};
const GEN=/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{7,127}$/;
const ROLE="pay54_paytag_register_role";

export const PAY54_CONNECTION_LIFECYCLE_POSTURE=Object.freeze({
 schema:"pay54.paytag.connection-lifecycle.v1",
 testOnly:true,realSecretManagerConnected:false,
 liveProviderIdentityVerified:false,stagingEnabled:false,
 productionEnabled:false,financialExecutionEnabled:false
});

/**
 * @param {object} deps - no passwords, connection strings or production pools.
 * acquireDisposableClient: checks out a NEW disposable physical connection.
 * attestDisposableSession: a trusted test adapter must query the real
 * session_user/current_user/TLS transport itself; this module cannot.
 */
export function createPay54DisposableConnectionLifecycle({
 environment,initialGeneration,acquireDisposableClient,
 attestDisposableSession
}={}){
 if(environment!=="disposable-test"||
  !GEN.test(initialGeneration??"")||
  typeof acquireDisposableClient!=="function"||
  typeof attestDisposableSession!=="function")deny();
 let generation=initialGeneration,closed=false,rotating=false;
 let active=0;
 const held=new WeakSet();
 const retired=new Set();

 async function use({expectedGeneration,operation}={}){
  if(closed||rotating||!GEN.test(expectedGeneration??"")||
    expectedGeneration!==generation||retired.has(expectedGeneration)||
    typeof operation!=="function")deny();

  // Acquire may await; recheck generation afterwards to prevent a rotation
  // racing with pool checkout and executing under a stale credential epoch.
  active++;
  let client;
  try{
   client=await acquireDisposableClient({generation:expectedGeneration});
   if(!client||typeof client!=="object"||
     typeof client.query!=="function"||
     typeof client.release!=="function"||held.has(client))deny();
   held.add(client);
   if(closed||rotating||generation!==expectedGeneration)deny();
   const a=await attestDisposableSession({client,generation:expectedGeneration});
   if(!a||a.sessionRole!==ROLE||a.isolation!=="serializable"||
     a.tlsVerified!==true||a.roleEscalated!==false||
     a.financialDmlAccessible!==false)deny();
   if(closed||rotating||generation!==expectedGeneration)deny();

   const output=await operation(client);
   if(closed||rotating||generation!==expectedGeneration)deny();
   const b=await attestDisposableSession({client,generation:expectedGeneration});
   if(!b||b.sessionRole!==ROLE||b.isolation!=="serializable"||
     b.tlsVerified!==true||b.roleEscalated!==false||
     b.financialDmlAccessible!==false)deny();
   if(closed||rotating||generation!==expectedGeneration)deny();

   return output;
  }catch{deny();}
  finally{
   if(client&&typeof client.release==="function"){
    try{client.release(true);}catch{/* quarantine attempted */}
   }
   if(client&&typeof client==="object")held.delete(client);
   active--;
  }
 }

 function rotate({fromGeneration,toGeneration}={}){
  if(closed||rotating||active!==0||!GEN.test(fromGeneration??"")||
     !GEN.test(toGeneration??"")||fromGeneration!==generation||
     fromGeneration===toGeneration||retired.has(toGeneration))deny();
  rotating=true;
  try{
   retired.add(generation);
   generation=toGeneration;
   return Object.freeze({generation,connectionsDrained:true,
     oldGenerationRetired:true,providerCredentialRevoked:false,
     physicalDbConnectionVerified:false});
  }finally{rotating=false;}
 }

 function close(){
  closed=true;
  return Object.freeze({closed:true,activeLeases:active,
    providerConnectionsTerminatedByThisModule:false});
 }

 return Object.freeze({
  use,rotate,close,
  snapshot:()=>Object.freeze({generation,closed,activeLeases:active,
   providerAuthenticated:false,productionAuthorised:false})
 });
}
