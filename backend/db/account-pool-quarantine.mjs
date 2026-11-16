"use strict";

/* Per-operation client boundary for a separately trusted pool. In-use client
 * reuse is denied. Error, invalid actor, or cleanup uncertainty discards client.
 * No live connection or role switch is instantiated by this module.
 */
export function createAccountPoolQuarantine({pool}){
 if(!pool||typeof pool.connect!=="function")throw new TypeError("ACCOUNT_POOL_REQUIRED");
 const checkedOut=new WeakSet();
 return Object.freeze({
  async withClient(callback){
   if(typeof callback!=="function")throw new TypeError("ACCOUNT_CALLBACK_REQUIRED");
   const client=await pool.connect();
   if(!client||typeof client!=="object"||typeof client.query!=="function"||
      typeof client.release!=="function"||checkedOut.has(client)){
    throw new Error("ACCOUNT_POOL_CLIENT_UNTRUSTED");
   }
   checkedOut.add(client);
   let failed=false;
   try{return await callback(client);}
   catch(error){failed=true;throw error;}
   finally{
    checkedOut.delete(client);
    client.release(failed);
   }
  }
 });
}
