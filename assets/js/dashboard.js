/* =========================
   PAY54 DASHBOARD v9.2 CLEAN STABLE
========================= */

(function(){
"use strict";

/* =========================
   SAFE LEDGER ACCESS
========================= */
function getLedger(){
  return window.PAY54_LEDGER || null;
}

/* =========================
   SAFE DOM
========================= */
const $ = (s)=>document.querySelector(s);

/* =========================
   BASIC RENDER
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
   TRANSACTION
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

/* =========================
   CLICK BINDING
========================= */
function bindUI(){

  document.querySelectorAll("[data-action='send']")
    .forEach(el=>el.onclick = send);

  document.querySelectorAll("[data-action='add_money']")
    .forEach(el=>el.onclick = addMoney);

  document.querySelectorAll("[data-action='withdraw']")
    .forEach(el=>el.onclick = withdraw);

  document.querySelectorAll("[data-action='scan_pay']")
    .forEach(el=>el.onclick = ()=>alert("Scan Pay coming"));

  document.querySelectorAll("[data-action='bank_transfer']")
    .forEach(el=>el.onclick = ()=>alert("Bank Transfer coming"));

}

/* =========================
   INIT
========================= */
function init(){

  console.log("✅ PAY54 LOADED CLEAN");

  bindUI();
  renderBalance();
}

/* =========================
   BOOT
========================= */
document.addEventListener("DOMContentLoaded", ()=>{

  const check = setInterval(()=>{

    if(getLedger()){
      clearInterval(check);
      init();
    }

  },200);

});

})();
