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

    name: "Amazon Marketplace",

    amount: 125.50,

    currency: activeCurrency,

    risk: "Low",

    item: "Wireless Headphones",

    merchantId: "MRC-78493"

  };

  openModal({

    title: "PAY54 Smart Checkout",

    bodyHTML: `

      <div class="p54-checkout">

        <div class="checkout-hero">

          <div class="checkout-icon">
            🛍️
          </div>

          <div class="checkout-title">
            Pending Checkout Approval
          </div>

          <div class="checkout-sub">
            Review merchant request securely
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
            <span>Risk Level</span>
            <strong class="risk-low">
              ${merchant.risk}
            </strong>
          </div>

          <div class="checkout-row">
            <span>Merchant ID</span>
            <strong>${merchant.merchantId}</strong>
          </div>

          <div class="checkout-row">
            <span>Wallet</span>
            <strong>${activeCurrency}</strong>
          </div>

          <div class="checkout-row">
            <span>Available</span>
            <strong>
              ${ledger.moneyFmt(
                activeCurrency,
                availableBalance
              )}
            </strong>
          </div>

        </div>

        <div class="checkout-amount-wrap">

          <div class="checkout-amount-label">
            Amount
          </div>

          <div class="checkout-amount">
            ${ledger.moneyFmt(
              merchant.currency,
              merchant.amount
            )}
          </div>

        </div>

        <div class="p54-actions">

          <button
            class="p54-btn"
            id="declineCheckoutBtn"
          >
            Decline
          </button>

          <button
            class="p54-btn primary"
            id="approveCheckoutBtn"
          >
            Approve Payment
          </button>

        </div>

      </div>

    `,

    onMount: ({ modal, close }) => {

      modal
        .querySelector("#declineCheckoutBtn")
        .addEventListener("click", () => {

          close();

          setTimeout(() => {

            window.PAY54_TOAST
              ?.showToast(
                "Checkout declined"
              );

          }, 200);

        });

      modal
        .querySelector("#approveCheckoutBtn")
        .addEventListener("click", () => {

          if(
            availableBalance <
            merchant.amount
          ){

            window.PAY54_TOAST
              ?.showToast(
                "Insufficient balance"
              );

            return;

          }

          window.PAY54_TX
            ?.requestPinVerification(() => {

              const entry =
                ledger.createEntry({

                  type: "checkout",

                  title: "Smart Checkout",

                  icon: "🛍️",

                  currency: merchant.currency,

                  amount: -merchant.amount,

                  meta: {

                    merchant:
                      merchant.name,

                    item:
                      merchant.item,

                    risk:
                      merchant.risk,

                    merchant_id:
                      merchant.merchantId

                  }

                });

              const tx =
                window.PAY54_TX
                ?.processTransaction(

                  entry,

                  {

                    title:
                      merchant.name,

                    source:
                      "checkout",

                    showReceipt: false

                  }

                );

              close();

              setTimeout(() => {

                if(
                  window
                  .PAY54_RECEIPTS
                  ?.openReceiptModal
                ){

                  window
                    .PAY54_RECEIPTS
                    .openReceiptModal({

                      openModal,

                      title:
                        "PAY54 Smart Checkout",

                      tx,

                      lines: [

                        `Merchant: ${merchant.name}`,

                        `Item: ${merchant.item}`,

                        `Amount: ${ledger.moneyFmt(
                          merchant.currency,
                          merchant.amount
                        )}`,

                        `Wallet: ${merchant.currency}`,

                        `Risk Level: ${merchant.risk}`,

                        `Status: APPROVED`

                      ]

                    });

                }

                renderBalance();

                if(
                  window
                  .renderRecentTransactions
                ){
                  window
                    .renderRecentTransactions();
                }

              }, 250);

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

    cards.unshift(payload);

    saveCards(cards);

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

                    createCard({

                      id:
                        "CARD-" +
                        Date.now(),

                      currency,

                      scheme,

                      type:
                        "Virtual",

                      last4:
                        Math.floor(
                          1000 +
                          Math.random() * 9000
                        ),

                      frozen:false,

                      default:false

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

            bodyHTML: `

              <div class="p54-form">

                <input
                  id="bankName"
                  class="p54-input"
                  placeholder="Bank name"
                >

                <input
                  id="last4Digits"
                  class="p54-input"
                  placeholder="Last 4 digits"
                  style="margin-top:12px"
                >

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

                    const bank =
                      modal.querySelector(
                        "#bankName"
                      ).value.trim();

                    const last4 =
                      modal.querySelector(
                        "#last4Digits"
                      ).value.trim();

                    if(!bank || !last4){

                      window.PAY54_TOAST
                        ?.showToast(
                          "Complete all fields"
                        );

                      return;

                    }

                    createCard({

                      id:
                        "LINK-" +
                        Date.now(),

                      currency:"GBP",

                      scheme:"Visa",

                      type:
                        bank,

                      last4,

                      frozen:false,

                      default:false,

                      linked:true

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

  if(!openModal) return;

  const LEDGER =
    window.PAY54_LEDGER;

  const balances =
    LEDGER.getBalances();

  const goals =
    JSON.parse(
      localStorage.getItem(
        "pay54_goals_v3"
      ) || "[]"
    );

  function saveGoals(){

    localStorage.setItem(
      "pay54_goals_v3",
      JSON.stringify(goals)
    );

  }

  function renderGoals(){

    const wrap =
      document.getElementById(
        "p54GoalsGrid"
      );

    if(!wrap) return;

    wrap.innerHTML = "";

    goals.slice(0,3).forEach((goal,index)=>{

      const percent =
        Math.min(
          100,
          Math.round(
            (goal.saved / goal.target) * 100
          )
        );

      const card =
        document.createElement("div");

      card.className =
        "p54-goal-premium";

      card.innerHTML = `

        <div class="p54-goal-head">

          <div class="p54-goal-name">
            ${goal.name}
          </div>

          <div>
            🎯
          </div>

        </div>

        <div
          class="p54-goal-circle"
          style="
            --progress:${percent * 3.6}deg;
          "
        >
          <div class="p54-goal-circle-inner">
            ${percent}%
          </div>
        </div>

        <div class="p54-goal-stat">

          <div>Saved</div>

          <strong>
            ${LEDGER.moneyFmt(
              goal.currency,
              goal.saved
            )}
          </strong>

          <small>
            Target:
            ${LEDGER.moneyFmt(
              goal.currency,
              goal.target
            )}
          </small>

        </div>

        <div class="p54-goal-actions">

          <button
            class="p54-goal-btn primary"
            data-open="${index}"
          >
            Open Goal
          </button>

        </div>

      `;

      wrap.appendChild(card);

    });

    bindGoalButtons();

  }

  function bindGoalButtons(){

    document
      .querySelectorAll("[data-open]")
      .forEach(btn=>{

        btn.onclick = ()=>{

          const index =
            Number(
              btn.dataset.open
            );

          openGoal(index);

        };

      });

  }

  function openGoal(index){

    const goal = goals[index];

    openModal({

      title: goal.name,

      bodyHTML: `

        <div class="p54-goal-detail">

          <div class="p54-goal-balance">

            <div>Saved Amount</div>

            <h2>
              ${LEDGER.moneyFmt(
                goal.currency,
                goal.saved
              )}
            </h2>

            <small>
              Target:
              ${LEDGER.moneyFmt(
                goal.currency,
                goal.target
              )}
            </small>

          </div>

          <div class="p54-goal-actions">

            <button
              class="p54-goal-btn primary"
              id="goalAddMoney"
            >
              Add Money
            </button>

            <button
              class="p54-goal-btn alt"
              id="goalWithdraw"
            >
              Withdraw
            </button>

          </div>

          <div class="p54-goal-auto">

            <div
              style="
                font-weight:800;
                margin-bottom:12px;
              "
            >
              Auto Save Plan
            </div>

            <select
              id="goalFrequency"
              class="p54-input"
            >
              <option value="">
                Select frequency
              </option>

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
              id="goalAutoAmount"
              class="p54-input"
              placeholder="Auto save amount"
              type="number"
              style="margin-top:12px;"
            >

            <button
              class="p54-goal-btn primary"
              id="saveAutoPlan"
              style="
                width:100%;
                margin-top:14px;
              "
            >
              Save Auto Plan
            </button>

          </div>

        </div>

      `,

      onMount:({ modal })=>{

        modal
          .querySelector("#goalAddMoney")
          .onclick = ()=>{

            const amount =
              Number(
                prompt(
                  "Amount to add"
                )
              );

            if(!amount) return;

            if(
              amount >
              balances.NGN
            ){

              PAY54_TOAST.showToast(
                "Insufficient balance"
              );

              return;

            }

            balances.NGN -= amount;

            LEDGER.setBalances(
              balances
            );

            goal.saved += amount;

            saveGoals();

            PAY54_TOAST.showToast(
              "Savings updated"
            );

          };

        modal
          .querySelector("#goalWithdraw")
          .onclick = ()=>{

            const amount =
              Number(
                prompt(
                  "Withdraw amount"
                )
              );

            if(!amount) return;

            if(
              amount >
              goal.saved
            ){

              PAY54_TOAST.showToast(
                "Insufficient goal balance"
              );

              return;

            }

            goal.saved -= amount;

            balances.NGN += amount;

            LEDGER.setBalances(
              balances
            );

            saveGoals();

            PAY54_TOAST.showToast(
              "Withdrawal successful"
            );

          };

        modal
          .querySelector("#saveAutoPlan")
          .onclick = ()=>{

            const frequency =
              modal
                .querySelector(
                  "#goalFrequency"
                )
                .value;

            const amount =
              Number(
                modal
                  .querySelector(
                    "#goalAutoAmount"
                  )
                  .value
              );

            if(
              !frequency ||
              !amount
            ){

              PAY54_TOAST.showToast(
                "Complete all fields"
              );

              return;

            }

            goal.auto_save = {

              enabled:true,
              frequency,
              amount

            };

            saveGoals();

            PAY54_TOAST.showToast(
              "Auto save configured"
            );

          };

      }

    });

  }

  openModal({

    title:"Savings & Goals",

    bodyHTML:`

      <div class="p54-savings-v3">

        <div class="p54-save-summary">

          <small>
            Total Available Balance
          </small>

          <h2>
            ${LEDGER.moneyFmt(
              "NGN",
              balances.NGN || 0
            )}
          </h2>

        </div>

        <div
          class="p54-goals-grid"
          id="p54GoalsGrid"
        ></div>

        <div
          class="p54-create-goal"
          id="openCreateGoal"
        >

          <div
            style="
              font-size:38px;
              margin-bottom:10px;
            "
          >
            ➕
          </div>

          <div
            style="
              font-size:18px;
              font-weight:800;
            "
          >
            Create New Goal
          </div>

        </div>

      </div>

    `,

    onMount:()=>{

      renderGoals();

      document
        .getElementById(
          "openCreateGoal"
        )
        .onclick = ()=>{

          openModal({

            title:"Create Goal",

            bodyHTML:`

              <input
                id="goalName"
                class="p54-input"
                placeholder="Goal name"
              >

              <input
                id="goalTarget"
                class="p54-input"
                placeholder="Target amount"
                type="number"
                style="margin-top:12px;"
              >

              <select
                id="goalCurrency"
                class="p54-input"
                style="margin-top:12px;"
              >
                <option>NGN</option>
                <option>GBP</option>
                <option>USD</option>
                <option>EUR</option>
              </select>

              <button
                id="createGoalBtn"
                class="p54-goal-btn primary"
                style="
                  width:100%;
                  margin-top:18px;
                "
              >
                Create Goal
              </button>

            `,

            onMount:({ modal })=>{

              modal
                .querySelector(
                  "#createGoalBtn"
                )
                .onclick = ()=>{

                  const name =
                    modal
                      .querySelector(
                        "#goalName"
                      )
                      .value
                      .trim();

                  const target =
                    Number(
                      modal
                        .querySelector(
                          "#goalTarget"
                        )
                        .value
                    );

                  const currency =
                    modal
                      .querySelector(
                        "#goalCurrency"
                      )
                      .value;

                  if(
                    !name ||
                    !target
                  ){

                    PAY54_TOAST.showToast(
                      "Complete all fields"
                    );

                    return;

                  }

                  goals.push({

                    name,
                    target,
                    currency,
                    saved:0

                  });

                  saveGoals();

                  PAY54_TOAST.showToast(
                    "Goal created"
                  );

                };

            }

          });

        };

    }

  });

};
