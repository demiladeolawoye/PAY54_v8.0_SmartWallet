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
   ENTERPRISE TRANSACTION
   STATES
========================= */

const TX_STATE = Object.freeze({

    CREATED: "CREATED",

    VALIDATED: "VALIDATED",

    PROCESSING: "PROCESSING",

    COMPLETED: "COMPLETED",

    FAILED: "FAILED",

    REVERSED: "REVERSED"

});
/* =========================
   STATE TRANSITIONS
========================= */

const TX_STATE_FLOW = Object.freeze({

    CREATED: [

        TX_STATE.VALIDATED,

        TX_STATE.FAILED

    ],

    VALIDATED: [

        TX_STATE.PROCESSING,

        TX_STATE.FAILED

    ],

    PROCESSING: [

        TX_STATE.COMPLETED,

        TX_STATE.FAILED,

        TX_STATE.REVERSED

    ],

    COMPLETED: [],

    FAILED: [],

    REVERSED: []

});
/* =========================
   SAGA STATES
========================= */

const TX_SAGA_STATE = Object.freeze({

    CREATED: "CREATED",

    RUNNING: "RUNNING",

    COMPLETED: "COMPLETED",

    COMPENSATING: "COMPENSATING",

    COMPENSATED: "COMPENSATED",

    FAILED: "FAILED"

});
/* =========================
   ENTERPRISE PIPELINE
   HOOK REGISTRY
========================= */

const TX_PIPELINE_HOOKS = Object.seal({

    beforeValidation: [],

    beforeExecution: [],

    afterExecution: [],

    onFailure: []

});
/* =========================
   EXECUTE PIPELINE HOOKS
========================= */

function executePipelineHooks(

    stage,

    payload

){

    const hooks =

        TX_PIPELINE_HOOKS[stage] ||

        [];

    for(

        const hook of hooks

    ){

        try{

            hook(payload);

        }

        catch(error){

            console.error(

                "[PIPELINE HOOK]",

                stage,

                error

            );

        }

    }

}
/* =========================
   TRANSACTION MIDDLEWARE
========================= */

const TX_MIDDLEWARE = [];
/* =========================
   REGISTER MIDDLEWARE
========================= */

function registerTransactionMiddleware(

    middleware

){

    if(

        typeof middleware === "function"

    ){

        TX_MIDDLEWARE.push(

            middleware

        );

    }

}
/* =========================
   EXECUTE MIDDLEWARE
========================= */

function executeTransactionMiddleware(

    payload

){

    for(

        const middleware of TX_MIDDLEWARE

    ){

        middleware(

            payload

        );

    }

}
/* =========================
   TRANSACTION INTERCEPTORS
========================= */

const TX_INTERCEPTORS = [];
/* =========================
   REGISTER INTERCEPTOR
========================= */

function registerTransactionInterceptor(

    interceptor

){

    if(

        typeof interceptor === "function"

    ){

        TX_INTERCEPTORS.push(

            interceptor

        );

    }

}
/* =========================
   EXECUTE INTERCEPTORS
========================= */

function executeTransactionInterceptors(

    payload

){

    for(

        const interceptor of TX_INTERCEPTORS

    ){

        interceptor(

            payload

        );

    }

}
/* =========================
   TRANSACTION ORCHESTRATOR
========================= */

function orchestrateTransaction(

    context,

    executor

){

    if(

        typeof executor !== "function"

    ){

        throw new Error(

            "Transaction executor is required"

        );

    }

    return executor(

        context

    );

}
/* =========================
   PIPELINE RESULT
========================= */

function buildPipelineResult(

    success,

    transaction = null,

    error = null

){

    return {

        success,

        transaction,

        error,

        timestamp:

            new Date().toISOString()

    };

}
/* =========================
   TRANSACTION PIPELINE
   REGISTRY
========================= */

const TX_PIPELINE = [];
/* =========================
   SAGA REGISTRY
========================= */

const TX_SAGAS = new Map();
/* =========================
   ENTERPRISE METRICS
========================= */

const TX_METRICS = {

    started: 0,

    completed: 0,

    failed: 0,

    retries: 0,

    compensated: 0,

    totalLatency: 0,

    averageLatency: 0

};
/* =========================
   CIRCUIT BREAKER
========================= */

