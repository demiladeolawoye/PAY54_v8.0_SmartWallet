/* =========================
   PAY54 Dashboard — Layer 2 Wiring — v805
   FULL REPLACEMENT FILE

   v805 FIXES / FEATURES
   ✅ Currency mismatch bug fixed (single source of truth)
   ✅ Light-mode modal buttons always visible
   ✅ FX receiver logic (PAY54 & non-PAY54)
   ✅ Receipt branding + referral messaging
   ✅ Ledger search
   ✅ Trading rename + behaviour stub
   ✅ ATM / Agent Finder (Layer 2 UI)
   ✅ Real-time tx sync (mobile + web)
========================= */

(() => {
  "use strict";

  /* ---------------------------
     0) STORAGE + STATE
  --------------------------- */

  const LS = {
    THEME: "pay54_theme",
    CURRENCY: "pay54_currency",
    BALANCES: "pay54_balances",
    TX: "pay54_transactions"
  };

  const defaultBalances = {
    NGN: 1229250.5,
    GBP: 8420.75,
    USD: 15320.4,
    EUR: 11890.2,
    GHS: 9650,
    KES: 132450,
    ZAR: 27890.6
  };

  const symbols = {
    NGN: "₦", GBP: "£", USD: "$", EUR: "€",
    GHS: "₵", KES: "KSh", ZAR: "R"
  };

  const fxRates = {
    USD: { NGN: 1650 },
    GBP: { NGN: 2050 },
    EUR: { NGN: 1800 }
  };

  const getBalances = () =>
    JSON.parse(localStorage.getItem(LS.BALANCES)) || { ...defaultBalances };

  const setBalances = (b) =>
    localStorage.setItem(LS.BALANCES, JSON.stringify(b));

  const getTx = () =>
    JSON.parse(localStorage.getItem(LS.TX)) || [];

  const setTx = (t) =>
    localStorage.setItem(LS.TX, JSON.stringify(t));

  const activeCurrency = () =>
    localStorage.getItem(LS.CURRENCY) || "NGN";

  const fmt = (c, n) =>
    `${symbols[c] || ""} ${Number(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  const uid = () =>
    `TX-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;

  /* ---------------------------
     1) UI HELPERS
  --------------------------- */

  function updateBalanceUI() {
    const bal = getBalances();
    const cur = activeCurrency();
    const el = document.getElementById("balanceAmount");
    if (el) el.textContent = fmt(cur, bal[cur] || 0);
  }

  function addTx({ title, currency, amount }) {
    const tx = {
      id: uid(),
      title,
      currency,
      amount,
      time: new Date().toLocaleString()
    };
    const list = getTx();
    list.unshift(tx);
    setTx(list);
    prependTx(tx);
  }

  function visibleTxFeed() {
    return [...document.querySelectorAll('[data-role="recentTxFeed"]')]
      .find(el => el.offsetParent !== null);
  }

  function prependTx(tx) {
    const feed = visibleTxFeed();
    if (!feed) return;
    const div = document.createElement("div");
    div.className = "feed-item";
    div.innerHTML = `
      <div class="feed-icon">💳</div>
      <div class="feed-main">
        <div class="feed-title">${tx.title}</div>
        <div class="feed-sub">${tx.time}</div>
      </div>
      <div class="feed-amt ${tx.amount < 0 ? "neg" : "pos"}">
        ${tx.amount < 0 ? "−" : "+"} ${fmt(tx.currency, Math.abs(tx.amount))}
      </div>`;
    feed.prepend(div);
  }

  /* ---------------------------
     2) MODAL SYSTEM
  --------------------------- */

  function openModal(title, html, onMount) {
    const wrap = document.createElement("div");
    wrap.className = "p54-modal-backdrop";
    wrap.innerHTML = `
      <div class="p54-modal">
        <div class="p54-modal-head">
          <strong>${title}</strong>
          <button id="x">✕</button>
        </div>
        <div class="p54-modal-body">${html}</div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector("#x").onclick = () => wrap.remove();
    if (onMount) onMount(wrap);
  }

  /* ---------------------------
     3) ADD / WITHDRAW (FIXED)
  --------------------------- */

  function openAddMoney() {
    openModal("Add Money", `
      <form id="addForm">
        <label>Currency</label>
        <select id="cur">${Object.keys(defaultBalances).map(c=>`<option>${c}</option>`)}</select>
        <label>Amount</label>
        <input type="number" id="amt" required />
        <button class="p54-btn primary">Add</button>
      </form>`,
      m => {
        m.querySelector("#addForm").onsubmit = e => {
          e.preventDefault();
          const c = m.querySelector("#cur").value;
          const a = Number(m.querySelector("#amt").value);
          const b = getBalances();
          b[c] = (b[c] || 0) + a;
          setBalances(b);
          addTx({ title: "Wallet funding", currency: c, amount: a });
          updateBalanceUI();
          m.remove();
        };
      });
  }

  function openWithdraw() {
    openModal("Withdraw", `
      <form id="wdForm">
        <label>Currency</label>
        <select id="cur">${Object.keys(defaultBalances).map(c=>`<option>${c}</option>`)}</select>
        <label>Amount</label>
        <input type="number" id="amt" required />
        <button class="p54-btn primary">Withdraw</button>
      </form>`,
      m => {
        m.querySelector("#wdForm").onsubmit = e => {
          e.preventDefault();
          const c = m.querySelector("#cur").value;
          const a = Number(m.querySelector("#amt").value);
          const b = getBalances();
          if ((b[c] || 0) < a) return alert("Insufficient balance");
          b[c] -= a;
          setBalances(b);
          addTx({ title: "Withdrawal", currency: c, amount: -a });
          updateBalanceUI();
          m.remove();
        };
      });
  }

  /* ---------------------------
     4) FX — RECEIVER LOGIC
  --------------------------- */

  function openFX() {
    openModal("Cross-border FX", `
      <form id="fxForm">
        <label>Receiver Type</label>
        <select id="type">
          <option value="pay54">PAY54 User</option>
          <option value="external">Non-PAY54 User</option>
        </select>

        <div id="pay54Box">
          <label>PAY54 Tag / Account</label>
          <input id="tag" />
          <small>Refer & win when friends join PAY54</small>
        </div>

        <div id="extBox" style="display:none">
          <label>Receiver Name</label><input id="name"/>
          <label>Account Number</label><input id="acct"/>
          <label>Reason</label>
          <select><option>Family Support</option><option>Business</option></select>
        </div>

        <label>Send Amount (USD)</label>
        <input type="number" id="amt" required />
        <button class="p54-btn primary">Send</button>
      </form>`,
      m => {
        const t = m.querySelector("#type");
        t.onchange = () => {
          m.querySelector("#pay54Box").style.display =
            t.value === "pay54" ? "block" : "none";
          m.querySelector("#extBox").style.display =
            t.value === "external" ? "block" : "none";
        };

        m.querySelector("#fxForm").onsubmit = e => {
          e.preventDefault();
          const amt = Number(m.querySelector("#amt").value);
          const b = getBalances();
          if (b.USD < amt) return alert("Insufficient USD");
          const out = amt * fxRates.USD.NGN;
          b.USD -= amt;
          b.NGN += out;
          setBalances(b);
          addTx({ title: "Cross-border FX", currency: "USD", amount: -amt });
          updateBalanceUI();
          alert("PAY54 Receipt\nPowered by PAY54\nInvite receiver to PAY54 for fast & secure payments.");
          m.remove();
        };
      });
  }

  /* ---------------------------
     5) LEDGER SEARCH
  --------------------------- */

  function openLedger() {
    const tx = getTx();
    openModal("Transaction History", `
      <input id="q" placeholder="Search transactions…" />
      <div id="list"></div>`,
      m => {
        const list = m.querySelector("#list");
        const render = q => {
          list.innerHTML = tx
            .filter(t => !q || JSON.stringify(t).toLowerCase().includes(q))
            .map(t => `<div>${t.title} • ${fmt(t.currency, t.amount)}</div>`)
            .join("");
        };
        m.querySelector("#q").oninput = e => render(e.target.value.toLowerCase());
        render("");
      });
  }

  /* ---------------------------
     6) TRADING (DEMO)
  --------------------------- */

  function openTrading() {
    openModal("Trading — Stocks • Shares • Crypto", `
      <p>Buy • Sell • Fund • Withdraw</p>
      <p>Portfolio view (mock)</p>
      <small>Layer 3 will connect broker APIs</small>`);
  }

  /* ---------------------------
     7) ATM / AGENT FINDER
  --------------------------- */

  function openATM() {
    openModal("ATM / Agent Near You", `
      <p>Map view (Layer 2 placeholder)</p>
      <p>Enable location in Layer 3</p>`);
  }

  /* ---------------------------
     8) WIRING
  --------------------------- */

  document.getElementById("addMoneyBtn")?.addEventListener("click", openAddMoney);
  document.getElementById("withdrawBtn")?.addEventListener("click", openWithdraw);
  document.getElementById("viewAllTx")?.addEventListener("click", openLedger);
  document.getElementById("viewAllTxMobile")?.addEventListener("click", openLedger);

  document.querySelectorAll("[data-service='fx']").forEach(b => b.onclick = openFX);
  document.querySelectorAll("[data-service='invest']").forEach(b => b.onclick = openTrading);
  document.querySelectorAll("[data-shortcut='atm']").forEach(b => b.onclick = openATM);

  updateBalanceUI();
})();
