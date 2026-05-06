/* =========================
   PAY54 DASHBOARD v9.5 CORE ENGINE
   Stable + Scalable Build
========================= */

(function(){
"use strict";

/* =========================
   CORE
========================= */

const LS = {
  CUR: "pay54_currency"
};

function $(s){ return document.querySelector(s); }

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
  const cur = localStorage.getItem(LS.CUR) || "NGN";

  el.textContent = ledger.moneyFmt(cur, balances[cur] || 0);
}

/* =========================
   TRANSACTION ENGINE (SAFE)
========================= */

function processTx(entry, label){

  const ledger = getLedger();

  if(!ledger){
    alert("System not ready");
    return;
  }

  if(!entry.amount || isNaN(entry.amount)){
    alert("Invalid amount");
    return;
  }

  const tx = ledger.applyEntry(entry);

  renderBalance();

  showReceipt(tx, label);

}

/* =========================
   RECEIPT (CLEAN VERSION)
========================= */

function showReceipt(tx, label){

  alert(
`PAY54 RECEIPT
${label}

Amount: ${tx.amount}
Currency: ${tx.currency}
Time: ${new Date().toLocaleString()}
`
  );

}

/* =========================
   MONEY FLOWS
========================= */

function send(){

  const user = prompt("Recipient (@username)");
  const amount = Number(prompt("Amount"));

  if(!user || !amount) return;

  processTx({
    type:"send",
    title:`Sent to ${user}`,
    currency:"NGN",
    amount:-amount
  }, "Send Money");

}

function addMoney(){

  const amount = Number(prompt("Amount"));

  if(!amount) return;

  processTx({
    type:"fund",
    title:"Wallet Top-up",
    currency:"NGN",
    amount:amount
  }, "Add Money");

}

function withdraw(){

  const amount = Number(prompt("Amount"));

  if(!amount) return;

  processTx({
    type:"withdraw",
    title:"Withdrawal",
    currency:"NGN",
    amount:-amount
  }, "Withdraw");

}

/* =========================
   BANK TRANSFER (FIXED)
========================= */

function bankTransfer(){

  const bank = prompt("Bank Name");
  const acc = prompt("Account Number");
  const amount = Number(prompt("Amount"));

  if(!bank || !acc || !amount) return;

  processTx({
    type:"bank_transfer",
    title:`Transfer to ${bank}`,
    currency:"NGN",
    amount:-amount,
    meta:{
      bank,
      account: acc
    }
  }, "Bank Transfer");

}

/* =========================
   PLACEHOLDERS (SAFE)
========================= */

function scanPay(){
  alert("Scan & Pay coming next phase");
}

function fx(){
  alert("Global Transfer coming next phase");
}

/* =========================
   ROUTING ENGINE (CRITICAL)
========================= */

const ACTIONS = {
  send,
  receive: ()=>alert("Receive coming"),
  scan_pay: scanPay,
  add_money: addMoney,
  withdraw,
  bank_transfer: bankTransfer
};

const SERVICES = {
  fx,
  bills: ()=>alert("Bills coming"),
  savings: ()=>alert("Savings coming"),
  cards: ()=>alert("Cards coming"),
  checkout: ()=>alert("Checkout coming"),
  shop: ()=>alert("Shop coming"),
  merchantqr: ()=>alert("QR coming"),
  trading: ()=>alert("Trading coming"),
  bet: ()=>alert("Bet coming"),
  agent: ()=>alert("Agent coming"),
  request: ()=>alert("Request coming"),
  risk: ()=>alert("Risk coming")
};

/* =========================
   CLICK ENGINE (STABLE)
========================= */

function bindClicks(){

  document.addEventListener("click",(e)=>{

    const btn = e.target.closest(".tile-btn");
    if(!btn) return;

    const action = btn.dataset.action;
    const service = btn.dataset.service;

    if(action && ACTIONS[action]){
      ACTIONS[action]();
      return;
    }

    if(service && SERVICES[service]){
      SERVICES[service]();
      return;
    }

  });

}

/* =========================
   INIT
========================= */

function init(){

  console.log("✅ PAY54 v9.5 LOADED");

  bindClicks();
  renderBalance();

}

/* =========================
   BOOT
========================= */

document.addEventListener("DOMContentLoaded", ()=>{

  const wait = setInterval(()=>{

    if(getLedger()){
      clearInterval(wait);
      init();
    }

  },200);

});

})();