const TX_CIRCUIT = {

    state: "CLOSED",

    failures: 0,

    threshold: 5,

    openedAt: null,

    timeout: 30000

};
/* =========================
   DEAD LETTER QUEUE
========================= */

const TX_DLQ = [];
/* =========================
   TRANSACTION SCHEDULER
========================= */

const TX_SCHEDULED = [];
/* =========================
   TRANSACTION REGISTRY
========================= */

const TX_REGISTRY = new Map();
/* =========================
   SETTLEMENT REGISTRY
========================= */

const TX_SETTLEMENTS = [];
/* =========================
   SETTLEMENT REGISTRY
========================= */

const TX_SETTLEMENTS = [];
/* =========================
   CLEARING REGISTRY
========================= */

const TX_CLEARING = [];
/* =========================
   RECONCILIATION REGISTRY
========================= */

const TX_RECONCILIATION = [];

/* =========================
   EXCEPTION REGISTRY
========================= */

const TX_EXCEPTIONS = [];
/* =========================
   REPLAY STATES
========================= */

const TX_REPLAY_STATUS = Object.freeze({

    PENDING: "PENDING",

    REPLAYING: "REPLAYING",

    COMPLETED: "COMPLETED",

    FAILED: "FAILED"

});
/* =========================
   SCHEDULE STATES
========================= */

const TX_SCHEDULE_STATE = Object.freeze({

    PENDING: "PENDING",

    RUNNING: "RUNNING",

    COMPLETED: "COMPLETED",

    CANCELLED: "CANCELLED",

    FAILED: "FAILED"

});
/* =========================
   SETTLEMENT STATES
========================= */

const TX_SETTLEMENT_STATE = Object.freeze({

    PENDING:
        "PENDING",

    PROCESSING:
        "PROCESSING",

    SETTLED:
        "SETTLED",

    FAILED:
        "FAILED"

});
/* =========================
   CLEARING STATES
========================= */

const TX_CLEARING_STATE = Object.freeze({

    PENDING:
        "PENDING",

    PROCESSING:
        "PROCESSING",

    CLEARED:
        "CLEARED",

    FAILED:
        "FAILED"

});
/* =========================
   RECONCILIATION STATES
========================= */

const TX_RECONCILIATION_STATE = Object.freeze({

    PENDING:
        "PENDING",

    MATCHED:
        "MATCHED",

    MISMATCH:
        "MISMATCH",

    RESOLVED:
        "RESOLVED"

});
/* =========================
   REGISTER PIPELINE STAGE
========================= */

function registerPipelineStage(

    name,

    handler

){

    if(

        typeof name !== "string" ||

        !name.trim()

    ){

        throw new Error(

            "Pipeline stage name is required"

        );

    }

    if(

        typeof handler !== "function"

    ){

        throw new Error(

            "Pipeline handler must be a function"

        );

    }

    TX_PIPELINE.push({

        name,

        handler

    });

}
/* =========================
   RUN PIPELINE
========================= */

function runTransactionPipeline(

    context

){

    for(

        const stage of TX_PIPELINE

    ){

        stage.handler(

            context

        );

    }

    return context;

}
/* =========================
   CREATE SAGA
========================= */

function createTransactionSaga(

    name

){

    const saga = {

        id:

            crypto?.randomUUID?.() ||

            ("SAGA-" + Date.now()),

        name,

        status:

            TX_SAGA_STATE.CREATED,

        steps: [],

        compensation: []

    };

    TX_SAGAS.set(

        saga.id,

        saga

    );

    return saga;

}
/* =========================
   REGISTER SAGA STEP
========================= */

function registerSagaStep(

    saga,

    execute,

    compensate

){

    saga.steps.push({

        execute,

        compensate

    });

}
/* =========================
   EXECUTE SAGA
========================= */

