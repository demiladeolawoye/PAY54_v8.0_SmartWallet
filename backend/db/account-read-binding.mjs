"use strict";

/* PAY54 Batch 05 — source-only account read binding.
 * Composes the trusted principal resolver, canonical query catalogue,
 * statement policy and a separately supplied read-only transaction executor.
 * No HTTP listener, DB pool, user account, grant or money movement created.
 */
import {requireTrustedPrincipal} from "../domain/trusted-account-principal.mjs";
import {buildAccountQuery} from "./account-query-catalogue.mjs";
import {assertAccountReadStatement} from "./account-sql-policy.mjs";
import {freezeAccountReadRows} from "./account-read-results.mjs";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createAccountReadBinding({principalResolver,transaction}) {
  if(!principalResolver||typeof principalResolver.resolve!=="function"||
     !transaction||typeof transaction.execute!=="function"){
    throw new TypeError("Verified principal resolver and read-only transaction required");
  }
  return Object.freeze({
    async query(request,id,accountId=null){
      const principal=await principalResolver.resolve(request);
      const principalId=requireTrustedPrincipal(principal);
      const definition=buildAccountQuery(id,principalId,accountId);
      assertAccountReadStatement(definition.sql,definition.params,principalId);
      const result=await transaction.execute({
        principal,sql:definition.sql,params:definition.params
      });
      return freezeAccountReadRows(result);
    }
  });
}
