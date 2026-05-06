/* =========================
   PAY54 v9.6 HYBRID (STABLE + FULL UI RESTORE)
========================= */

(function(){
"use strict";

/* =========================
   CORE HELPERS
========================= */
const $ = (s)=>document.querySelector(s);

function getLedger(){
  return window.PAY54_LEDGER || null;
}

/* =========================
   BALANCE ENGINE
========================= */
function renderBalance(){

  const el = $("#balanceAmount");
  if(!el) return;

  const ledger = getLedger();
  if(!ledger) return;

  const balances = ledger.getBalances();
  const cur = localStorage.getItem("pay54_currency") || "NGN";

  el.textContent = ledger.moneyFmt(cur, balances[cur] || 0);
}

/* =========================
   CURRENCY SYSTEM (RESTORED)
========================= */
function bindCurrency(){

  const pills = document.querySelectorAll(".currency");
  const dropdown = $("#currencySelect");

  function setCurrency(cur){
    localStorage.setItem("pay54_currency", cur);

    pills.forEach(p=>{
      p.classList.toggle("active", p.dataset.cur === cur);
    });

    if(dropdown) dropdown.value = cur;

    renderBalance();
  }

  pills.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      setCurrency(btn.dataset.cur);
    });
  });

  if(dropdown){
    dropdown.addEventListener("change",(e)=>{
      setCurrency(e.target.value);
    });
  }
}

/* =========================
   TRANSACTION ENGINE
========================= */
function processTx(entry){

  const ledger = getLedger();
  if(!ledger){
    alert("System not ready");
    return;
  }

  ledger.applyEntry(entry);
  renderBalance();
}

/* =========================
   FLOWS
========================= */

function send(){
  const user = prompt("Recipient");
  const amount = Number(prompt("Amount"));
  if(!amount) return;

  processTx({
    type:"send",
    title:`Sent to ${user}`,
    currency:"NGN",
    amount:-amount
  });
}

function addMoney(){
  const amount = Number(prompt("Amount"));
  if(!amount) return;

  processTx({
    type:"fund",
    title:"Wallet Top-up",
    currency:"NGN",
    amount:amount
  });
}

function withdraw(){
  const amount = Number(prompt("Amount"));
  if(!amount) return;

  processTx({
    type:"withdraw",
    title:"Withdrawal",
    currency:"NGN",
    amount:-amount
  });
}

function bankTransfer(){
  const bank = prompt("Bank");
  const amount = Number(prompt("Amount"));
  if(!amount) return;

  processTx({
    type:"bank_transfer",
    title:`Transfer to ${bank}`,
    currency:"NGN",
    amount:-amount
  });
}

function scanPay(){
  alert("Scan Pay coming");
}

/* =========================
   SERVICES MAP
========================= */

const ACTIONS = {
  send,
  receive: ()=>alert("Receive"),
  scan_pay: scanPay,
  add_money: addMoney,
  withdraw,
  bank_transfer: bankTransfer
};

const SERVICES = {
  fx: ()=>alert("FX coming"),
  bills: ()=>alert("Bills"),
  savings: ()=>alert("Savings"),
  cards: ()=>alert("Cards"),
  checkout: ()=>alert("Checkout"),
  shop: ()=>alert("Shop"),
  merchantqr: ()=>alert("QR"),
  trading: ()=>alert("Trading"),
  bet: ()=>alert("Bet"),
  agent: ()=>alert("Agent"),
  request: ()=>alert("Request"),
  risk: ()=>alert("Risk")
};

/* =========================
   🔥 FULL CLICK ENGINE (v8.1 RESTORED)
========================= */

function bindClicks(){

  document.addEventListener("click",(e)=>{

    const el = e.target.closest(".tile-btn, .shortcut-btn, .utility-btn");

    if(!el) return;

    const action =
      el.dataset.action ||
      el.dataset.service ||
      el.dataset.shortcut ||
      el.dataset.utility;

    if(!action){
      console.warn("No action");
      return;
    }

    if(ACTIONS[action]){
      ACTIONS[action]();
      return;
    }

    if(SERVICES[action]){
      SERVICES[action]();
      return;
    }

    console.warn("Unknown:", action);

  });

}

/* =========================
   HEADER BUTTONS (RESTORED)
========================= */

function bindHeader(){

  const addBtn = $("#addMoneyBtn");
  const wdBtn = $("#withdrawBtn");

  if(addBtn) addBtn.onclick = addMoney;
  if(wdBtn) wdBtn.onclick = withdraw;
}

/* =========================
   INIT
========================= */

function init(){

  console.log("✅ PAY54 v9.6 HYBRID ACTIVE");

  bindClicks();        // 🔥 FULL routing restored
  bindCurrency();      // 🔥 FIX pills
  bindHeader();        // 🔥 FIX header buttons

  renderBalance();
}

/* =========================
   BOOT
========================= */

document.addEventListener("DOMContentLoaded",()=>{

  const wait = setInterval(()=>{

    if(getLedger()){
      clearInterval(wait);
      init();
    }

  },200);

});

})();
