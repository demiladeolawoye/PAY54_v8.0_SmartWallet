"use strict";

/* =========================
   PAY54 v10 STABLE ENGINE
   (WITH v8.1 FX LOGIC)
========================= */

/* ========= STATE ========= */
const STATE = {
  ledger: null,
  currency: localStorage.getItem("pay54_currency") || "NGN"
};

/* ========= INIT ========= */
document.addEventListener("DOMContentLoaded", init);

function init(){
  waitForLedger(() => {
    bindUI();
    seedIfEmpty();   // 🔥 prevent 0.00
    render();
    console.log("✅ PAY54 READY (FINAL)");
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

    if(tries++ > 50){
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
    console.warn("Ledger not ready");
    return null;
  }
  return STATE.ledger;
}

/* ========= SEED ========= */
function seedIfEmpty(){
  const l = ledger();
  if(!l) return;

  const balances = l.getBalances();
  const total = Object.values(balances).reduce((a,b)=>a + Number(b||0),0);

  if(total > 0) return;

  l.applyEntry(l.createEntry({
    type:"seed",
    title:"Initial funding",
    currency:"NGN",
    amount:5000000
  }));

  console.log("🔥 Wallet seeded");
}

/* ========= FX TOTAL ========= */
function getConvertedTotal(targetCur){
  const l = ledger();
  if(!l) return 0;

  const balances = l.getBalances();
  let total = 0;

  Object.keys(balances).forEach(c=>{
    const amt = balances[c] || 0;

    if(c === targetCur){
      total += amt;
    } else {
      total += l.convert(c, targetCur, amt);
    }
  });

  return total;
}

/* ========= UI BIND ========= */
function bindUI(){

  /* CLICK ROUTER */
  document.addEventListener("click", e => {

    const el =
      e.target.closest("[data-action]") ||
      e.target.closest("[data-service]") ||
      e.target.closest("[data-shortcut]") ||
      e.target.closest("[data-utility]");

    if(!el) return;

    const key =
      el.dataset.action ||
      el.dataset.service ||
      el.dataset.shortcut ||
      el.dataset.utility;

    if(ACTIONS[key]){
      ACTIONS[key]();
    }else{
      console.warn("No handler:", key);
    }
  });

  /* CURRENCY SWITCH */
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

  const balances = l.getBalances();

  /* 🔥 TOTAL BALANCE (FIXED) */
  const total = getConvertedTotal(STATE.currency);

  document.getElementById("balanceAmount").textContent =
    l.moneyFmt(STATE.currency, total);

  /* 🔥 AVAILABLE (PER WALLET) */
  const container = document.getElementById("availableBalance");

  if(container){

    const other = Object.keys(balances)
      .filter(c => balances[c] > 0)
      .slice(0, 3);

    container.innerHTML = `
      <div style="font-size:12px;opacity:0.7;margin-top:6px;">
        ${other.map(c => `${c}: ${l.moneyFmt(c, balances[c])}`).join(" • ")}
      </div>
    `;
  }
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

/* ========= TX ========= */
function tx(entry){
  const l = ledger();
  if(!l) return;

  l.applyEntry(l.createEntry(entry));
  render();
}

/* ========= ACTIONS ========= */
const ACTIONS = {

  send(){
    const m = modal("Send", `
      <input id="amt" placeholder="Amount">
      <button id="go">Send</button>
    `);

    m.querySelector("#go").onclick = ()=>{
      const amt = Number(m.querySelector("#amt").value);
      if(!amt) return;

      tx({ type:"send", currency:STATE.currency, amount:-amt });
      m.remove();
    };
  },

  receive(){
    modal("Receive", "@pay54-user");
  },

  add_money(){
    const m = modal("Add Money", `
      <input id="amt" placeholder="Amount">
      <button id="go">Add</button>
    `);

    m.querySelector("#go").onclick = ()=>{
      const amt = Number(m.querySelector("#amt").value);

      tx({ type:"fund", currency:STATE.currency, amount:amt });
      m.remove();
    };
  },

  withdraw(){
    const m = modal("Withdraw", `
      <input id="amt" placeholder="Amount">
      <button id="go">Withdraw</button>
    `);

    m.querySelector("#go").onclick = ()=>{
      const amt = Number(m.querySelector("#amt").value);

      tx({ type:"withdraw", currency:STATE.currency, amount:-amt });
      m.remove();
    };
  },

  bank_transfer(){ modal("Bank Transfer","Coming soon"); },
  scan_pay(){ modal("Scan & Pay","Coming soon"); },

  fx(){ modal("FX","Coming soon"); },
  bills(){ modal("Bills","Coming soon"); },
  savings(){ modal("Savings","Coming soon"); },
  cards(){ modal("Cards","Coming soon"); },
  shop(){ modal("Shop","Coming soon"); },
  trading(){ modal("Trading","Coming soon"); },
  agent(){ modal("Agent","Coming soon"); },
  merchantqr(){ modal("QR","Coming soon"); },
  request(){ modal("Request","Coming soon"); },
  checkout(){ modal("Checkout","Coming soon"); },
  risk(){ modal("Risk","Active"); },

  atm(){ modal("ATM Finder","Nearby ATMs"); },
  pos(){ modal("POS Finder","Nearby agents"); }

};