async function executeSaga(

    saga,

    context

){

    saga.status =

        TX_SAGA_STATE.RUNNING;

    const completed = [];

    try{

        for(

            const step of saga.steps

        ){

            await step.execute(

                context

            );

            completed.push(

                step

            );

        }

        saga.status =

            TX_SAGA_STATE.COMPLETED;

        return true;

    }

    catch(error){

        saga.status =

            TX_SAGA_STATE.COMPENSATING;

        while(

            completed.length

        ){

            const step =

                completed.pop();

            if(

                typeof step.compensate === "function"

            ){

                await step.compensate(

                    context

                );

            }

        }

        saga.status =

            TX_SAGA_STATE.COMPENSATED;
       TX_METRICS.compensated++;

        throw error;

    }

}
/* =========================
   GET SAGA
========================= */

function getTransactionSaga(

    id

){

    return TX_SAGAS.get(

        id

    ) || null;

}
/* =========================
   GET METRICS
========================= */

function getTransactionMetrics(){

    return {

        ...TX_METRICS

    };

}
/* =========================
   TRANSACTION HEALTH
========================= */

function getTransactionHealth(){

    const successRate =

        TX_METRICS.started === 0

            ? 100

            : (

                (TX_METRICS.completed /

                 TX_METRICS.started) * 100

            );

    return {

    status:

        successRate >= 95

            ? "HEALTHY"

            : successRate >= 80

                ? "DEGRADED"

                : "CRITICAL",

    successRate,

    metrics:

        getTransactionMetrics(),

    circuitState:

        TX_CIRCUIT.state,

    circuitFailures:

        TX_CIRCUIT.failures,
       
   deadLetterQueue:

    TX_DLQ.length,
   pendingReplay:

    TX_DLQ.filter(

        item =>

            item.status ===

            TX_REPLAY_STATUS.PENDING

    ).length,
       scheduledTransactions:

    TX_SCHEDULED.length,

       registeredTransactions:

    TX_REGISTRY.size,

       transactionRegistryHealthy:

    TX_REGISTRY.size >= 0,
       analyticsReady:

    true,
       reportingReady:

    true,
       pendingSettlements:

    TX_SETTLEMENTS.length,
       
      pendingClearing:

    TX_CLEARING.length,
       clearedTransactions:

    TX_CLEARING.filter(

        clearing =>

            clearing.status ===

            TX_CLEARING_STATE.CLEARED

    ).length,
       pendingReconciliation:

    TX_RECONCILIATION.length,

       matchedReconciliations:

    TX_RECONCILIATION.filter(

        reconciliation =>

            reconciliation.status ===

            TX_RECONCILIATION_STATE.MATCHED

    ).length,
       pendingSettlements:

    TX_SETTLEMENTS.length,

       settledTransactions:

    TX_SETTLEMENTS.filter(

        settlement =>

            settlement.status ===

            TX_SETTLEMENT_STATE.SETTLED

    ).length,

    activeLocks:

        TX_LOCKS.size,

    activeSagas:

        TX_SAGAS.size,

    installedPlugins:

        TX_PLUGINS.length,

    pipelineStages:

        TX_PIPELINE.length,

    middleware:

        TX_MIDDLEWARE.length,

    interceptors:

        TX_INTERCEPTORS.length

};
}
/* =========================
   RESET METRICS
========================= */

function resetTransactionMetrics(){

    Object.assign(

        TX_METRICS,

        {

            started:0,

            completed:0,

            failed:0,

            retries:0,

            compensated:0,

            totalLatency:0,

            averageLatency:0

        }

    );

}
/* =========================
   CIRCUIT STATUS
========================= */

function isTransactionEngineAvailable(){

    if(

        TX_CIRCUIT.state === "CLOSED"

    ){

        return true;

    }

    if(

        Date.now() -

        TX_CIRCUIT.openedAt >=

        TX_CIRCUIT.timeout

    ){

        TX_CIRCUIT.state = "HALF_OPEN";

        return true;

    }

    return false;

}
/* =========================
   CIRCUIT SUCCESS
========================= */

function recordTransactionSuccess(){

    TX_CIRCUIT.failures = 0;

    TX_CIRCUIT.state = "CLOSED";

    TX_CIRCUIT.openedAt = null;

}
/* =========================
   CIRCUIT FAILURE
========================= */

function recordTransactionFailure(){

    TX_CIRCUIT.failures++;

    if(

        TX_CIRCUIT.failures >=

        TX_CIRCUIT.threshold

    ){

        TX_CIRCUIT.state = "OPEN";

        TX_CIRCUIT.openedAt = Date.now();

    }

}
/* =========================
   DEAD LETTER QUEUE
========================= */

