"use strict";
import {extractPay54BearerCredential,digestPay54BearerToken}
 from "../postgres-session-resolver.mjs";
import {buildWalletReadModel} from "./wallet-read-model.mjs";

/**
 * Authenticated read-only adapter to the reviewed Batch38 wallet function.
 * Unmounted: no HTTP route, money API, credentials or provider execution.
 * The supplied pool MUST connect as pay54_wallet_read_caller_role only.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CURRENCY=/^[A-Z]{3}$/;
const deny=()=>{throw new Error("PAY54_W3_WALLET_READ_DENIED");};
export const PAY54_W3_READ_SQL=Object.freeze({
 role:"SELECT current_user AS runtime_role, current_setting('transaction_read_only') AS read_only",
 fetch:"SELECT account_id::text AS \"accountId\",wallet_id::text AS \"walletId\",currency,posted_minor AS \"postedMinor\",held_minor AS \"heldMinor\" FROM pay54.wallet_read_restricted_v1(decode($1::text,'hex'),$2::uuid,$3::uuid,$4::varchar(3))"
});
export function createPay54AuthenticatedWalletReader({pool}={}){
 if(!pool||typeof pool.connect!=="function")deny();
 return Object.freeze({
  async read({request,accountId,walletId,currency}={}){
   if(typeof accountId!=="string"||!UUID.test(accountId)||
      typeof walletId!=="string"||!UUID.test(walletId)||
      typeof currency!=="string"||!CURRENCY.test(currency))deny();
   let client;let started=false;let dispose=false;
   try{
    const digest=digestPay54BearerToken(extractPay54BearerCredential(request));
    client=await pool.connect();
    if(!client||typeof client.query!=="function"||typeof client.release!=="function")deny();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    started=true;
    const posture=await client.query(PAY54_W3_READ_SQL.role);
    if(posture?.rows?.length!==1||
       posture.rows[0].runtime_role!=="pay54_wallet_read_caller_role"||
       posture.rows[0].read_only!=="on")deny();
    const result=await client.query(PAY54_W3_READ_SQL.fetch,
      [digest,accountId,walletId,currency]);
    if(result?.rows?.length!==1)deny();
    const row=result.rows[0];
    if(row.accountId!==accountId||row.walletId!==walletId||
       row.currency!==currency)deny();
    const model=buildWalletReadModel({
      schema:"pay54.wallet-read.v1",authoritative:true,
      wallets:[{
        walletId:row.walletId,currency:row.currency,
        postedMinor:row.postedMinor,heldMinor:row.heldMinor
      }]
    });
    await client.query("COMMIT");
    started=false;
    return model;
   }catch{
    if(client&&started){try{await client.query("ROLLBACK");}catch{dispose=true;}}
    deny();
   }finally{
    if(client){try{client.release(dispose);}catch{/* driver disposed */}}
   }
  }
 });
}
