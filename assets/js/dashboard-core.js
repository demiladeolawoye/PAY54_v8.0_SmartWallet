"use strict";

/* =========================================
   PAY54 CORE ENGINE v9.0
   CLEAN STABLE FOUNDATION
========================================= */

console.log("🚀 PAY54 CORE ENGINE STARTING...");

/* =========================================
   GLOBAL APP STATE
========================================= */

window.PAY54_APP = {

  activeCurrency: "NGN",

  initialized: false,

  modulesReady: false

};

/* =========================================
   SAFE MODULE CHECKER
========================================= */

function modulesReady(){

  return (

    window.PAY54_LEDGER &&
    typeof window.PAY54_LEDGER.getBalances === "function" &&
    typeof window.PAY54_LEDGER.applyEntry === "function"

  );

}

/* =========================================
   SAFE DOM HELPERS
========================================= */

function qs(selector){
  return document.querySelector(selector);
}

function qsa(selector){
  return document.querySelectorAll(selector);
}

/* =========================================
   BALANCE RENDER ENGINE
========================================= */

function renderBalance(){

  try{

    const ledger = window.PAY54_LEDGER;

    if(!ledger) return;

    const balances =
      ledger.getBalances();

    const active =
      window.PAY54_APP.activeCurrency || "NGN";

    const amount =
      Number(balances[active] || 70284035);

    const balanceEl =
      qs("#balanceAmount");

    if(balanceEl){

      balanceEl.textContent =
        ledger.moneyFmt(active, amount);

    }

    /* =========================================
       MULTI WALLET BALANCES
    ========================================= */

    const walletContainer =
      qs("#walletBalances");

    if(walletContainer){

      walletContainer.innerHTML =

        Object.entries(balances)

        .map(([cur, amt]) => {

          return `

            <div class="wallet-balance-row">

              <span class="wallet-balance-cur">
                ${cur}
              </span>

              <span class="wallet-balance-amt">
                ${ledger.moneyFmt(cur, amt)}
              </span>

            </div>

          `;

        })

        .join("");

    }

    console.log("✅ BALANCE RENDERED");

  }catch(err){

    console.error(
      "BALANCE RENDER FAILED",
      err
    );

  }

}
/* =========================================
   CURRENCY SWITCHER
========================================= */

function bindCurrencyPills(){

  const pills =
  qsa(".currency");

  pills.forEach(pill => {

    pill.addEventListener("click", () => {
       
const cur =
  pill.dataset.cur;

      if(!cur) return;

      window.PAY54_APP.activeCurrency = cur;

      pills.forEach(p =>
        p.classList.remove("active")
      );

      pill.classList.add("active");

      renderBalance();

      console.log("💱 Currency switched:", cur);

    });

  });

  console.log("✅ Currency pills bound");

}

/* =========================================
   TILE ROUTING ENGINE
========================================= */

function bindDashboardButtons(){

  qsa("[data-action]").forEach(btn => {

    btn.addEventListener("click", () => {

      const action =
        btn.dataset.action;

      if(!action) return;

      console.log("🟢 ACTION:", action);

      routeAction(action);

    });

  });

  console.log("✅ Dashboard buttons bound");

}

/* =========================================
   ROUTER
========================================= */
function routeAction(action){

  try{

    const UI = window.PAY54_UI;

    if(!UI){
      console.warn("PAY54_UI missing");
      return;
    }

    switch(action){

/* =========================================
   MONEY MOVES
========================================= */

case "send":
  UI.openSend();
  break;

case "receive":
  UI.openReceive();
  break;

/* SCAN & PAY */
case "scan_pay":
  UI.openScanAndPay();
  break;

/* ADD MONEY */
case "add_money":
  UI.openAddMoney();
  break;

/* WITHDRAW */
case "withdraw":
  UI.openWithdraw();
  break;

/* BANK TRANSFER */
case "bank_transfer":
  UI.openBankTransfer();
  break;

/* FX / GLOBAL TRANSFER */
case "fx":
  UI.openGlobalTransfer();
  break

  case "bills":
    UI.openBills();
    break;

  case "savings":
    UI.openSavings();
    break;

  case "cards":
    UI.openCards();
    break;

  case "checkout":
    UI.openCheckout();
    break;

  case "shop":
  UI.openShop();
  break;

case "refer":

  alert("Refer & Earn coming soon");

  break;

  case "merchantqr":
    UI.openMerchantQR();
    break;

case "request":
  UI.openRequestMoney();
  break;

  case "trading":
    UI.openTrading();
    break;

  case "agent":
    UI.openAgent();
    break;

   case "bet":
  alert("Bet Funding coming soon");
  break;
          
  case "risk":
    UI.openRisk();
    break;
          
/* ATM FINDER */
case "atm":

  if(window.openATMFinder){
    window.openATMFinder();
  }

  break;

/* POS FINDER */
case "pos":

  if(window.openPOSFinder){
    window.openPOSFinder();
  }

  break;
  default:
    console.warn("Unknown action:", action);

}

  }catch(err){

    console.error("ROUTER FAILED", err);

  }

}