function enqueueFailedTransaction(

    entry,

    meta,

    audit,

    error

){

    TX_DLQ.push({

        id:

            crypto?.randomUUID?.() ||

            ("DLQ-" + Date.now()),

        timestamp:

            new Date().toISOString(),
       status:

    TX_REPLAY_STATUS.PENDING,

replayAttempts:

    0,

        entry:

            structuredClone(entry),

        meta:

            structuredClone(meta),

        audit:

            structuredClone(audit),

        error:

            error?.message ||

            String(error)

    });

}
/* =========================
   DLQ SIZE
========================= */

function getDeadLetterQueueSize(){

    return TX_DLQ.length;

}
/* =========================
   GET DEAD LETTER QUEUE
========================= */

function getDeadLetterQueue(){

    return [

        ...TX_DLQ

    ];

}
/* =========================
   REPLAY FAILED TRANSACTION
========================= */

async function replayFailedTransaction(

    id

){

    const item =

        TX_DLQ.find(

            record => record.id === id

        );

    if(!item){

        return false;

    }

    item.status =

        TX_REPLAY_STATUS.REPLAYING;

    item.replayAttempts++;

    try{

        const result =

            await processTransaction(

                structuredClone(item.entry),

                structuredClone(item.meta)

            );

        item.status =

            result

                ? TX_REPLAY_STATUS.COMPLETED

                : TX_REPLAY_STATUS.FAILED;

        return !!result;

    }

    catch{

        item.status =

            TX_REPLAY_STATUS.FAILED;

        return false;

    }

}
/* =========================
   REPLAY ALL
========================= */

async function replayAllFailedTransactions(){

    for(

        const item of TX_DLQ

    ){

        if(

            item.status ===

            TX_REPLAY_STATUS.PENDING

        ){

            await replayFailedTransaction(

                item.id

            );

        }

    }

}
/* =========================
   SCHEDULE TRANSACTION
========================= */

function scheduleTransaction(

    entry,

    meta,

    executeAt

){

    const schedule = {

        id:

            crypto?.randomUUID?.() ||

            ("SCH-" + Date.now()),

        entry:

            structuredClone(entry),

        meta:

            structuredClone(meta),

        executeAt,

        status:

            TX_SCHEDULE_STATE.PENDING,

        createdAt:

            new Date().toISOString()

    };

    TX_SCHEDULED.push(schedule);

    return schedule;

}
/* =========================
   RUN SCHEDULES
========================= */

async function runScheduledTransactions(){

    const now = Date.now();

    for(const schedule of TX_SCHEDULED){

        if(
            schedule.status !==
            TX_SCHEDULE_STATE.PENDING
        ){
            continue;
        }

        if(
            new Date(
                schedule.executeAt
            ).getTime() > now
        ){
            continue;
        }

        schedule.status =
            TX_SCHEDULE_STATE.RUNNING;

        try{

            const result =
                await processTransaction(
                    structuredClone(schedule.entry),
                    structuredClone(schedule.meta)
                );

            schedule.status =
                result
                    ? TX_SCHEDULE_STATE.COMPLETED
                    : TX_SCHEDULE_STATE.FAILED;

        }catch{

            schedule.status =
                TX_SCHEDULE_STATE.FAILED;

        }

    }

}
/* =========================
   GET SCHEDULES
========================= */

function getScheduledTransactions(){

    return [

        ...TX_SCHEDULED

    ];

}
/* =========================
   REGISTER TRANSACTION
========================= */

function registerProcessedTransaction(

    transaction

){

    if(

        transaction?.id

    ){

        TX_REGISTRY.set(

            transaction.id,

            structuredClone(transaction)

        );

    }

}
/* =========================
   GET TRANSACTION
========================= */

function getProcessedTransaction(

    id

){

    return TX_REGISTRY.get(

        id

    ) || null;

}
/* =========================
   GET ALL TRANSACTIONS
========================= */

function getProcessedTransactions(){

    return [

        ...TX_REGISTRY.values()

    ];

}
/* =========================
   FIND TRANSACTIONS BY TYPE
========================= */

