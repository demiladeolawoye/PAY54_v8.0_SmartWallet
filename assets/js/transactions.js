"use strict";

/* ========================================================================
   PAY54 ENTERPRISE EVENT BRIDGE
======================================================================== */

const EVENTS = window.PAY54_EVENTS || null;

/* ========================================================================
   TRANSACTION EVENT CONSTANTS
======================================================================== */

const TX_EVENTS = Object.freeze({

    STARTED:
        "transaction.started",

    COMPLETED:
        "transaction.completed",

    FAILED:
        "transaction.failed",

    REVERSED:
        "transaction.reversed",

    RECEIPT_CREATED:
        "receipt.created"

});

/* ========================================================================
   SAFE EVENT PUBLISHER
======================================================================== */

function publishTransactionEvent(

    eventName,

    payload = {}

){

    try{

        if(

            EVENTS &&

            typeof EVENTS.publish === "function"

        ){

            EVENTS.publish(

                eventName,

                payload,

                {

                    source:"transactions"

                }

            );

        }

    }catch(error){

        console.error(

            "[PAY54_TRANSACTIONS]",

            error

        );

    }

}

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

    const STORAGE =

        window.PAY54_SECURITY?.storage ||

        null;

    const openModal =

        window.PAY54_MODALS?.openModal;

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

          if(

    STORAGE &&

    typeof STORAGE.set === "function"

){

    STORAGE.set(

        "pay54_pin",

        p1

    );

}else{

    localStorage.setItem(

        "pay54_pin",

        p1

    );

}

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

  const STORAGE =

    window.PAY54_SECURITY?.storage ||

    null;

const savedPin =

    (

        STORAGE &&

        typeof STORAGE.get === "function"

    )

        ? STORAGE.get(

            "pay54_pin"

        )

        : localStorage.getItem(

            "pay54_pin"

        );

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
   ENTERPRISE TRANSACTION
   CONTEXT BUILDER
========================= */

function buildTransactionContext(

    entry,

    meta = {}

){

    return {

        ...(entry.meta || {}),

        source:

            meta.source ??

            "wallet",

        walletId:

            meta.walletId ??

            entry.meta?.walletId ??

            "",

        beneficiary:

            meta.beneficiary ??

            entry.meta?.beneficiary ??

            "",

        recipient:

            meta.recipient ??

            entry.meta?.recipient ??

            "",

        reference:

            meta.reference ??

            entry.meta?.reference ??

            entry.id ??

            "",

        provider:

            meta.provider ??

            entry.meta?.provider ??

            "",

        route:

            meta.route ??

            "smart_engine",

        paymentMethod:

            meta.paymentMethod ??

            entry.meta?.paymentMethod ??

            "",

        channel:

            meta.channel ??

            "wallet",

        account_name:

            meta.account_name ??

            entry.meta?.account_name ??

            "",

        account_no:

            meta.account_no ??

            entry.meta?.account_no ??

            "",

        country:

            meta.country ??

            entry.meta?.country ??

            "",

        deviceId:

            meta.deviceId ??

            entry.meta?.deviceId ??

            "",

        ipAddress:

            meta.ipAddress ??

            entry.meta?.ipAddress ??

            "",

        fx_used:

            meta.fx ??

            false,

        fees:

            meta.fees ??

            0

    };

}
/* =========================
   ENTERPRISE TRANSACTION
   VALIDATION PIPELINE
========================= */

function validateTransaction(

    entry

){

    if(

        !entry ||

        typeof entry !== "object"

    ){

        return {

            valid:false,

            message:"Invalid transaction"

        };

    }

    if(

        typeof entry.amount !== "number" ||

        Number.isNaN(entry.amount)

    ){

        return {

            valid:false,

            message:"Invalid transaction amount"

        };

    }

    if(

        entry.amount === 0

    ){

        return {

            valid:false,

            message:"Amount cannot be zero"

        };

    }

    if(

        Math.abs(entry.amount) >

        100000000

    ){

        return {

            valid:false,

            message:"Amount exceeds limit"

        };

    }

    if(

        !entry.currency ||

        typeof entry.currency !== "string"

    ){

        return {

            valid:false,

            message:"Currency is required"

        };

    }

    if(

        !entry.type ||

        typeof entry.type !== "string"

    ){

        return {

            valid:false,

            message:"Transaction type is required"

        };

    }

    return {

        valid:true,

        message:null

    };

}
/* =========================
   ENTERPRISE TRANSACTION
   EXECUTION PIPELINE
========================= */

