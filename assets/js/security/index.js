"use strict";

/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File: assets/js/security/index.js
   Version: v12.0.0
   Module: WP-TITAN-SEC-001F Enterprise Security Bootstrap
   ------------------------------------------------------------------------
   Responsibilities

   • Security subsystem bootstrap
   • Dependency verification
   • Canonical PAY54 Registry attestation
   • Backward-compatible internal module registry
   • Health and integrity monitoring
   • Startup diagnostics
   • Runtime security information
   • Fail-closed security verification for consumers
   • Zero financial mutation responsibility
======================================================================== */

(() => {

"use strict";

/* ========================================================================
   IDENTITY
======================================================================== */

const VERSION =
"12.0.0";

const MODULE_ID =
"security.bootstrap";

const MODULE_NAME =
"PAY54 Titan Enterprise Security Bootstrap";

const MODULE_TYPE =
"security";

const MODULE_LAYER =
"layer.security";

const MODULE_PATH =
"assets/js/security/index.js";

/* ========================================================================
   DEPENDENCIES
======================================================================== */

const EVENTS =
window.PAY54_EVENTS || null;

const PLATFORM_REGISTRY =
window.PAY54_REGISTRY || null;

const SECURITY =
window.PAY54_SECURITY;

if(
    !SECURITY ||
    typeof SECURITY !== "object"
){

    throw new Error(
        "[PAY54_SECURITY] PAY54 Security namespace must exist before Security Bootstrap loads."
    );

}

if(
    !PLATFORM_REGISTRY ||
    typeof PLATFORM_REGISTRY.register !== "function" ||
    typeof PLATFORM_REGISTRY.has !== "function" ||
    typeof PLATFORM_REGISTRY.get !== "function" ||
    typeof PLATFORM_REGISTRY.getApi !== "function"
){

    throw new Error(
        "[PAY54_SECURITY] PAY54 Registry v12 must load before Security Bootstrap."
    );

}

/* ========================================================================
   IDEMPOTENT RELOAD PROTECTION
======================================================================== */

if(
    SECURITY.bootstrap &&
    SECURITY.bootstrap.version === VERSION &&
    PLATFORM_REGISTRY.has(MODULE_ID) === true &&
    PLATFORM_REGISTRY.getApi(MODULE_ID) === SECURITY.bootstrap
){

    console.info(
        "[PAY54] Enterprise Security Bootstrap 12.0.0 already active"
    );

    return;

}

if(
    SECURITY.bootstrap &&
    SECURITY.bootstrap.version !== VERSION
){

    throw new Error(
        "[PAY54_SECURITY] A different Enterprise Security Bootstrap version is already active. Hard refresh after replacing assets/js/security/index.js."
    );

}

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
        "security.error",

    VERIFIED:
        "security.bootstrap.verified",

    VERIFICATION_FAILED:
        "security.bootstrap.verification.failed"

});

/* ========================================================================
   REQUIRED MODULES
======================================================================== */

const REQUIRED_MODULES =
Object.freeze({

    storage:
        Object.freeze({
            key: "storage",
            legacyName: "secure-storage",
            registryId: "security.secure-storage",
            version: "12.0.0",
            integrityRequired: true
        }),

    session:
        Object.freeze({
            key: "session",
            legacyName: "session-manager",
            registryId: "security.session-manager",
            version: "12.0.0",
            integrityRequired: true
        }),

    validator:
        Object.freeze({
            key: "validator",
            legacyName: "validator",
            registryId: "security.validator",
            version: "12.0.0",
            integrityRequired: true
        }),

    sanitizer:
        Object.freeze({
            key: "sanitizer",
            legacyName: "sanitizer",
            registryId: "security.sanitizer",
            version: "12.0.0",
            integrityRequired: true
        }),

    xss:
        Object.freeze({
            key: "xss",
            legacyName: "xss",
            registryId: "security.xss",
            version: "12.0.0",
            integrityRequired: true
        }),

    transactionGuard:
        Object.freeze({
            key: "transactionGuard",
            legacyName: "transaction-guard",
            registryId: "security.transaction-guard",
            version: "12.0.0",
            integrityRequired: true
        })

});

/* ========================================================================
   UTILITIES
======================================================================== */

function now(){

    return new Date()
        .toISOString();

}

