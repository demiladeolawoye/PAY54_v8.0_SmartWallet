/* ============================
   PAY54 — Layer 3A Core Money Engine
   Version: v805.2-hotfix
============================ */

(() => {
  "use strict";

  /* ---------------------------
     CONFIG
  ---------------------------- */

  const BASE_CURRENCY = "NGN";

  const FX = {
    NGN: 1,
    GBP: 1700,
    USD: 1650,
    EUR: 1800,
    GHS: 140,
    KES: 13,
    ZAR: 90
  };

  const LS = {
    WALLETS: "pay54_wallets",
    ACTIVE_CUR: "pay54_active_currency",
    TX: "pay54_transactions"
  };

  /* ---------------------------
     STATE
  ---------------------------- */

  let wallets = JSON.parse(localStorage.getItem(LS.WALLETS)) || {
    NGN: 1200500,
    GBP: 0,
    USD: 0,
    EUR: 0,
    GHS: 0,
    KES: 0,
    ZAR: 0
  };

  let activeCurrency =
    localStorage.getItem(LS.ACTIVE_CUR) || BASE_CURRENCY;

  let transactions =
    JSON.parse(localStorage.getItem(LS.TX)) || [];

  /* ---------------------------
     HELPERS
  ---------------------------- */

  function format(amount, cur) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: cur
    }).format(amount);
  }

  function toBase(amount, cur) {
    return (amount * FX[cur]) / FX[BASE_CURRENCY];
  }

  function fromBase(amount, cur) {
    return (amount * FX[BASE_CURRENCY]) / FX[cur];
  }

  function totalBalanceBase() {
    return Object.keys(wallets).reduce((sum, cur) => {
      return sum + toBase(wallets[cur], cur);
    }, 0);
  }

  /* ---------------------------
     UI RENDER
  ---------------------------- */

  function renderBalance() {
    const totalBase = totalBalanceBase();
    const display =
      activeCurrency === BASE_CURRENCY
        ? totalBase
        : fromBase(totalBase, activeCurrency);

    document.getElementById("balanceAmount").innerText =
      format(display, activeCurrency);
  }

  function renderLedger() {
    const feed = document.querySelector('[data-role="recentTxFeed"]');
    if (!feed) return;

    feed.innerHTML = "";

    transactions.slice(0, 5).forEach(tx => {
      const item = document.createElement("div");
      item.className = "feed-item";

      const baseEq =
        tx.currency !== BASE_CURRENCY
          ? `<div class="fx-sub">≈ ${format(
              toBase(tx.amount, tx.currency),
              BASE_CURRENCY
            )}</div>`
          : "";

      item.innerHTML = `
        <div class="feed-main">
          <div class="feed-title">${tx.title}</div>
          <div class="feed-sub">${tx.time}</div>
          ${baseEq}
        </div>
        <div class="feed-amt ${tx.amount > 0 ? "pos" : "neg"}">
          ${format(tx.amount, tx.currency)}
        </div>
      `;
      feed.appendChild(item);
    });
  }

  /* ---------------------------
     TRANSACTIONS
  ---------------------------- */

  function addTransaction(title, amount, currency) {
    transactions.unshift({
      title,
      amount,
      currency,
      time: "Just now"
    });

    localStorage.setItem(LS.TX, JSON.stringify(transactions));
    renderLedger();
  }

  /* ---------------------------
     MONEY ACTIONS
  ---------------------------- */

  function addMoney(amount, currency) {
    wallets[currency] += amount;
    localStorage.setItem(LS.WALLETS, JSON.stringify(wallets));

    addTransaction("Add Money", amount, currency);
    renderBalance();
  }

  function withdrawMoney(amount, currency) {
    if (wallets[currency] < amount) {
      alert("Insufficient balance");
      return;
    }

    wallets[currency] -= amount;
    localStorage.setItem(LS.WALLETS, JSON.stringify(wallets));

    addTransaction("Withdraw", -amount, currency);
    renderBalance();
  }

  /* ---------------------------
     CURRENCY SWITCH
  ---------------------------- */

  document.querySelectorAll(".currency").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCurrency = btn.dataset.cur;
      localStorage.setItem(LS.ACTIVE_CUR, activeCurrency);

      document
        .querySelectorAll(".currency")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      renderBalance();
    });
  });

  /* ---------------------------
     INIT
  ---------------------------- */

  renderBalance();
  renderLedger();
})();
