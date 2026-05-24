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

    const balances = ledger.getBalances();

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

    console.log("✅ BALANCE RENDERED");

  }catch(err){

    console.error("BALANCE RENDER FAILED", err);

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
          class="p54-input"
          placeholder="Enter city or postcode"
        >

        <div class="utility-results">

          <div class="utility-location-card">

            <div class="utility-location-title">
              🏧 Barclays ATM
            </div>

            <div class="utility-location-sub">
              0.4 miles away • Thamesmead
            </div>

          </div>

          <div class="utility-location-card">

            <div class="utility-location-title">
              🏧 HSBC ATM
            </div>

            <div class="utility-location-sub">
              0.8 miles away • Woolwich
            </div>

          </div>

        </div>

      </div>

    `

  });

};

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
          class="p54-input"
          placeholder="Enter city or postcode"
        >

        <div class="utility-results">

          <div class="utility-location-card">

            <div class="utility-location-title">
              📍 PAY54 Agent
            </div>

            <div class="utility-location-sub">
              0.2 miles away • Abbey Wood
            </div>

          </div>

          <div class="utility-location-card">

            <div class="utility-location-title">
              📍 PAY54 POS Merchant
            </div>

            <div class="utility-location-sub">
              1.1 miles away • Greenwich
            </div>

          </div>

        </div>

      </div>

    `

  });

};