function findTransactionsByType(

    type

){

    return getProcessedTransactions()

        .filter(

            transaction =>

                transaction.type === type

        );

}
/* =========================
   FIND TRANSACTIONS BY CURRENCY
========================= */

function findTransactionsByCurrency(

    currency

){

    return getProcessedTransactions()

        .filter(

            transaction =>

                transaction.currency === currency

        );

}
/* =========================
   FIND TRANSACTIONS BY STATUS
========================= */

function findTransactionsByStatus(

    status

){

    return getProcessedTransactions()

        .filter(

            transaction =>

                transaction.status === status

        );

}
/* =========================
   SEARCH TRANSACTIONS
========================= */

function searchTransactions(

    predicate

){

    if(

        typeof predicate !== "function"

    ){

        return [];

    }

    return getProcessedTransactions()

        .filter(

            predicate

        );

}
/* =========================
   TRANSACTION ANALYTICS
========================= */

function getTransactionAnalytics(){

    const transactions =

        getProcessedTransactions();

    const totalVolume =

        transactions.reduce(

            (sum, tx) =>

                sum + Math.abs(tx.amount || 0),

            0

        );

    return {

        totalTransactions:

            transactions.length,

        totalVolume,

        averageAmount:

            transactions.length

                ? totalVolume /

                  transactions.length

                : 0

    };

}
/* =========================
   VOLUME BY CURRENCY
========================= */

function getTransactionVolumeByCurrency(){

    const totals = {};

    for(

        const tx of

        getProcessedTransactions()

    ){

        totals[tx.currency] =

            (totals[tx.currency] || 0) +

            Math.abs(tx.amount || 0);

    }

    return totals;

}
/* =========================
   COUNT BY TYPE
========================= */

function getTransactionCountByType(){

    const counts = {};

    for(

        const tx of

        getProcessedTransactions()

    ){

        counts[tx.type] =

            (counts[tx.type] || 0) + 1;

    }

    return counts;

}
/* =========================
   TRANSACTION REPORT
========================= */

function generateTransactionReport(){

    return {

        generatedAt:

            new Date().toISOString(),

        analytics:

            getTransactionAnalytics(),

        volumeByCurrency:

            getTransactionVolumeByCurrency(),

        countByType:

            getTransactionCountByType(),

        health:

            getTransactionHealth()

    };

}
/* =========================
   REGISTRY SNAPSHOT
========================= */

function exportTransactionRegistry(){

    return structuredClone(

        getProcessedTransactions()

    );

}
/* =========================
   CREATE SETTLEMENT
========================= */

function createSettlement(transaction){

    const settlement = {

        id:

            crypto?.randomUUID?.() ||

            ("SET-" + Date.now()),

        transactionId:

            transaction.id,

        currency:

            transaction.currency,

        amount:

            transaction.amount,

        status:

            TX_SETTLEMENT_STATE.PENDING,

        createdAt:

            new Date().toISOString()

    };

    TX_SETTLEMENTS.push(settlement);

    return settlement;

}
/* =========================
   GET SETTLEMENTS
========================= */

function getSettlements(){

    return [

        ...TX_SETTLEMENTS

    ];

}
/* =========================
   PROCESS SETTLEMENT
========================= */

function processSettlement(settlementId){

    const settlement =

        TX_SETTLEMENTS.find(

            item => item.id === settlementId

        );

    if(!settlement){

        return null;

    }

    settlement.status =

        TX_SETTLEMENT_STATE.PROCESSING;

    settlement.processedAt =

        new Date().toISOString();

    settlement.status =

        TX_SETTLEMENT_STATE.SETTLED;

    settlement.settledAt =

        new Date().toISOString();

    return settlement;

}
/* =========================
   PROCESS ALL SETTLEMENTS
========================= */

function processPendingSettlements(){

    const processed = [];

    for(

        const settlement of TX_SETTLEMENTS

    ){

        if(

            settlement.status !==

            TX_SETTLEMENT_STATE.PENDING

        ){

            continue;

        }

        processed.push(

            processSettlement(

                settlement.id

            )

        );

    }

    return processed;

}
/* =========================
   CREATE CLEARING RECORD
========================= */

