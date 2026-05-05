"use strict";

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
    render();
    console.log("✅ PAY54 READY");
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

/* ========= LEDGER SAFE ========= */
function ledger(){
  if(!STATE.ledger) return null;
  return STATE.ledger;
}

/* ========= UI BIND ========= */
function bindUI(){

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

  /* currency */
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

  /* MAIN */
  const main = balances[STATE.currency] || 0;

  document.getElementById("balanceAmount").textContent =
    l.moneyFmt(STATE.currency, main);

  /* CLEAN DISPLAY (FIXED) */
  const container = document.getElementById("availableBalance");

  if(container){

    const other = Object.keys(balances)
      .filter(c => c !== STATE.currency)
      .slice(0,2);

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

/* ========= TRANSACTION ========= */
function tx(entry){
  const l = ledger();
  if(!l) return;

  l.applyEntry(l.createEntry(entry));
  render();
}

/* ========= ACTIONS ========= */
const ACTIONS = {

  send(){
    const m = modal("Send Money", `
      <input id="amt" class="p54-input" placeholder="Amount">
      <button id="go" class="p54-btn primary">Send</button>
    `);

    m.querySelector("#go").onclick = ()=>{
      const amt = Number(m.querySelector("#amt").value);
      if(!amt) return alert("Enter amount");

      tx({ type:"send", title:"Sent", currency: STATE.currency, amount:-amt });
      m.remove();
    };
  },

  receive(){
    modal("Receive", `<strong>@pay54-user</strong>`);
  },

  add_money(){
    const m = modal("Add Money", `
      <input id="amt" class="p54-input" placeholder="Amount">
      <button id="go" class="p54-btn primary">Add</button>
    `);

    m.querySelector("#go").onclick = ()=>{
      const amt = Number(m.querySelector("#amt").value);
      tx({ type:"fund", title:"Wallet Funding", currency: STATE.currency, amount: amt });
      m.remove();
    };
  },

  withdraw(){
    const m = modal("Withdraw", `
      <input id="amt" class="p54-input" placeholder="Amount">
      <button id="go" class="p54-btn primary">Withdraw</button>
    `);

    m.querySelector("#go").onclick = ()=>{
      const amt = Number(m.querySelector("#amt").value);
      tx({ type:"withdraw", title:"Withdrawal", currency: STATE.currency, amount:-amt });
      m.remove();
    };
  },

  bank_transfer(){ modal("Bank Transfer", "Coming next phase"); },
  scan_pay(){ modal("Scan & Pay", "Coming next phase"); },

  fx(){ modal("FX Transfer", "Coming soon"); },
  bills(){ modal("Bills", "Coming soon"); },
  savings(){ modal("Savings", "Coming soon"); },
  cards(){ modal("Cards", "Coming soon"); },
  shop(){ modal("Shop", "Coming soon"); },
  trading(){ modal("Trading", "Coming soon"); },
  agent(){ modal("Agent", "Coming soon"); },
  merchantqr(){ modal("QR Generator", "Coming soon"); },
  request(){ modal("Request Money", "Coming soon"); },
  checkout(){ modal("Checkout", "Coming soon"); },
  risk(){ modal("Risk Watch", "System active"); },

  atm(){ modal("ATM Finder", "Nearby ATMs"); },
  pos(){ modal("POS Finder", "Nearby agents"); }

};
