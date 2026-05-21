/* =========================
   PAY54 v9.0 — Service Registry
   SINGLE SOURCE OF SERVICE ROUTING
========================= */

(() => {

"use strict";

window.PAY54_SERVICES = {

  /* =========================
     MONEY MOVES
  ========================= */

  send: {
    title: "Send",
  handler: () => {
  if(window.PAY54_UI?.openSend){
    window.PAY54_UI.openSend();
  }
}
  },

  receive: {
    title: "Receive",
    handler: () => window.PAY54_UI.openReceive()
  },

  scan_pay: {
    title: "Scan & Pay",
    handler: () => window.PAY54_UI.openScanAndPay()
  },

  add_money: {
    title: "Add Money",
    handler: () => window.PAY54_UI.openAddMoney()
  },

  withdraw: {
    title: "Withdraw",
    handler: () => window.PAY54_UI.openWithdraw()
  },

  bank_transfer: {
    title: "Bank Transfer",
    handler: () => window.PAY54_UI.openBankTransfer()
  },

  /* =========================
     SERVICES
  ========================= */

  fx: {
    title: "PAY54 Global Transfer",
    handler: () => window.PAY54_UI.openGlobalTransfer()
  },

  bills: {
    title: "Bills & Top Up",
    handler: () => window.PAY54_UI.openBills()
  },

  savings: {
    title: "Savings",
    handler: () => window.PAY54_UI.openSavings()
  },

  cards: {
    title: "Cards",
    handler: () => window.PAY54_UI.openCards()
  },

  checkout: {
    title: "Checkout",
    handler: () => window.PAY54_UI.openCheckout()
  },

  shop: {
    title: "Shop & Go",
    handler: () => window.PAY54_UI.openShop()
  },

  merchantqr: {
    title: "Merchant QR",
    handler: () => window.PAY54_UI.openMerchantQR()
  },

  request: {
    title: "Request Money",
    handler: () => window.PAY54_UI.openRequestMoney()
  },

  trading: {
    title: "Trading",
    handler: () => window.PAY54_UI.openTrading()
  },

  agent: {
    title: "Agent",
    handler: () => window.PAY54_UI.openAgent()
  },

  risk: {
    title: "AI Risk Watch",
    handler: () => window.PAY54_UI.openRisk()
  }

};

console.log("✅ PAY54 SERVICES READY");

})();
