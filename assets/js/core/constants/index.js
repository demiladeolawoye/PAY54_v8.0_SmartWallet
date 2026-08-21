"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE CONSTANTS REGISTRY
   File: assets/js/core/constants/index.js
   Version: v12.0.0

   Purpose
   -------
   Central registry for all PAY54 constant modules.

   Responsibilities
   ----------------
   • Register constant modules
   • Retrieve constant modules
   • Health monitoring
   • Version reporting
   • Diagnostics
   • Prevent duplicate registrations

   Architecture
   ------------
   Core
      ↓
   Constants Registry
      ↓
   Engine Constants
      ↓
   Engine Modules

========================================================================== */

(() => {

"use strict";

/* ========================================================================
   REGISTRY
======================================================================== */

const VERSION = "12.0.0";

const ENGINE = "PAY54 Constants Registry";

const startedAt =
new Date().toISOString();

const registry = new Map();

let locked = false;

/* ========================================================================
   VALIDATION
======================================================================== */

function validateName(name){

    if(typeof name !== "string"){

        throw new TypeError(
            "Constants module name must be a string."
        );

    }

    if(!name.trim()){

        throw new Error(
            "Constants module name cannot be empty."
        );

    }

}

function validateModule(module){

    if(
        !module ||
        typeof module !== "object"
    ){

        throw new TypeError(
            "Constants module must be an object."
        );

    }

}

/* ========================================================================
   REGISTRATION
======================================================================== */

function register(name,module){

    validateName(name);

    validateModule(module);

   if(locked){

    throw new Error(

        "PAY54 Constants Registry is locked."

    );

}

    if(registry.has(name)){

        console.warn(

            `[PAY54_CONSTANTS] ${name} already registered.`

        );

        return registry.get(name);

    }

    Object.freeze(module);

    registry.set(

        name,

        module

    );

    console.info(

        `[PAY54_CONSTANTS] Registered ${name}`

    );

    return module;

}

function unregister(name){

    validateName(name);

    return registry.delete(name);

}

/* ========================================================================
   LOOKUP
======================================================================== */

function get(name){

    validateName(name);

    return registry.get(name);

}

function has(name){

    validateName(name);

    return registry.has(name);

}

function list(){

    return Array.from(

        registry.keys()

    ).sort();

}

function count(){

    return registry.size;

}

/* ========================================================================
   HEALTH
======================================================================== */

function health(){

    return {

        engine: ENGINE,

        version: VERSION,

        modules: count(),

        registered: list(),

        healthy: true,

        generatedAt:

            new Date().toISOString()

    };

}

/* ========================================================================
   PUBLIC API
======================================================================== */

const CONSTANTS = Object.freeze({

    register,

    unregister,

    get,

    has,

    list,

    count,

    version(){

        return VERSION;

    },

    health

});

Object.defineProperty(

    window,

    "PAY54_CONSTANTS",

    {

        value: CONSTANTS,

        writable: false,

        configurable: false

    }

);

/* ========================================================================
   STARTUP
======================================================================== */

console.info(

    "✅ PAY54 Constants Registry",

    VERSION,

    "loaded."

);

})();
