/* =========================
   PAY54 Dashboard — v9.1 STABLE CORE (UI SAFE VERSION)
   FULL REPLACEMENT — NO PATCHING REQUIRED
========================= */

(function(){
"use strict";

/* =========================
   SAFE LOGGER
========================= */
const log = (...args) => console.log("PAY54:", ...args);

/* =========================
   SAFE LEDGER ACCESS (ONLY SOURCE)
========================= */
function getLedger(){
  if(window.PAY54_LEDGER && typeof window.PAY54_LEDGER.getBalances === "function"){
    return window.PAY54_LEDGER;
  }
  return null;
}

/* =========================
   WAIT FOR SYSTEM READY
========================= */
function waitForReady(cb){

  let tries = 0;

  function check(){

    const ledger = getLedger();

    if(ledger){
      log("Ledger ready");
      cb();
      return;
    }

    tries++;
    if(tries > 30){
      console.error("🚨 Ledger failed to load");
      return;
    }

    setTimeout(check, 150);
  }

  check();
}

/* =========================
   LOCAL STORAGE KEYS
========================= */
const LS = {
  CURRENCY: "pay54_currency",
  PIN: "pay54_pin"
};

/* =========================
   STATE HELPERS
========================= */
function getCurrency(){
  return localStorage.getItem(LS.CURRENCY) || "NGN";
}

function setCurrency(cur){
  localStorage.setItem(LS.CURRENCY, cur);
}

/* =========================
   CORE TRANSACTION ENGINE
   (ONLY WAY TO WRITE MONEY)
========================= */
function processTransaction(entry, opts = {}){

  const ledger = getLedger();

  if(!ledger){
    alert("System not ready");
    return null;
  }

  try{

    const tx = ledger.applyEntry(entry);

    renderAll();

    if(opts.receipt){
      showReceipt(tx);
    }

    return tx;

  }catch(err){
    console.error("TX ERROR:", err);
    alert("Transaction failed");
    return null;
  }
}

/* =========================
   SAFE DOM HELPERS
========================= */
function safeEl(id){
  return document.getElementById(id) || null;
}

function safeQuery(sel){
  return document.querySelector(sel) || null;
}

/* =========================
   BALANCE RENDER
========================= */
function renderBalance(){

  const ledger = getLedger();
  if(!ledger) return;

  const el = safeEl("totalBalance");
  if(!el){
    log("balanceAmount not found — skipping");
    return;
  }

  const balances = ledger.getBalances();
  const cur = getCurrency();

  el.textContent = ledger.moneyFmt(cur, balances[cur] || 0);
}

/* =========================
   RECENT TRANSACTIONS
========================= */
function renderRecent(){

  const ledger = getLedger();
  if(!ledger) return;

  const container = safeQuery('[data-role="recentTxFeed"]');

  if(!container){
    log("recentTxFeed missing — skipping");
    return;
  }

  const txs = ledger.getTx().slice(0,5);

  if(!txs.length){
    container.innerHTML = `<div>No transactions yet</div>`;
    return;
  }

  container.innerHTML = txs.map(tx => `
    <div class="feed-item">
      <div>${tx.title}</div>
      <div>${tx.currency} ${tx.amount}</div>
    </div>
  `).join("");
}

/* =========================
   RECEIPT (ALWAYS)
========================= */
function showReceipt(tx){

  alert(`
PAY54 RECEIPT
-------------
${tx.title}
${tx.currency} ${tx.amount}
ID: ${tx.id}
${new Date().toLocaleString()}
  `);
}

/* =========================
   PIN SYSTEM
========================= */
function requirePIN(cb){

  let pin = localStorage.getItem(LS.PIN);

  if(!pin){
    pin = prompt("Create a PIN");
    if(!pin) return;
    localStorage.setItem(LS.PIN, pin);
  }

  const input = prompt("Enter PIN");

  if(input === pin){
    cb();
  }else{
    alert("Incorrect PIN");
  }
}

/* =========================
   ACTIONS (CLEAN + STABLE)
========================= */

function actionSend(){

  const user = prompt("Send to:");
  const amount = Number(prompt("Amount"));

  if(!amount || amount <= 0) return;

  requirePIN(()=>{

    processTransaction({
      type:"send",
      title:`Sent to ${user}`,
      currency:getCurrency(),
      amount:-amount
    }, {receipt:true});

  });
}

function actionAddMoney(){

  const amount = Number(prompt("Amount"));

  if(!amount || amount <= 0) return;

  processTransaction({
    type:"fund",
    title:"Wallet Top-up",
    currency:getCurrency(),
    amount:amount
  }, {receipt:true});
}

function actionWithdraw(){

  const amount = Number(prompt("Amount"));

  if(!amount || amount <= 0) return;

  requirePIN(()=>{

    processTransaction({
      type:"withdraw",
      title:"Withdrawal",
      currency:getCurrency(),
      amount:-amount
    }, {receipt:true});

  });
}

function actionShop(){

  const merchant = prompt("Merchant");
  const amount = Number(prompt("Amount"));

  if(!amount || amount <= 0) return;

  requirePIN(()=>{

    processTransaction({
      type:"shop",
      title:merchant,
      currency:getCurrency(),
      amount:-amount
    }, {receipt:true});

  });
}

/* =========================
   RENDER ALL
========================= */
function renderAll(){
  renderBalance();
  renderRecent();
}

/* =========================
   INIT
========================= */
function init(){

  if(window.__PAY54_INIT__) return;
  window.__PAY54_INIT__ = true;

  log("INIT v9.1");

  renderAll();
}

/* =========================
   BOOTSTRAP
========================= */
document.addEventListener("DOMContentLoaded", ()=>{

  log("DOM READY");

  waitForReady(()=>{
    init();
  });

});
/* =========================
   PAY54 UI BRIDGE
========================= */

window.PAY54_UI = {

  openSend(){
    actionSend();
  },

  openReceive(){
    alert("Receive Money Coming Soon");
  },

  openScanAndPay(){
    alert("Scan & Pay Coming Soon");
  },

  openAddMoney(){
    actionAddMoney();
  },

  openWithdraw(){
    actionWithdraw();
  },

  openBankTransfer(){
    alert("Bank Transfer Coming Soon");
  },

  openGlobalTransfer(){
    alert("Global Transfer Coming Soon");
  },

  openBills(){
    alert("Bills Coming Soon");
  },

  openSavings(){
    alert("Savings Coming Soon");
  },

  openCards(){
    alert("Cards Coming Soon");
  },

  openCheckout(){
    alert("Checkout Coming Soon");
  },

  openShop(){
    actionShop();
  },

  openMerchantQR(){
    alert("Merchant QR Coming Soon");
  },

  openRequestMoney(){
    alert("Request Money Coming Soon");
  },

  openTrading(){
    alert("Trading Coming Soon");
  },

  openAgent(){
    alert("Become Agent Coming Soon");
  },

  openRisk(){
    alert("AI Risk Watch Coming Soon");
  }

};

log("PAY54_UI READY");
})();
