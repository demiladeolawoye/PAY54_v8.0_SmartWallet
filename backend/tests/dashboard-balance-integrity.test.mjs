"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const source=readFileSync(new URL("../../assets/js/dashboard-core.js",import.meta.url),"utf8");
const start=source.indexOf("function renderBalance(){");
const end=source.indexOf("/* =========================================\n   CURRENCY SWITCHER",start);
assert.ok(start>=0&&end>start,"Canonical dashboard balance renderer is present");
const rendererSource=source.slice(start,end);
assert.doesNotMatch(rendererSource,/70284035/);

function harness({balances={},currency="NGN",failure=false,formatter}={}){
 const balance={textContent:"PREVIOUS_BALANCE"};
 const wallet={innerHTML:"PREVIOUS_WALLET_HTML"};
 const nodes={"#balanceAmount":balance,"#walletBalances":wallet};
 const ledger={
  getBalances(){if(failure)throw Error("PRIVATE_BALANCE_ERROR");return balances;}
 };
 const context={
  window:{PAY54_LEDGER:ledger,PAY54_APP:{activeCurrency:currency}},
  qs:selector=>nodes[selector]??null,
  safeMoneyFmt:formatter??((cur,amount)=>cur+":"+String(amount)),
  console:{log(){},error(){throw Error("UNEXPECTED_RENDER_FAILURE");}}
 };
 vm.runInNewContext(rendererSource,context,{timeout:1000});
 context.renderBalance();
 return {balance:balance.textContent,wallet:wallet.innerHTML};
}
test("legitimate zero balance remains zero, never replaced with a demo amount",()=>{
 const r=harness({balances:{NGN:0,GBP:100}});
 assert.equal(r.balance,"NGN:0");
 assert.doesNotMatch(r.wallet,/70284035/);
});
test("missing, empty and nonnumeric balances are never fabricated",()=>{
 for(const balances of [{},{NGN:null},{NGN:false},{NGN:""},{NGN:"no funds"},
  {NGN:Infinity},{NGN:NaN},{NGN:"1e1000"},null]){
  const r=harness({balances});
  assert.equal(r.balance,"Balance unavailable");
 }
});
test("ledger failure clears the stale previously rendered sensitive values",()=>{
 const r=harness({failure:true});
 assert.equal(r.balance,"Balance unavailable");
 assert.match(r.wallet,/Wallet balances unavailable/);
 assert.doesNotMatch(r.wallet,/PREVIOUS_WALLET_HTML/);
});
test("valid signed finite numbers and numeric decimals remain visible",()=>{
 assert.equal(harness({balances:{NGN:"-2.50"}}).balance,"NGN:-2.5");
 assert.equal(harness({balances:{NGN:"100.23"}}).balance,"NGN:100.23");
});
test("unknown active currency does not borrow any other wallet balance",()=>{
 const r=harness({balances:{GBP:123.45},currency:"USD"});
 assert.equal(r.balance,"Balance unavailable");
});
test("untrusted currency property keys cannot inject markup",()=>{
 const r=harness({balances:{"<img src=x onerror=alert(1)>":5,NGN:10}});
 assert.doesNotMatch(r.wallet,/<img/);
 assert.match(r.wallet,/NGN/);
});
test("formatter HTML is escaped before wallet listing is rendered",()=>{
 const r=harness({balances:{NGN:1},
  formatter:()=>'<img src=x onerror="alert(1)"> & \''});
 assert.doesNotMatch(r.wallet,/<img/);
 assert.match(r.wallet,/&lt;img/);
 assert.match(r.wallet,/&quot;/);
 assert.match(r.wallet,/&#39;/);
});
test("existing dashboard remains a classic script and has no new network endpoint",()=>{
 assert.doesNotMatch(source,/import\s+\{/);
 assert.doesNotMatch(rendererSource,/fetch\(|XMLHttpRequest|sendMoney|applyEntry/);
});
