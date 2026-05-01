/* =========================
   PAY54 DASHBOARD — v9.0 FULL BUILD
   CORE ENGINE (CLEAN FOUNDATION)
========================= */

"use strict";

/* =========================
   GLOBAL ERROR GUARD
========================= */
window.addEventListener("error", function (e) {
  console.error("🚨 GLOBAL ERROR:", e.message);
});

/* =========================
   GLOBAL STATE
========================= */
let LEDGER = null;

/* =========================
   SAFE LEDGER ACCESS
========================= */
function safeLedger(){
  if (LEDGER && typeof LEDGER.getBalances === "function") return LEDGER;

  if (window.PAY54_LEDGER) {
    LEDGER = window.PAY54_LEDGER;
    return LEDGER;
  }

  return null;
}

/* =========================
   WAIT FOR LEDGER
========================= */
function waitForLedgerReady(callback){
  let attempts = 0;

  function check(){
    const ledger = safeLedger();

    if(ledger){
      callback(ledger);
      return;
    }

    attempts++;
    if(attempts > 30){
      console.error("🚨 Ledger failed to load");
      return;
    }

    setTimeout(check, 150);
  }

  check();
}

/* =========================
   WAIT FOR MODULES
========================= */
function waitForModules(callback){

  function check(){

    if(window.PAY54_LEDGER){
      LEDGER = window.PAY54_LEDGER;
      console.log("✅ Modules ready");
      callback();
      return;
    }

    setTimeout(check,150);
  }

  check();
}

/* =========================
   STORAGE KEYS
========================= */
const LS = {
  CURRENCY: "pay54_currency",
  THEME: "pay54_theme",
  PIN: "pay54_pin"
};

/* =========================
   HELPERS
========================= */
function getSelectedCurrency(){
  return localStorage.getItem(LS.CURRENCY) || "NGN";
}

/* =========================
   MODAL SYSTEM (CLEAN)
========================= */
function openModal({title, bodyHTML, onMount}){

  const backdrop = document.createElement("div");
  backdrop.className = "p54-modal-backdrop";

  backdrop.innerHTML = `
    <div class="p54-modal">
      <div class="p54-modal-head">
        <div>${title}</div>
        <button id="closeModal">✕</button>
      </div>
      <div class="p54-modal-body">${bodyHTML}</div>
    </div>
  `;

  function close(){
    backdrop.remove();
  }

  backdrop.querySelector("#closeModal").onclick = close;

  backdrop.addEventListener("click",(e)=>{
    if(e.target === backdrop) close();
  });

  document.body.appendChild(backdrop);

  if(onMount){
    onMount({
      modal: backdrop.querySelector(".p54-modal"),
      close
    });
  }
}

/* =========================
   PIN VERIFICATION
========================= */
function requestPinVerification(callback){

  const saved = localStorage.getItem(LS.PIN);

  if(!saved){
    return openCreatePin(callback);
  }

  openModal({
    title:"Enter PIN",
    bodyHTML:`
      <input id="pin" class="p54-input" type="password" placeholder="PIN">
      <button id="ok" class="p54-btn primary">Confirm</button>
    `,
    onMount:({modal,close})=>{
      modal.querySelector("#ok").onclick = ()=>{
        const val = modal.querySelector("#pin").value;
        if(val === saved){
          close();
          callback();
        }else{
          alert("Incorrect PIN");
        }
      };
    }
  });
}

function openCreatePin(callback){

  openModal({
    title:"Create PIN",
    bodyHTML:`
      <input id="p1" class="p54-input" placeholder="Enter PIN">
      <input id="p2" class="p54-input" placeholder="Confirm PIN">
      <button id="save" class="p54-btn primary">Save</button>
    `,
    onMount:({modal,close})=>{
      modal.querySelector("#save").onclick = ()=>{
        const p1 = modal.querySelector("#p1").value;
        const p2 = modal.querySelector("#p2").value;

        if(p1 !== p2){
          alert("PIN mismatch");
          return;
        }

        localStorage.setItem(LS.PIN,p1);
        close();

        if(callback) callback();
      };
    }
  });
}

/* =========================
   TRANSACTION ENGINE
========================= */
function processTransaction(entry, meta={}){

  const ledger = safeLedger();
  if(!ledger){
    alert("System error");
    return;
  }

  const tx = ledger.applyEntry(entry);

  if(meta.showReceipt){
    showReceipt(tx);
  }

  refreshUI();
  return tx;
}

/* =========================
   RECEIPT
========================= */
function showReceipt(tx){

  openModal({
    title:"Success",
    bodyHTML:`
      <div>Transaction Completed</div>
      <div>${tx.title}</div>
      <div>${tx.currency} ${tx.amount}</div>
      <button id="done" class="p54-btn primary">Close</button>
    `,
    onMount:({modal,close})=>{
      modal.querySelector("#done").onclick = close;
    }
  });
}

/* =========================
   UI REFRESH
========================= */
function refreshUI(){

  const ledger = safeLedger();
  if(!ledger) return;

  const balances = ledger.getBalances();
  const cur = getSelectedCurrency();

  const el = document.getElementById("balanceAmount");

  if(el){
    el.textContent = ledger.moneyFmt(cur, balances[cur] || 0);
  }
}

/* =========================
   CLICK ROUTING ENGINE
========================= */
const SERVICES = {};

function bindClicks(){

  document.addEventListener("click",(e)=>{

    const btn = e.target.closest("[data-action]");
    if(!btn) return;

    const key = btn.dataset.action;

    if(!SERVICES[key]){
      console.warn("Unknown action:", key);
      return;
    }

    SERVICES[key]();
  });

}

/* =========================
   INIT SYSTEM
========================= */
function init(){

  console.log("🚀 PAY54 INIT");

  bindClicks();

  refreshUI();
}

/* =========================
   BOOTSTRAP
========================= */
document.addEventListener("DOMContentLoaded",()=>{

  waitForModules(()=>{
    waitForLedgerReady(()=>{
      init();
    });
  });

});
