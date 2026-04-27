(() => {
"use strict";

let LEDGER = null;
let APP_READY = false;

function getLedger(){
  if(LEDGER) return LEDGER;
  if(window.PAY54_LEDGER){
    LEDGER = window.PAY54_LEDGER;
    return LEDGER;
  }
  return null;
}

function waitForSystemReady(cb){
  let tries = 0;

  function check(){
    if(window.PAY54_LEDGER && typeof window.PAY54_LEDGER.getBalances === "function"){
      LEDGER = window.PAY54_LEDGER;
      cb();
      return;
    }

    tries++;
    if(tries > 30){
      console.error("🚨 SYSTEM FAILED TO LOAD");
      return;
    }

    setTimeout(check, 150);
  }

  check();
}

function seedDemoIfEmpty(){
  const ledger = getLedger();
  if(!ledger) return;

  const balances = ledger.getBalances() || {};
  const total = Object.values(balances).reduce((a,b)=>a+Number(b||0),0);

  if(total > 0) return;

  const entry = ledger.createEntry({
    type:"seed",
    title:"Initial Funding",
    currency:"NGN",
    amount:70284035,
    icon:"💰"
  });

  ledger.applyEntry(entry);
}

function setActiveCurrency(cur){
  localStorage.setItem("pay54_currency", cur);

  const ledger = getLedger();
  if(!ledger) return;

  const balances = ledger.getBalances() || {};
  const value = balances[cur] || 0;

  const el = document.getElementById("balanceAmount");
  if(el){
    el.textContent = ledger.moneyFmt(cur, value);
  }
}

function bindClickSystem(){
  document.addEventListener("click",(e)=>{
    const el = e.target.closest(".tile-btn, .shortcut-btn, .utility-btn");
    if(!el) return;

    const key = el.dataset.action || el.dataset.service || el.dataset.shortcut;

    if(!key) return;

    const fn = SERVICES[key];
    if(typeof fn === "function") fn();
  });
}

const SERVICES = {
  send: ()=>console.log("Send"),
  receive: ()=>console.log("Receive"),
  scan_pay: ()=>console.log("Scan Pay"),
  add_money: ()=>console.log("Add Money"),
  withdraw: ()=>console.log("Withdraw")
};

function init(){
  if(APP_READY) return;
  APP_READY = true;

  seedDemoIfEmpty();
  setActiveCurrency(localStorage.getItem("pay54_currency") || "NGN");
  bindClickSystem();
}

document.addEventListener("DOMContentLoaded", () => {
  waitForSystemReady(init);
});

})();