function createClearingRecord(transaction){

    const clearing = {

        id:

            crypto?.randomUUID?.() ||

            ("CLR-" + Date.now()),

        transactionId:

            transaction.id,

        currency:

            transaction.currency,

        amount:

            transaction.amount,

        status:

            TX_CLEARING_STATE.PENDING,

        createdAt:

            new Date().toISOString()

    };

    TX_CLEARING.push(clearing);

    return clearing;

}
/* =========================
   GET CLEARING RECORDS
========================= */

function getClearingRecords(){

    return [

        ...TX_CLEARING

    ];

}
/* =========================
   PROCESS CLEARING
========================= */

function processClearingRecord(clearingId){

    const clearing =

        TX_CLEARING.find(

            item => item.id === clearingId

        );

    if(!clearing){

        return null;

    }

    clearing.status =

        TX_CLEARING_STATE.PROCESSING;

    clearing.processingStartedAt =

        new Date().toISOString();

    clearing.status =

        TX_CLEARING_STATE.CLEARED;

    clearing.clearedAt =

        new Date().toISOString();

    return clearing;

}
/* =========================
   PROCESS ALL CLEARING
========================= */

function processPendingClearing(){

    const processed = [];

    for(

        const clearing of TX_CLEARING

    ){

        if(

            clearing.status !==

            TX_CLEARING_STATE.PENDING

        ){

            continue;

        }

        processed.push(

            processClearingRecord(

                clearing.id

            )

        );

    }

    return processed;

}
/* =========================
   CREATE RECONCILIATION
========================= */

function createReconciliationRecord(transaction){

    const reconciliation = {

        id:

            crypto?.randomUUID?.() ||

            ("REC-" + Date.now()),

        transactionId:

            transaction.id,

        currency:

            transaction.currency,

        amount:

            transaction.amount,

        status:

            TX_RECONCILIATION_STATE.PENDING,

        createdAt:

            new Date().toISOString()

    };

    TX_RECONCILIATION.push(reconciliation);

    return reconciliation;

}
/* =========================
   GET RECONCILIATION
========================= */

function getReconciliationRecords(){

    return [

        ...TX_RECONCILIATION

    ];

}
/* =========================
   PROCESS RECONCILIATION
========================= */

function processReconciliationRecord(reconciliationId){

    const reconciliation =

        TX_RECONCILIATION.find(

            item => item.id === reconciliationId

        );

    if(!reconciliation){

        return null;

    }

    reconciliation.status =

        TX_RECONCILIATION_STATE.MATCHED;

    reconciliation.processedAt =

        new Date().toISOString();

    return reconciliation;

}
/* =========================
   PROCESS ALL RECONCILIATIONS
========================= */

function processPendingReconciliations(){

    const processed = [];

    for(

        const reconciliation of TX_RECONCILIATION

    ){

        if(

            reconciliation.status !==

            TX_RECONCILIATION_STATE.PENDING

        ){

            continue;

        }

        processed.push(

            processReconciliationRecord(

                reconciliation.id

            )

        );

    }

    return processed;

}
/* =========================
   PLUGIN REGISTRY
========================= */

const TX_PLUGINS = [];
/* =========================
   PLUGIN STATUS
========================= */

const TX_PLUGIN_STATUS = Object.freeze({

    ENABLED: "ENABLED",

    DISABLED: "DISABLED"

});
/* =========================
   REGISTER PLUGIN
========================= */

function registerTransactionPlugin(

    plugin

){

    if(

        !plugin ||

        typeof plugin !== "object"

    ){

        throw new Error(

            "Invalid transaction plugin"

        );

    }

    if(

        !plugin.name

    ){

        throw new Error(

            "Plugin name is required"

        );

    }

  TX_PLUGINS.push({

    ...plugin,

    version:

        plugin.version ??

        "1.0.0",

    status:

        TX_PLUGIN_STATUS.ENABLED,

    installedAt:

        new Date().toISOString()

});

}
/* =========================
   INSTALL PLUGIN
========================= */