function executeTransaction(

    ledger,

    entry

){

    if(

        !ledger ||

        typeof ledger.applyEntry !== "function"

    ){

        throw new Error(

            "Ledger unavailable"

        );

    }

    return ledger.applyEntry(

        entry

    );

}
/* =========================
   POLICY RULE
   AMOUNT
========================= */

function checkAmountPolicy(

    entry

){

    if(

        Math.abs(entry.amount) >

        50000000

    ){

        return {

            allowed:false,

            code:"LIMIT_EXCEEDED",

            message:

                "Transaction exceeds PAY54 policy limit"

        };

    }

    return {

        allowed:true

    };

}
/* =========================
   POLICY RULE
   WALLET
========================= */

function checkWalletPolicy(

    meta = {}

){

    if(

        meta.walletLocked === true

    ){

        return {

            allowed:false,

            code:"WALLET_LOCKED",

            message:

                "Wallet is locked"

        };

    }

    return {

        allowed:true

    };

}
/* =========================
   POLICY RULE
   ACCOUNT
========================= */

function checkAccountPolicy(

    meta = {}

){

    if(

        meta.accountStatus ===

        "SUSPENDED"

    ){

        return {

            allowed:false,

            code:"ACCOUNT_SUSPENDED",

            message:

                "Account is suspended"

        };

    }

    return {

        allowed:true

    };

}
/* =========================
   ENTERPRISE TRANSACTION
   POLICY ENGINE
========================= */

function evaluateTransactionPolicy(

    entry,

    meta = {}

){

    if(

        meta.ignorePolicy === true

    ){

        return {

            allowed:true,

            code:"POLICY_BYPASS",

            message:null

        };

    }

    const rules = [

        checkAmountPolicy(

            entry

        ),

        checkWalletPolicy(

            meta

        ),

        checkAccountPolicy(

            meta

        )

    ];

    for(

        const rule of rules

    ){

        if(

            !rule.allowed

        ){

            return rule;

        }

    }

    return {

        allowed:true,

        code:"APPROVED",

        message:null

    };

}
/* =========================
   ENTERPRISE COMPLIANCE
   & RISK PIPELINE
========================= */

function evaluateComplianceAndRisk(

    entry,

    meta = {}

){

    const result = {

        approved: true,

        riskScore: 0,

        amlStatus: "CLEAR",

        sanctionsStatus: "CLEAR",

        reason: null

    };

    if(

        Math.abs(entry.amount) >= 1000000

    ){

        result.riskScore += 25;

    }

    if(

        meta.highRiskCountry === true

    ){

        result.riskScore += 50;

    }

    if(

        meta.manualReview === true

    ){

        result.approved = false;

        result.reason =

            "Transaction requires manual review";

    }

    return result;

}
/* =========================
   ENTERPRISE FRAUD &
   BEHAVIOURAL ENGINE
========================= */

function evaluateFraudAndBehaviour(

    entry,

    meta = {}

){

    const result = {

        approved:true,

        fraudScore:0,

        behaviouralScore:0,

        reason:null

    };

    if(

        meta.newDevice === true

    ){

        result.fraudScore += 25;

    }

    if(

        meta.unusualLocation === true

    ){

        result.fraudScore += 25;

    }

    if(

        meta.highVelocity === true

    ){

        result.behaviouralScore += 40;

    }

    if(

        meta.fraudBlocked === true

    ){

        result.approved = false;

        result.reason =

            "Transaction blocked by fraud engine";

    }

    return result;

}
/* =========================
   ENTERPRISE MONITORING
   & AUDIT PIPELINE
========================= */

