/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File: assets/js/security/index.js
   Version: v11.0.0
   Module: WP-003G Enterprise Security Bootstrap
   ------------------------------------------------------------------------
   Responsibilities

   • Security subsystem bootstrap
   • Dependency verification
   • Module registry
   • Health monitoring
   • Startup diagnostics
   • Runtime security information
======================================================================== */

(() => {

"use strict";

/* ========================================================================
   VERSION
======================================================================== */

const VERSION =
"11.0.0";

/* ========================================================================
   DEPENDENCIES
======================================================================== */

const EVENTS =
window.PAY54_EVENTS || null;

const SECURITY =
window.PAY54_SECURITY || {};

/* ========================================================================
   SECURITY EVENTS
======================================================================== */

const SECURITY_EVENTS =
Object.freeze({

    STARTUP:
        "security.startup",

    READY:
        "security.ready",

    WARNING:
        "security.warning",

    ERROR:
        "security.error"

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

                    "security"

                }

            );

        }

    }

    catch(error){

        console.error(

            "[PAY54_SECURITY]",

            error

        );

    }

}

/* ========================================================================
   REQUIRED MODULES
======================================================================== */

const REQUIRED_MODULES =
Object.freeze({

    storage:
        "secure-storage",

    session:
        "session-manager",

    validator:
        "validator",

    sanitizer:
        "sanitizer",

    xss:
        "xss",

    transactionGuard:
        "transaction-guard"

});

/* ========================================================================
   MODULE LOOKUP
======================================================================== */

function getModule(

    name

){

    return SECURITY[name] || null;

}

/* ========================================================================
   MODULE STATUS
======================================================================== */

function moduleStatus(

    name

){

    const module =

        getModule(

            name

        );

    return {

        loaded:

            Boolean(

                module

            ),

        version:

            module?.version ||

            null

    };

}

/* ========================================================================
   BOOT RESULT
======================================================================== */

function createResult(

    success,

    warnings = []

){

    return Object.freeze({

        success,

        warnings,

        timestamp:

            new Date()

            .toISOString()

    });

}
  /* ========================================================================
   MODULE VERIFICATION
======================================================================== */

function verifyModule(

    name

){

    const module =

        getModule(

            name

        );

    if(

        !module

    ){

        publish(

            SECURITY_EVENTS.ERROR,

            {

                module:

                    name,

                reason:

                    "MISSING"

            }

        );

        return {

            name,

            loaded:false,

            valid:false,

            version:null,

            warnings:[

                "MODULE_NOT_FOUND"

            ]

        };

    }

    const warnings = [];

    if(

        typeof module.version !== "string"

    ){

        warnings.push(

            "VERSION_UNAVAILABLE"

        );

    }

    return {

        name,

        loaded:true,

        valid:

            warnings.length === 0,

        version:

            module.version ||

            null,

        warnings

    };

}

/* ========================================================================
   VERIFY ALL MODULES
======================================================================== */

function verifyModules(){

    const report = {};

    let success = true;

    Object.keys(

        REQUIRED_MODULES

    )

    .forEach(

        name=>{

            const result =

                verifyModule(

                    name

                );

            report[name] =

                result;

            if(

                !result.valid

            ){

                success = false;

            }

        }

    );

    return {

        success,

        modules:

            report

    };

}

/* ========================================================================
   SECURITY HEALTH
======================================================================== */

function health(){

    const verification =

        verifyModules();

    return Object.freeze({

        version:

            VERSION,

        healthy:

            verification.success,

        modules:

            verification.modules

    });

}

/* ========================================================================
   STARTUP DIAGNOSTICS
======================================================================== */

function diagnostics(){

    const verification =

        verifyModules();

    const warnings = [];

    Object.values(

        verification.modules

    )

    .forEach(

        module=>{

            warnings.push(

                ...module.warnings

            );

        }

    );

    publish(

        SECURITY_EVENTS.STARTUP,

        {

            success:

                verification.success,

            warnings:

                warnings.length

        }

    );

    return createResult(

        verification.success,

        warnings

    );

}