function clone(value){

    if(
        typeof structuredClone === "function"
    ){

        try{

            return structuredClone(value);

        }
        catch{

            /* fall through */

        }

    }

    if(value === undefined){

        return undefined;

    }

    try{

        return JSON.parse(
            JSON.stringify(value)
        );

    }
    catch{

        return value;

    }

}

function deepFreeze(
    value,
    visited = new WeakSet()
){

    if(
        value === null ||
        typeof value !== "object"
    ){

        return value;

    }

    if(
        visited.has(value)
    ){

        return value;

    }

    visited.add(value);

    Object.keys(value)
    .forEach(key=>{

        deepFreeze(
            value[key],
            visited
        );

    });

    return Object.freeze(value);

}

function immutable(value){

    return deepFreeze(
        clone(value)
    );

}

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
                    source: MODULE_ID
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
   MODULE LOOKUP
======================================================================== */

function getDescriptor(name){

    return REQUIRED_MODULES[name] || null;

}

function getModule(name){

    const descriptor =
        getDescriptor(name);

    if(!descriptor){

        return SECURITY[name] || null;

    }

    return SECURITY[descriptor.key] || null;

}

/* ========================================================================
   NORMALISED HEALTH
======================================================================== */

function readHealth(module){

    if(
        !module ||
        typeof module.health !== "function"
    ){

        return Object.freeze({
            available: false,
            healthy: false,
            raw: null,
            error: null
        });

    }

    try{

        const raw =
            module.health();

        const healthy =
            Boolean(
                raw === true ||
                raw?.healthy === true ||
                raw?.ok === true
            );

        return Object.freeze({
            available: true,
            healthy,
            raw,
            error: null
        });

    }
    catch(error){

        return Object.freeze({
            available: true,
            healthy: false,
            raw: null,
            error: error?.message || String(error)
        });

    }

}

/* ========================================================================
   NORMALISED INTEGRITY
======================================================================== */

function readIntegrity(
    module,
    required = true
){

    if(
        !module ||
        typeof module.verifyIntegrity !== "function"
    ){

        return Object.freeze({
            available: false,
            required: required === true,
            ok: required !== true,
            raw: null,
            error: null
        });

    }

    try{

        const raw =
            module.verifyIntegrity();

        const ok =
            Boolean(
                raw === true ||
                raw?.ok === true ||
                raw?.healthy === true ||
                raw?.status === "HEALTHY"
            );

        return Object.freeze({
            available: true,
            required: required === true,
            ok,
            raw,
            error: null
        });

    }
    catch(error){

        return Object.freeze({
            available: true,
            required: required === true,
            ok: false,
            raw: null,
            error: error?.message || String(error)
        });

    }

}

/* ========================================================================
   MODULE STATUS
======================================================================== */

function moduleStatus(name){

    const descriptor =
        getDescriptor(name);

    const module =
        getModule(name);

    if(!descriptor){

        return immutable({
            loaded: Boolean(module),
            version: module?.version || null
        });

    }

    const registered =
        PLATFORM_REGISTRY.has(
            descriptor.registryId
        ) === true;

    const registryApi =
        registered
            ? PLATFORM_REGISTRY.getApi(
                descriptor.registryId
              )
            : null;

    const healthResult =
        readHealth(module);

    const integrityResult =
        readIntegrity(
            module,
            descriptor.integrityRequired
        );

    const version =
        module?.version || null;

    return immutable({
        loaded: Boolean(module),
        version,
        expectedVersion: descriptor.version,
        versionCorrect: version === descriptor.version,
        registered,
        registryId: descriptor.registryId,
        registryApiMatches: registered && registryApi === module,
        healthAvailable: healthResult.available,
        healthy: healthResult.healthy,
        integrityAvailable: integrityResult.available,
        integrityHealthy: integrityResult.ok
    });

}

/* ========================================================================
   BOOT RESULT
======================================================================== */

function createResult(
    success,
    warnings = [],
    details = {}
){

    return immutable({
        success: success === true,
        warnings: Array.isArray(warnings)
            ? warnings
            : [],
        details,
        timestamp: now()
    });

}

/* ========================================================================
   MODULE VERIFICATION
======================================================================== */

