/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File: assets/js/security/transaction-guard.js
   Version: v11.0.0
   Module: WP-003F Enterprise Transaction Guard
   ------------------------------------------------------------------------
   Responsibilities

   • Enterprise transaction authorization
   • Session verification
   • Transaction validation pipeline
   • Duplicate detection hooks
   • Velocity protection
   • Risk integration
   • Fraud prevention hooks
   • AML integration hooks
   • Event Bus integration
======================================================================== */

(() => {

"use strict";

/* ========================================================================
   DEPENDENCIES
======================================================================== */

const EVENTS =
window.PAY54_EVENTS || null;

const SESSION =
window.PAY54_SECURITY?.session || null;

const SESSION_MANAGER =
window.PAY54_SECURITY?.session || null;

const VALIDATOR =
window.PAY54_SECURITY?.validator || null;

const SANITIZER =
window.PAY54_SECURITY?.sanitizer || null;

/* ========================================================================
   VERSION
======================================================================== */

const VERSION =
"11.0.0";

const TRANSACTION_AUDIT_KEY =
"transaction_audit";

/* ========================================================================
   TRANSACTION EVENTS
======================================================================== */

const GUARD_EVENTS =
Object.freeze({

    APPROVED:
        "guard.approved",

    REJECTED:
        "guard.rejected",

    WARNING:
        "guard.warning",

    DUPLICATE:
        "guard.duplicate",

    LIMIT:
        "guard.limit",

    FRAUD:
        "guard.fraud"

});

/* ========================================================================
   EVENT PUBLISHER
======================================================================== */

function publish(

    event,

    payload = {}

){

    try{

        if(

            EVENTS &&

            typeof EVENTS.publish === "function"

        ){

            EVENTS.publish(

                event,

                payload,

                {

                    source:

                    "transaction-guard"

                }

            );

        }

    }

    catch(error){

        console.error(

            "[PAY54_GUARD]",

            error

        );

    }

}
/* ========================================================================
   TRANSACTION AUDIT
======================================================================== */

function getTransactionAudit(){

    return STORAGE?.get(

        TRANSACTION_AUDIT_KEY,

        []

    ) || [];

}

function saveTransactionAudit(

    audit

){

    STORAGE?.set(

        TRANSACTION_AUDIT_KEY,

        audit

    );

}

function recordTransactionAudit(

    action,

    details = {}

){

    const audit =

        getTransactionAudit();

    audit.push({

        id:

            uuid(),

        action,

        timestamp:

            new Date()

                .toISOString(),

        details

    });

    saveTransactionAudit(

        audit

    );

}
/* ========================================================================
   DEFAULT POLICY
======================================================================== */

const DEFAULT_POLICY =
Object.freeze({

    enabled: true,

    requireSession: true,

    validateAmounts: true,

    validateWallets: true,

    validateCurrency: true,

    duplicateProtection: true,

    velocityProtection: true,

    riskChecks: true,

    auditEvents: true

});

/* ========================================================================
   UTILITIES
======================================================================== */

function now(){

    return Date.now();

}

function uuid(){

    if(

        crypto?.randomUUID

    ){

        return crypto.randomUUID();

    }

    return (

        "txn-" +

        now() +

        "-" +

        Math.random()

            .toString(36)

            .slice(2)

    );

}

function clone(

    value

){

    if(

        typeof structuredClone === "function"

    ){

        return structuredClone(

            value

        );

    }

    return JSON.parse(

        JSON.stringify(

            value

        )

    );

}

/* ========================================================================
   GUARD RESULT
======================================================================== */

function createResult(

    approved,

    reason = null,

    warnings = []

){

    return {

        approved,

        reason,

        warnings,

        reference:

            uuid(),

        timestamp:

            new Date()

            .toISOString()

    };

}

/* ========================================================================
   TRANSACTION CONTEXT
======================================================================== */

function createContext(

    transaction = {}

){

    const context =

        clone(

            transaction

        );

    context.reference ||=

        uuid();

    context.createdAt ||=

        new Date()

        .toISOString();

    context.guardVersion =

        VERSION;

    return context;

}
 /* ========================================================================
   SESSION VALIDATION
======================================================================== */

function validateSession(){

    if(

        !DEFAULT_POLICY.requireSession

    ){

        return createResult(

            true

        );

    }

    if(

        !SESSION ||

        typeof SESSION.isAuthenticated !== "function"

    ){

        publish(

            GUARD_EVENTS.WARNING,

            {

                stage:

                    "session"

            }

        );

        return createResult(

            false,

            "SESSION_ENGINE_UNAVAILABLE"

        );

    }

    if(

        !SESSION.isAuthenticated()

    ){

        publish(

            GUARD_EVENTS.REJECTED,

            {

                stage:

                    "session"

            }

        );

        return createResult(

            false,

            "SESSION_REQUIRED"

        );

    }

    return createResult(

        true

    );

}

/* ========================================================================
   WALLET VALIDATION
======================================================================== */

function validateWallet(

    walletId

){

    if(

        !DEFAULT_POLICY.validateWallets

    ){

        return createResult(

            true

        );

    }

    if(

        !VALIDATOR ||

        typeof VALIDATOR.walletId !== "function"

    ){

        return createResult(

            false,

            "VALIDATOR_UNAVAILABLE"

        );

    }

    const validation =

        VALIDATOR.walletId(

            walletId

        );

    if(

        !validation.valid

    ){

        publish(

            GUARD_EVENTS.REJECTED,

            {

                stage:

                    "wallet"

            }

        );

        return createResult(

            false,

            "INVALID_WALLET"

        );

    }

    return createResult(

        true

    );

}

/* ========================================================================
   AMOUNT VALIDATION
======================================================================== */

function validateAmount(

    amount

){

    if(

        !DEFAULT_POLICY.validateAmounts

    ){

        return createResult(

            true

        );

    }

    if(

        !VALIDATOR ||

        typeof VALIDATOR.amount !== "function"

    ){

        return createResult(

            false,

            "VALIDATOR_UNAVAILABLE"

        );

    }

    const validation =

        VALIDATOR.amount(

            amount

        );

    if(

        !validation.valid

    ){

        publish(

            GUARD_EVENTS.REJECTED,

            {

                stage:

                    "amount"

            }

        );

        return createResult(

            false,

            "INVALID_AMOUNT"

        );

    }

    return createResult(

        true

    );

}

/* ========================================================================
   CURRENCY VALIDATION
======================================================================== */

function validateCurrency(

    currency

){

    if(

        !DEFAULT_POLICY.validateCurrency

    ){

        return createResult(

            true

        );

    }

    if(

        !VALIDATOR ||

        typeof VALIDATOR.currency !== "function"

    ){

        return createResult(

            false,

            "VALIDATOR_UNAVAILABLE"

        );

    }

    const validation =

        VALIDATOR.currency(

            currency

        );

    if(

        !validation.valid

    ){

        publish(

            GUARD_EVENTS.REJECTED,

            {

                stage:

                    "currency"

            }

        );

        return createResult(

            false,

            "INVALID_CURRENCY"

        );

    }

    return createResult(

        true

    );

}

/* ========================================================================
   PAYLOAD SANITIZATION
======================================================================== */

function sanitizeTransaction(

    transaction

){

    if(

        !SANITIZER ||

        typeof SANITIZER.payload !== "function"

    ){

        return clone(

            transaction

        );

    }

    return SANITIZER

        .payload(

            transaction

        )

        .value;

}

/* ========================================================================
   INITIAL AUTHORIZATION
======================================================================== */

function authorize(

    transaction

){

    const context =

        createContext(

            sanitizeTransaction(

                transaction

            )

        );

    const session =

        validateSession();

    if(

        !session.approved

    ){

        return session;

    }

    const wallet =

        validateWallet(

            context.walletId

        );

    if(

        !wallet.approved

    ){

        return wallet;

    }

    const amount =

        validateAmount(

            context.amount

        );

    if(

        !amount.approved

    ){

        return amount;

    }

    const currency =

        validateCurrency(

            context.currency

        );

    if(

        !currency.approved

    ){

        return currency;

    }

    publish(

        GUARD_EVENTS.APPROVED,

        {

            reference:

                context.reference,

            stage:

                "authorization"

        }

    );

    return createResult(

        true

    );

} 
/* ========================================================================
   TRANSACTION CACHE
======================================================================== */

const TRANSACTION_CACHE =
new Map();

/* ========================================================================
   VELOCITY CACHE
======================================================================== */

const VELOCITY_CACHE =
new Map();

/* ========================================================================
   CACHE CONFIGURATION
======================================================================== */

const CACHE_POLICY =
Object.freeze({

    duplicateWindow:

        60_000,

    velocityWindow:

        60_000,

    maxTransactions:

        10

});

/* ========================================================================
   TRANSACTION FINGERPRINT
======================================================================== */

function fingerprint(

    transaction

){

    return [

        transaction.walletId ?? "",

        transaction.amount ?? "",

        transaction.currency ?? "",

        transaction.type ?? "",

        transaction.beneficiary ?? ""

    ]

    .join("|")

    .toLowerCase();

}

/* ========================================================================
   DUPLICATE DETECTION
======================================================================== */

function detectDuplicate(

    transaction

){

    if(

        !DEFAULT_POLICY.duplicateProtection

    ){

        return createResult(

            true

        );

    }

    const key =

        fingerprint(

            transaction

        );

    const timestamp =

        TRANSACTION_CACHE.get(

            key

        );

    if(

        timestamp &&

        (

            now() - timestamp

        ) <

        CACHE_POLICY.duplicateWindow

    ){

        publish(

            GUARD_EVENTS.DUPLICATE,

            {

                key

            }

        );

        return createResult(

            false,

            "DUPLICATE_TRANSACTION"

        );

    }

    TRANSACTION_CACHE.set(

        key,

        now()

    );

    return createResult(

        true

    );

}

/* ========================================================================
   VELOCITY CHECK
======================================================================== */

function checkVelocity(

    walletId

){

    if(

        !DEFAULT_POLICY.velocityProtection

    ){

        return createResult(

            true

        );

    }

    const timestamp =

        now();

    const history =

        VELOCITY_CACHE.get(

            walletId

        ) || [];

    const recent =

        history.filter(

            value =>

                (

                    timestamp - value

                ) <

                CACHE_POLICY.velocityWindow

        );

    if(

        recent.length >=

        CACHE_POLICY.maxTransactions

    ){

        publish(

            GUARD_EVENTS.LIMIT,

            {

                walletId

            }

        );

        return createResult(

            false,

            "VELOCITY_LIMIT"

        );

    }

    recent.push(

        timestamp

    );

    VELOCITY_CACHE.set(

        walletId,

        recent

    );

    return createResult(

        true

    );

}

/* ========================================================================
   CACHE CLEANUP
======================================================================== */

function cleanupCaches(){

    const timestamp =

        now();

    for(

        const [

            key,

            value

        ]

        of

        TRANSACTION_CACHE

    ){

        if(

            (

                timestamp - value

            ) >

            CACHE_POLICY.duplicateWindow

        ){

            TRANSACTION_CACHE.delete(

                key

            );

        }

    }

    for(

        const [

            wallet,

            history

        ]

        of

        VELOCITY_CACHE

    ){

        const recent =

            history.filter(

                value =>

                    (

                        timestamp - value

                    ) <

                    CACHE_POLICY.velocityWindow

            );

        if(

            recent.length

        ){

            VELOCITY_CACHE.set(

                wallet,

                recent

            );

        }

        else{

            VELOCITY_CACHE.delete(

                wallet

            );

        }

    }

}

/* ========================================================================
   REPLAY PROTECTION
======================================================================== */

function preventReplay(

    context

){

    const duplicate =

        detectDuplicate(

            context

        );

    if(

        !duplicate.approved

    ){

        return duplicate;

    }

    const velocity =

        checkVelocity(

            context.walletId

        );

    if(

        !velocity.approved

    ){

        return velocity;

    }

    cleanupCaches();

    return createResult(

        true

    );

}

/* ========================================================================
   ENTERPRISE AUTHORIZATION PIPELINE
======================================================================== */

function authorizeTransaction(

    transaction

){

    const context =

        createContext(

            sanitizeTransaction(

                transaction

            )

        );

    const authorization =

        authorize(

            context

        );

    if(

        !authorization.approved

    ){

        return authorization;

    }

    const replay =

        preventReplay(

            context

        );

    if(

        !replay.approved

    ){

        return replay;

    }
recordTransactionAudit(

    "TRANSACTION_AUTHORISED",

    {

        reference:

            context.reference

    }

);
    publish(

        GUARD_EVENTS.APPROVED,

        {

            reference:

                context.reference,

            pipeline:

                "transaction"

        }

    );

    return createResult(

        true

    );

} 
   const TRANSACTION_RISK =
Object.freeze({

    LOW:
        "LOW",

    MEDIUM:
        "MEDIUM",

    HIGH:
        "HIGH",

    CRITICAL:
        "CRITICAL"

});
 /* ========================================================================
   RISK POLICY
======================================================================== */

const RISK_POLICY =
Object.freeze({

    mediumAmount:

        1000,

    highAmount:

        5000,

    maximumAmount:

        100000,

    requireStepUpRisk:

        70

});
/* ========================================================================
   RISK CLASSIFICATION
======================================================================== */

function classifyRisk(

    score

){

    if(

        score >= 100

    ){

        return TRANSACTION_RISK.CRITICAL;

    }

    if(

        score >= 70

    ){

        return TRANSACTION_RISK.HIGH;

    }

    if(

        score >= 30

    ){

        return TRANSACTION_RISK.MEDIUM;

    }

    return TRANSACTION_RISK.LOW;

}
/* ========================================================================
   RISK SCORE
======================================================================== */

function calculateRiskScore(

    context

){

    let score = 0;
    const reasons = [];

    const amount =
        Number(context.amount || 0);

    if(

        amount >=
        RISK_POLICY.mediumAmount

    ){

        score += 20;
        reasons.push(
            "MEDIUM_VALUE"
        );

    }

    if(

        amount >=
        RISK_POLICY.highAmount

    ){

        score += 30;
        reasons.push(
            "HIGH_VALUE"
        );

    }

    if(

        amount >
        RISK_POLICY.maximumAmount

    ){

        score += 100;
        reasons.push(
            "EXCEEDS_MAXIMUM"
        );

    }

    if(

        !context.beneficiary

    ){

        score += 10;
        reasons.push(
            "UNKNOWN_BENEFICIARY"
        );

    }

 return {

    score,

    level:

        classifyRisk(

            score

        ),

    reasons

};

}

/* ========================================================================
   STEP-UP AUTHENTICATION
======================================================================== */

function requiresStepUp(

    score

){

    return (

        score >=

        RISK_POLICY.requireStepUpRisk

    );

}
/* ========================================================================
   MFA ESCALATION
======================================================================== */

function requestTransactionMFA(

    context,

    risk

){

    if(

        !SESSION_MANAGER ||

        typeof SESSION_MANAGER.requestMFA !== "function"

    ){

        return false;

    }

    SESSION_MANAGER.requestMFA();

    publish(

        GUARD_EVENTS.WARNING,

        {

            reference:

                context.reference,

            score:

                risk.score,

            level:

                risk.level,

            action:

                "MFA_REQUIRED"

        }

    );

    return true;

}
/* ========================================================================
   FRAUD EVALUATION
======================================================================== */

function evaluateFraud(

    context

){

    const risk =

        calculateRiskScore(

            context

        );

    if(

        risk.score >= 100

    ){

        publish(

            GUARD_EVENTS.FRAUD,

            {

                reference:

                    context.reference,

                score:

                    risk.score

            }

        );

        return createResult(

            false,

            "FRAUD_RISK",

            risk.reasons

        );

    }

    if(

        requiresStepUp(

            risk.score

        )

    ){
requestTransactionMFA(

    context,

    risk

);
        publish(

            GUARD_EVENTS.WARNING,

            {

    reference:

        context.reference,

    score:

        risk.score,

    level:

        risk.level,

    action:

        "STEP_UP"

}

        );

        return createResult(

            false,

            "STEP_UP_REQUIRED",

            risk.reasons

        );

    }

    return createResult(

        true,

        null,

        risk.reasons

    );

}

/* ========================================================================
   AML HOOK
======================================================================== */

function evaluateAML(

    context

){

    publish(

        GUARD_EVENTS.WARNING,

        {

            stage:

                "aml",

            reference:

                context.reference

        }

    );

    return createResult(

        true

    );

}

/* ========================================================================
   FINAL SECURITY PIPELINE
======================================================================== */

function evaluateTransaction(

    transaction

){

    const context =

        createContext(

            sanitizeTransaction(

                transaction

            )

        );

    const authorization =

        authorizeTransaction(

            context

        );

    if(

        !authorization.approved

    ){

        return authorization;

    }

    const fraud =

        evaluateFraud(

            context

        );

    if(

        !fraud.approved

    ){

        return fraud;

    }

    const aml =

        evaluateAML(

            context

        );

    if(

        !aml.approved

    ){

        return aml;

    }

    publish(

        GUARD_EVENTS.APPROVED,

        {

            reference:

                context.reference,

            pipeline:

                "risk"

        }

    );

    return createResult(

        true,

        null,

        fraud.warnings

    );

}
  /* ========================================================================
   POLICY MANAGEMENT
======================================================================== */

let activePolicy = {

    ...DEFAULT_POLICY

};

function getPolicy(){

    return Object.freeze({

        ...activePolicy

    });

}

function updatePolicy(

    updates = {}

){

    activePolicy = {

        ...activePolicy,

        ...updates

    };

    publish(

        GUARD_EVENTS.WARNING,

        {

            stage:

                "policy",

            updated:

                Object.keys(

                    updates

                )

        }

    );

    return getPolicy();

}

/* ========================================================================
   SECURITY STATUS
======================================================================== */

function status(){

    return Object.freeze({

        version:

            VERSION,

        policy:

            getPolicy(),

        duplicateCache:

            TRANSACTION_CACHE.size,

        velocityCache:

            VELOCITY_CACHE.size,
       mfaAvailable:

    Boolean(

        SESSION_MANAGER &&

        typeof SESSION_MANAGER.requestMFA === "function"

    ),

    });

}

/* ========================================================================
   SELF TEST
======================================================================== */

function selfTest(){

    const report = {

        session:

            Boolean(

                SESSION

            ),

        validator:

            Boolean(

                VALIDATOR

            ),

        sanitizer:

            Boolean(

                SANITIZER

            ),

        events:

            Boolean(

                EVENTS

            ),
      sessionMFA:

    Boolean(

        SESSION_MANAGER &&

        typeof SESSION_MANAGER.requestMFA === "function"

    ), 

    };

    publish(

        GUARD_EVENTS.WARNING,

        {

            stage:

                "self-test"

        }

    );

    return Object.freeze(

        report

    );

}

/* ========================================================================
   GUARD REGISTRY
======================================================================== */

const GUARD = Object.freeze({

    validateSession,
    validateWallet,
    validateAmount,
    validateCurrency,

    sanitizeTransaction,

    authorize,
    authorizeTransaction,
    evaluateTransaction,

    detectDuplicate,
    checkVelocity,
    preventReplay,

    calculateRiskScore,
    classifyRisk,
    evaluateFraud,
    evaluateAML,

    getPolicy,
    updatePolicy,

    status,
    selfTest

});

/* ========================================================================
   DISPATCHER
======================================================================== */

function run(

    operation,

    ...args

){

    const fn =

        GUARD[operation];

    if(

        typeof fn !== "function"

    ){

        publish(

            GUARD_EVENTS.WARNING,

            {

                operation

            }

        );

        return createResult(

            false,

            "UNKNOWN_OPERATION"

        );

    }

    return fn(

        ...args

    );

}

function has(

    operation

){

    return Object.prototype.hasOwnProperty.call(

        GUARD,

        operation

    );

}

function list(){

    return Object.keys(

        GUARD

    ).sort();

}

/* ========================================================================
   PUBLIC API
======================================================================== */

const api = Object.freeze({

    version:

        VERSION,

    run,

    has,

    list,

    status,

    selfTest,

    getPolicy,
    updatePolicy,

    operations:

        GUARD,

    validateSession,
    validateWallet,
    validateAmount,
    validateCurrency,

    sanitizeTransaction,

    authorize,
    authorizeTransaction,
    evaluateTransaction,

    detectDuplicate,
    checkVelocity,
    preventReplay,

    calculateRiskScore,
    evaluateFraud,
    evaluateAML

});

/* ========================================================================
   PAY54 SECURITY ROOT
======================================================================== */

window.PAY54_SECURITY =
window.PAY54_SECURITY || {};

Object.defineProperty(

    window.PAY54_SECURITY,

    "transactionGuard",

    {

        value:

            api,

        writable:

            false,

        configurable:

            false,

        enumerable:

            true

    }

);

/* ========================================================================
   STARTUP
======================================================================== */

publish(

    GUARD_EVENTS.APPROVED,

    {

        module:

            "transaction-guard",

        version:

            VERSION

    }

);

console.info(

    "[PAY54]",

    "Enterprise Transaction Guard",

    VERSION,

    "loaded"

);

/* ========================================================================
   MODULE COMPLETE
======================================================================== */

})();
