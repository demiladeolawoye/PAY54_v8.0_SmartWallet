"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE VERSION CATALOGUE
   File: assets/js/core/constants/versions.js
   Version: v12.0.0

   Purpose
   -------
   Canonical version catalogue for all PAY54 platform modules.

   Responsibilities
   ----------------
   • Centralise module versions
   • Eliminate duplicated VERSION constants
   • Support diagnostics and release management
   • Provide immutable version information

========================================================================== */

(() => {

"use strict";

/* ========================================================================
   REGISTRY DEPENDENCY
======================================================================== */

if(!window.PAY54_CONSTANTS){

    throw new Error(
        "PAY54 Constants Registry must load before versions.js"
    );

}

/* ========================================================================
   MODULE DEPENDENCY
======================================================================== */

const MODULES =
window.PAY54_CONSTANTS.get("MODULES");

if(!MODULES){

    throw new Error(
        "PAY54 Module identifiers must load before versions.js"
    );

}

/* ========================================================================
   VERSION CATALOGUE
======================================================================== */

const VERSIONS = Object.freeze({

    /* Core */

    CORE: "12.0.0",
    CONSTANTS: "12.0.0",

    /* Platform */

    LEDGER: "8.0.5",
    TRANSACTIONS: "11.0.0",
    SERVICES: "11.0.0",
    RECIPIENTS: "11.0.0",

    /* Engines */

    CONTACTS: "1.0.0",
    CARDS: "11.0.0",
    WALLET: "11.0.0",
    MERCHANT: "11.0.0",
    SECURITY: "11.0.0",
    SAVINGS: "11.0.0",
    TRADING: "11.0.0",
    INVEST: "11.0.0",
    CHECKOUT: "11.0.0",
    AGENT: "11.0.0",
    RISK: "11.0.0"

});

/* ========================================================================
   REGISTRATION
======================================================================== */

window.PAY54_CONSTANTS.register(

    MODULES.VERSIONS,

    VERSIONS

);

/* ========================================================================
   STARTUP
======================================================================== */

console.info(

    "✅ PAY54 Version Catalogue",

    VERSIONS.CORE,

    "loaded."

);

})();