function verifyModule(name){

    const descriptor =
        getDescriptor(name);

    const module =
        getModule(name);

    if(!descriptor){

        return immutable({
            name,
            loaded: Boolean(module),
            valid: false,
            version: module?.version || null,
            warnings: [
                "UNKNOWN_REQUIRED_MODULE"
            ]
        });

    }

    const warnings = [];

    if(!module){

        warnings.push(
            "MODULE_NOT_FOUND"
        );

    }

    const version =
        module?.version || null;

    if(
        !version ||
        version !== descriptor.version
    ){

        warnings.push(
            "VERSION_MISMATCH"
        );

    }

    const registered =
        PLATFORM_REGISTRY.has(
            descriptor.registryId
        ) === true;

    if(!registered){

        warnings.push(
            "REGISTRY_ENTRY_MISSING"
        );

    }

    const registryApi =
        registered
            ? PLATFORM_REGISTRY.getApi(
                descriptor.registryId
              )
            : null;

    const registryApiMatches =
        registered &&
        registryApi === module;

    if(!registryApiMatches){

        warnings.push(
            "REGISTRY_API_MISMATCH"
        );

    }

    const healthResult =
        readHealth(module);

    if(!healthResult.available){

        warnings.push(
            "HEALTH_API_UNAVAILABLE"
        );

    }
    else if(!healthResult.healthy){

        warnings.push(
            "MODULE_UNHEALTHY"
        );

    }

    const integrityResult =
        readIntegrity(
            module,
            descriptor.integrityRequired
        );

    if(
        descriptor.integrityRequired &&
        !integrityResult.available
    ){

        warnings.push(
            "INTEGRITY_API_UNAVAILABLE"
        );

    }
    else if(!integrityResult.ok){

        warnings.push(
            "INTEGRITY_CHECK_FAILED"
        );

    }

    const valid =
        warnings.length === 0;

    if(!valid){

        publish(
            SECURITY_EVENTS.ERROR,
            {
                module: name,
                registryId: descriptor.registryId,
                warnings: [...warnings]
            }
        );

    }

    return immutable({
        name,
        registryId: descriptor.registryId,
        loaded: Boolean(module),
        valid,
        version,
        expectedVersion: descriptor.version,
        registered,
        registryApiMatches,
        healthAvailable: healthResult.available,
        healthHealthy: healthResult.healthy,
        integrityRequired: descriptor.integrityRequired,
        integrityAvailable: integrityResult.available,
        integrityHealthy: integrityResult.ok,
        warnings
    });

}

/* ========================================================================
   VERIFY ALL MODULES
======================================================================== */

function verifyModules(){

    const report = {};

    let success = true;

    Object.keys(REQUIRED_MODULES)
    .forEach(name=>{

        const result =
            verifyModule(name);

        report[name] =
            result;

        if(!result.valid){

            success = false;

        }

    });

    return immutable({
        success,
        modules: report
    });

}

/* ========================================================================
   FAIL-CLOSED CONSUMER VERIFICATION
======================================================================== */

function verify(
    consumer = "runtime"
){

    const target =
        typeof consumer === "string" &&
        consumer.trim()
            ? consumer.trim()
            : "runtime";

    const verification =
        verifyModules();

    if(verification.success){

        publish(
            SECURITY_EVENTS.VERIFIED,
            {
                consumer: target,
                version: VERSION,
                modules: moduleCount(),
                checkedAt: now()
            }
        );

        return immutable({
            ok: true,
            healthy: true,
            status: "HEALTHY",
            consumer: target,
            version: VERSION,
            checkedAt: now()
        });

    }

    const failedModules =
        Object.values(
            verification.modules
        )
        .filter(module=>
            !module.valid
        )
        .map(module=>({
            name: module.name,
            registryId: module.registryId,
            warnings: [...module.warnings]
        }));

    publish(
        SECURITY_EVENTS.VERIFICATION_FAILED,
        {
            consumer: target,
            failedModules,
            checkedAt: now()
        }
    );

    console.error(
        "[PAY54_SECURITY] Security verification failed closed.",
        {
            consumer: target,
            failedModules
        }
    );

    return immutable({
        ok: false,
        healthy: false,
        status: "DEGRADED",
        consumer: target,
        version: VERSION,
        failedModules,
        checkedAt: now()
    });

}

/* ========================================================================
   SECURITY HEALTH
======================================================================== */

function health(){

    const verification =
        verifyModules();

    return immutable({
        ok: verification.success,
        version: VERSION,
        healthy: verification.success,
        status: verification.success
            ? "HEALTHY"
            : "DEGRADED",
        modules: verification.modules
    });

}

