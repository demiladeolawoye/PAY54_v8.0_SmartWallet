/* =========================
   PAY54 v9.2 — UI RESTORED (ON TOP OF v9 ENGINE)
========================= */

(function(){
"use strict";

/* =========================
   CORE ENGINE ACCESS
========================= */
function getLedger(){
  return window.PAY54_LEDGER || null;
}

function getCurrency(){
  return localStorage.getItem("pay54_currency") || "NGN";
}

/* =========================
   SAFE DOM
========================= */
const $ = (s)=>document.querySelector(s);

/* =========================
   TRANSACTION PIPELINE
========================= */
function processTx(entry){

  const ledger = getLedger();
  if(!ledger){
    alert("System not ready");
    return;
  }

  const tx = ledger.applyEntry(entry);

  renderAll();
  showReceipt(tx);
}

/* =========================
   RENDER
========================= */
function renderBalance(){

  const el = $("#balanceAmount");
  if(!el) return;

  const ledger = getLedger();
  if(!ledger) return;

  const bal = ledger.getBalances();
  const cur = getCurrency();

  el.textContent = ledger.moneyFmt(cur, bal[cur] || 0);
}

function renderRecent(){

  const container = $('[data-role="recentTxFeed"]');
  if(!container) return;

  const ledger = getLedger();
  if(!ledger) return;

  const txs = ledger.getTx().slice(0,5);

  container.innerHTML = txs.map(tx=>`
    <div class="feed-item">
      <div class="feed-title">${tx.title}</div>
      <div class="feed-sub">${tx.currency} ${tx.amount}</div>
    </div>
  `).join("");
}

function renderAll(){
  renderBalance();
  renderRecent();
}

/* =========================
   RECEIPT
========================= */
function showReceipt(tx){
  alert(`${tx.title}\n${tx.currency} ${tx.amount}`);
}

/* =========================
   PIN
========================= */
function requirePIN(cb){

  let pin = localStorage.getItem("pay54_pin");

  if(!pin){
    pin = prompt("Create PIN");
    if(!pin) return;
    localStorage.setItem("pay54_pin", pin);
  }

  const input = prompt("Enter PIN");

  if(input === pin){
    cb();
  }else{
    alert("Wrong PIN");
  }
}

/* =========================
   ACTIONS (CONNECTED TO UI)
========================= */

function sendFlow(){

  const user = prompt("Recipient");
  const amount = Number(prompt("Amount"));

  if(!amount) return;

  requirePIN(()=>{
    processTx({
      type:"send",
      title:`Sent to ${user}`,
      currency:getCurrency(),
      amount:-amount
    });
  });
}

function addMoneyFlow(){

  const amount = Number(prompt("Amount"));
  if(!amount) return;

  processTx({
    type:"fund",
    title:"Wallet Top-up",
    currency:getCurrency(),
    amount:amount
  });
}

function withdrawFlow(){

  const amount = Number(prompt("Amount"));
  if(!amount) return;

  requirePIN(()=>{
    processTx({
      type:"withdraw",
      title:"Withdrawal",
      currency:getCurrency(),
      amount:-amount
    });
  });
}

function scanPayFlow(){
  alert("Scan & Pay coming next layer");
}

function bankTransferFlow(){
  alert("Bank Transfer flow coming next");
}

/* =========================
   🔥 AUTO UI BINDING (KEY FIX)
========================= */
function bindUI(){

  // MONEY MOVES
  bind("send", sendFlow);
  bind("receive", ()=>alert("Receive coming"));
  bind("scan_pay", scanPayFlow);
  bind("add_money", addMoneyFlow);
  bind("withdraw", withdrawFlow);
  bind("bank_transfer", bankTransferFlow);

  // SERVICES
  bind("fx", ()=>alert("FX coming"));
  bind("bills", ()=>alert("Bills coming"));
  bind("savings", ()=>alert("Savings coming"));
  bind("cards", ()=>alert("Cards coming"));
}

/* =========================
   UNIVERSAL BINDER
========================= */
function bind(action, handler){

  document.querySelectorAll(`
    [data-action="${action}"],
    [data-service="${action}"],
    [data-shortcut="${action}"]
  `).forEach(el=>{
    el.addEventListener("click", handler);
  });

}

/* =========================
   INIT
========================= */
function init(){

  console.log("🚀 PAY54 UI RESTORED");

  bindUI();
  renderAll();
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

  },150);

});

})();
