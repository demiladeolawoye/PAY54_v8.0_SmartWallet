"use strict";

/* PAY54 Batch 05 — defensive read-only account-row projection.
 * The bounded shape is deliberately narrow. It cannot authorise account access.
 */
const FIELD=/^[a-z][a-z0-9_]{0,63}$/;
export function freezeAccountReadRows(input) {
  if(!input||!Array.isArray(input.rows)||input.rows.length>100){
    throw new Error("ACCOUNT_RESULT_UNAVAILABLE");
  }
  const rows=input.rows.map(row=>{
    if(row===null||typeof row!=="object"||Array.isArray(row)){
      throw new Error("ACCOUNT_RESULT_UNAVAILABLE");
    }
    const keys=Object.keys(row);
    if(keys.length>24)throw new Error("ACCOUNT_RESULT_UNAVAILABLE");
    const result={};
    for(const key of keys){
      if(!FIELD.test(key))throw new Error("ACCOUNT_RESULT_UNAVAILABLE");
      const value=row[key];
      if(value!==null && typeof value!=="string" && typeof value!=="boolean" &&
         !(typeof value==="number"&&Number.isFinite(value))){
        throw new Error("ACCOUNT_RESULT_UNAVAILABLE");
      }
      if(typeof value==="string" && Buffer.byteLength(value,"utf8")>1024){
        throw new Error("ACCOUNT_RESULT_UNAVAILABLE");
      }
      Object.defineProperty(result,key,{value,enumerable:true,writable:false,configurable:false});
    }
    return Object.freeze(result);
  });
  return Object.freeze({rows:Object.freeze(rows)});
}
