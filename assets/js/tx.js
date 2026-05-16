/* =========================
   PAY54 Transaction Engine
   File: assets/js/tx.js
   Version: v9.0 STABLE
========================= */

(() => {

"use strict";

function getLedger(){

  if(
    window.PAY54_LEDGER &&
    typeof window.PAY54_LEDGER.applyEntry === "function"
  ){
    return window.PAY54_LEDGER;
  }

  return null;
}

/* =========================
   PIN VERIFICATION
========================= */

function requestPinVerification(callback){

  let pin = localStorage.getItem("pay54_pin");

  if(!pin){

    pin = prompt("Create PAY54 PIN");

    if(!pin){
      return;
    }

    localStorage.setItem("pay54_pin", pin);
  }

  const entered = prompt("Enter PAY54 PIN");

  if(entered !== pin){

    alert("Incorrect PIN");

    return;
  }

  if(typeof callback === "function"){
    callback();
  }

}

/* =========================
   SHOW RECEIPT
========================= */

function showPaymentReceipt(tx, title){

  if(
    !window.PAY54_RECEIPTS ||
    !window.PAY54_MODALS
  ){
    console.warn("Receipt engine unavailable");
    return;
  }

  const lines = [

    `Title: ${tx.title}`,
    `Amount: ${tx.currency} ${Math.abs(tx.amount)}`,
    `Type: ${tx.type}`,
    `Status: Successful`

  ];

  window.PAY54_RECEIPTS.openReceiptModal({

    openModal: window.PAY54_MODALS.openModal,

    title: title || tx.title,

    tx,

    lines

  });

}

/* =========================
   UI REFRESH
========================= */

function refreshUI(){

  try{

    if(
      window.PAY54_UI_REFRESH &&
      typeof window.PAY54_UI_REFRESH === "function"
    ){
      window.PAY54_UI_REFRESH();
    }

  }catch(err){
    console.warn("UI refresh failed", err);
  }

}

/* =========================
   CORE TRANSACTION ENGINE
========================= */

function processTransaction(entry, opts = {}){

  const ledger = getLedger();

  if(!ledger){

    alert("Ledger unavailable");

    return null;
  }

  try{

    const tx = ledger.applyEntry(entry);

    refreshUI();

    if(opts.showReceipt){

      showPaymentReceipt(
        tx,
        opts.title || "Transaction"
      );

    }

    return tx;

  }catch(err){

    console.error("TX ENGINE FAILURE:", err);

    alert("Transaction failed");

    return null;
  }

}

/* =========================
   EXPORT
========================= */

window.PAY54_TX = {

  processTransaction,

  requestPinVerification,

  showPaymentReceipt

};

console.log("✅ PAY54_TX READY");

})();
