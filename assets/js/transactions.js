"use strict";

/* =========================
   PAY54 TRANSACTION ENGINE
========================= */

if(window.PAY54_TX_LOADED){
  console.warn("PAY54 TX already loaded");
}else{
  window.PAY54_TX_LOADED = true;
}

/* =========================
   SAFE LEDGER ACCESS
========================= */

function txLedger(){

  if(
    window.PAY54_LEDGER &&
    typeof window.PAY54_LEDGER.getBalances === "function"
  ){
    return window.PAY54_LEDGER;
  }

  console.warn("⚠️ Ledger unavailable");

  return null;

}

/* =========================
   UNIVERSAL TOAST ACCESS
========================= */

function showToast(message){

  if(
    window.PAY54_TOAST &&
    typeof window.PAY54_TOAST.showToast === "function"
  ){

    window.PAY54_TOAST.showToast(message);

  }else{

    console.warn("Toast engine unavailable");

  }

}
/* =========================
   CREATE PIN
========================= */

function openCreatePinModal(callback){

  const openModal = window.PAY54_MODALS?.openModal;

  if(!openModal){
    console.error("Modal engine missing");
    return;
  }

  openModal({

    title: "Create Transaction PIN",

    bodyHTML: `
      <div class="p54-note">
        Set a secure PIN for PAY54 transactions
      </div>

      <input 
        class="p54-input"
        id="newPin"
        type="password"
        placeholder="Enter PIN"
        maxlength="6"
        style="margin-top:12px"
      >

      <input
        class="p54-input"
        id="confirmPin"
        type="password"
        placeholder="Confirm PIN"
        maxlength="6"
        style="margin-top:10px"
      >

      <div class="p54-actions">
        <button class="p54-btn" id="cancelCreatePin">
          Cancel
        </button>

        <button class="p54-btn primary" id="savePin">
          Save PIN
        </button>
      </div>
    `,

    onMount: ({ modal, close }) => {

      const pin1 = modal.querySelector("#newPin");
      const pin2 = modal.querySelector("#confirmPin");

      modal.querySelector("#cancelCreatePin")
        .addEventListener("click", close);

      modal.querySelector("#savePin")
        .addEventListener("click", ()=>{

          const p1 = pin1.value.trim();
          const p2 = pin2.value.trim();

          if(p1.length < 4){
            showToast("PIN must be at least 4 digits");
            return;
          }

          if(p1 !== p2){
            showToast("PINs do not match");
            return;
          }

          localStorage.setItem("pay54_pin", p1);

          showToast("PIN created successfully");

          close();

          if(callback){
            callback();
          }

        });

    }

  });

}

/* =========================
   PIN VERIFICATION
========================= */

function requestPinVerification(callback){

  const savedPin = localStorage.getItem("pay54_pin");

  if(!savedPin){
    openCreatePinModal(callback);
    return;
  }

  const openModal = window.PAY54_MODALS?.openModal;

  if(!openModal){
    console.error("Modal engine missing");
    return;
  }

  openModal({

    title: "Enter PIN",

    bodyHTML: `
      <div class="p54-note">
        Confirm your transaction PIN
      </div>

      <input
        class="p54-input"
        id="userPin"
        type="password"
        maxlength="6"
        placeholder="••••"
        style="margin-top:12px"
      >

      <div class="p54-actions">
        <button class="p54-btn" id="cancelPin">
          Cancel
        </button>

        <button class="p54-btn primary" id="confirmPin">
          Confirm
        </button>
      </div>
    `,

    onMount: ({ modal, close }) => {

      const input = modal.querySelector("#userPin");

      modal.querySelector("#cancelPin")
        .addEventListener("click", close);

      modal.querySelector("#confirmPin")
        .addEventListener("click", ()=>{

          const entered = input.value.trim();

          if(entered !== savedPin){
            showToast("Incorrect PIN");
            return;
          }

          close();

          if(callback){
            callback();
          }

        });

    }

  });

}

/* =========================
   PAYMENT RECEIPT
========================= */

function showPaymentReceipt(tx, merchant, amount, currency){

  const openModal = window.PAY54_MODALS?.openModal;

  if(!openModal){
    console.error("Modal engine missing");
    return;
  }

  const ledger = txLedger();

  if(!ledger){
    return;
  }

  const receiptId = tx.id || ("P54-" + Date.now());

  openModal({

    title: "Payment Successful",

    bodyHTML: `
      <div style="text-align:center">

        <div class="pay-success-check">✔</div>

        <div style="
          font-size:18px;
          font-weight:900;
          margin-top:8px;
        ">
          Payment Completed
        </div>

        <div class="p54-divider"></div>

        <div class="p54-note"><b>Merchant</b></div>
        <div>${merchant}</div>

        <div class="p54-note" style="margin-top:10px">
          <b>Amount</b>
        </div>

        <div style="
          font-size:18px;
          font-weight:900;
        ">
          ${ledger.moneyFmt(currency, amount)}
        </div>

        <div class="p54-note" style="margin-top:10px">
          <b>Receipt ID</b>
        </div>

        <div>${receiptId}</div>

        <div class="p54-note" style="margin-top:10px">
          ${new Date().toLocaleString()}
        </div>

        <div class="p54-actions" style="margin-top:16px">

          <button class="p54-btn" id="copyBtn">
            Copy
          </button>

          <button class="p54-btn" id="shareBtn">
            WhatsApp
          </button>

          <button class="p54-btn primary" id="doneBtn">
            Close
          </button>

        </div>

      </div>
    `,

    onMount: ({ modal, close }) => {

      const text = `
PAY54 Receipt
Merchant: ${merchant}
Amount: ${ledger.moneyFmt(currency, amount)}
Receipt: ${receiptId}
      `;

      modal.querySelector("#copyBtn")
        .addEventListener("click", ()=>{

          navigator.clipboard.writeText(text);
          showToast("Receipt copied");

        });

      modal.querySelector("#shareBtn")
        .addEventListener("click", ()=>{

          const url = `
https://wa.me/?text=${encodeURIComponent(text)}
          `;

          window.open(url, "_blank");

        });

      modal.querySelector("#doneBtn")
        .addEventListener("click", close);

    }

  });

}

/* =========================
   CORE TRANSACTION PIPELINE
========================= */

function processTransaction(entry, meta = {}){

  const ledger = txLedger();

  if(!ledger){
    showToast("System unavailable");
    return null;
  }

  if(!entry.amount || isNaN(entry.amount)){
    showToast("Invalid transaction");
    return null;
  }

  if(Math.abs(entry.amount) > 100000000){
    showToast("Amount exceeds limit");
    return null;
  }

  try{

    entry.meta = {
      ...(entry.meta || {}),
      source: meta.source || "wallet",
      route: "smart_engine",
      fx_used: meta.fx || false,
      fees: meta.fees || 0
    };

    const tx = ledger.applyEntry(entry);

    if(window.prependTxToDOM){
      window.prependTxToDOM(tx);
    }

    if(window.refreshUI){
      window.refreshUI();
    }

    if(meta.showReceipt){

      showPaymentReceipt(
        tx,
        meta.title || "Transaction",
        Math.abs(tx.amount),
        tx.currency
      );

    }

    return tx;

  }catch(err){

    console.error("🚨 TX FAILED:", err);

    showToast("Transaction failed");

    return null;

  }

}

/* =========================
   GLOBAL EXPORT
========================= */

window.PAY54_TX = {

  processTransaction,
  showPaymentReceipt,
  showToast,
  requestPinVerification,
  openCreatePinModal

};

console.log("✅ PAY54 TRANSACTION ENGINE LOADED");