/* ========================================================================
   BOOTSTRAP INTEGRITY
======================================================================== */

function verifyIntegrity(){

    const verification =
        verifyModules();

    const errors =
        Object.values(
            verification.modules
        )
        .filter(module=>
            !module.valid
        )
        .map(module=>({
            name: module.name,
            registryId: module.registryId,
            warnings: [...module.warnings]
        }));

    const bootstrapRegistered =
        PLATFORM_REGISTRY.has(
            MODULE_ID
        ) === true;

    const bootstrapApiMatches =
        bootstrapRegistered &&
        PLATFORM_REGISTRY.getApi(
            MODULE_ID
        ) === SECURITY.bootstrap;

    if(!bootstrapRegistered){

        errors.push({
            name: MODULE_ID,
            warnings: [
                "BOOTSTRAP_REGISTRY_ENTRY_MISSING"
            ]
        });

    }
    else if(!bootstrapApiMatches){

        errors.push({
            name: MODULE_ID,
            warnings: [
                "BOOTSTRAP_REGISTRY_API_MISMATCH"
            ]
        });

    }

    return immutable({
        ok: errors.length === 0,
        status: errors.length === 0
            ? "HEALTHY"
            : "DEGRADED",
        errors,
        checkedAt: now()
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
    .forEach(module=>{

        warnings.push(
            ...module.warnings
        );

    });

    publish(
        SECURITY_EVENTS.STARTUP,
        {
            success: verification.success,
            warnings: warnings.length
        }
    );

    return createResult(
        verification.success,
        warnings,
        {
            moduleCount: moduleCount(),
            loadedModules: loadedModules()
        }
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
    .filter(name=>
        Boolean(
            getModule(name)
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
   BACKWARD-COMPATIBLE INTERNAL MODULE REGISTRY
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
            action: "register",
            module: name
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
    .forEach(name=>{

        const module =
            getModule(name);

        if(module){

            register(
                name,
                module
            );

        }

    });

    return REGISTRY.size;

}

/* ========================================================================
   REGISTRY STATUS
======================================================================== */

function registryStatus(){

    return immutable({
        registered: REGISTRY.size,
        expected: moduleCount(),
        ready: REGISTRY.size === moduleCount(),
        canonicalRegistryBound:
            PLATFORM_REGISTRY.has(MODULE_ID) === true
    });

}

/* ========================================================================
   SECURITY INITIALIZATION
======================================================================== */

let initialized = false;

function initialize(){

    if(initialized){

        return createResult(
            true,
            [],
            {
                alreadyInitialized: true
            }
        );

    }

    const verification =
        verifyModules();

    if(!verification.success){

        publish(
            SECURITY_EVENTS.ERROR,
            {
                stage: "initialize"
            }
        );

        return createResult(
            false,
            [
                "INITIALIZATION_ABORTED"
            ],
            {
                verification
            }
        );

    }

    registerModules();

    if(
        REGISTRY.size !==
        moduleCount()
    ){

        return createResult(
            false,
            [
                "INTERNAL_MODULE_REGISTRY_INCOMPLETE"
            ]
        );

    }

    initialized = true;

    publish(
        SECURITY_EVENTS.READY,
        {
            modules: REGISTRY.size
        }
    );

    return createResult(true);

}

/* ========================================================================
   INITIALIZATION STATUS
======================================================================== */

function isInitialized(){

    return initialized;

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

    METRICS.healthChecks += 1;

    METRICS.lastHealthCheck =
        now();

    const report =
        health();

    publish(
        SECURITY_EVENTS.STARTUP,
        {
            action: "health-check",
            healthy: report.healthy
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
    .forEach(name=>{

        modules[name] =
            moduleStatus(name);

    });

    return immutable(modules);

}

/* ========================================================================
   SECURITY METRICS
======================================================================== */

function metrics(){

    return immutable({
        startupTime: METRICS.startupTime,
        initializedAt: METRICS.initializedAt,
        healthChecks: METRICS.healthChecks,
        lastHealthCheck: METRICS.lastHealthCheck
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
        now();

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
            startupTime: METRICS.startupTime
        }
    );

}

/* ========================================================================
   SECURITY SUMMARY
======================================================================== */

function summary(){

    const verification =
        verifyModules();

    return immutable({
        version: VERSION,
        initialized,
        healthy: verification.success,
        loadedModules: loadedModules(),
        totalModules: moduleCount(),
        registeredModules: REGISTRY.size,
        canonicalRegistryBound:
            PLATFORM_REGISTRY.has(MODULE_ID) === true
    });

}

/* ========================================================================
   RUNTIME INFORMATION
======================================================================== */

function runtime(){

    return immutable({
        version: VERSION,
        initialized,
        modules: registryStatus(),
        healthy: isReady(),
        diagnostics: diagnostics()
    });

}

/* ========================================================================
   SNAPSHOT
======================================================================== */

function snapshot(){

    const verification =
        verifyModules();

    return immutable({
        id: MODULE_ID,
        name: MODULE_NAME,
        version: VERSION,
        initialized,
        healthy: verification.success,
        status: verification.success
            ? "HEALTHY"
            : "DEGRADED",
        moduleCount: moduleCount(),
        loadedModules: loadedModules(),
        registeredModules: REGISTRY.size,
        modules: verification.modules,
        checkedAt: now()
    });

}

/* ========================================================================
   BOOTSTRAP
======================================================================== */

function bootstrap(){

    beginStartupTimer();

    const result =
        initialize();

    if(!result.success){

        return result;

    }

    completeStartup();

    return createResult(true);

}

/* ========================================================================
   RUNTIME REPORT
======================================================================== */

function report(){

    return immutable({
        summary: summary(),
        runtime: runtime(),
        metrics: metrics(),
        registry: registryStatus(),
        modules: moduleInformation(),
        integrity: verifyIntegrity()
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
    verifyIntegrity,
    verify,

    summary,
    runtime,
    report,
    snapshot,

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

    return fn(...args);

}

function has(operation){

    return Object.prototype
        .hasOwnProperty.call(
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

    id: MODULE_ID,

    name: MODULE_NAME,

    version: VERSION,

    file: MODULE_PATH,

    run,
    has,
    list,

    bootstrap,
    initialize,

    diagnostics,
    health,
    healthCheck,
    verifyIntegrity,
    verify,

    summary,
    runtime,
    report,
    snapshot,

    metrics,

    moduleInformation,

    verifyModule,
    verifyModules,

    getModule,

    moduleCount,
    loadedModules,

    status: registryStatus,

    isReady,
    isInitialized

});

/* ========================================================================
   PAY54 SECURITY ROOT
======================================================================== */

Object.defineProperty(
    SECURITY,
    "bootstrap",
    {
        value: api,
        writable: false,
        configurable: false,
        enumerable: true
    }
);

/* ========================================================================
   CANONICAL PAY54 REGISTRY REGISTRATION
======================================================================== */

if(
    PLATFORM_REGISTRY.has(
        MODULE_ID
    )
){

    const existingApi =
        PLATFORM_REGISTRY.getApi(
            MODULE_ID
        );

    if(
        existingApi !== api
    ){

        throw new Error(
            "[PAY54_SECURITY] Registry collision detected for security.bootstrap."
        );

    }

}
else{

    PLATFORM_REGISTRY.register({
        id: MODULE_ID,
        name: MODULE_NAME,
        version: VERSION,
        type: MODULE_TYPE,
        layer: MODULE_LAYER,
        path: MODULE_PATH,
        health,
        api
    });

}

if(
    PLATFORM_REGISTRY.has(MODULE_ID) !== true ||
    PLATFORM_REGISTRY.getApi(MODULE_ID) !== api
){

    throw new Error(
        "[PAY54_SECURITY] Security Bootstrap Registry verification failed."
    );

}

/* ========================================================================
   AUTO BOOTSTRAP
======================================================================== */

const startup =
    bootstrap();

if(startup.success){

    const initialVerification =
        verify(
            "security-bootstrap"
        );

    if(initialVerification.ok){

        publish(
            SECURITY_EVENTS.READY,
            {
                version: VERSION
            }
        );

    }
    else{

        publish(
            SECURITY_EVENTS.ERROR,
            {
                reason:
                    "BOOTSTRAP_ATTESTATION_FAILED"
            }
        );

    }

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
    startup.success && isReady()
        ? "ready"
        : "failed"
);

/* ========================================================================
   MODULE COMPLETE
======================================================================== */

})();
