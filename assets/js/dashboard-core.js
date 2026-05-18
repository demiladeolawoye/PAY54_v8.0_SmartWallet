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
      Number(balances[active] || 0);

    const balanceEl =
      qs("#totalBalance");

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
        pill.dataset.currency;

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

      /* MONEY MOVES */

      case "send":
        UI.openSend();
        break;

      case "receive":
        UI.openReceive();
        break;

      case "scan":
      case "scanpay":
        UI.openScanAndPay();
        break;

      case "add-money":
      case "addmoney":
        UI.openAddMoney();
        break;

      case "withdraw":
        UI.openWithdraw();
        break;

      case "bank-transfer":
      case "banktransfer":
        UI.openBankTransfer();
        break;

      /* SERVICES */

      case "globaltransfer":
        UI.openGlobalTransfer();
        break;

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

      case "requestmoney":
        UI.openRequestMoney();
        break;

      case "trading":
        UI.openTrading();
        break;

      case "agent":
        UI.openAgent();
        break;

      case "risk":
        UI.openRisk();
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

      return;

    }

    console.log("⏳ Waiting for modules...");

    setTimeout(waitForModules, 150);

  }

  waitForModules();

});
