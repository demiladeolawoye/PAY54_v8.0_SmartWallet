"use strict";
import {authorizeAccountContext} from "./account-membership.mjs";
/* List-item guard applied after account-specific server query. */
export function filterAccountReadScope({principalId,items}){
 if(typeof principalId!=="string"||!Array.isArray(items)||items.length>100)throw new Error("ACCOUNT_SCOPE_DENIED");
 const output=[],seen=new Set();
 for(const item of items){
  if(!item||!authorizeAccountContext({principalId,account:item.account,
      membership:item.membership,operation:"view"}))continue;
  const id=item.account.accountId.toLowerCase();
  if(seen.has(id))throw new Error("DUPLICATE_ACCOUNT_SCOPE");
  seen.add(id);
  output.push(Object.freeze({accountId:id,type:item.account.type,
    displayName:item.account.displayName}));
 }
 return Object.freeze(output);
}
