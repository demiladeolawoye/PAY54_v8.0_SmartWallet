"use strict";

/* =========================
   PAY54 — CLEAN CONTROLLER
========================= */

let LEDGER = null;

/* =========================
   SAFE LEDGER
========================= */
function getLedger(){
  if(window.PAY54_LEDGER){
    return window.PAY54_LEDGER;
  }
  alert("System still loading...");
  return null;
}

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  waitForLedger(() => {
    console.log("✅ PAY54 READY");
    bindClicks();
    refreshUI();
  });
});

/* =========================
   WAIT FOR LEDGER
========================= */
function waitForLedger(cb){
  let tries = 0;

  function check(){
    if(window.PAY54_LEDGER){
      LEDGER = window.PAY54_LEDGER;
      cb();
      return;
    }

    tries++;
    if(tries > 30){
      alert("Ledger failed to load");
      return;
    }

    setTimeout(check, 150);
  }

  check();
}

/* =========================
   CLICK SYSTEM
========================= */
function bindClicks(){

  document.addEventListener("click", (e) => {

    const el =
      e.target.closest("[data-action]") ||
      e.target.closest("[data-service]") ||
      e.target.closest("[data-shortcut]");

    if(!el) return;

    const key =
      el.dataset.action ||
      el.dataset.service ||
      el.dataset.shortcut;

    console.log("👉", key);

    if(actions[key]){
      actions[key]();
    }else{
      console.warn("No handler:", key);
    }

  });

}

/* =========================
   MODAL
========================= */
function openModal(title, content){

  const wrap = document.createElement("div");
  wrap.className = "p54-modal-backdrop";

  wrap.innerHTML = `
    <div class="p54-modal">
      <div class="p54-modal-head">
        <div>${title}</div>
        <button id="closeModal">✕</button>
      </div>
      <div class="p54-modal-body">${content}</div>
    </div>
  `;

  wrap.onclick = (e)=>{
    if(e.target === wrap) wrap.remove();
  };

  wrap.querySelector("#closeModal").onclick = ()=>wrap.remove();

  document.body.appendChild(wrap);

  return wrap;
}

/* =========================
   REFRESH UI
========================= */
function refreshUI(){
  const ledger = getLedger();
  if(!ledger) return;

  const cur = localStorage.getItem("pay54_currency") || "NGN";
  const balances = ledger.getBalances();

  const el = document.getElementById("balanceAmount");
  if(el){
    el.textContent = ledger.moneyFmt(cur, balances[cur] || 0);
  }
}

/* =========================
   ACTIONS
========================= */
const actions = {

  send(){
    const m = openModal("Send", `
      <input id="amt" placeholder="Amount" class="p54-input">
      <button id="go" class="p54-btn primary">Send</button>
    `);

    m.querySelector("#go").onclick = ()=>{
      const ledger = getLedger();
      if(!ledger) return;

      const amt = Number(m.querySelector("#amt").value);
      if(!amt) return alert("Enter amount");

      ledger.applyEntry(
        ledger.createEntry({
          type:"send",
          title:"Sent",
          currency:"NGN",
          amount:-amt
        })
      );

      refreshUI();
      m.remove();
    };
  },

  receive(){
    openModal("Receive", `<div>@pay54-user</div>`);
  },

  add_money(){
    const m = openModal("Add Money", `
      <input id="amt" placeholder="Amount" class="p54-input">
      <button id="go" class="p54-btn primary">Add</button>
    `);

    m.querySelector("#go").onclick = ()=>{
      const ledger = getLedger();
      if(!ledger) return;

      const amt = Number(m.querySelector("#amt").value);

      ledger.applyEntry(
        ledger.createEntry({
          type:"add",
          title:"Funding",
          currency:"NGN",
          amount:amt
        })
      );

      refreshUI();
      m.remove();
    };
  },

  withdraw(){
    alert("Withdraw coming next");
  },

  bank_transfer(){
    alert("Bank transfer coming next");
  },

  scan_pay(){
    alert("Scan & Pay coming next");
  },

  fx(){
    alert("FX coming next");
  },

  bills(){
    alert("Bills coming next");
  },

  savings(){
    alert("Savings coming next");
  },

  cards(){
    alert("Cards coming next");
  },

  shop(){
    alert("Shop coming next");
  },

  trading(){
    alert("Trading coming next");
  },

  agent(){
    alert("Agent flow coming next");
  }

};
