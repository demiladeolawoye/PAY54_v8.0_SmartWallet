"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE MODULE IDENTIFIERS
   File: assets/js/core/constants/modules.js
   Version: v12.0.0

   Purpose
   -------
   Canonical identifiers for all PAY54 modules.

   Responsibilities
   ----------------
   • Provide immutable module identifiers
   • Eliminate hardcoded strings
   • Standardise registry registration
   • Support enterprise diagnostics

   Architecture
   ------------
   Core
      ↓
   Constants Registry
      ↓
   Module Identifiers
      ↓
   Engine Registries

========================================================================== */

(() => {

"use strict";

/* ========================================================================
   METADATA
======================================================================== */

const VERSION = "12.0.0";

const ENGINE =
"PAY54 Module Identifiers";

/* ========================================================================
   MODULE IDENTIFIERS
======================================================================== */

const MODULES = Object.freeze({

    /* ===============================================================
       CORE
    =============================================================== */

    CONFIG:
        "CONFIG",

    EVENTS:
        "EVENTS",

    STATE:
        "STATE",

    ROUTER:
        "ROUTER",

    REGISTRY:
        "REGISTRY",

    BOOTSTRAP:
        "BOOTSTRAP",

    CONSTANTS:
        "CONSTANTS",

    /* ===============================================================
       FOUNDATION
    =============================================================== */

    LEDGER:
        "LEDGER",

    TRANSACTIONS:
        "TRANSACTIONS",

    RECEIPTS:
        "RECEIPTS",

    SERVICES:
        "SERVICES",

    RECIPIENTS:
        "RECIPIENTS",

    CONTACTS:
        "CONTACTS",

    /* ===============================================================
       ENGINE LAYER
    =============================================================== */

    CARDS:
        "CARDS",

    WALLET:
        "WALLET",

    MERCHANT:
        "MERCHANT",

    SECURITY:
        "SECURITY",

    SAVINGS:
        "SAVINGS",

    TRADING:
        "TRADING",

    CHECKOUT:
        "CHECKOUT",

    INVEST:
        "INVEST",

    AGENT:
        "AGENT",

    RISK:
        "RISK",

    /* ===============================================================
       UI
    =============================================================== */

    DASHBOARD:
        "DASHBOARD",

    MODALS:
        "MODALS",

    UI_ENGINE:
        "UI_ENGINE"

});

/* ========================================================================
   REGISTRATION
======================================================================== */

if(

    !window.PAY54_CONSTANTS

){

    throw new Error(

        "PAY54 Constants Registry must load before modules.js"

    );

}

window.PAY54_CONSTANTS.register(

    "MODULES",

    MODULES

);

/* ========================================================================
   STARTUP
======================================================================== */

console.info(

    "✅ PAY54 Module Identifiers",

    VERSION,

    "loaded."

);

})();
