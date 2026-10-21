"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE CORE BOOTSTRAP
   File: assets/js/core/bootstrap.js
   Version: v12.0.0

   Purpose
   -------
   Canonical Project Titan Core bootstrap coordinator.

   Responsibilities
   ----------------
   • Verify mandatory Core dependencies
   • Reconcile deferred Constants → Platform Registry registration
   • Verify Constants, Registry, Config and Event Bus contracts
   • Verify canonical Core component versions
   • Register Bootstrap in the Platform Registry
   • Publish the canonical "core.ready" lifecycle event exactly once
   • Expose immutable Core boot state and diagnostics
   • Fail closed when mandatory Core contracts are missing or unhealthy

   Architecture
   ------------
   Constants
      ↓
   Registry
      ↓
   Config
      ↓
   Events
      ↓
   Bootstrap
      ↓
   Security
      ↓
   Infrastructure
      ↓
   Services
      ↓
   Engines
      ↓
   Modules
      ↓
   UI
      ↓
   Dashboard

   Non-responsibilities
   --------------------
   • Does not initialise Security
   • Does not initialise Infrastructure, Services or Engines
   • Does not publish "app.ready"
   • Does not mutate Ledger or wallet balances
   • Does not create, reverse or retry transactions
   • Does not call payment providers
   • Does not lock the Platform Registry during staged migration

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL / IDENTITY
    ====================================================================== */

    const GLOBAL =
        window;

    const MODULE_ID =
        "BOOTSTRAP";

    const MODULE_NAME =
        "PAY54 Enterprise Core Bootstrap";

    const FILE_PATH =
        "assets/js/core/bootstrap.js";

    const VERSION =
        "12.0.0";

    const STARTED_AT =
        new Date().toISOString();

    const CORE_READY_EVENT =
        "core.ready";

    /* ======================================================================
       SAFE RELOAD GUARD
    ====================================================================== */

    const existingBootstrap =
        GLOBAL.PAY54_BOOTSTRAP;

    if (existingBootstrap) {

        if (
            existingBootstrap.id === MODULE_ID &&
            existingBootstrap.version === VERSION &&
            typeof existingBootstrap.health === "function" &&
            typeof existingBootstrap.getState === "function"
        ) {

            console.info(
                "[PAY54_BOOTSTRAP] Existing Core Bootstrap preserved."
            );

            return;
        }

        throw new Error(
            "[PAY54_BOOTSTRAP] PAY54_BOOTSTRAP already exists with an incompatible contract."
        );
    }

    /* ======================================================================
       PRIVATE STATE
    ====================================================================== */

    const state = {

        phase:
            "STARTING",

        ready:
            false,

        failed:
            false,

        startedAt:
            STARTED_AT,

        readyAt:
            null,

        failedAt:
            null,

        constantsReconciled:
            false,

        registered:
            false,

        coreReadyPublished:
            false,

        lastError:
            null,

        checks:
            Object.create(null)
    };

    /* ======================================================================
       UTILITIES
    ====================================================================== */

    function nowISO() {

        return new Date()
            .toISOString();
    }


    function recordCheck(
        name,
        ok,
        detail = null
    ) {

        state.checks[name] =
            Object.freeze({

                ok:
                    ok === true,

                detail,

                checkedAt:
                    nowISO()
            });

        return ok === true;
    }


    function fail(
        message,
        cause = null
    ) {

        const error =
            cause instanceof Error
                ? cause
                : new Error(
                    message
                );

        state.phase =
            "FAILED";

        state.ready =
            false;

        state.failed =
            true;

        state.failedAt =
            nowISO();

        state.lastError =
            Object.freeze({

                name:
                    error.name,

                message:
                    error.message,

                timestamp:
                    state.failedAt
            });

        console.error(
            "[PAY54_BOOTSTRAP] Core bootstrap failed:",
            error
        );

        throw error;
    }


    function requireObject(
        name,
        value
    ) {

        if (
            !value ||
            typeof value !== "object"
        ) {

            fail(
                `[PAY54_BOOTSTRAP] Required Core dependency ${name} is unavailable.`
            );
        }

        return value;
    }

    /* ======================================================================
       REQUIRED CORE DEPENDENCIES
    ====================================================================== */

    const constants =
        requireObject(
            "PAY54_CONSTANTS",
            GLOBAL.PAY54_CONSTANTS
        );

    const registry =
        requireObject(
            "PAY54_REGISTRY",
            GLOBAL.PAY54_REGISTRY
        );

    const config =
        requireObject(
            "PAY54_CONFIG",
            GLOBAL.PAY54_CONFIG
        );

    const events =
        requireObject(
            "PAY54_EVENTS",
            GLOBAL.PAY54_EVENTS
        );

    /* ======================================================================
       CANONICAL CATALOGUES
    ====================================================================== */

    const MODULES =
        typeof constants.get === "function"
            ? constants.get(
                "MODULES"
            )
            : null;

    const VERSIONS =
        typeof constants.get === "function"
            ? constants.get(
                "VERSIONS"
            )
            : null;

    if (
        !MODULES ||
        typeof MODULES !== "object"
    ) {

        fail(
            "[PAY54_BOOTSTRAP] MODULES constants catalogue is unavailable."
        );
    }

    if (
        !VERSIONS ||
        typeof VERSIONS !== "object"
    ) {

        fail(
            "[PAY54_BOOTSTRAP] VERSIONS constants catalogue is unavailable."
        );
    }

    if (
        MODULES.BOOTSTRAP !==
            MODULE_ID
    ) {

        fail(
            `[PAY54_BOOTSTRAP] MODULES.BOOTSTRAP must resolve to ${MODULE_ID}.`
        );
    }

    const CORE_VERSIONS =
        VERSIONS.COMPONENTS
            ?.CORE ||
        {};

    const expectedBootstrapVersion =
        CORE_VERSIONS.BOOTSTRAP ||
        null;

    if (
        expectedBootstrapVersion !==
            VERSION
    ) {

        fail(
            `[PAY54_BOOTSTRAP] Bootstrap version mismatch. Expected ${VERSION}, received ${String(expectedBootstrapVersion)}.`
        );
    }

    /* ======================================================================
       CONSTANTS VERIFICATION
    ====================================================================== */

    function verifyConstants() {

        const contractAvailable =
            typeof constants.verifyIntegrity === "function" &&
            typeof constants.health === "function" &&
            typeof constants.registerWithPlatformRegistry ===
                "function";

        if (
            !contractAvailable
        ) {

            return recordCheck(
                "constantsContract",
                false,
                "Required Constants enterprise APIs are missing."
            );
        }

        const integrity =
            constants.verifyIntegrity();

        const health =
            constants.health();

        const integrityHealthy =
            integrity?.healthy === true ||
            integrity?.ok === true;

        const healthHealthy =
            health?.healthy === true ||
            health?.ok === true;

        const versionCorrect =
            typeof constants.version === "function" &&
            constants.version() ===
                CORE_VERSIONS.CONSTANTS_REGISTRY;

        const ok =
            integrityHealthy &&
            healthHealthy &&
            versionCorrect;

        return recordCheck(
            "constantsHealth",
            ok,
            Object.freeze({

                integrityHealthy,

                healthHealthy,

                version:
                    typeof constants.version === "function"
                        ? constants.version()
                        : null,

                expectedVersion:
                    CORE_VERSIONS.CONSTANTS_REGISTRY ||
                    null
            })
        );
    }

    /* ======================================================================
       DEFERRED CONSTANTS → REGISTRY RECONCILIATION
    ====================================================================== */

    function reconcileConstantsRegistry() {

        const integrationResult =
            constants
                .registerWithPlatformRegistry();

        const registered =
            typeof registry.has ===
                "function" &&
            registry.has(
                MODULES.CONSTANTS
            );

        const apiMatches =
            typeof registry.getApi ===
                "function"
                ? registry.getApi(
                    MODULES.CONSTANTS
                ) === constants
                : registered;

        const ok =
            integrationResult === true &&
            registered &&
            apiMatches;

        state.constantsReconciled =
            ok;

        return recordCheck(
            "constantsRegistryIntegration",
            ok,
            Object.freeze({

                integrationResult:
                    integrationResult === true,

                registered,

                apiMatches
            })
        );
    }

    /* ======================================================================
       PLATFORM REGISTRY VERIFICATION
    ====================================================================== */

    function verifyRegistry() {

        const contractAvailable =
            typeof registry.verifyIntegrity ===
                "function" &&
            typeof registry.health ===
                "function" &&
            typeof registry.registerModule ===
                "function" &&
            typeof registry.has ===
                "function" &&
            typeof registry.getApi ===
                "function";

        if (
            !contractAvailable
        ) {

            return recordCheck(
                "registryContract",
                false,
                "Required Platform Registry APIs are missing."
            );
        }

        const integrity =
            registry.verifyIntegrity();

        const health =
            registry.health();

        const versionCorrect =
            registry.version ===
            CORE_VERSIONS.REGISTRY;

        const ok =
            integrity?.ok === true &&
            health?.healthy === true &&
            versionCorrect;

        return recordCheck(
            "registryHealth",
            ok,
            Object.freeze({

                integrityOk:
                    integrity?.ok === true,

                healthy:
                    health?.healthy === true,

                version:
                    registry.version ||
                    null,

                expectedVersion:
                    CORE_VERSIONS.REGISTRY ||
                    null,

                moduleCount:
                    health?.moduleCount ??
                    null,

                locked:
                    health?.locked ??
                    null
            })
        );
    }

    /* ======================================================================
       RUNTIME CONFIG VERIFICATION
    ====================================================================== */

    function verifyConfig() {

        const contractAvailable =
            typeof config.verifyIntegrity ===
                "function" &&
            typeof config.health ===
                "function" &&
            typeof config.get ===
                "function";

        if (
            !contractAvailable
        ) {

            return recordCheck(
                "configContract",
                false,
                "Required Runtime Config APIs are missing."
            );
        }

        const integrity =
            config.verifyIntegrity();

        const health =
            config.health();

        const versionCorrect =
            config.version ===
            CORE_VERSIONS.CONFIG;

        const ok =
            integrity?.ok === true &&
            health?.healthy === true &&
            versionCorrect;

        return recordCheck(
            "configHealth",
            ok,
            Object.freeze({

                integrityOk:
                    integrity?.ok === true,

                healthy:
                    health?.healthy === true,

                version:
                    config.version ||
                    null,

                expectedVersion:
                    CORE_VERSIONS.CONFIG ||
                    null,

                environment:
                    health?.environment ??
                    null,

                realMoneyMode:
                    health?.realMoneyMode ??
                    null
            })
        );
    }

    /* ======================================================================
       EVENT BUS VERIFICATION
    ====================================================================== */

    function verifyEvents() {

        const requiredMethods = [
            "publish",
            "subscribe",
            "getHistory",
            "getDiagnostics"
        ];

        const methodsAvailable =
            requiredMethods.every(
                method =>
                    typeof events[method] ===
                        "function"
            );

        const versionCorrect =
            events.VERSION ===
            CORE_VERSIONS.EVENTS;

        const coreEventsReadyConstant =
            events.EVENTS
                ?.CORE_EVENTS_READY ===
            "core.events.ready";

        const appReadyConstantPreserved =
            events.EVENTS
                ?.APP_READY ===
            "app.ready";

        const history =
            methodsAvailable
                ? events.getHistory()
                : [];

        const eventNames =
            Array.isArray(
                history
            )
                ? history
                    .map(
                        item =>
                            item?.event ||
                            item?.name ||
                            item?.eventName ||
                            null
                    )
                    .filter(
                        Boolean
                    )
                : [];

        const coreEventsReadySeen =
            eventNames.includes(
                "core.events.ready"
            );

        const prematureAppReadyAbsent =
            !eventNames.includes(
                "app.ready"
            );

        const ok =
            methodsAvailable &&
            versionCorrect &&
            coreEventsReadyConstant &&
            appReadyConstantPreserved &&
            coreEventsReadySeen &&
            prematureAppReadyAbsent;

        return recordCheck(
            "eventsContract",
            ok,
            Object.freeze({

                methodsAvailable,

                version:
                    events.VERSION ||
                    null,

                expectedVersion:
                    CORE_VERSIONS.EVENTS ||
                    null,

                coreEventsReadyConstant,

                appReadyConstantPreserved,

                coreEventsReadySeen,

                prematureAppReadyAbsent
            })
        );
    }

    /* ======================================================================
       BOOTSTRAP REGISTRATION
    ====================================================================== */

    function registerBootstrap() {

        const descriptor =
            Object.freeze({

                id:
                    MODULE_ID,

                name:
                    MODULE_NAME,

                version:
                    VERSION,

                type:
                    "core",

                layer:
                    MODULES.LAYERS
                        ?.CORE ||
                    "layer.core",

                path:
                    FILE_PATH,

                api:
                    API,

                health
            });

        registry.registerModule(
            MODULE_ID,
            descriptor
        );

        const registered =
            registry.has(
                MODULE_ID
            ) === true;

        const apiMatches =
            registry.getApi(
                MODULE_ID
            ) === API;

        const ok =
            registered &&
            apiMatches;

        state.registered =
            ok;

        return recordCheck(
            "bootstrapRegistration",
            ok,
            Object.freeze({

                registered,

                apiMatches
            })
        );
    }

    /* ======================================================================
       CORE READY PUBLICATION
    ====================================================================== */

    function publishCoreReady() {

        if (
            state.coreReadyPublished
        ) {

            return true;
        }

        events.publish(

            CORE_READY_EVENT,

            Object.freeze({

                moduleId:
                    MODULE_ID,

                version:
                    VERSION,

                environment:
                    config.get(
                        "environment.name",
                        null
                    ),

                realMoneyMode:
                    config.get(
                        "environment.realMoneyMode",
                        false
                    ),

                readyAt:
                    state.readyAt
            }),

            {

                source:
                    MODULE_ID
            }
        );

        state.coreReadyPublished =
            true;

        return recordCheck(
            "coreReadyPublished",
            true,
            CORE_READY_EVENT
        );
    }

    /* ======================================================================
       READ-ONLY STATE
    ====================================================================== */

    function getState() {

        return Object.freeze({

            phase:
                state.phase,

            ready:
                state.ready,

            failed:
                state.failed,

            startedAt:
                state.startedAt,

            readyAt:
                state.readyAt,

            failedAt:
                state.failedAt,

            constantsReconciled:
                state.constantsReconciled,

            registered:
                state.registered,

            coreReadyPublished:
                state.coreReadyPublished,

            lastError:
                state.lastError,

            checks:
                Object.freeze({
                    ...state.checks
                })
        });
    }

    /* ======================================================================
       INTEGRITY
    ====================================================================== */

    function verifyIntegrity() {

        const errors = [];

        if (
            !state.ready
        ) {

            errors.push(
                "Core bootstrap is not ready."
            );
        }

        if (
            !state.constantsReconciled
        ) {

            errors.push(
                "Constants are not reconciled with the Platform Registry."
            );
        }

        if (
            !state.registered
        ) {

            errors.push(
                "Bootstrap is not registered with the Platform Registry."
            );
        }

        if (
            !state.coreReadyPublished
        ) {

            errors.push(
                "core.ready has not been published."
            );
        }

        for (
            const [
                name,
                check
            ]
            of Object.entries(
                state.checks
            )
        ) {

            if (
                check?.ok !== true
            ) {

                errors.push(
                    `Core check failed: ${name}.`
                );
            }
        }

        return Object.freeze({

            ok:
                errors.length === 0,

            status:
                errors.length === 0
                    ? "HEALTHY"
                    : "DEGRADED",

            errors:
                Object.freeze(
                    errors
                ),

            checkedAt:
                nowISO()
        });
    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    function health() {

        const integrity =
            verifyIntegrity();

        return Object.freeze({

            ok:
                integrity.ok,

            healthy:
                integrity.ok,

            status:
                integrity.status,

            id:
                MODULE_ID,

            name:
                MODULE_NAME,

            version:
                VERSION,

            file:
                FILE_PATH,

            phase:
                state.phase,

            ready:
                state.ready,

            startedAt:
                state.startedAt,

            readyAt:
                state.readyAt,

            constantsReconciled:
                state.constantsReconciled,

            registered:
                state.registered,

            coreReadyPublished:
                state.coreReadyPublished,

            integrity
        });
    }

    /* ======================================================================
       PUBLIC API
    ====================================================================== */

    const API =
        Object.freeze({

            id:
                MODULE_ID,

            name:
                MODULE_NAME,

            version:
                VERSION,

            file:
                FILE_PATH,

            getState,

            verifyIntegrity,

            health
        });

    /* ======================================================================
       GLOBAL EXPOSURE
    ====================================================================== */

    Object.defineProperty(

        GLOBAL,

        "PAY54_BOOTSTRAP",

        {

            value:
                API,

            writable:
                false,

            configurable:
                false,

            enumerable:
                true
        }
    );

    /* ======================================================================
       CORE BOOT SEQUENCE
    ====================================================================== */

    try {

        state.phase =
            "VERIFYING";

        if (
            !verifyConstants()
        ) {

            fail(
                "[PAY54_BOOTSTRAP] Constants verification failed."
            );
        }

        if (
            !reconcileConstantsRegistry()
        ) {

            fail(
                "[PAY54_BOOTSTRAP] Constants → Platform Registry reconciliation failed."
            );
        }

        if (
            !verifyRegistry()
        ) {

            fail(
                "[PAY54_BOOTSTRAP] Platform Registry verification failed."
            );
        }

        if (
            !verifyConfig()
        ) {

            fail(
                "[PAY54_BOOTSTRAP] Runtime Config verification failed."
            );
        }

        if (
            !verifyEvents()
        ) {

            fail(
                "[PAY54_BOOTSTRAP] Event Bus verification failed."
            );
        }

        state.phase =
            "REGISTERING";

        if (
            !registerBootstrap()
        ) {

            fail(
                "[PAY54_BOOTSTRAP] Bootstrap registration failed."
            );
        }

        state.phase =
            "READY";

        state.ready =
            true;

        state.failed =
            false;

        state.readyAt =
            nowISO();

        publishCoreReady();

        const finalIntegrity =
            verifyIntegrity();

        if (
            !finalIntegrity.ok
        ) {

            fail(
                "[PAY54_BOOTSTRAP] Final Core integrity verification failed."
            );
        }

        console.info(
            `[PAY54_BOOTSTRAP] ${MODULE_NAME} v${VERSION} ready.`
        );

    } catch (
        error
    ) {

        if (
            !state.failed
        ) {

            fail(
                "[PAY54_BOOTSTRAP] Unexpected Core bootstrap failure.",
                error
            );
        }

        throw error;
    }

})();
