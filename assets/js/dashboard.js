"use strict";

/* =========================
   PAY54 v10 — CORE ENGINE
   (Stable, Fast, Scalable)
========================= */

/* ========= GLOBAL STATE ========= */
const STATE = {
  ledger: null,
  currency: localStorage.getItem("pay54_currency") || "NGN"
};

/* ========= INIT ========= */
document.addEventListener("DOMContentLoaded", init);

function init(){
  waitForLedger(() => {
    bindUI();
    render();
    console.log("✅ PAY54 READY (v10)");
  });
}

/* ========= WAIT FOR LEDGER ========= */
function waitForLedger(cb){
  let tries = 0;

  const loop = () => {
    if(window.PAY54_LEDGER){
      STATE.ledger = window.PAY54_LEDGER;
      return cb();
    }

    if(tries++ > 40){
      alert("System failed to load");
      return;
    }

    setTimeout(loop, 100);
  };

  loop();
}

/* ========= SAFE LEDGER ========= */
function ledger(){
  if(!STATE.ledger){
    alert("System loading...");
    return null;
  }
  return STATE.ledger;
}

/* ========= UI BIND ========= */
function bindUI(){

  /* ---- GLOBAL CLICK ROUTER ---- */
  document.addEventListener("click", e => {

    const el =
      e.target.closest("[data-action]") ||
      e.target.closest("[data-service]") ||
      e.target.closest("[data-shortcut]");

    if(!el) return;

    const key =
      el.dataset.action ||
      el.dataset.service ||
      el.dataset.shortcut;

    if(ACTIONS[key]){
      ACTIONS[key]();
    }else{
      console.warn("No handler:", key);
    }
  });

  /* ---- CURRENCY SWITCH ---- */
  document.querySelectorAll(".currency").forEach(btn=>{
    btn.onclick = ()=>{
      STATE.currency = btn.dataset.cur;
      localStorage.setItem("pay54_currency", STATE.currency);

      document.querySelectorAll(".currency").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");

      render();
    };
  });

}

/* ========= RENDER ========= */
function render(){
  const l = ledger();
  if(!l) return;

  const bal = l.getBalances()[STATE.currency] || 0;

  document.getElementById("balanceAmount").textContent =
    l.moneyFmt(STATE.currency, bal);
}

/* ========= MODAL ========= */
function modal(title, html){

  const wrap = document.createElement("div");
  wrap.className = "p54-modal-backdrop";

  wrap.innerHTML = `
    <div class="p54-modal">
      <div class="p54-modal-head">
        <div>${title}</div>
        <button class="close">✕</button>
      </div>
      <div class="p54-modal-body">${html}</div>
    </div>
  `;

  wrap.onclick = e => {
    if(e.target === wrap) wrap.remove();
  };

  wrap.querySelector(".close").onclick = ()=>wrap.remove();

  document.body.appendChild(wrap);

  return wrap;
}

/* ========= TRANSACTION ========= */
function tx(entry){
  const l = ledger();
  if(!l) return;

  l.applyEntry(l.createEntry(entry));
  render();
}

/* ========= ACTIONS ========= */
const ACTIONS = {

  /* ==== SEND ==== */
  send(){
    const m = modal("Send Money", `
      <input id="amt" class="p54-input" placeholder="Amount">
      <button id="go" class="p54-btn primary">Send</button>
    `);

    m.querySelector("#go").onclick = ()=>{
      const amt = Number(m.querySelector("#amt").value);
      if(!amt) return alert("Enter amount");

      tx({
        type:"send",
        title:"Sent",
        currency: STATE.currency,
        amount:-amt
      });

      m.remove();
    };
  },

  /* ==== RECEIVE ==== */
  receive(){
    modal("Receive", `<strong>@pay54-user</strong>`);
  },

  /* ==== ADD MONEY ==== */
  add_money(){
    const m = modal("Add Money", `
      <input id="amt" class="p54-input" placeholder="Amount">
      <button id="go" class="p54-btn primary">Add</button>
    `);

    m.querySelector("#go").onclick = ()=>{
      const amt = Number(m.querySelector("#amt").value);

      tx({
        type:"fund",
        title:"Wallet Funding",
        currency: STATE.currency,
        amount: amt
      });

      m.remove();
    };
  },

  /* ==== WITHDRAW ==== */
  withdraw(){
    modal("Withdraw", "Coming next phase");
  },

  bank_transfer(){
    modal("Bank Transfer", "Coming next phase");
  },

  scan_pay(){
    modal("Scan & Pay", "Coming next phase");
  },

  /* ==== SERVICES ==== */
  fx(){ modal("FX", "Global transfer coming"); },
  bills(){ modal("Bills", "Bills coming"); },
  savings(){ modal("Savings", "Savings coming"); },
  cards(){ modal("Cards", "Cards coming"); },
  shop(){ modal("Shop", "Shop coming"); },
  trading(){ modal("Trading", "Trading coming"); },
  agent(){ modal("Agent", "Agent onboarding coming"); },
  merchantqr(){ modal("QR", "QR generator coming"); }

};