/* ========================================================================
   MODULE COUNT
======================================================================== */

function moduleCount(){

    return Object.keys(

        REQUIRED_MODULES

    ).length;

}

/* ========================================================================
   LOADED MODULE COUNT
======================================================================== */

function loadedModules(){

    return Object.keys(

        REQUIRED_MODULES

    )

    .filter(

        name=>

            Boolean(

                getModule(

                    name

                )

            )

    )

    .length;

}

/* ========================================================================
   READINESS CHECK
======================================================================== */

function isReady(){

    return verifyModules()

        .success;

}
  /* ========================================================================
   MODULE REGISTRY
======================================================================== */

const REGISTRY =
new Map();

/* ========================================================================
   REGISTER MODULE
======================================================================== */

function register(

    name,

    module

){

    if(

        !name ||

        !module

    ){

        return false;

    }

    REGISTRY.set(

        name,

        module

    );

    publish(

        SECURITY_EVENTS.STARTUP,

        {

            action:

                "register",

            module:

                name

        }

    );

    return true;

}

/* ========================================================================
   REGISTER ALL MODULES
======================================================================== */

function registerModules(){

    Object.keys(

        REQUIRED_MODULES

    )

    .forEach(

        name=>{

            const module =

                getModule(

                    name

                );

            if(

                module

            ){

                register(

                    name,

                    module

                );

            }

        }

    );

    return REGISTRY.size;

}

/* ========================================================================
   REGISTRY STATUS
======================================================================== */

function registryStatus(){

    return Object.freeze({

        registered:

            REGISTRY.size,

        expected:

            moduleCount(),

        ready:

            REGISTRY.size ===

            moduleCount()

    });

}

/* ========================================================================
   SECURITY INITIALIZATION
======================================================================== */

let initialized = false;

function initialize(){

    if(

        initialized

    ){

        return createResult(

            true

        );

    }

    const verification =

        verifyModules();

    if(

        !verification.success

    ){

        publish(

            SECURITY_EVENTS.ERROR,

            {

                stage:

                    "initialize"

            }

        );

        return createResult(

            false,

            [

                "INITIALIZATION_ABORTED"

            ]

        );

    }

    registerModules();

    initialized = true;

    publish(

        SECURITY_EVENTS.READY,

        {

            modules:

                REGISTRY.size

        }

    );

    return createResult(

        true

    );

}

/* ========================================================================
   INITIALIZATION STATUS
======================================================================== */

function isInitialized(){

    return initialized;

}

/* ========================================================================
   RUNTIME INFORMATION
======================================================================== */

function runtime(){

    return Object.freeze({

        version:

            VERSION,

        initialized,

        modules:

            registryStatus(),

        healthy:

            isReady(),

        diagnostics:

            diagnostics()

    });

}

/* ========================================================================
   SECURITY SUMMARY
======================================================================== */

function summary(){

    const verification =

        verifyModules();

    return Object.freeze({

        version:

            VERSION,

        initialized,

        healthy:

            verification.success,

        loadedModules:

            loadedModules(),

        totalModules:

            moduleCount(),

        registeredModules:

            REGISTRY.size

    });

}
  /* ========================================================================
   SECURITY METRICS
======================================================================== */

const METRICS = {

    startupTime: null,

    initializedAt: null,

    healthChecks: 0,

    lastHealthCheck: null

};

/* ========================================================================
   HEALTH CHECK
======================================================================== */

function healthCheck(){

    METRICS.healthChecks++;

    METRICS.lastHealthCheck =

        new Date()

        .toISOString();

    const report =

        health();

    publish(

        SECURITY_EVENTS.STARTUP,

        {

            action:

                "health-check",

            healthy:

                report.healthy

        }

    );

    return report;

}

/* ========================================================================
   MODULE INFORMATION
======================================================================== */