function installTransactionPlugin(

    plugin

){

    registerTransactionPlugin(

        plugin

    );

    if(

        Array.isArray(

            plugin.pipelineStages

        )

    ){

        for(

            const stage of plugin.pipelineStages

        ){

            registerPipelineStage(

                stage.name,

                stage.handler

            );

        }

    }

    if(

        Array.isArray(

            plugin.middleware

        )

    ){

        for(

            const middleware of plugin.middleware

        ){

            registerTransactionMiddleware(

                middleware

            );

        }

    }

    if(

        Array.isArray(

            plugin.interceptors

        )

    ){

        for(

            const interceptor of plugin.interceptors

        ){

            registerTransactionInterceptor(

                interceptor

            );

        }

    }

    if(

        plugin.hooks

    ){

        for(

            const [

                stage,

                handlers

            ]

            of

            Object.entries(

                plugin.hooks

            )

        ){

            if(

                !TX_PIPELINE_HOOKS[stage]

            ){

                continue;

            }

            for(

                const handler of handlers

            ){

                TX_PIPELINE_HOOKS[stage]

                .push(

                    handler

                );

            }

        }

    }

    return plugin;

}
/* =========================
   GET PLUGINS
========================= */

function getInstalledPlugins(){

    return [

        ...TX_PLUGINS

    ];

}
/* =========================
   FIND PLUGIN
========================= */

function findTransactionPlugin(

    name

){

    return TX_PLUGINS.find(

        plugin =>

            plugin.name === name

    ) || null;

}
/* =========================
   ENABLE PLUGIN
========================= */

function enableTransactionPlugin(

    name

){

    const plugin =

        findTransactionPlugin(

            name

        );

    if(

        !plugin

    ){

        return false;

    }

    plugin.status =

        TX_PLUGIN_STATUS.ENABLED;

    return true;

}
/* =========================
   DISABLE PLUGIN
========================= */

function disableTransactionPlugin(

    name

){

    const plugin =

        findTransactionPlugin(

            name

        );

    if(

        !plugin

    ){

        return false;

    }

    plugin.status =

        TX_PLUGIN_STATUS.DISABLED;

    return true;

}
/* =========================
   PLUGIN HEALTH
========================= */

