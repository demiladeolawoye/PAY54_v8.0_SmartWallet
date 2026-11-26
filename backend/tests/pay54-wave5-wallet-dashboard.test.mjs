"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54WalletDashboard,formatPay54WalletMinor}
 from "../src/wave2/wallet-dashboard-controller.mjs";
const accountId="a0000000-0000-4000-8000-000000000001";
const walletId="b0000000-0000-4000-8000-000000000001";
const config={accountId,walletId,currency:"GBP"};
const token="Bearer "+Buffer.alloc(32,41).toString("base64url");
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.textContent="";this.disabled=false;}
 setAttribute(k,v){this.attributes[k]=v;}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;}
 get lines(){return [this.textContent,...this.children.flatMap(x=>x.lines)];}
}
const doc={createElement:tag=>new Element(tag)};
const data=()=>({schema:"pay54.wave2.wallet-read-model.v1",presentationOnly:true,
financialExecutionEnabled:false,wallets:[{
 walletId,currency:"GBP",postedMinor:"10000",heldMinor:"2500",
 availableMinor:"7500",canInitiateTransfer:false
}]});
function setup({response=data(),status=200,tokenProvider=async()=>token,fetchImpl}={}){
 const calls=[];
 const dashboard=createPay54WalletDashboard({documentRef:doc,tokenProvider,
 fetchImpl:fetchImpl??(async(url,options)=>{
  calls.push({url,options});return {status,json:async()=>response};
 })});
 return {dashboard,calls,mount:new Element("main")};
}
test("wallet dashboard renders authoritative GET result and disables transfers",async()=>{
 const f=setup();
 assert.deepEqual(await f.dashboard.refresh(config,f.mount),
 {status:"READ_ONLY_RENDERED",moneyMovementEnabled:false});
 assert.equal(f.calls.length,1);
 assert.equal(f.calls[0].options.method,"GET");
 assert.equal(f.calls[0].options.cache,"no-store");
 assert.equal(f.calls[0].options.credentials,"omit");
 assert.ok(f.calls[0].url.includes("accountId="+accountId));
 const root=f.mount.children[0];
 assert.ok(root.lines.includes("GBP 75.00"));
 assert.ok(root.lines.includes("GBP 25.00"));
 const button=root.children.at(-1);
 assert.equal(button.disabled,true);
 assert.equal(button.attributes["aria-disabled"],"true");
});
test("invalid or inconsistent backend snapshot fails closed",async()=>{
 for(const malformed of [
 {...data(),financialExecutionEnabled:true},
 {...data(),wallets:[{...data().wallets[0],availableMinor:"9999"}]},
 {...data(),wallets:[{...data().wallets[0],walletId:accountId}]},
 {...data(),wallets:[]}
 ]){
  const f=setup({response:malformed});
  assert.equal((await f.dashboard.refresh(config,f.mount)).status,"UNAVAILABLE");
  assert.ok(f.mount.children[0].lines.includes("Wallet balance unavailable"));
  assert.ok(!f.mount.children[0].lines.includes("GBP 75.00"));
 }
});
test("failed HTTP and token acquisition do not expose cached balances",async()=>{
 const f=setup();
 assert.equal((await f.dashboard.refresh(config,f.mount)).status,"READ_ONLY_RENDERED");
 const failing=setup({status:503});
 assert.equal((await failing.dashboard.refresh(config,f.mount)).status,"UNAVAILABLE");
 assert.ok(!f.mount.children[0].lines.includes("GBP 75.00"));
 const noToken=setup({tokenProvider:async()=>""});
 assert.equal((await noToken.dashboard.refresh(config,noToken.mount)).status,"UNAVAILABLE");
 assert.equal(noToken.calls.length,0);
});
test("stale response never overwrites newer wallet view",async()=>{
 let finish;let count=0;
 const f=setup({fetchImpl:async()=>{
  count++;
  if(count===1)return await new Promise(resolve=>{finish=resolve;});
  return {status:200,json:async()=>({...data(),wallets:[{
    ...data().wallets[0],postedMinor:"5000",heldMinor:"0",availableMinor:"5000"
  }]})};
 }});
 const first=f.dashboard.refresh(config,f.mount);
 await new Promise(resolve=>setImmediate(resolve));
 const second=await f.dashboard.refresh(config,f.mount);
 assert.equal(second.status,"READ_ONLY_RENDERED");
 finish({status:200,json:async()=>data()});
 assert.equal((await first).status,"STALE_IGNORED");
 assert.ok(f.mount.children[0].lines.includes("GBP 50.00"));
});
test("money is exact for int64 bounds without float rounding",()=>{
 assert.equal(formatPay54WalletMinor("9223372036854775807","GBP"),
 "GBP 92233720368547758.07");
 assert.throws(()=>formatPay54WalletMinor("9223372036854775808","GBP"));
});
