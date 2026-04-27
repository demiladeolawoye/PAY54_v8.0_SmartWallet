REPLACE your entire `assets/js/dashboard.js` with this:

```javascript
/* =========================
   PAY54 Dashboard — v8.2 STABLE CLEAN
   CTO FIX: BOOT + LEDGER + CLICK SYSTEM
========================= */

(() => {
"use strict";

/* =========================
   🔥 GLOBAL STATE (SINGLE SOURCE)
========================= */
let LEDGER = null;
let APP_READY = false;

/* =========================
   SAFE LEDGER ACCESS
========================= */
function getLedger(){
  if(LEDGER) return LEDGER;

  if(window.PAY54_LEDGER){
    LEDGER = window.PAY54_LEDGER;
    return LEDGER;
  }

  return null;
}

/* =========================
   WAIT FOR CORE SYSTEM
========================= */
function waitForSystemReady(cb){

  let tries = 0;

  function check(){

    if(
      window.PAY54_LEDGER &&
      typeof window.PAY54_LEDGER.getBalances === "function"
    ){
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

/* =========================
   SAFE INIT (RUN ONCE ONLY)
========================= */
function init(){

  if(APP_READY){
    console.warn("⚠️ INIT BLOCKED (already ran)");
    return;
  }

  APP_READY = true;

  console.log("🚀 PAY54 INIT STARTED");

  /* 🔥 FORCE SEED FIRST */
  seedDemoIfEmpty();

  /* 🔥 INITIAL UI */
  setActiveCurrency(getSelectedCurrency());
  renderRecentTransactions();
  renderAlerts();
  renderNews();
  renderFxTicker();

  /* 🔥 BIND CLICK SYSTEM AFTER INIT */
  bindClickSystem();

  console.log("✅ PAY54 READY");
}

/* =========================
   🔥 CLEAN CLICK SYSTEM (FIXED)
========================= */
function bindClickSystem(){

  document.addEventListener("click",(e)=>{

    const el = e.target.closest(".tile-btn, .shortcut-btn, .utility-btn");
    if(!el) return;

    const key =
      el.dataset.action ||
      el.dataset.service ||
      el.dataset.shortcut;

    if(!key){
      console.warn("No action defined");
      return;
    }

    const fn = SERVICES[key];

    if(typeof fn !== "function"){
      console.warn("Unknown service:", key);
      return;
    }

    fn();
  });

}

/* =========================
   🔥 SAFE BALANCE ENGINE
========================= */
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

/* =========================
   🔥 SEED (NO ZERO BUG EVER AGAIN)
========================= */
function seedDemoIfEmpty(){

  const ledger = getLedger();
  if(!ledger) return;

  const balances = ledger.getBalances() || {};
  const total = Object.values(balances).reduce((a,b)=>a+Number(b||0),0);

  if(total > 0) return;

  console.log("🔥 SEEDING WALLET");

  const entry = ledger.createEntry({
    type:"seed",
    title:"Initial Funding",
    currency:"NGN",
    amount:70284035,
    icon:"💰"
  });

  ledger.applyEntry(entry);
}

/* =========================
   BASIC UI SAFE RENDERS
========================= */
function renderRecentTransactions(){
  console.log("Render TX");
}

function renderAlerts(){}
function renderNews(){}
function renderFxTicker(){}

/* =========================
   SERVICES (SAFE)
========================= */
const SERVICES = {
  send: ()=>console.log("Send"),
  receive: ()=>console.log("Receive"),
  scan_pay: ()=>console.log("Scan Pay"),
  add_money: ()=>console.log("Add Money"),
  withdraw: ()=>console.log("Withdraw")
};

/* =========================
   🚀 BOOTSTRAP (FINAL FIX)
========================= */
document.addEventListener("DOMContentLoaded", () => {

  console.log("📦 DOM READY");

  waitForSystemReady(() => {
    console.log("✅ SYSTEM READY");
    init();
  });

});

})();
```