function buildAuditRecord(

    entry,

    meta = {}

){

    return {

        auditId:

            crypto?.randomUUID?.() ||

            ("AUD-" + Date.now()),

        timestamp:

            new Date().toISOString(),

        transactionId:

            entry.id || null,

        type:

            entry.type,

        amount:

            entry.amount,

        currency:

            entry.currency,

        source:

            meta.source || "wallet",

        walletId:

            meta.walletId || null,

        userId:

            meta.userId || null,

        deviceId:

            meta.deviceId || null,

        ipAddress:

            meta.ipAddress || null,

        channel:

            meta.channel || "wallet",

        status:

            "PENDING"

    };

}
/* =========================
   ENTERPRISE IDEMPOTENCY
   ENGINE
========================= */

const TX_CACHE =

    new Map();

function checkTransactionIdempotency(

    entry

){

    const key =

        entry.id ||

        `${entry.type}:${entry.currency}:${entry.amount}`;

    if(

        TX_CACHE.has(key)

    ){

        return {

            allowed:false,

            reason:

                "Duplicate transaction detected"

        };

    }

    TX_CACHE.set(

        key,

        Date.now()

    );

    return {

        allowed:true

    };

}
/* =========================
   ENTERPRISE TRANSACTION
   LIFECYCLE MANAGER
========================= */

function updateTransactionLifecycle(

    audit,

    status

){

    audit.status = status;

    audit.updatedAt =

        new Date().toISOString();

    return audit;

}
/* =========================
   ENTERPRISE CORRELATION
   ENGINE
========================= */

function buildCorrelationId(

    entry,

    audit

){

    return (

        audit.auditId +

        ":" +

        (

            entry.id ||

            crypto?.randomUUID?.() ||

            Date.now()

        )

    );

}
/* =========================
   ENTERPRISE TRANSACTION
   LOCK MANAGER
========================= */

const TX_LOCKS =

    new Set();
/* =========================
   ACQUIRE LOCK
========================= */

function acquireTransactionLock(

    entry

){

    const key =

        entry.id ||

        `${entry.type}:${entry.currency}:${entry.amount}`;

    if(

        TX_LOCKS.has(key)

    ){

        return false;

    }

    TX_LOCKS.add(

        key

    );

    return true;

}

/* =========================
   RELEASE LOCK
========================= */