/* =========================================
   INIT ENGINE
========================================= */

function initDashboard(){

  if(window.PAY54_APP.initialized){

    console.warn("Dashboard already initialized");

    return;

  }

  bindCurrencyPills();

  bindDashboardButtons();

  renderBalance();

  window.PAY54_APP.initialized = true;

  console.log("🔥 PAY54 DASHBOARD READY");

}

/* =========================================
   SAFE BOOTSTRAP
========================================= */
document.addEventListener("DOMContentLoaded", () => {

  console.log("📦 DOM READY");

  function waitForModules(){

    if(modulesReady()){

      console.log("✅ Modules ready");

      initDashboard();

      /* =========================================
         UNIVERSAL FEEDS INIT
      ========================================= */

      if(window.seedDemoAlertsIfEmpty){
        window.seedDemoAlertsIfEmpty();
      }

      if(window.renderAlerts){
        window.renderAlerts();
      }

      if(window.renderNews){
        window.renderNews();
      }

      if(window.renderFxTicker){
        window.renderFxTicker();
      }

      if(window.renderRecentTransactions){
        window.renderRecentTransactions();
      }

      console.log("✅ PAY54 FEEDS INITIALIZED");

      return;

    }

    console.log("⏳ Waiting for modules...");

    setTimeout(waitForModules, 150);

  }

  waitForModules();

}); // ✅ CLOSE DOMContentLoaded PROPERLY

/* =========================================
   PAY54 UTILITIES ENGINE
========================================= */

window.openATMFinder = function(){

  const openModal =
    window.PAY54_MODALS?.openModal;

  if(!openModal) return;

 openModal({

  title: "ATM Finder",

  bodyHTML: `

    <div class="p54-form">

      <div class="p54-note">
        Find nearby ATMs instantly
      </div>

      <input
        id="atmSearchInput"
        class="p54-input"
        placeholder="Enter city or postcode"
      >

      <button
        id="atmSearchBtn"
        class="btn primary utility-search-btn"
        style="margin-top:14px;width:100%"
      >
        Search Nearby
      </button>

      <div
        id="atmResults"
        class="utility-results"
        style="margin-top:16px"
      ></div>

    </div>

  `,

  onMount: ({ modal }) => {

    const btn =
      modal.querySelector("#atmSearchBtn");

    const input =
      modal.querySelector("#atmSearchInput");

    const results =
      modal.querySelector("#atmResults");

    btn.addEventListener("click", () => {

      const city =
        input.value.trim() || "London";

      results.innerHTML = `

        <div class="utility-location-card">

          <div class="utility-location-title">
            🏧 Barclays ATM
          </div>

          <div class="utility-location-sub">
            0.4 miles away • ${city}
          </div>

        </div>

        <div class="utility-location-card">

          <div class="utility-location-title">
            🏧 HSBC ATM
          </div>

          <div class="utility-location-sub">
            0.8 miles away • ${city}
          </div>

        </div>

      `;

    });

  }

});

}; // ✅ CLOSE ATM FINDER FUNCTION

