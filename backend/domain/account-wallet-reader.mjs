"use strict";

/* PAY54 source-only, unmounted read-eligibility repository. This does not
 * return balances, grant DB access or execute account/wallet operations.
 * query must be a separately authorised read-only PostgreSQL adapter. */
import { evaluatePersonalWalletAccess } from "./account-wallet-eligibility.mjs";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const valid=value=>typeof value==="string"&&UUID.test(value);

const SQL=[
  "SELECT a.id AS account_id, a.legal_owner_subject AS owner_id,",
  "a.account_type, a.display_name, a.status AS account_status,",
  "a.verification_status, m.principal_subject, m.role,",
  "m.status AS membership_status, w.id AS wallet_id,",
  "w.owner_subject AS wallet_owner, w.status AS wallet_status,",
  "b.account_id AS binding_account_id, b.wallet_id AS binding_wallet_id",
  "FROM pay54.account_contexts a",
  "JOIN pay54.account_memberships m ON m.account_id=a.id",
  "JOIN pay54.personal_wallet_bindings b ON b.account_id=a.id",
  "JOIN pay54.wallets w ON w.id=b.wallet_id",
  "WHERE a.id=$1::uuid AND m.principal_subject=$2::uuid",
  "AND a.account_type='PERSONAL' AND a.status='ACTIVE'",
  "AND a.verification_status='VERIFIED' AND m.status='ACTIVE'",
  "AND w.status='ACTIVE' AND w.owner_subject=a.legal_owner_subject",
  "ORDER BY w.id LIMIT 100"
].join("\n");

export function createAccountWalletReader({query,resolveAuthenticatedPrincipal}) {
  if(typeof query!=="function"||typeof resolveAuthenticatedPrincipal!=="function"){
    throw new TypeError("Trusted reader dependencies required");
  }
  return Object.freeze({
    async eligibleWalletIds(request,accountId){
      if(!valid(accountId))throw new Error("INVALID_ACCOUNT_ID");
      const principalId=await resolveAuthenticatedPrincipal(request);
      if(!valid(principalId))throw new Error("ACCOUNT_AUTH_REQUIRED");
      const result=await query(SQL,[accountId.toLowerCase(),principalId.toLowerCase()]);
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
