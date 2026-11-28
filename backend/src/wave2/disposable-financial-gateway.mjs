"use strict";
import { createHash } from "node:crypto";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA=/^[0-9a-f]{64}$/;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const KEY=/^[A-Za-z0-9._:-]{16,128}$/;
const SQL="SELECT operation_id,outcome FROM pay54.w7_disposable_attested_money($1::bytea,$2::uuid,$3::bigint,$4::text,$5::uuid,$6::uuid,$7::bigint,$8::text,$9::text,$10::uuid,$11::text)";
function uuid(x){if(typeof x!=="string"||!UUID.test(x))throw new TypeError("PAY54_W11_INVALID_UUID");return x;}
function validate(x){
 if(!x||typeof x!=="object"||Array.isArray(x)||!["RESERVE","CAPTURE","RELEASE"].includes(x.action)||
 !Number.isSafeInteger(x.sessionVersion)||x.sessionVersion<=0)throw new TypeError("PAY54_W11_INVALID_COMMAND");
 const v={accountId:uuid(x.accountId),version:String(x.sessionVersion),action:x.action,
 source:null,destination:null,amount:null,key:null,digest:null,operation:null,reason:null};
 if(x.action==="RESERVE"){
  v.source=uuid(x.sourceAccountId);v.destination=uuid(x.destinationWalletId);
  if(typeof x.amountMinor!=="string"||!/^[1-9][0-9]{0,18}$/.test(x.amountMinor)||
  BigInt(x.amountMinor)>9223372036854775807n||typeof x.idempotencyKey!=="string"||
  !KEY.test(x.idempotencyKey)||typeof x.requestDigest!=="string"||!SHA.test(x.requestDigest))
   throw new TypeError("PAY54_W11_INVALID_RESERVATION");
  v.amount=x.amountMinor;v.key=x.idempotencyKey;v.digest=x.requestDigest;
 }else{
  v.operation=uuid(x.operationId);
  if(x.action==="RELEASE"){
   if(typeof x.reason!=="string"||!/^[A-Z_]{3,64}$/.test(x.reason))
    throw new TypeError("PAY54_W11_INVALID_REASON");
   v.reason=x.reason;
  }
 }
 return Object.freeze(v);
}
function tokenDigest(authorization){
 if(typeof authorization!=="string"||!authorization.startsWith("Bearer ")||
 !TOKEN.test(authorization.slice(7)))throw new TypeError("PAY54_W11_BEARER_DENIED");
 const raw=Buffer.from(authorization.slice(7),"base64url");
 if(raw.length!==32||raw.toString("base64url")!==authorization.slice(7))
 throw new TypeError("PAY54_W11_BEARER_DENIED");
 return createHash("sha256").update(raw).digest();
}
/**
 * Disposable-only, deliberately unmounted. Requires a pool that already
 * connects as the restricted caller; it never switches roles or grants rights.
 * The only SQL that can move money is PAY54's existing canonical wrapper.
 */
export function createPay54DisposableFinancialGateway({pool,environment,financialExecution=false}={}){
 if(typeof pool?.connect!=="function"||environment!=="DISPOSABLE_CI"||
 financialExecution!==false||process.env.PAY54_FINANCIAL_EXECUTION==="true")
 throw new Error("PAY54_W11_ENVIRONMENT_ADMISSION_DENIED");
 async function execute({authorization,command}={}){
  const c=validate(command),digest=tokenDigest(authorization);
  const client=await pool.connect();
  if(typeof client?.query!=="function"||typeof client?.release!=="function")
   throw new Error("PAY54_W11_INVALID_DB_CLIENT");
  let began=false;
  try{
   await client.query("BEGIN");began=true;
   const pre=await client.query("SELECT current_database() AS db,current_user AS role,rolsuper AS superuser,rolbypassrls AS bypass FROM pg_roles WHERE rolname=current_user");
   const role=pre?.rows?.[0];
   if(role?.db!=="pay54_disposable_ci"||role.role!=="pay54_w7_disposable_caller"||
   role.superuser!==false||role.bypass!==false)throw Error("PAY54_W11_ROLE_DENIED");
   const result=await client.query(SQL,[digest,c.accountId,c.version,c.action,c.source,
    c.destination,c.amount,c.key,c.digest,c.operation,c.reason]);
   if(!Array.isArray(result?.rows)||result.rows.length!==1||
   !UUID.test(result.rows[0]?.operation_id??"")||
   typeof result.rows[0]?.outcome!=="string")throw Error("PAY54_W11_RESULT_DENIED");
   await client.query("COMMIT");began=false;
   return Object.freeze({operationId:result.rows[0].operation_id,outcome:result.rows[0].outcome});
  }catch{
   if(began)try{await client.query("ROLLBACK");}catch{}
   throw new Error("PAY54_W11_OPERATION_DENIED");
  }finally{client.release();}
 }
 return Object.freeze({execute});
}