function getPluginHealth(){

    return TX_PLUGINS.map(

        plugin => ({

            name:

                plugin.name,

            version:

                plugin.version,

            status:

                plugin.status,

            installedAt:

                plugin.installedAt

        })

    );

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

    TX_STATE.CREATED

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

    const current =

        audit.status ||

        TX_STATE.CREATED;

    const allowed =

        TX_STATE_FLOW[current] ||

        [];

    if(

        !allowed.includes(status)

    ){

        throw new Error(

            `Invalid transaction state transition: ${current} -> ${status}`

        );

    }

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
   TRANSACTION RETRY
   CONFIGURATION
========================= */

const TX_RETRY_CONFIG = Object.freeze({

    maxAttempts: 3,

    retryDelay: 500

});
/* =========================
   SHOULD RETRY
========================= */

function shouldRetryTransaction(

    error,

    attempt

){

    if(

        attempt >= TX_RETRY_CONFIG.maxAttempts

    ){

        return false;

    }

    if(

        !error

    ){

        return false;

    }

    return true;

}
/* =========================
   RETRY DELAY
========================= */

function waitForRetry(

    milliseconds

){

    return new Promise(

        resolve =>

            setTimeout(

                resolve,

                milliseconds

            )

    );

}
/* =========================
   RETRY EXECUTOR
========================= */

async function executeWithRetry(

    executor

){

    let attempt = 0;

    while(true){

        try{

            return await executor();

        }

        catch(error){

            attempt++;
           TX_METRICS.retries++;

            if(

                !shouldRetryTransaction(

                    error,

                    attempt

                )

            ){

                throw error;

            }

            await waitForRetry(

                TX_RETRY_CONFIG.retryDelay

            );

        }

    }

}
/* =========================
   RECOVERY EVENT
========================= */

function publishRecoveryEvent(

    payload

){

    publishTransactionEvent(

        "transaction.recovery",

        payload

    );

}
/* =========================
   SAGA EVENT
========================= */

function publishSagaEvent(

    event,

    payload

){

    publishTransactionEvent(

        `transaction.saga.${event}`,

        payload

    );

}
/* =========================
   HEALTH EVENT
========================= */

function publishHealthEvent(){

    publishTransactionEvent(

        "transaction.health",

        getTransactionHealth()

    );

}

/* =========================
   CORE TRANSACTION PIPELINE
========================= */

async function processTransaction(entry, meta = {}){

  const ledger = txLedger();
if(

    !isTransactionEngineAvailable()

){

    showToast(

        "Transaction engine temporarily unavailable"

    );

    return null;

}
const transactionStart = performance.now();

TX_METRICS.started++;
  if(!ledger){
    showToast("System unavailable");
    return null;
  }
executePipelineHooks(

    "beforeValidation",

    {

        entry,

        meta

    }

);
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
   executeTransactionMiddleware(

    {

        entry,

        meta,

        audit

    }

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
   const pipelineContext = {

    entry,

    meta,

    audit,

    correlationId,

    ledger

};
  runTransactionPipeline(

    pipelineContext

); 
   if(

    !acquireTransactionLock(

        entry

    )

){

    showToast(

        "Transaction already in progress"

    );

    return null;

}
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
releaseTransactionLock(

    entry

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

        correlationId,

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
executePipelineHooks(

    "beforeExecution",

    {

        entry,

        meta,

        audit,

        correlationId

    }

);
   executeTransactionInterceptors(

    {

        entry,

        meta,

        audit,

        correlationId

    }

);
   
const tx =

    await executeWithRetry(

        ()=>

            orchestrateTransaction(

                pipelineContext,

                ()=>

                    executeTransaction(

                        ledger,

                        entry

                    )

            )

    );
   executePipelineHooks(

    "afterExecution",

    {

        transaction: tx,

        audit,

        correlationId

    }

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
releaseTransactionLock(

    entry

);
   const duration =

    performance.now() -

    transactionStart;

TX_METRICS.completed++;

TX_METRICS.totalLatency += duration;

TX_METRICS.averageLatency =

    TX_METRICS.totalLatency /

    TX_METRICS.completed;
   publishHealthEvent();
   recordTransactionSuccess();
   registerProcessedTransaction(

    tx

);
  createSettlement(

    tx

); 
   createClearingRecord(
    tx
);
   createReconciliationRecord(
    tx
);
   createSettlement(

    tx

);
    return tx;

}catch(err){

    updateTransactionLifecycle(

        audit,

        "FAILED"

    );
executePipelineHooks(

    "onFailure",

    {

        error: err,

        audit,

        correlationId,

        entry

    }

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
   TX_METRICS.failed++;
   recordTransactionFailure();
   enqueueFailedTransaction(

    entry,

    meta,

    audit,

    err

);
releaseTransactionLock(

    entry

);
   publishHealthEvent();
    return null;

}

}

/* =========================
   GLOBAL EXPORT
========================= */

window.PAY54_TX = {

    processTransaction,

    orchestrateTransaction,

    createTransactionSaga,

    registerSagaStep,

    executeSaga,

    getTransactionSaga,

   getTransactionMetrics,

   getTransactionHealth,

   isTransactionEngineAvailable,

   resetTransactionMetrics,
   
   getDeadLetterQueue,

    getDeadLetterQueueSize,

   replayFailedTransaction,

   replayAllFailedTransactions,

   scheduleTransaction,

   runScheduledTransactions,

   getScheduledTransactions,

   registerProcessedTransaction,

getProcessedTransaction,

getProcessedTransactions,
   
findTransactionsByType,

findTransactionsByCurrency,

findTransactionsByStatus,

searchTransactions,

   getTransactionAnalytics,

getTransactionVolumeByCurrency,

getTransactionCountByType,

   generateTransactionReport,

exportTransactionRegistry,

   createSettlement,

getSettlements,
   
   createClearingRecord,

getClearingRecords,

   processClearingRecord,

processPendingClearing,

   createReconciliationRecord,

getReconciliationRecords,

   processReconciliationRecord,

processPendingReconciliations,
   
   createSettlement,

getSettlements,

   processSettlement,

processPendingSettlements,
   
    registerPipelineStage,

    registerTransactionMiddleware,

    registerTransactionInterceptor,

    registerTransactionPlugin,

    installTransactionPlugin,

    getInstalledPlugins,

    findTransactionPlugin,

    enableTransactionPlugin,

    disableTransactionPlugin,

    getPluginHealth,

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
