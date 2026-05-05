/* =========================
   PAY54 Dashboard — v9.0 REBUILD (CTO STABLE CORE)
========================= */

(function(){
"use strict";

/* =========================
   SAFE LEDGER (SINGLE SOURCE)
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
      cb(ledger);
      return;
    }

    tries++;
    if(tries > 25){
      console.error("🚨 Ledger not ready");
      return;
    }

    setTimeout(check, 150);
  }

  check();
}

/* =========================
   GLOBAL ERROR GUARD
========================= */
window.addEventListener("error", () => {
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">
      <div>
        <h2>⚠️ PAY54 Temporary Issue</h2>
        <button onclick="location.reload()">Refresh</button>
      </div>
    </div>
  `;
});

/* =========================
   STATE
========================= */
const LS = {
  CURRENCY: "pay54_currency",
  PIN: "pay54_pin"
};

function getCurrency(){
  return localStorage.getItem(LS.CURRENCY) || "NGN";
}

function setCurrency(c){
  localStorage.setItem(LS.CURRENCY, c);
}

/* =========================
   CORE TRANSACTION ENGINE (MANDATORY)
========================= */
function processTx(entry, options = {}){
  const ledger = getLedger();
  if(!ledger){
    alert("System not ready");
    return;
  }

  try{
    const tx = ledger.applyEntry(entry);

    renderBalance();
    renderRecent();

    if(options.receipt){
      showReceipt(tx);
    }

    return tx;

  }catch(e){
    console.error(e);
    alert("Transaction failed");
  }
}

/* =========================
   BALANCE
========================= */
function renderBalance(){

  const ledger = getLedger();
  if(!ledger) return;

  const balances = ledger.getBalances();
  const cur = getCurrency();

  const el = document.getElementById("balanceAmount");
  if(!el) return;

  el.textContent = ledger.moneyFmt(cur, balances[cur] || 0);
}

/* =========================
   RECENT TX
========================= */
function renderRecent(){

  const ledger = getLedger();
  if(!ledger) return;

  const container = document.querySelector('[data-role="recentTxFeed"]');
  if(!container) return;

  const txs = ledger.getTx().slice(0,5);

  container.innerHTML = txs.map(tx => `
    <div class="feed-item">
      <div>${tx.title}</div>
      <div>${tx.amount}</div>
    </div>
  `).join("");
}

/* =========================
   RECEIPT (ALWAYS)
========================= */
function showReceipt(tx){

  alert(`
PAY54 RECEIPT
${tx.title}
${tx.currency} ${tx.amount}
ID: ${tx.id}
  `);
}

/* =========================
   PIN
========================= */
function requirePIN(cb){

  let pin = localStorage.getItem(LS.PIN);

  if(!pin){
    pin = prompt("Create PIN");
    localStorage.setItem(LS.PIN, pin);
  }

  const input = prompt("Enter PIN");

  if(input === pin){
    cb();
  }else{
    alert("Wrong PIN");
  }
}

/* =========================
   ACTIONS
========================= */

function send(){

  const user = prompt("Send to:");
  const amount = Number(prompt("Amount"));

  if(!amount) return;

  requirePIN(()=>{

    processTx({
      type:"send",
      title:`Sent to ${user}`,
      currency:getCurrency(),
      amount:-amount
    }, {receipt:true});

  });
}

function addMoney(){

  const amount = Number(prompt("Amount"));

  processTx({
    type:"fund",
    title:"Wallet Top-up",
    currency:getCurrency(),
    amount:amount
  }, {receipt:true});
}

function withdraw(){

  const amount = Number(prompt("Amount"));

  requirePIN(()=>{

    processTx({
      type:"withdraw",
      title:"Withdrawal",
      currency:getCurrency(),
      amount:-amount
    }, {receipt:true});

  });
}

/* =========================
   SHOP (FIXED)
========================= */
function openShop(){

  const merchant = prompt("Merchant:");
  const amount = Number(prompt("Amount"));

  if(!amount) return;

  requirePIN(()=>{

    processTx({
      type:"shop",
      title:merchant,
      currency:getCurrency(),
      amount:-amount
    }, {receipt:true});

  });
}

/* =========================
   CLICK SYSTEM (CLEAN)
========================= */
function bindClicks(){

  document.addEventListener("click",(e)=>{

    const el = e.target.closest("[data-action]");
    if(!el) return;

    const action = el.dataset.action;

    const map = {
      send,
      add: addMoney,
      withdraw,
      shop: openShop
    };

    if(map[action]){
      map[action]();
    }

  });
}

/* =========================
   INIT
========================= */
function init(){

  console.log("🚀 PAY54 v9 INIT");

  renderBalance();
  renderRecent();
  bindClicks();
}

/* =========================
   BOOT
========================= */
document.addEventListener("DOMContentLoaded", ()=>{

  waitForReady(()=>{
    init();
  });

});

})();
