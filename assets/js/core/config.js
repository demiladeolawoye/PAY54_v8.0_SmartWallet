"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE RUNTIME CONFIGURATION
   File: assets/js/core/config.js
   Version: v12.0.0

   Purpose
   -------
   Canonical public runtime configuration contract for Project Titan.

   Responsibilities
   ----------------
   • Define the active runtime environment
   • Distinguish implemented, enabled and live capabilities
   • Keep demonstration capability separate from authorised live capability
   • Define public market, API, UI, release and security-policy settings
   • Support controlled pre-load runtime overrides
   • Provide immutable configuration and diagnostics
   • Register with the PAY54 Enterprise Platform Registry

   Security boundary
   -----------------
   This browser configuration is PUBLIC and MUST NEVER contain secrets.

   It MUST NOT contain:
   • API secrets or private provider credentials
   • Encryption keys
   • JWT signing secrets
   • Database credentials
   • PAN, CVV, PIN or OTP values
   • Any credential whose disclosure would weaken PAY54 security

   IMPORTANT
   ---------
   Client configuration is not a regulatory or authorisation boundary.
   A capability is not genuinely live merely because this file permits it.
   Production execution must also be allowed by market rules, provider
   capability, provider real-money state, compliance controls and server-side
   policy.
========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       IDENTITY
    ====================================================================== */

    const GLOBAL =
        window;

    const MODULE_ID =
        "CONFIG";

    const MODULE_NAME =
        "PAY54 Enterprise Runtime Configuration";

    const FILE_PATH =
        "assets/js/core/config.js";

    const VERSION =
        "12.0.0";

    const STARTED_AT =
        new Date().toISOString();

    /* ======================================================================
       DEPENDENCIES
    ====================================================================== */

    const constants =
        GLOBAL.PAY54_CONSTANTS;

    if (
        !constants ||
        typeof constants.get !== "function"
    ) {

        throw new Error(
            "[PAY54_CONFIG] Constants Registry must load before config.js."
        );
    }

    const MODULES =
        constants.get(
            "MODULES"
        );

    const VERSIONS =
        constants.get(
            "VERSIONS"
        );

    if (
        !MODULES ||
        typeof MODULES !== "object"
    ) {

        throw new Error(
            "[PAY54_CONFIG] Module identifiers are unavailable."
        );
    }

    if (
        !VERSIONS ||
        typeof VERSIONS !== "object"
    ) {

        throw new Error(
            "[PAY54_CONFIG] Version catalogue is unavailable."
        );
    }

    if (
        MODULES.CONFIG !== MODULE_ID
    ) {

        throw new Error(
            `[PAY54_CONFIG] MODULES.CONFIG must resolve to ${MODULE_ID}.`
        );
    }

    const expectedVersion =
        VERSIONS.COMPONENTS
            ?.CORE
            ?.CONFIG ||
        VERSIONS.CORE ||
        null;

    if (
        expectedVersion !== VERSION
    ) {

        throw new Error(
            `[PAY54_CONFIG] Config version mismatch. Expected ${VERSION}, received ${String(expectedVersion)}.`
        );
    }

    /* ======================================================================
       SAFE RELOAD GUARD
    ====================================================================== */

    const existingConfig =
        GLOBAL.PAY54_CONFIG;

    if (existingConfig) {

        if (
            existingConfig.id === MODULE_ID &&
            existingConfig.version === VERSION &&
            typeof existingConfig.get === "function" &&
            typeof existingConfig.health === "function"
        ) {

            console.info(
                "[PAY54_CONFIG] Existing runtime configuration preserved."
            );

            return;
        }

        throw new Error(
            "[PAY54_CONFIG] PAY54_CONFIG already exists with an incompatible contract."
        );
    }

    /* ======================================================================
       UTILITIES
    ====================================================================== */

    const UNSAFE_KEYS =
        new Set([
            "__proto__",
            "prototype",
            "constructor"
        ]);

    function isPlainObject(
        value
    ) {

        if (
            value === null ||
            typeof value !== "object"
        ) {
            return false;
        }

        const prototype =
            Object.getPrototypeOf(
                value
            );

        return (
            prototype === Object.prototype ||
            prototype === null
        );
    }

    function cloneValue(
        value
    ) {

        if (
            Array.isArray(
                value
            )
        ) {

            return value.map(
                cloneValue
            );
        }

        if (
            isPlainObject(
                value
            )
        ) {

            const clone = {};

            Object.entries(
                value
            ).forEach(
                ([key, child]) => {

                    if (
                        UNSAFE_KEYS.has(
                            key
                        )
                    ) {

                        throw new Error(
                            `[PAY54_CONFIG] Unsafe configuration key rejected: ${key}.`
                        );
                    }

                    clone[key] =
                        cloneValue(
                            child
                        );
                }
            );

            return clone;
        }

        return value;
    }

    function deepFreeze(
        value
    ) {

        if (
            value === null ||
            typeof value !== "object" ||
            Object.isFrozen(
                value
            )
        ) {
            return value;
        }

        Object.getOwnPropertyNames(
            value
        ).forEach(
            key => {

                deepFreeze(
                    value[key]
                );
            }
        );

        return Object.freeze(
            value
        );
    }

    function mergeKnown(
        base,
        override,
        path = "config"
    ) {

        if (
            override === undefined
        ) {

            return cloneValue(
                base
            );
        }

        if (
            Array.isArray(
                base
            )
        ) {

            if (
                !Array.isArray(
                    override
                )
            ) {

                throw new TypeError(
                    `[PAY54_CONFIG] ${path} must be an array.`
                );
            }

            return cloneValue(
                override
            );
        }

        if (
            isPlainObject(
                base
            )
        ) {

            if (
                !isPlainObject(
                    override
                )
            ) {

                throw new TypeError(
                    `[PAY54_CONFIG] ${path} must be an object.`
                );
            }

            const result = {};

            Object.keys(
                override
            ).forEach(
                key => {

                    if (
                        UNSAFE_KEYS.has(
                            key
                        )
                    ) {

                        throw new Error(
                            `[PAY54_CONFIG] Unsafe configuration key rejected: ${path}.${key}.`
                        );
                    }

                    if (
                        !Object.prototype.hasOwnProperty.call(
                            base,
                            key
                        )
                    ) {

                        throw new Error(
                            `[PAY54_CONFIG] Unknown runtime override rejected: ${path}.${key}.`
                        );
                    }
                }
            );

            Object.keys(
                base
            ).forEach(
                key => {

                    result[key] =
                        mergeKnown(
                            base[key],
                            override[key],
                            `${path}.${key}`
                        );
                }
            );

            return result;
        }

        return cloneValue(
            override
        );
    }

    function cleanString(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(
            value
        ).trim();
    }

    function normaliseEnvironment(
        value
    ) {

        const environment =
            cleanString(
                value
            ).toLowerCase();

        const supported =
            new Set([
                "development",
                "test",
                "staging",
                "production"
            ]);

        if (
            !supported.has(
                environment
            )
        ) {

            throw new Error(
                `[PAY54_CONFIG] Unsupported environment: ${environment || "<empty>"}.`
            );
        }

        return environment;
    }

    function normaliseCurrency(
        value
    ) {

        const currency =
            cleanString(
                value
            ).toUpperCase();

        if (
            !/^[A-Z]{3}$/.test(
                currency
            )
        ) {

            throw new Error(
                `[PAY54_CONFIG] Invalid ISO currency code: ${currency || "<empty>"}.`
            );
        }

        return currency;
    }

    function normaliseMarket(
        value
    ) {

        const market =
            cleanString(
                value
            ).toUpperCase();

        if (
            !/^[A-Z]{2}$/.test(
                market
            )
        ) {

            throw new Error(
                `[PAY54_CONFIG] Invalid ISO market code: ${market || "<empty>"}.`
            );
        }

        return market;
    }

    function assertBoolean(
        value,
        path
    ) {

        if (
            typeof value !== "boolean"
        ) {

            throw new TypeError(
                `[PAY54_CONFIG] ${path} must be boolean.`
            );
        }
    }

    function assertFinitePositive(
        value,
        path
    ) {

        if (
            !Number.isFinite(
                value
            ) ||
            value <= 0
        ) {

            throw new TypeError(
                `[PAY54_CONFIG] ${path} must be a positive finite number.`
            );
        }
    }

    /* ======================================================================
       CANONICAL DEFAULTS

       IMPORTANT
       ---------
       These states describe the current Project Titan build conservatively.
       "live" remains false for regulated financial capability until genuine
       production providers, compliance and server-side controls permit it.
    ====================================================================== */

    const DEFAULTS = {

        app: {

            name:
                "PAY54",

            product:
                "SmartWallet",

            platform:
                "Project Titan",

            version:
                VERSIONS.PLATFORM
                    ?.RELEASE ||
                VERSION
        },

        environment: {

            name:
                "development",

            debug:
                true,

            realMoneyMode:
                false,

            allowDevelopmentProviders:
                true
        },

        release: {

            channel:
                "development",

            build:
                VERSION
        },

        api: {

            baseUrl:
                null,

            timeoutMs:
                15000
        },

        market: {

            defaultMarket:
                "NG",

            defaultCurrency:
                "NGN",

            displayCurrencies: [
                "NGN",
                "GBP",
                "USD",
                "EUR",
                "GHS",
                "KES",
                "ZAR"
            ]
        },

        features: {

            wallet: {
                implemented: true,
                enabled: true,
                live: false
            },

            send: {
                implemented: true,
                enabled: true,
                live: false
            },

            receive: {
                implemented: true,
                enabled: true,
                live: false
            },

            contacts: {
                implemented: true,
                enabled: true,
                live: false
            },

            beneficiaries: {
                implemented: true,
                enabled: true,
                live: false
            },

            fx: {
                implemented: true,
                enabled: true,
                live: false
            },

            cards: {
                implemented: true,
                enabled: true,
                live: false
            },

            linkedCardFunding: {
                implemented: true,
                enabled: true,
                live: false
            },

            bills: {
                implemented: false,
                enabled: false,
                live: false
            },

            airtime: {
                implemented: false,
                enabled: false,
                live: false
            },

            data: {
                implemented: false,
                enabled: false,
                live: false
            },

            electricity: {
                implemented: false,
                enabled: false,
                live: false
            },

            tv: {
                implemented: false,
                enabled: false,
                live: false
            },

            educationPayments: {
                implemented: false,
                enabled: false,
                live: false
            },

            giftCards: {
                implemented: false,
                enabled: false,
                live: false
            },

            savings: {
                implemented: false,
                enabled: false,
                live: false
            },

            trading: {
                implemented: false,
                enabled: false,
                live: false
            },

            crypto: {
                implemented: false,
                enabled: false,
                live: false
            },

            marketplace: {
                implemented: false,
                enabled: false,
                live: false
            },

            agentNetwork: {
                implemented: false,
                enabled: false,
                live: false
            },

            riskIntelligence: {
                implemented: false,
                enabled: false,
                live: false
            }
        },

        security: {

            failClosed:
                true,

            requirePinForFinancialActions:
                true,

            requireProviderRealMoneyCapability:
                true,

            allowClientSecrets:
                false
        },

        limits: {

            requestTimeoutMs:
                15000,

            maxUiTransactionAmount:
                100000000
        },

        ui: {

            mobileFirst:
                true,

            accessibilityRequired:
                true,

            reducedMotionAware:
                true
        }
    };

    /* ======================================================================
       PRE-LOAD RUNTIME OVERRIDES

       Deployments may define window.PAY54_RUNTIME_CONFIG before this file.
       Only known keys are accepted. The override object is copied and never
       retained as mutable configuration state.

       This mechanism is for PUBLIC deployment configuration only.
    ====================================================================== */

    const runtimeOverride =
        GLOBAL.PAY54_RUNTIME_CONFIG === undefined
            ? {}
            : GLOBAL.PAY54_RUNTIME_CONFIG;

    if (
        !isPlainObject(
            runtimeOverride
        )
    ) {

        throw new TypeError(
            "[PAY54_CONFIG] PAY54_RUNTIME_CONFIG must be a plain object when provided."
        );
    }

    const resolved =
        mergeKnown(
            DEFAULTS,
            runtimeOverride
        );

    /* ======================================================================
       NORMALISATION / VALIDATION
    ====================================================================== */

    resolved.environment.name =
        normaliseEnvironment(
            resolved.environment.name
        );

    resolved.market.defaultMarket =
        normaliseMarket(
            resolved.market.defaultMarket
        );

    resolved.market.defaultCurrency =
        normaliseCurrency(
            resolved.market.defaultCurrency
        );

    resolved.market.displayCurrencies =
        Array.from(
            new Set(
                resolved.market.displayCurrencies.map(
                    normaliseCurrency
                )
            )
        );

    if (
        !resolved.market.displayCurrencies.includes(
            resolved.market.defaultCurrency
        )
    ) {

        throw new Error(
            "[PAY54_CONFIG] Default currency must be present in displayCurrencies."
        );
    }

    assertBoolean(
        resolved.environment.debug,
        "environment.debug"
    );

    assertBoolean(
        resolved.environment.realMoneyMode,
        "environment.realMoneyMode"
    );

    assertBoolean(
        resolved.environment.allowDevelopmentProviders,
        "environment.allowDevelopmentProviders"
    );

    assertBoolean(
        resolved.security.failClosed,
        "security.failClosed"
    );

    assertBoolean(
        resolved.security.requirePinForFinancialActions,
        "security.requirePinForFinancialActions"
    );

    assertBoolean(
        resolved.security.requireProviderRealMoneyCapability,
        "security.requireProviderRealMoneyCapability"
    );

    if (
        resolved.security.allowClientSecrets !== false
    ) {

        throw new Error(
            "[PAY54_CONFIG] Client secrets are forbidden in browser configuration."
        );
    }

    assertFinitePositive(
        resolved.api.timeoutMs,
        "api.timeoutMs"
    );

    assertFinitePositive(
        resolved.limits.requestTimeoutMs,
        "limits.requestTimeoutMs"
    );

    assertFinitePositive(
        resolved.limits.maxUiTransactionAmount,
        "limits.maxUiTransactionAmount"
    );

    if (
        resolved.api.baseUrl !== null &&
        typeof resolved.api.baseUrl !== "string"
    ) {

        throw new TypeError(
            "[PAY54_CONFIG] api.baseUrl must be null or a public URL string."
        );
    }

    if (
        typeof resolved.api.baseUrl === "string"
    ) {

        resolved.api.baseUrl =
            resolved.api.baseUrl.trim();

        if (
            !resolved.api.baseUrl
        ) {

            resolved.api.baseUrl =
                null;
        }
    }

    const environmentName =
        resolved.environment.name;

    if (
        environmentName === "production" &&
        resolved.environment.debug === true
    ) {

        throw new Error(
            "[PAY54_CONFIG] Debug mode cannot be enabled in production."
        );
    }

    if (
        environmentName === "production" &&
        resolved.environment.allowDevelopmentProviders === true
    ) {

        throw new Error(
            "[PAY54_CONFIG] Development providers cannot be enabled in production."
        );
    }

    if (
        environmentName !== "production" &&
        resolved.environment.realMoneyMode === true
    ) {

        throw new Error(
            "[PAY54_CONFIG] Real-money mode is allowed only in the production environment."
        );
    }

    Object.entries(
        resolved.features
    ).forEach(
        ([featureName, state]) => {

            if (
                !isPlainObject(
                    state
                )
            ) {

                throw new TypeError(
                    `[PAY54_CONFIG] Feature ${featureName} must define a state object.`
                );
            }

            [
                "implemented",
                "enabled",
                "live"
            ].forEach(
                property => {

                    assertBoolean(
                        state[property],
                        `features.${featureName}.${property}`
                    );
                }
            );

            if (
                state.enabled === true &&
                state.implemented !== true
            ) {

                throw new Error(
                    `[PAY54_CONFIG] Feature ${featureName} cannot be enabled before it is implemented.`
                );
            }

            if (
                state.live === true &&
                (
                    state.implemented !== true ||
                    state.enabled !== true
                )
            ) {

                throw new Error(
                    `[PAY54_CONFIG] Feature ${featureName} cannot be live unless implemented and enabled.`
                );
            }

            if (
                state.live === true &&
                resolved.environment.realMoneyMode !== true
            ) {

                throw new Error(
                    `[PAY54_CONFIG] Feature ${featureName} cannot be marked live while realMoneyMode is false.`
                );
            }
        }
    );

    const CONFIG =
        deepFreeze(
            resolved
        );

    /* ======================================================================
       ACCESSORS
    ====================================================================== */

    function getByPath(
        path,
        fallback = null
    ) {

        if (
            typeof path !== "string" ||
            !path.trim()
        ) {

            return fallback;
        }

        const segments =
            path
                .split(".")
                .map(
                    segment =>
                        segment.trim()
                )
                .filter(
                    Boolean
                );

        let current =
            CONFIG;

        for (
            const segment
            of segments
        ) {

            if (
                UNSAFE_KEYS.has(
                    segment
                ) ||
                current === null ||
                typeof current !== "object" ||
                !Object.prototype.hasOwnProperty.call(
                    current,
                    segment
                )
            ) {

                return fallback;
            }

            current =
                current[segment];
        }

        return current;
    }

    function getFeature(
        name
    ) {

        const featureName =
            cleanString(
                name
            );

        if (
            !featureName ||
            !Object.prototype.hasOwnProperty.call(
                CONFIG.features,
                featureName
            )
        ) {

            return null;
        }

        return CONFIG.features[
            featureName
        ];
    }

    function isFeatureImplemented(
        name
    ) {

        return (
            getFeature(
                name
            )?.implemented === true
        );
    }

    function isFeatureEnabled(
        name
    ) {

        const feature =
            getFeature(
                name
            );

        return Boolean(
            feature?.implemented === true &&
            feature?.enabled === true
        );
    }

    function isFeatureLive(
        name
    ) {

        const feature =
            getFeature(
                name
            );

        return Boolean(
            CONFIG.environment.realMoneyMode === true &&
            feature?.implemented === true &&
            feature?.enabled === true &&
            feature?.live === true
        );
    }

    function isDevelopment() {

        return (
            CONFIG.environment.name ===
                "development"
        );
    }

    function isTest() {

        return (
            CONFIG.environment.name ===
                "test"
        );
    }

    function isStaging() {

        return (
            CONFIG.environment.name ===
                "staging"
        );
    }

    function isProduction() {

        return (
            CONFIG.environment.name ===
                "production"
        );
    }

    function snapshot() {

        return deepFreeze(
            cloneValue(
                CONFIG
            )
        );
    }

    /* ======================================================================
       HEALTH / INTEGRITY
    ====================================================================== */

    function verifyIntegrity() {

        const errors = [];

        if (
            !Object.isFrozen(
                CONFIG
            )
        ) {

            errors.push(
                "Root configuration object is mutable."
            );
        }

        if (
            CONFIG.environment.name !==
                normaliseEnvironment(
                    CONFIG.environment.name
                )
        ) {

            errors.push(
                "Environment normalisation failed."
            );
        }

        if (
            CONFIG.security.allowClientSecrets !==
                false
        ) {

            errors.push(
                "Client-secret protection is not enforced."
            );
        }

        Object.entries(
            CONFIG.features
        ).forEach(
            ([name, feature]) => {

                if (
                    !Object.isFrozen(
                        feature
                    )
                ) {

                    errors.push(
                        `Feature state ${name} is mutable.`
                    );
                }

                if (
                    feature.live === true &&
                    CONFIG.environment.realMoneyMode !== true
                ) {

                    errors.push(
                        `Feature ${name} is live while realMoneyMode is disabled.`
                    );
                }
            }
        );

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
                new Date().toISOString()
        });
    }

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

            startedAt:
                STARTED_AT,

            environment:
                CONFIG.environment.name,

            realMoneyMode:
                CONFIG.environment.realMoneyMode,

            defaultMarket:
                CONFIG.market.defaultMarket,

            defaultCurrency:
                CONFIG.market.defaultCurrency,

            featureCount:
                Object.keys(
                    CONFIG.features
                ).length,

            liveFeatureCount:
                Object.values(
                    CONFIG.features
                ).filter(
                    feature =>
                        feature.live === true
                ).length,

            integrity
        });
    }

    /* ======================================================================
       EVENT PUBLICATION

       Events are optional because Config belongs to early Core boot.
    ====================================================================== */

    function publishReadyEvent() {

        try {

            const events =
                GLOBAL.PAY54_EVENTS;

            if (
                !events ||
                typeof events.publish !== "function"
            ) {

                return false;
            }

            events.publish(
                "config.ready",
                Object.freeze({
                    moduleId:
                        MODULE_ID,
                    version:
                        VERSION,
                    environment:
                        CONFIG.environment.name,
                    realMoneyMode:
                        CONFIG.environment.realMoneyMode,
                    occurredAt:
                        new Date().toISOString()
                }),
                {
                    source:
                        MODULE_ID
                }
            );

            return true;

        } catch (
            error
        ) {

            console.warn(
                "[PAY54_CONFIG] Ready event publication failed.",
                error
            );

            return false;
        }
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

            get:
                getByPath,

            getFeature,

            isFeatureImplemented,

            isFeatureEnabled,

            isFeatureLive,

            isDevelopment,

            isTest,

            isStaging,

            isProduction,

            snapshot,

            verifyIntegrity,

            health
        });

    /* ======================================================================
       PLATFORM REGISTRY INTEGRATION
    ====================================================================== */

    const registry =
        GLOBAL.PAY54_REGISTRY;

    if (
        !registry ||
        typeof registry.registerModule !== "function"
    ) {

        throw new Error(
            "[PAY54_CONFIG] Enterprise Platform Registry must load before config.js."
        );
    }

    registry.registerModule(
        MODULE_ID,
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
                "layer.core",

            path:
                FILE_PATH,

            api:
                API,

            health
        })
    );

    /* ======================================================================
       GLOBAL EXPOSURE
    ====================================================================== */

    Object.defineProperty(
        GLOBAL,
        "PAY54_CONFIG",
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

    publishReadyEvent();

    console.info(
        `[PAY54_CONFIG] ${MODULE_NAME} v${VERSION} ready — ${CONFIG.environment.name}; realMoneyMode=${CONFIG.environment.realMoneyMode}.`
    );

})();