function moduleInformation(){

    const modules = {};

    Object.keys(

        REQUIRED_MODULES

    )

    .forEach(

        name=>{

            modules[name] =

                moduleStatus(

                    name

                );

        }

    );

    return Object.freeze(

        modules

    );

}

/* ========================================================================
   SECURITY METRICS
======================================================================== */

function metrics(){

    return Object.freeze({

        startupTime:

            METRICS.startupTime,

        initializedAt:

            METRICS.initializedAt,

        healthChecks:

            METRICS.healthChecks,

        lastHealthCheck:

            METRICS.lastHealthCheck

    });

}

/* ========================================================================
   STARTUP TIMER
======================================================================== */

function beginStartupTimer(){

    METRICS.startupTime =

        performance.now();

}

/* ========================================================================
   COMPLETE STARTUP
======================================================================== */

function completeStartup(){

    METRICS.initializedAt =

        new Date()

        .toISOString();

    if(

        typeof METRICS.startupTime ===

        "number"

    ){

        METRICS.startupTime =

            Number(

                (

                    performance.now() -

                    METRICS.startupTime

                )

                .toFixed(2)

            );

    }

    publish(

        SECURITY_EVENTS.READY,

        {

            startupTime:

                METRICS.startupTime

        }

    );

}

/* ========================================================================
   BOOTSTRAP
======================================================================== */

function bootstrap(){

    beginStartupTimer();

    const result =

        initialize();

    if(

        !result.success

    ){

        return result;

    }

    completeStartup();

    return createResult(

        true

    );

}

/* ========================================================================
   RUNTIME REPORT
======================================================================== */

function report(){

    return Object.freeze({

        summary:

            summary(),

        runtime:

            runtime(),

        metrics:

            metrics(),

        registry:

            registryStatus(),

        modules:

            moduleInformation()

    });

}
  /* ========================================================================
   BOOTSTRAP REGISTRY
======================================================================== */

const BOOTSTRAP = Object.freeze({

    initialize,
    bootstrap,

    diagnostics,
    health,
    healthCheck,

    summary,
    runtime,
    report,

    metrics,
    status: registryStatus,

    moduleInformation,

    getModule,

    verifyModule,
    verifyModules,

    moduleCount,
    loadedModules,

    register,
    registerModules,

    isReady,
    isInitialized

});

/* ========================================================================
   DISPATCHER
======================================================================== */

function run(

    operation,

    ...args

){

    const fn =

        BOOTSTRAP[operation];

    if(

        typeof fn !== "function"

    ){

        publish(

            SECURITY_EVENTS.WARNING,

            {

                operation

            }

        );

        return createResult(

            false,

            [

                "UNKNOWN_OPERATION"

            ]

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

        BOOTSTRAP,

        operation

    );

}

function list(){

    return Object.keys(

        BOOTSTRAP

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

    bootstrap,
    initialize,

    diagnostics,
    health,
    healthCheck,

    summary,
    runtime,
    report,

    metrics,

    moduleInformation,

    verifyModule,
    verifyModules,

    getModule,

    moduleCount,
    loadedModules,

    status:

        registryStatus,

    isReady,
    isInitialized

});

/* ========================================================================
   PAY54 SECURITY ROOT
======================================================================== */

window.PAY54_SECURITY =
window.PAY54_SECURITY || {};

Object.defineProperty(

    window.PAY54_SECURITY,

    "bootstrap",

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
   AUTO BOOTSTRAP
======================================================================== */

const startup =

    bootstrap();

if(

    startup.success

){

    publish(

        SECURITY_EVENTS.READY,

        {

            version:

                VERSION

        }

    );

}

else{

    publish(

        SECURITY_EVENTS.ERROR,

        {

            reason:

                "BOOTSTRAP_FAILED"

        }

    );

}

/* ========================================================================
   STARTUP LOG
======================================================================== */

console.info(

    "[PAY54]",

    "Enterprise Security Bootstrap",

    VERSION,

    startup.success

        ? "ready"

        : "failed"

);

/* ========================================================================
   MODULE COMPLETE
======================================================================== */

})();
  