function releaseTransactionLock(

    entry

){

    const key =

        entry.id ||

        `${entry.type}:${entry.currency}:${entry.amount}`;

    TX_LOCKS.delete(

        key

    );

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

const validation =

    validateTransaction(

        entry

    );

if(

    !validation.valid

){

    showToast(

        validation.message

    );

    return null;

}
const policy =

    evaluateTransactionPolicy(

        entry,

        meta

    );

if(

    !policy.allowed

){

    publishTransactionEvent(

        TX_EVENTS.FAILED,

        {

            reason:

                policy.code,

            message:

                policy.message,

            entry:{

                ...entry

            }

        }

    );

    showToast(

        policy.message

    );

    return null;

}
const compliance =

    evaluateComplianceAndRisk(

        entry,

        meta

    );

if(

    !compliance.approved

){

    publishTransactionEvent(

        TX_EVENTS.FAILED,

        {

            reason:

                "COMPLIANCE",

            message:

                compliance.reason,

            riskScore:

                compliance.riskScore,

            entry:{

                ...entry

            }

        }

    );

    showToast(

        compliance.reason

    );

    return null;

}
   const fraud =

    evaluateFraudAndBehaviour(

        entry,

        meta

    );

if(

    !fraud.approved

){

    publishTransactionEvent(

        TX_EVENTS.FAILED,

        {

            reason:

                "FRAUD",

            message:

                fraud.reason,

            fraudScore:

                fraud.fraudScore,

            behaviouralScore:

                fraud.behaviouralScore,

            entry:{

                ...entry

            }

        }

    );

    showToast(

        fraud.reason

    );

    return null;

}
   const audit =

    buildAuditRecord(

        entry,

        meta

    );
   updateTransactionLifecycle(

    audit,

    "VALIDATED"

);
 const correlationId =

    buildCorrelationId(

        entry,

        audit

    );  
   const duplicate =

    checkTransactionIdempotency(

        entry

    );

if(

    !duplicate.allowed

){

    publishTransactionEvent(

        TX_EVENTS.FAILED,

        {

            reason:

                "DUPLICATE",

            message:

                duplicate.reason,

            audit,

            entry:{

                ...entry

            }

        }

    );

    showToast(

        duplicate.reason

    );

    return null;

}
try{
updateTransactionLifecycle(

    audit,

    "PROCESSING"

);
   publishTransactionEvent(

    TX_EVENTS.STARTED,

    {

        audit,

        entry: {

            ...entry

        },

        meta: {

            ...meta

        },

        startedAt:

            new Date().toISOString()

    }

);

entry.meta =

    buildTransactionContext(

        entry,

        meta

    );

const tx =

    executeTransaction(

        ledger,

        entry

    );
   updateTransactionLifecycle(

    audit,

    "COMPLETED"

);

publishTransactionEvent(

    TX_EVENTS.COMPLETED,

    {

        correlationId,

        transaction: {

            ...tx

        },

        completedAt:

            new Date().toISOString()

    }

);

 publishTransactionEvent(

    "transaction.ui.refresh",

    {

        transaction: {

            ...tx

        },

        refreshBalance: true,

        refreshFeed: true,

        refreshCards: true,

        refreshServices: true,

        occurredAt: new Date().toISOString()

    }

);

    if(meta.showReceipt){

        showPaymentReceipt(

            tx,

            meta.title || "Transaction",

            Math.abs(tx.amount),

            tx.currency

        );

        publishTransactionEvent(

            TX_EVENTS.RECEIPT_CREATED,

            {

                transactionId:

                    tx.id,

                currency:

                    tx.currency,

                amount:

                    tx.amount

            }

        );

    }

    return tx;

}catch(err){

    updateTransactionLifecycle(

        audit,

        "FAILED"

    );

 publishTransactionEvent(

    TX_EVENTS.FAILED,

    {

        correlationId,

        audit,

        error:

            err.message,

        entry: {

            ...entry

        }

    }

);

    console.error(

        "🚨 TX FAILED:",

        err

    );

    showToast(

        "Transaction failed"

    );

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
/* =========================================
   GLOBAL FEED EXPORTS
========================================= */

if(typeof renderAlerts === "function"){
  window.renderAlerts = renderAlerts;
}

if(typeof renderNews === "function"){
  window.renderNews = renderNews;
}

if(typeof renderFxTicker === "function"){
  window.renderFxTicker = renderFxTicker;
}

if(typeof renderRecentTransactions === "function"){
  window.renderRecentTransactions = renderRecentTransactions;
}

if(typeof seedDemoAlertsIfEmpty === "function"){
  window.seedDemoAlertsIfEmpty = seedDemoAlertsIfEmpty;
}

console.log("✅ GLOBAL FEED EXPORTS READY");
/* =========================================
   DEMO ALERTS DATA
========================================= */

const PAY54_ALERTS = [

  {
    title: "Security Alert",
    message: "New login detected from London."
  },

  {
    title: "Transfer Update",
    message: "Your FX transfer completed successfully."
  }

];

/* =========================================
   DEMO NEWS DATA
========================================= */

const PAY54_NEWS = [

  {
    title: "PAY54 Expansion",
    summary: "PAY54 expands payment corridors globally."
  },

  {
    title: "FX Markets",
    summary: "GBP strengthens against NGN today."
  }

];

/* =========================================
   RENDER ALERTS
========================================= */

function renderAlerts(){

  const container =
    document.querySelector("#alertsFeed");

  if(!container) return;

  container.innerHTML =
    PAY54_ALERTS.map(alert => `

      <div class="feed-item">

        <div class="feed-title">
          ${alert.title}
        </div>

        <div class="feed-sub">
          ${alert.message}
        </div>

        <button
          class="feed-open-btn"
          onclick="openAlertItem(this)"
        >
          Open
        </button>

      </div>

    `).join("");

}

/* =========================================
   RENDER NEWS
========================================= */

function renderNews(){

  const container =
    document.querySelector("#newsFeed");

  if(!container) return;

  container.innerHTML =
    PAY54_NEWS.map(item => `

      <div class="feed-item">

        <div class="feed-title">
          ${item.title}
        </div>

        <div class="feed-sub">
          ${item.summary}
        </div>

        <button
          class="feed-open-btn"
          onclick="openNewsItem(this)"
        >
          Open
        </button>

      </div>

    `).join("");

}