window.openPOSFinder = function(){

  const openModal =
    window.PAY54_MODALS?.openModal;

  if(!openModal) return;
openModal({

  title: "POS / Agent Finder",

  bodyHTML: `

    <div class="p54-form">

      <div class="p54-note">
        Find PAY54 agents nearby
      </div>

      <input
        id="posSearchInput"
        class="p54-input"
        placeholder="Enter city or postcode"
      >

      <button
        id="posSearchBtn"
        class="btn primary utility-search-btn"
        style="margin-top:14px;width:100%"
      >
        Search Nearby
      </button>

      <div
        id="posResults"
        class="utility-results"
        style="margin-top:16px"
      ></div>

    </div>

  `,

  onMount: ({ modal }) => {

    const btn =
      modal.querySelector("#posSearchBtn");

    const input =
      modal.querySelector("#posSearchInput");

    const results =
      modal.querySelector("#posResults");

    btn.addEventListener("click", () => {

      const city =
        input.value.trim() || "London";

      results.innerHTML = `

        <div class="utility-location-card">

          <div class="utility-location-title">
            📍 PAY54 Agent
          </div>

          <div class="utility-location-sub">
            0.2 miles away • ${city}
          </div>

        </div>

        <div class="utility-location-card">

          <div class="utility-location-title">
            📍 PAY54 POS Merchant
          </div>

          <div class="utility-location-sub">
            1.1 miles away • ${city}
          </div>

        </div>

      `;

    });

  }

});

}; // ✅ CLOSE POS FINDER FUNCTION

  
/* =========================================
   ALERT MODAL VIEWER
========================================= */

window.openAlertItem = function(btn){

  const item =
    btn.closest(".feed-item");

  if(!item) return;

  const title =
    item.querySelector(".feed-title")?.textContent || "Alert";

  const sub =
    item.querySelector(".feed-sub")?.textContent || "";

  const openModal =
    window.PAY54_MODALS?.openModal;

  if(!openModal) return;

  openModal({

    title,

    bodyHTML: `

      <div class="p54-feed-reader">

        <div class="p54-feed-reader-title">
          ${title}
        </div>

        <div class="p54-feed-reader-sub">
          ${sub}
        </div>

      </div>

    `

  });

};
/* =========================================
   NEWS MODAL VIEWER
========================================= */

window.openNewsItem = function(btn){

  const item =
    btn.closest(".feed-item");

  if(!item) return;

  const title =
    item.querySelector(".feed-title")?.textContent || "News";

  const sub =
    item.querySelector(".feed-sub")?.textContent || "";

  const openModal =
    window.PAY54_MODALS?.openModal;

  if(!openModal) return;

  openModal({

    title,

    bodyHTML: `

      <div class="p54-feed-reader">

        <div class="p54-feed-reader-title">
          ${title}
        </div>

        <div class="p54-feed-reader-sub">
          ${sub}
        </div>

      </div>

    `

  });

};
/* =========================================
   ALERTS RENDER ENGINE
========================================= */

window.renderAlerts = function(){

  const container =
    document.querySelector("#alertsFeed");

  if(!container) return;

  const alerts = [

    {
      id:"a1",
      icon:"🔔",
      title:"Security Alert",
      body:"New login detected from London."
    },

    {
      id:"a2",
      icon:"💸",
      title:"Transfer successful",
      body:"Your FX transfer completed successfully."
    },

    {
      id:"a3",
      icon:"🛡️",
      title:"Security tip",
      body:"Keep your PIN private at all times."
    }

  ];

  container.innerHTML = alerts.map(alert => `

    <div class="feed-item">

      <div class="feed-icon">
        ${alert.icon}
      </div>

      <div class="feed-content">

        <div class="feed-title">
          ${alert.title}
        </div>

        <div class="feed-sub">
          ${alert.body}
        </div>

      </div>

      <button
        class="feed-open-btn"
        onclick="openAlertItem(this)"
      >
        Open
      </button>

    </div>

  `).join("");

};

/* =========================================
   NEWS RENDER ENGINE
========================================= */

window.renderNews = function(){

  const container =
    document.querySelector("#newsFeed");

  if(!container) return;

  const news = [

    {
      icon:"📰",
      title:"PAY54 launches FX wallets",
      body:"Hold and convert across key currencies."
    },

    {
      icon:"📈",
      title:"Markets: USD strengthens",
      body:"Global FX markets show increased volatility."
    }

  ];

  container.innerHTML = news.map(item => `

    <div class="feed-item">

      <div class="feed-icon">
        ${item.icon}
      </div>

      <div class="feed-content">

        <div class="feed-title">
          ${item.title}
        </div>

        <div class="feed-sub">
          ${item.body}
        </div>

      </div>

      <button
        class="feed-open-btn"
        onclick="openNewsItem(this)"
      >
        Open
      </button>

    </div>

  `).join("");

};
