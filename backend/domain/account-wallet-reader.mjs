"use strict";

/* PAY54 source-only, unmounted read-eligibility repository. This does not
 * return balances, grant DB access or execute account/wallet operations.
 * query must be a separately authorised read-only PostgreSQL adapter. */
import { evaluatePersonalWalletAccess } from "./account-wallet-eligibility.mjs";
import { buildAccountQuery } from "../db/account-query-catalogue.mjs";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const valid=value=>typeof value==="string"&&UUID.test(value);

export function createAccountWalletReader({query,resolveAuthenticatedPrincipal}) {
  if(typeof query!=="function"||typeof resolveAuthenticatedPrincipal!=="function"){
    throw new TypeError("Trusted reader dependencies required");
  }
  return Object.freeze({
    async eligibleWalletIds(request,accountId){
      if(!valid(accountId))throw new Error("INVALID_ACCOUNT_ID");
      const principalId=await resolveAuthenticatedPrincipal(request);
      if(!valid(principalId))throw new Error("ACCOUNT_AUTH_REQUIRED");
      const definition=buildAccountQuery("PERSONAL_WALLET_IDS",principalId,accountId);
      const result=await query(definition.sql,definition.params);
      if(!result || !Array.isArray(result.rows) || result.rows.length>100){
        throw new Error("ACCOUNT_WALLET_STORE_UNAVAILABLE");
      }
      const output=[];
      const seen=new Set();
      for(const row of result.rows){
        const verdict=evaluatePersonalWalletAccess({
          principalId,
          account:{
            accountId:row.account_id,legalOwnerId:row.owner_id,
            type:row.account_type,displayName:row.display_name,
            status:row.account_status,verificationStatus:row.verification_status
          },
          membership:{
            accountId:row.account_id,principalId:row.principal_subject,
            role:row.role,status:row.membership_status
          },
          wallet:{id:row.wallet_id,ownerSubject:row.wallet_owner,status:row.wallet_status},
          binding:{accountId:row.binding_account_id,walletId:row.binding_wallet_id}
        });
        if(!verdict.allowed||verdict.accountId!==accountId.toLowerCase())continue;
        if(seen.has(verdict.walletId))throw new Error("DUPLICATE_WALLET_BINDING");
        seen.add(verdict.walletId);
        output.push(verdict.walletId);
      }
      return Object.freeze(output);
    }
  });
}
