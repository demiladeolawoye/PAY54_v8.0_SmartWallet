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

  console.log(
    "CARDS ENGINE:",
    window.PAY54_CARDS
  );

  UI.openCards();

  break;

  case "checkout":
    UI.openCheckout();
    break;

  case "shop":
  UI.openShop();
  break;

case "refer":

  UI.openReferEarn();

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
   PAY54 REFER & EARN
========================================= */

window.PAY54_UI =
window.PAY54_UI || {};

window.PAY54_UI.openReferEarn = function(){

  const openModal =
    window.PAY54_MODALS?.openModal;

  if(!openModal) return;

  openModal({

    title: "Refer & Earn",

    bodyHTML: `

      <div class="p54-referral">

        <div class="referral-hero">

          <div class="referral-icon">
            🎁
          </div>

          <div class="referral-title">
            Invite Friends & Earn
          </div>

          <div class="referral-sub">
            Earn rewards when friends join PAY54.
          </div>

        </div>

        <div class="referral-card">

          <div class="referral-label">
            Your Referral Code
          </div>

          <div class="referral-code">
            PAY54-DEMI-2026
          </div>

        </div>

        <div class="referral-stats">

          <div class="ref-stat">
            <span class="ref-stat-value">
              12
            </span>

            <span class="ref-stat-label">
              Friends Invited
            </span>
          </div>

          <div class="ref-stat">
            <span class="ref-stat-value">
              ₦45,000
            </span>

            <span class="ref-stat-label">
              Rewards Earned
            </span>
          </div>

        </div>

        <div class="p54-actions">

          <button
            class="p54-btn"
            id="copyReferralBtn"
          >
            Copy Code
          </button>

          <button
            class="p54-btn primary"
            id="shareReferralBtn"
          >
            Share Invite
          </button>

        </div>

      </div>

    `,

    onMount: ({ modal }) => {

      modal
        .querySelector("#copyReferralBtn")
        .addEventListener("click", () => {

          navigator.clipboard.writeText(
            "PAY54-DEMI-2026"
          );

          window.PAY54_TOAST
            ?.showToast(
              "Referral code copied"
            );

        });

      modal
        .querySelector("#shareReferralBtn")
        .addEventListener("click", () => {

          const text = encodeURIComponent(
            "Join PAY54 using my referral code PAY54-DEMI-2026"
          );

          window.open(
            `https://wa.me/?text=${text}`,
            "_blank"
          );

        });

    }

  });

};
  
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

  const requests =
    window.PAY54_REQUESTS?.getRequests()
    || [];

  const alertHtml =
    alerts.map(alert => `

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

  const requestHtml =
    requests.map(req => `

      <div class="feed-item">

        <div class="feed-icon">
          💰
        </div>

        <div class="feed-content">

          <div class="feed-title">
            ${req.recipient}
          </div>

          <div class="feed-sub">
            Requested ₦${req.amount}
          </div>

          <div class="feed-sub">
            Status: ${req.status}
          </div>

        </div>

        <button
          class="feed-open-btn approveReq"
          data-id="${req.id}"
        >
          Approve
        </button>

        <button
          class="feed-open-btn declineReq"
          data-id="${req.id}"
        >
          Decline
        </button>

      </div>

    `).join("");

  container.innerHTML =
    alertHtml + requestHtml;

  if(
    typeof bindRequestButtons ===
    "function"
  ){
    bindRequestButtons();
  }

};

function bindRequestButtons(){

  document
    .querySelectorAll(".approveReq")
    .forEach(btn => {

      btn.onclick = () => {

        const id =
          btn.dataset.id;

        const req =
          window.PAY54_REQUESTS
          .getRequests()
          .find(r => r.id === id);

        if(!req) return;

        window.PAY54_TX
          .requestPinVerification(()=>{

            const entry =
              window.PAY54_LEDGER
              .createEntry({

                type:"request",

                title:
                  "Request Payment",

                currency:"NGN",

                amount:-req.amount,

                icon:"💸"

              });

            window.PAY54_TX
              .processTransaction(
                entry,
                {
                  title:"Request Payment",
                  showReceipt:true
                }
              );

            window.PAY54_REQUESTS
              .markPaid(id);

            renderAlerts();

          });

      };

    });

  document
    .querySelectorAll(".declineReq")
    .forEach(btn => {

      btn.onclick = () => {

        window.PAY54_REQUESTS
          .markDeclined(
            btn.dataset.id
          );

        renderAlerts();

      };

    });

}
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

/* =========================================
   PAY54 AGENT ONBOARDING
========================================= */

window.PAY54_UI =
window.PAY54_UI || {};

window.PAY54_UI.openAgent = function(){

  const openModal =
    window.PAY54_MODALS?.openModal;

  if(!openModal) return;

  openModal({

    title: "Become a PAY54 Agent",

    bodyHTML: `

      <div class="p54-agent-wrap">

        <div class="agent-hero">

          <div class="agent-icon">
            🏪
          </div>

          <div class="agent-title">
            Start earning with PAY54
          </div>

          <div class="agent-sub">
            Become an authorised PAY54 cash agent
            and earn commissions daily.
          </div>

        </div>

        <div class="p54-form">

          <input
            id="agentName"
            class="p54-input"
            placeholder="Full name"
          >

          <input
            id="agentPhone"
            class="p54-input"
            placeholder="Phone number"
            style="margin-top:12px"
          >

          <select
            id="agentBusiness"
            class="p54-input"
            style="margin-top:12px"
          >
            <option value="">
              Select business type
            </option>

            <option>
              POS Business
            </option>

            <option>
              Retail Shop
            </option>

            <option>
              Supermarket
            </option>

            <option>
              Mobile Money
            </option>

          </select>

          <input
            id="agentLocation"
            class="p54-input"
            placeholder="Location / City"
            style="margin-top:12px"
          >

          <input
            id="agentCapacity"
            class="p54-input"
            placeholder="Daily cash capacity"
            style="margin-top:12px"
          >

        </div>

        <div class="agent-earnings-card">

          <div class="agent-earnings-title">
            Estimated Monthly Earnings
          </div>

          <div class="agent-earnings-value">
            ₦150,000+
          </div>

        </div>

        <div class="p54-actions">

          <button
            class="p54-btn"
            id="cancelAgentBtn"
          >
            Cancel
          </button>

          <button
            class="p54-btn primary"
            id="submitAgentBtn"
          >
            Submit Application
          </button>

        </div>

      </div>

    `,

    onMount: ({ modal, close }) => {

      modal
        .querySelector("#cancelAgentBtn")
        .addEventListener("click", close);

      modal
        .querySelector("#submitAgentBtn")
        .addEventListener("click", () => {

          const payload = {

            name:
              modal.querySelector("#agentName")
              .value.trim(),

            phone:
              modal.querySelector("#agentPhone")
              .value.trim(),

            business:
              modal.querySelector("#agentBusiness")
              .value.trim(),

            location:
              modal.querySelector("#agentLocation")
              .value.trim(),

            capacity:
              modal.querySelector("#agentCapacity")
              .value.trim()

          };

          if(
            !payload.name ||
            !payload.phone ||
            !payload.business
          ){

            window.PAY54_TOAST
              ?.showToast(
                "Complete all required fields"
              );

            return;

          }

          localStorage.setItem(
            "pay54_agent_application",
            JSON.stringify(payload)
          );

          close();

          setTimeout(() => {

            window.PAY54_TOAST
              ?.showToast(
                "Agent application submitted"
              );

          }, 200);

        });

    }

  });

};

/* =========================================
   PAY54 SHOP & GO
========================================= */

window.PAY54_UI =
window.PAY54_UI || {};

window.PAY54_UI.openShop = function(){

  const openModal =
    window.PAY54_MODALS?.openModal;

  if(!openModal) return;

  openModal({

    title: "Shop & Go",

    bodyHTML: `

      <div class="p54-shop">

        <div class="shop-hero">

          <div class="shop-icon">
            🛍️
          </div>

          <div class="shop-title">
            PAY54 Lifestyle Hub
          </div>

          <div class="shop-sub">
            Food, transport, shopping & experiences
          </div>

        </div>

        <div class="shop-grid">

          <button
            class="shop-card"
            data-shop="food"
          >
            <div class="shop-card-icon">🍔</div>

            <div class="shop-card-title">
              Food Delivery
            </div>

            <div class="shop-card-sub">
              Order meals instantly
            </div>
          </button>

          <button
            class="shop-card"
            data-shop="taxi"
          >
            <div class="shop-card-icon">🚕</div>

            <div class="shop-card-title">
              Taxi Booking
            </div>

            <div class="shop-card-sub">
              Ride anywhere
            </div>
          </button>

          <button
            class="shop-card"
            data-shop="tickets"
          >
            <div class="shop-card-icon">🎟️</div>

            <div class="shop-card-title">
              Event Tickets
            </div>

            <div class="shop-card-sub">
              Concerts & events
            </div>
          </button>

          <button
            class="shop-card"
            data-shop="shopping"
          >
            <div class="shop-card-icon">🛒</div>

            <div class="shop-card-title">
              Marketplace
            </div>

            <div class="shop-card-sub">
              Shop online
            </div>
          </button>

        </div>

      </div>

    `,

    onMount: ({ modal }) => {

      modal
        .querySelectorAll(".shop-card")
        .forEach(card => {

          card.addEventListener("click", () => {

            const type =
              card.dataset.shop;

            let message =
              "Coming soon";

            if(type === "food"){
              message =
                "Food delivery launching soon";
            }

            if(type === "taxi"){
              message =
                "Taxi booking launching soon";
            }

            if(type === "tickets"){
              message =
                "Ticketing engine launching soon";
            }

            if(type === "shopping"){
              message =
                "Marketplace launching soon";
            }

            window.PAY54_TOAST
              ?.showToast(message);

          });

        });

    }

  });

};

/* =========================================
   PAY54 TRADING ENGINE
========================================= */

window.PAY54_UI =
window.PAY54_UI || {};

window.PAY54_UI.openTrading = function(){

  const openModal =
    window.PAY54_MODALS?.openModal;

  if(!openModal) return;

  openModal({

    title: "PAY54 Trading",

    bodyHTML: `

      <div class="p54-trading">

        <div class="trading-hero">

          <div class="trading-icon">
            📈
          </div>

          <div class="trading-title">
            Global Markets
          </div>

          <div class="trading-sub">
            Crypto, Stocks & FX Markets
          </div>

        </div>

        <div class="trading-grid">

          <button
            class="trade-card"
            data-market="btc"
          >

            <div class="trade-top">

              <div class="trade-symbol">
                BTC
              </div>

              <div class="trade-change pos">
                +4.2%
              </div>

            </div>

            <div class="trade-name">
              Bitcoin
            </div>

            <div class="trade-price">
              $68,420
            </div>

          </button>

          <button
            class="trade-card"
            data-market="eth"
          >

            <div class="trade-top">

              <div class="trade-symbol">
                ETH
              </div>

              <div class="trade-change pos">
                +2.1%
              </div>

            </div>

            <div class="trade-name">
              Ethereum
            </div>

            <div class="trade-price">
              $3,240
            </div>

          </button>

          <button
            class="trade-card"
            data-market="tesla"
          >

            <div class="trade-top">

              <div class="trade-symbol">
                TSLA
              </div>

              <div class="trade-change neg">
                -0.8%
              </div>

            </div>

            <div class="trade-name">
              Tesla
            </div>

            <div class="trade-price">
              $245
            </div>

          </button>

          <button
            class="trade-card"
            data-market="usdngn"
          >

            <div class="trade-top">

              <div class="trade-symbol">
                USD/NGN
              </div>

              <div class="trade-change pos">
                +1.5%
              </div>

            </div>

            <div class="trade-name">
              FX Pair
            </div>

            <div class="trade-price">
              ₦1,580
            </div>

          </button>

        </div>

      </div>

    `,

    onMount: ({ modal }) => {

      modal
        .querySelectorAll(".trade-card")
        .forEach(card => {

          card.addEventListener("click", () => {

            const market =
              card.dataset.market;

            let name = "Market";

            if(market === "btc"){
              name = "Bitcoin";
            }

            if(market === "eth"){
              name = "Ethereum";
            }

            if(market === "tesla"){
              name = "Tesla";
            }

            if(market === "usdngn"){
              name = "USD/NGN";
            }

            openModal({

              title: `${name} Trading`,

              bodyHTML: `

                <div class="trade-detail">

                  <div class="trade-detail-chart">
                    📊 Live Chart Coming Soon
                  </div>

                  <div class="trade-actions">

                    <button
                      class="btn primary trade-action-btn"
                    >
                      Buy
                    </button>

                    <button
                      class="btn ghost trade-action-btn"
                    >
                      Sell
                    </button>

                    <button
                      class="btn ghost trade-action-btn"
                    >
                      Watchlist
                    </button>

                  </div>

                </div>

              `,

              onMount: ({ modal }) => {

                modal
                  .querySelectorAll(
                    ".trade-action-btn"
                  )
                  .forEach(btn => {

                    btn.addEventListener(
                      "click",
                      () => {

                        const text =
                          btn.textContent.trim();

                        window.PAY54_TOAST
                          ?.showToast(
                            `${text} feature coming soon`
                          );

                      }
                    );

                  });

              }

            });

          });

        });

    }

  });

};

/* =========================================
   PAY54 SMART CHECKOUT ENGINE
========================================= */

window.PAY54_UI =
window.PAY54_UI || {};
window.PAY54_UI.openCheckout = function(){

const openModal =
window.PAY54_MODALS?.openModal;

if(!openModal){
console.error("Modal engine unavailable");
return;
}

const ledger =
window.PAY54_LEDGER;

if(!ledger){
console.error("Ledger unavailable");
return;
}

const balances =
ledger.getBalances();

const activeCurrency =
window.PAY54_APP.activeCurrency || "NGN";

const availableBalance =
balances[activeCurrency] || 0;

const merchant = {

name:"Amazon Marketplace",

merchantId:"MRC-78493",

item:"Wireless Headphones",

risk:"LOW",

trust:98,

amount:125.50,

fee:1.50,

discount:2.00,

currency:activeCurrency

};

const total =
merchant.amount +
merchant.fee -
merchant.discount;
const savedCards =
  JSON.parse(
    localStorage.getItem(
      "pay54_cards"
    ) || "[]"
  );

const fundingHTML = `

<label class="checkout-radio">

<input
  type="radio"
  name="funding"
  value="wallet"
  checked
>

PAY54 Wallet

</label>

${savedCards.map(card => `

<label class="checkout-radio">

<input
  type="radio"
  name="funding"
  value="${card.id}"
>

${card.scheme}
•••• ${card.last4}

${card.default
  ? "(Default)"
  : ""
}

</label>

`).join("")}

<label class="checkout-radio">

<input
  type="radio"
  name="funding"
  value="mobilemoney"
>

Mobile Money

</label>

<label class="checkout-radio">

<input
  type="radio"
  name="funding"
  value="bank"
>

Bank Account

</label>

`;
openModal({

title:"PAY54 Smart Checkout",

bodyHTML:`

<div class="p54-checkout-premium">

<div class="checkout-hero">

<div class="checkout-icon">
🛒
</div>

<div class="checkout-title">
Merchant Verified
</div>

<div class="checkout-sub">
Trust Score ${merchant.trust}/100
</div>

</div>

<div class="checkout-card">

<div class="checkout-row">
<span>Merchant</span>
<strong>${merchant.name}</strong>
</div>

<div class="checkout-row">
<span>Item</span>
<strong>${merchant.item}</strong>
</div>

<div class="checkout-row">
<span>Merchant ID</span>
<strong>${merchant.merchantId}</strong>
</div>

<div class="checkout-row">
<span>Risk</span>
<strong style="color:#22c55e">
${merchant.risk}
</strong>
</div>

</div>

<div class="checkout-section">

<div class="checkout-label">

Funding Source

</div>

${fundingHTML}

</div>

<div class="checkout-wallet-card">

<div class="checkout-wallet-title">
Available Balance
</div>

<div class="checkout-wallet-amount">

${ledger.moneyFmt(
activeCurrency,
availableBalance
)}

</div>

</div>

<div class="checkout-reward-card">

<div>
🎁 Reward Points
</div>

<strong>
120 PAY54 Points
</strong>

<hr>

<div>
💸 Cashback
</div>

<strong>
£1.20
</strong>

</div>

<div class="checkout-summary">

<div class="checkout-row">
<span>Subtotal</span>
<strong>
${ledger.moneyFmt(
merchant.currency,
merchant.amount
)}
</strong>
</div>

<div class="checkout-row">
<span>Fee</span>
<strong>
${ledger.moneyFmt(
merchant.currency,
merchant.fee
)}
</strong>
</div>

<div class="checkout-row">
<span>Discount</span>
<strong style="color:#22c55e">
-${ledger.moneyFmt(
merchant.currency,
merchant.discount
)}
</strong>
</div>

<div class="checkout-row">

<span>
Total
</span>

<strong>

${ledger.moneyFmt(
merchant.currency,
total
)}

</strong>

</div>

</div>

<div class="p54-actions">

<button
class="p54-btn"
id="declineCheckoutBtn">
Decline
</button>

<button
class="p54-btn primary"
id="approveCheckoutBtn">
Approve Payment
</button>

</div>

</div>

`,

onMount:({modal,close})=>{

modal
.querySelector("#declineCheckoutBtn")
.addEventListener("click",()=>{

close();

window.PAY54_TOAST
?.showToast(
"Checkout cancelled"
);

});

modal
.querySelector("#approveCheckoutBtn")
.addEventListener("click",()=>{

if(
availableBalance < total
){

window.PAY54_TOAST
?.showToast(
"Insufficient balance"
);

return;

}

window.PAY54_TX
?.requestPinVerification(()=>{

const entry =
ledger.createEntry({

type:"checkout",

title:"Smart Checkout",

icon:"🛒",

currency:
merchant.currency,

amount:-total,

meta:{

merchant:
merchant.name,

item:
merchant.item,

merchantId:
merchant.merchantId

}

});

const tx =
window.PAY54_TX
.processTransaction(

entry,

{

title:
merchant.name,

source:
"checkout",

showReceipt:true

}

);

if(
typeof renderBalance
===
"function"
){
renderBalance();
}

close();

window.PAY54_TOAST
?.showToast(
"Payment approved"
);

});

});

}

});

};


/* =========================================
   PAY54 BILLS ENGINE v2 PREMIUM
========================================= */

window.PAY54_UI =
window.PAY54_UI || {};

window.PAY54_UI.openBills = function(){

  const openModal =
    window.PAY54_MODALS?.openModal;

  const LEDGER =
    window.PAY54_LEDGER;

  const RECEIPTS =
    window.PAY54_RECEIPTS;

  if(!openModal || !LEDGER) return;

  const providers = {

    airtime:[
      "MTN",
      "Airtel",
      "Glo",
      "9mobile"
    ],

    data:[
      "MTN Data",
      "Airtel Data",
      "Glo Data",
      "9mobile Data"
    ],

    electricity:[
      "IKEDC",
      "EKEDC",
      "Abuja Electric",
      "KEDCO"
    ],

    cable:[
      "DSTV",
      "GOtv",
      "Startimes"
    ]

  };

  const bundles = {

    "MTN Data":[
      "1GB - ₦500",
      "2GB - ₦1000",
      "5GB - ₦2000"
    ],

    "Airtel Data":[
      "1GB - ₦500",
      "3GB - ₦1500",
      "6GB - ₦3000"
    ],

    DSTV:[
      "Compact",
      "Compact Plus",
      "Premium"
    ],

    GOtv:[
      "Jolli",
      "Max",
      "Supa"
    ],

    Startimes:[
      "Nova",
      "Basic",
      "Classic"
    ]

  };

  openModal({

    title:"Bills & Top Up",

    bodyHTML:`

      <div class="p54-bills">

        <div class="bills-hero">

          <div class="bills-icon">
            ⚡
          </div>

          <div class="bills-title">
            Pay Bills Instantly
          </div>

          <div class="bills-sub">
            Airtime, data, electricity & subscriptions
          </div>

        </div>

        <div class="bill-tabs">

          <button class="bill-tab active"
            data-type="airtime">
            📱 Airtime
          </button>

          <button class="bill-tab"
            data-type="data">
            🌐 Data
          </button>

          <button class="bill-tab"
            data-type="electricity">
            💡 Electricity
          </button>

          <button class="bill-tab"
            data-type="cable">
            📺 Cable TV
          </button>

        </div>

        <div class="bill-form">

          <select
            id="billProvider"
            class="p54-input"
          ></select>

          <select
            id="billBundle"
            class="p54-input"
            style="margin-top:12px"
          >
            <option value="">
              Select Bundle
            </option>
          </select>

          <input
            id="billTarget"
            class="p54-input"
            placeholder="Phone / Meter / Smartcard"
            style="margin-top:12px"
          >

          <input
            id="billAmount"
            class="p54-input"
            type="number"
            placeholder="Amount"
            style="margin-top:12px"
          >

          <div class="quick-amounts">

            <button
              class="quick-amount"
              data-amount="500"
            >
              ₦500
            </button>

            <button
              class="quick-amount"
              data-amount="1000"
            >
              ₦1000
            </button>

            <button
              class="quick-amount"
              data-amount="2000"
            >
              ₦2000
            </button>

            <button
              class="quick-amount"
              data-amount="5000"
            >
              ₦5000
            </button>

          </div>

          <select
            id="billWallet"
            class="p54-input"
            style="margin-top:12px"
          >
            <option value="NGN">
              NGN Wallet
            </option>
          </select>

          <div
            id="billBalance"
            class="bill-balance"
          ></div>

          <div class="bill-actions">

            <button
              class="btn ghost"
              id="cancelBillBtn"
            >
              Cancel
            </button>

            <button
              class="btn primary"
              id="payBillBtn"
            >
              Pay Bill
            </button>

          </div>

        </div>

      </div>

    `,

    onMount: ({ modal, close }) => {

      let activeType =
        "airtime";

      const balances =
        LEDGER.getBalances();

      const providerEl =
        modal.querySelector("#billProvider");

      const bundleEl =
        modal.querySelector("#billBundle");

      const targetEl =
        modal.querySelector("#billTarget");

      const amountEl =
        modal.querySelector("#billAmount");

      const balanceEl =
        modal.querySelector("#billBalance");

      function renderBalance(){

        balanceEl.innerHTML = `
          Available:
          <strong>
            ${LEDGER.moneyFmt(
              "NGN",
              balances.NGN
            )}
          </strong>
        `;

      }

      function loadProviders(type){

        providerEl.innerHTML = "";

        providers[type].forEach(p => {

          const opt =
            document.createElement("option");

          opt.value = p;
          opt.textContent = p;

          providerEl.appendChild(opt);

        });

        loadBundles();

      }

      function loadBundles(){

        const provider =
          providerEl.value;

        const list =
          bundles[provider] || [];

        bundleEl.innerHTML = `
          <option value="">
            Select Bundle
          </option>
        `;

        list.forEach(item => {

          const opt =
            document.createElement("option");

          opt.value = item;
          opt.textContent = item;

          bundleEl.appendChild(opt);

        });

      }

      renderBalance();

      loadProviders(activeType);

      modal
        .querySelectorAll(".bill-tab")
        .forEach(tab => {

          tab.addEventListener("click", () => {

            modal
              .querySelectorAll(".bill-tab")
              .forEach(t =>
                t.classList.remove("active")
              );

            tab.classList.add("active");

            activeType =
              tab.dataset.type;

            loadProviders(activeType);

          });

        });

      providerEl.addEventListener(
        "change",
        loadBundles
      );

      modal
        .querySelectorAll(".quick-amount")
        .forEach(btn => {

          btn.addEventListener("click", () => {

            amountEl.value =
              btn.dataset.amount;

          });

        });

      modal.querySelector(
        "#cancelBillBtn"
      ).addEventListener(
        "click",
        close
      );

      modal.querySelector(
        "#payBillBtn"
      ).addEventListener(
        "click",
        () => {

          const amount =
            Number(amountEl.value);

          if(!amount || amount <= 0){

            window.PAY54_TOAST
              ?.showToast(
                "Enter valid amount"
              );

            return;

          }

          const tx =
            LEDGER.createEntry({

              type:"bill",

              title:"Bill Payment",

              currency:"NGN",

              amount:-amount,

              icon:"⚡",

              meta:{
                provider:
                  providerEl.value,
                target:
                  targetEl.value,
                bundle:
                  bundleEl.value,
                category:
                  activeType
              }

            });

          LEDGER.applyEntry(tx);

          close();

          RECEIPTS?.openReceiptModal({

            openModal,

            title:"Bill Payment",

            tx,

            lines:[

              `Provider: ${providerEl.value}`,

              `Category: ${activeType}`,

              `Bundle: ${bundleEl.value || "N/A"}`,

              `Target: ${targetEl.value}`,

              `Amount: ${LEDGER.moneyFmt("NGN",amount)}`,

              `Status: SUCCESS`

            ]

          });

          window.PAY54_TOAST
            ?.showToast(
              "Bill payment successful"
            );

          if(
            typeof renderBalances ===
            "function"
          ){
            renderBalances();
          }

        });

    }

  });

};

/* =========================================
   PAY54 CARDS ENGINE v1
========================================= */

window.PAY54_UI =
window.PAY54_UI || {};

window.PAY54_UI.openCards = function(){

  const openModal =
    window.PAY54_MODALS?.openModal;

  if(!openModal) return;

  const STORAGE_KEY =
    "pay54_cards";

  function getCards(){

    return JSON.parse(
      localStorage.getItem(STORAGE_KEY)
      || "[]"
    );

  }

  function saveCards(cards){

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(cards)
    );

  }

 function createCard(payload){

  const cards = getCards();

  if(cards.length >= 3){

    window.PAY54_TOAST
      ?.showToast(
        "Maximum 3 cards allowed"
      );

    return false;

  }

  cards.push(payload);

  saveCards(cards);

  return true;

}

  function renderCards(container){

    const cards = getCards();

    if(!cards.length){

      container.innerHTML = `

        <div class="empty-cards">

          No cards available

        </div>

      `;

      return;

    }

    container.innerHTML = cards.map(card => `

      <div class="pay54-card-ui">

        <div class="card-top">

          <div class="card-brand">
            PAY54
          </div>

          <div class="card-scheme">
            ${card.scheme}
          </div>

        </div>

        <div class="card-number">
          •••• •••• •••• ${card.last4}
        </div>

        <div class="card-meta">

          <div>
            ${card.currency}
          </div>

          <div>
            ${card.type}
          </div>

        </div>

        <div class="card-status">

          ${
            card.frozen
            ? "❄️ Frozen"
            : "✅ Active"
          }

        </div>

        ${
          card.default
          ? `
            <div class="default-card-badge">
              Default Payment Card
            </div>
          `
          : ""
        }

        <div class="card-actions">

          <button
            class="btn ghost sm freezeCardBtn"
            data-id="${card.id}"
          >
            ${
              card.frozen
              ? "Unfreeze"
              : "Freeze"
            }
          </button>

          <button
            class="btn ghost sm defaultCardBtn"
            data-id="${card.id}"
          >
            Set Default
          </button>

          <button
            class="btn ghost sm deleteCardBtn"
            data-id="${card.id}"
          >
            Delete
          </button>

        </div>

      </div>

    `).join("");

    bindCardActions(container);

  }

  function bindCardActions(container){

    container
      .querySelectorAll(".freezeCardBtn")
      .forEach(btn => {

        btn.addEventListener("click", () => {

          const id =
            btn.dataset.id;

          const cards =
            getCards();

          const card =
            cards.find(c => c.id === id);

          if(!card) return;

          card.frozen =
            !card.frozen;

          saveCards(cards);

          renderCards(container);

          window.PAY54_TOAST
            ?.showToast(
              card.frozen
              ? "Card frozen"
              : "Card activated"
            );

        });

      });

    container
      .querySelectorAll(".defaultCardBtn")
      .forEach(btn => {

        btn.addEventListener("click", () => {

          const id =
            btn.dataset.id;

          const cards =
            getCards();

          cards.forEach(c => {
            c.default = false;
          });

          const card =
            cards.find(c => c.id === id);

          if(card){
            card.default = true;
          }

          saveCards(cards);

          renderCards(container);

          window.PAY54_TOAST
            ?.showToast(
              "Default payment card updated"
            );

        });

      });

    container
      .querySelectorAll(".deleteCardBtn")
      .forEach(btn => {

        btn.addEventListener("click", () => {

          const id =
            btn.dataset.id;

          let cards =
            getCards();

          cards =
            cards.filter(
              c => c.id !== id
            );

          saveCards(cards);

          renderCards(container);

          window.PAY54_TOAST
            ?.showToast(
              "Card deleted"
            );

        });

      });

  }

  openModal({

    title: "Virtual & Linked Cards",

    bodyHTML: `

      <div class="p54-cards-wrap">

        <div class="cards-hero">

          <div class="cards-icon">
            💳
          </div>

          <div class="cards-title">
            PAY54 Smart Cards
          </div>

          <div class="cards-sub">
            Virtual cards, linked bank cards
            & contactless-ready payments
          </div>

        </div>

        <div class="cards-actions">

          <button
            id="createVirtualCardBtn"
            class="btn primary"
          >
            Create Virtual Card
          </button>

          <button
            id="linkExternalCardBtn"
            class="btn ghost"
          >
            Link Bank Card
          </button>

        </div>

        <div
          id="cardsContainer"
          class="cards-container"
        ></div>

      </div>

    `,

    onMount: ({ modal }) => {

      const container =
        modal.querySelector(
          "#cardsContainer"
        );

      renderCards(container);

      modal
        .querySelector(
          "#createVirtualCardBtn"
        )
        .addEventListener("click", () => {

          openModal({

            title:"Create Virtual Card",

            bodyHTML: `

              <div class="p54-form">

                <select
                  id="cardCurrency"
                  class="p54-input"
                >
                  <option value="USD">
                    USD Virtual Visa
                  </option>

                  <option value="GBP">
                    GBP Mastercard
                  </option>

                  <option value="NGN">
                    NGN Virtual Card
                  </option>

                </select>

                <div class="p54-actions">

                  <button
                    class="btn primary"
                    id="confirmCreateCard"
                  >
                    Create Card
                  </button>

                </div>

              </div>

            `,

            onMount: ({ modal, close }) => {

              modal
                .querySelector(
                  "#confirmCreateCard"
                )
                .addEventListener(
                  "click",
                  () => {

                    const currency =
                      modal.querySelector(
                        "#cardCurrency"
                      ).value;

                    const scheme =
                      currency === "GBP"
                      ? "Mastercard"
                      : "Visa";
const existingCards =
getCards();

if(existingCards.length >= 3){

  window.PAY54_TOAST
  ?.showToast(
    "Maximum 3 cards allowed"
  );

  return;

}
console.log("STEP 1");

createCard({

id:
"CARD-" + Date.now(),

currency,

scheme,

type:"Virtual",

last4:
Math.floor(
1000 + Math.random() * 9000
),

contactless:true,

frozen:false,

default:false,

balance:0,

transactions:[]

});
                    close();

                    renderCards(container);

                    window.PAY54_TOAST
                      ?.showToast(
                        "Virtual card created"
                      );

                  }
                );

            }

          });

        });

      modal
        .querySelector(
          "#linkExternalCardBtn"
        )
        .addEventListener("click", () => {

          openModal({

            title:"Link Bank Card",
             
            bodyHTML:`

<div class="p54-form">

<div class="p54-label">
Cardholder Name
</div>

<input
id="cardholderName"
class="p54-input"
placeholder="John Smith"
>

<div class="p54-label">
Bank Name
</div>

<input
id="bankName"
class="p54-input"
placeholder="Barclays"
>

<div class="p54-label">
Card Number
</div>

<input
id="cardNumber"
class="p54-input"
maxlength="19"
placeholder="1234 5678 9012 3456"
>

<div class="p54-grid-2">

<div>

<div class="p54-label">
Expiry Date
</div>

<input
id="expiryDate"
class="p54-input"
placeholder="MM/YY"
>

</div>

<div>

<div class="p54-label">
CVV
</div>

<input
id="cvv"
class="p54-input"
maxlength="4"
placeholder="123"
>

</div>

</div>

<div class="p54-label">
Card Type
</div>

<select
id="cardType"
class="p54-input"
>

<option value="Visa">
Visa
</option>

<option value="Mastercard">
Mastercard
</option>

<option value="Amex">
American Express
</option>

</select>

<div class="p54-actions">

<button
class="btn primary"
id="confirmLinkCard"
>
Link Card
</button>

</div>

</div>

`,
            onMount: ({ modal, close }) => {

              modal
                .querySelector(
                  "#confirmLinkCard"
                )
                .addEventListener(
                  "click",
                  () => {

                   const cardholder =
modal.querySelector("#cardholderName")
.value.trim();

const bank =
modal.querySelector("#bankName")
.value.trim();

const cardNumber =
modal.querySelector("#cardNumber")
.value.replace(/\s/g,"");

const expiry =
modal.querySelector("#expiryDate")
.value.trim();

const cvv =
modal.querySelector("#cvv")
.value.trim();

const cardType =
modal.querySelector("#cardType")
.value;

                   if(
!cardholder ||
!bank ||
cardNumber.length < 16 ||
!expiry ||
cvv.length < 3
){

                      window.PAY54_TOAST
                        ?.showToast(
                          "Complete all fields"
                        );

                      return;

                    }
const existingCards =
getCards();

if(existingCards.length >= 3){

  window.PAY54_TOAST
  ?.showToast(
    "Maximum 3 cards allowed"
  );

  return;

}
         createCard({

id:
"LINK-" + Date.now(),

currency:"GBP",

scheme:cardType,

type:"Bank",

cardholder,

last4:
cardNumber.slice(-4),

expiry,

contactless:true,

frozen:false,

default:false,

linked:true,

balance:0,

transactions:[]

});

                    close();

                    renderCards(container);

                    window.PAY54_TOAST
                      ?.showToast(
                        "Bank card linked"
                      );

                  }
                );

            }

          });

        });

    }

  });

};

/* =========================================
   PAY54 SAVINGS V3 PREMIUM
========================================= */

window.PAY54_UI =
window.PAY54_UI || {};

window.PAY54_UI.openSavings = function(){

  const openModal =
    window.PAY54_MODALS?.openModal;

  const LEDGER =
    window.PAY54_LEDGER;

  if(!openModal || !LEDGER) return;

  const LS_KEY =
    "pay54_savings_goals";

  function getGoals(){

    return JSON.parse(
      localStorage.getItem(LS_KEY) || "[]"
    );

  }

  function saveGoals(goals){

    localStorage.setItem(
      LS_KEY,
      JSON.stringify(goals)
    );

  }

  function renderSavings(){

    const goals =
      getGoals();

    const balances =
      LEDGER.getBalances();

    const ngn =
      balances.NGN || 0;

    const canCreate =
      goals.length < 4;

    openModal({

      title:"Savings & Goals",

      bodyHTML:`

        <div class="p54-savings-wrap">

          <div class="balance-card">

            <div class="label">
              Total Available Balance
            </div>

            <div class="balance-amount">
              ${LEDGER.moneyFmt("NGN", ngn)}
            </div>

          </div>

          <div class="savings-grid">

            ${goals.map((goal,index)=>{

              const progress =
                Math.min(
                  100,
                  Math.round(
                    (goal.saved / goal.target) * 100
                  ) || 0
                );

              return `

                <div class="saving-goal-card">

                  <div>

                    <div style="
                      display:flex;
                      justify-content:space-between;
                      align-items:center;
                    ">

                      <strong>
                        ${goal.name}
                      </strong>

                      <span>🎯</span>

                    </div>

                    <div style="
                      margin:22px auto;
                      width:90px;
                      height:90px;
                      border-radius:50%;
                      border:8px solid #e5e7eb;
                      display:flex;
                      align-items:center;
                      justify-content:center;
                      font-weight:900;
                    ">
                      ${progress}%
                    </div>

                    <div style="
                      text-align:center;
                      font-weight:800;
                    ">
                      Saved
                    </div>

                    <div style="
                      text-align:center;
                      font-size:34px;
                      font-weight:900;
                    ">
                      ${LEDGER.moneyFmt("NGN", goal.saved)}
                    </div>

                    <div style="
                      text-align:center;
                      margin-top:8px;
                      color:var(--muted);
                      font-size:13px;
                    ">
                      Target:
                      ${LEDGER.moneyFmt("NGN", goal.target)}
                    </div>

                  </div>

                  <div>

                    <button
                      class="btn primary goal-open-btn"
                      data-open-goal="${index}"
                    >
                      Open Goal
                    </button>

                    <button
                      class="btn ghost goal-delete-btn"
                      data-delete-goal="${index}"
                      ${goal.saved > 0 ? "disabled" : ""}
                    >
                      Close Goal
                    </button>

                  </div>

                </div>

              `;

            }).join("")}

            ${canCreate ? `

              <div
                class="create-goal-card"
                id="createGoalCard"
              >

                <div style="
                  font-size:56px;
                  font-weight:200;
                ">
                  +
                </div>

                <button
  id="createGoalBtn"
  class="create-goal-btn"
>
  ➕ Create New Goal
</button>

<div class="goal-helper">
  Maximum 4 savings goals
</div>

                <div class="goal-limit-note">
                  Maximum 4 savings goals
                </div>

              </div>

            ` : ""}

          </div>

        </div>

      `,

      onMount: ({ modal, close }) => {

        modal
          .querySelectorAll("[data-open-goal]")
          .forEach(btn => {

            btn.addEventListener("click", () => {

              openGoal(
                Number(
                  btn.dataset.openGoal
                )
              );

            });

          });

        modal
          .querySelectorAll("[data-delete-goal]")
          .forEach(btn => {

            btn.addEventListener("click", () => {

             const index =
  Number(
    btn.dataset.deleteGoal
  );

              const goals =
                getGoals();

              if(goals[index].saved > 0){

                window.PAY54_TOAST
                  ?.showToast(
                    "Withdraw funds before closing goal"
                  );

                return;

              }

              goals.splice(index,1);

              saveGoals(goals);

              close();

              setTimeout(() => {

                renderSavings();

              }, 150);

            });

          });

        const createBtn =
          modal.querySelector("#createGoalCard");

        if(createBtn){

          createBtn.addEventListener("click", () => {

            openCreateGoal();

          });

        }

      }

    });

  }

  function openCreateGoal(){

    const openModal =
      window.PAY54_MODALS?.openModal;

    openModal({

      title:"Create Goal",

      bodyHTML:`

        <div class="p54-form">

          <input
            id="goalName"
            class="p54-input"
            placeholder="Goal name"
          >

          <input
            id="goalTarget"
            class="p54-input"
            type="number"
            placeholder="Target amount"
            style="margin-top:12px"
          >

          <button
            class="btn primary"
            id="saveGoalBtn"
            style="width:100%;margin-top:18px"
          >
            Create Goal
          </button>

        </div>

      `,

      onMount: ({ modal, close }) => {

  modal
    .querySelector("#saveGoalBtn")
    .addEventListener("click", () => {

      const name =
        modal.querySelector("#goalName")
        .value.trim();

      const target =
        Number(
          modal.querySelector("#goalTarget")
          .value
        );

      if(!name || !target){

        window.PAY54_TOAST
          ?.showToast(
            "Complete all fields"
          );

        return;

      }

      const goals =
        getGoals();

      if(goals.length >= 4){

        window.PAY54_TOAST
          ?.showToast(
            "Maximum 4 goals allowed"
          );

        return;

      }

      goals.push({

        name,
        target,
        saved:0,
        auto_save:null

      });

      saveGoals(goals);

      close();

      setTimeout(() => {

        renderSavings();

        window.PAY54_TOAST
          ?.showToast(
            "Goal created"
          );

      },150);

    });

} // close onMount

}); // close openModal

} // close openCreateGoal

  function openGoal(index){

    const goals =
      getGoals();

    const goal =
      goals[index];

    const openModal =
      window.PAY54_MODALS?.openModal;

    openModal({

      title:goal.name,

      bodyHTML:`

        <div class="p54-form">

          <div style="
            text-align:center;
            margin-bottom:18px;
          ">

            <div class="label">
              Saved Amount
            </div>

            <div class="balance-amount">
              ${LEDGER.moneyFmt("NGN", goal.saved)}
            </div>

            <div class="sub">
              Target:
              ${LEDGER.moneyFmt("NGN", goal.target)}
            </div>

          </div>

          <button
            class="btn primary"
            id="addMoneyGoalBtn"
            style="width:100%"
          >
            Add Money
          </button>

          <button
            class="btn ghost"
            id="withdrawGoalBtn"
            style="width:100%;margin-top:10px"
          >
            Withdraw
          </button>

          <div style="
            margin-top:24px;
            font-weight:900;
          ">
            Auto Save Plan
          </div>

          <select
            id="autoFrequency"
            class="p54-input"
            style="margin-top:12px"
          >
            <option value="weekly">
              Weekly
            </option>

            <option value="fortnightly">
              Fortnightly
            </option>

            <option value="monthly">
              Monthly
            </option>
          </select>

          <input
            id="autoAmount"
            class="p54-input"
            type="number"
            placeholder="Auto save amount"
            style="margin-top:12px"
          >

          <button
            class="btn primary"
            id="saveAutoBtn"
            style="width:100%;margin-top:14px"
          >
            Save Auto Plan
          </button>

        </div>

      `,

  onMount: ({ modal, close }) => {

  const addBtn =
    modal.querySelector("#addMoneyGoalBtn");

  const withdrawBtn =
    modal.querySelector("#withdrawGoalBtn");

  const autoBtn =
    modal.querySelector("#saveAutoBtn");

  /* =========================
     ADD MONEY
  ========================= */

  addBtn?.addEventListener("click", () => {

    const amount =
      Number(
        prompt("Enter amount to save")
      );

    if(!amount || amount <= 0){

      window.PAY54_TOAST
        ?.showToast(
          "Invalid amount"
        );

      return;

    }

    const balances =
      LEDGER.getBalances();

    const available =
      balances.NGN || 0;

    if(amount > available){

      window.PAY54_TOAST
        ?.showToast(
          "Insufficient balance"
        );

      return;

    }

    goal.saved += amount;

    goals[index] = goal;

    saveGoals(goals);

    LEDGER.applyEntry({

      currency:"NGN",

      amount:-amount,

      type:"savings",

      title:`Savings Deposit • ${goal.name}`

    });

    window.PAY54_TOAST
      ?.showToast(
        "Money added successfully"
      );

    close();

    setTimeout(() => {

      renderSavings();

      renderBalance?.();

    }, 180);

  });

  /* =========================
     WITHDRAW
  ========================= */

  withdrawBtn?.addEventListener("click", () => {

    const amount =
      Number(
        prompt("Enter withdrawal amount")
      );

    if(!amount || amount <= 0){

      window.PAY54_TOAST
        ?.showToast(
          "Invalid amount"
        );

      return;

    }

    if(amount > goal.saved){

      window.PAY54_TOAST
        ?.showToast(
          "Insufficient savings"
        );

      return;

    }

    goal.saved -= amount;

    goals[index] = goal;

    saveGoals(goals);

    LEDGER.applyEntry({

      currency:"NGN",

      amount:amount,

      type:"savings_withdrawal",

      title:`Savings Withdrawal • ${goal.name}`

    });

    window.PAY54_TOAST
      ?.showToast(
        "Withdrawal successful"
      );

    close();

    setTimeout(() => {

      renderSavings();

      renderBalance?.();

    }, 180);

  });

  /* =========================
     AUTO SAVE PLAN
  ========================= */
autoBtn?.addEventListener("click", () => {

  const frequency =
    modal.querySelector("#autoFrequency").value;

  const amount =
    Number(
      modal.querySelector("#autoAmount").value
    );

  if(!amount || amount <= 0){

    window.PAY54_TOAST?.showToast(
      "Enter valid auto save amount"
    );

    return;

  }

  goal.auto_save = {

    frequency,

    amount

  };

  goals[index] = goal;

  saveGoals(goals);

  window.PAY54_TOAST?.showToast(
    "✅ Auto Save Plan Updated"
  );

});

} // end onMount

    }); // end openModal

  } // end openGoal

  /* =========================
     START SAVINGS MODULE
  ========================= */

  renderSavings();

}; // end window.PAY54_UI.openSavings

/* =========================================
   PAY54 REQUEST MONEY ENGINE
========================================= */

window.PAY54_REQUESTS = {

  getRequests(){

    return JSON.parse(
      localStorage.getItem("pay54_requests") || "[]"
    );

  },

  saveRequests(list){

    localStorage.setItem(
      "pay54_requests",
      JSON.stringify(list)
    );

  },

  createRequest(payload){

    const list = this.getRequests();

    list.unshift({

      id:"REQ-"+Date.now(),

      status:"pending",

      created:new Date().toISOString(),

      ...payload

    });

    this.saveRequests(list);

  },

  markPaid(id){

    const list = this.getRequests();

    const req =
      list.find(r => r.id === id);

    if(req){
      req.status = "paid";
    }

    this.saveRequests(list);

  },

  markDeclined(id){

    const list = this.getRequests();

    const req =
      list.find(r => r.id === id);

    if(req){
      req.status = "declined";
    }

    this.saveRequests(list);

  }

};

window.PAY54_UI.openRequestMoney = function(){

  const openModal =
    window.PAY54_MODALS?.openModal;

  if(!openModal) return;

  openModal({

    title:"Request Money",

    bodyHTML:`

      <div class="p54-form">

        <input
          id="reqRecipient"
          class="p54-input"
          placeholder="Recipient Name"
        >

        <input
          id="reqPhone"
          class="p54-input"
          placeholder="Phone Number"
          style="margin-top:12px"
        >

        <input
          id="reqAmount"
          class="p54-input"
          type="number"
          placeholder="Amount"
          style="margin-top:12px"
        >

        <input
          id="reqReason"
          class="p54-input"
          placeholder="Reason"
          style="margin-top:12px"
        >

        <div class="p54-actions">

          <button
            class="p54-btn"
            id="whatsappRequestBtn"
          >
            WhatsApp
          </button>

          <button
            class="p54-btn"
            id="smsRequestBtn"
          >
            SMS
          </button>

          <button
            class="p54-btn primary"
            id="copyRequestBtn"
          >
            Copy Link
          </button>

        </div>

      </div>

    `,

    onMount: ({ modal, close }) => {

      const whatsappBtn =
        modal.querySelector("#whatsappRequestBtn");

      const smsBtn =
        modal.querySelector("#smsRequestBtn");

      const copyBtn =
        modal.querySelector("#copyRequestBtn");

      const recipient =
        modal.querySelector("#reqRecipient");

      const phone =
        modal.querySelector("#reqPhone");

      const amount =
        modal.querySelector("#reqAmount");

      const reason =
        modal.querySelector("#reqReason");

      function createRequestPayload(){

        if(
          !recipient.value.trim() ||
          !phone.value.trim() ||
          !amount.value.trim()
        ){

          window.PAY54_TOAST
            ?.showToast(
              "Complete all required fields"
            );

          return null;

        }

     const requestId =
  "REQ-" + Date.now();

const paymentLink =

`${location.origin}/request.html?id=${requestId}`;

        const payload = {

  id: requestId,

  paymentLink,

  recipient:
    recipient.value.trim(),

  phone:
    phone.value.trim(),

  amount:
    Number(amount.value),

  reason:
    reason.value.trim(),

  status:"pending",

  created_at:
    new Date().toISOString()

};

        if(
          window.PAY54_REQUESTS?.createRequest
        ){

          window.PAY54_REQUESTS
            .createRequest(payload);

        }

        if(window.renderAlerts){

          window.renderAlerts();

        }

        return payload;

      }

      whatsappBtn?.addEventListener(
        "click",
        () => {

          const req =
            createRequestPayload();

          if(!req) return;

const text =

`💳 PAY54 Payment Request

${localStorage.getItem("pay54_name") || "PAY54 User"}

is requesting:

₦${req.amount}

Reason:
${req.reason}

Pay securely here:

${req.paymentLink}`;

          window.open(
            `https://wa.me/?text=${encodeURIComponent(text)}`,
            "_blank"
          );

          close();

        }
      );

      smsBtn?.addEventListener(
        "click",
        () => {

          const req =
            createRequestPayload();

          if(!req) return;

          const text =

`PAY54 Payment Request

₦${req.amount}

Reason:
${req.reason}

Pay:

${req.paymentLink}`;

          window.location.href =
            `sms:${req.phone}?body=${encodeURIComponent(text)}`;

          close();

        }
      );

      copyBtn?.addEventListener(
        "click",
        async () => {

          const req =
            createRequestPayload();

          if(!req) return;

         const link =
req.paymentLink;

          await navigator.clipboard
            .writeText(link);

          window.PAY54_TOAST
            ?.showToast(
              "Request link copied"
            );

          close();

        }
      );

    }

  });

};
