"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE CONSTANTS REGISTRY
   File: assets/js/core/constants/index.js
   Version: v12.0.0

   Purpose
   -------
   Canonical constants registry for the PAY54 Enterprise Platform.

   Responsibilities
   ----------------
   • Register immutable constant catalogues
   • Preserve legacy Constants Registry APIs
   • Provide defensive cloning and recursive immutability
   • Detect incompatible duplicate registrations
   • Provide deterministic catalogue lookup
   • Support platform registry integration
   • Support Event Bus diagnostics
   • Provide registry integrity verification
   • Provide health and version reporting
   • Support controlled registry locking
   • Prevent mutation after registration
   • Maintain zero-regression compatibility

   Architecture
   ------------
   Core
      ↓
   Constants Registry
      ↓
   Module Identifiers
      ↓
   Version Catalogue
      ↓
   Domain Constants
      ↓
   Infrastructure / Services / Engines / Modules

   Public Compatibility
   --------------------
   Existing APIs are preserved:

   PAY54_CONSTANTS.register()
   PAY54_CONSTANTS.unregister()
   PAY54_CONSTANTS.get()
   PAY54_CONSTANTS.has()
   PAY54_CONSTANTS.list()
   PAY54_CONSTANTS.entries()
   PAY54_CONSTANTS.snapshot()
   PAY54_CONSTANTS.count()
   PAY54_CONSTANTS.version()
   PAY54_CONSTANTS.health()
   PAY54_CONSTANTS.lock()

   Enterprise APIs are additive:

   PAY54_CONSTANTS.require()
   PAY54_CONSTANTS.resolve()
   PAY54_CONSTANTS.size()
   PAY54_CONSTANTS.verifyIntegrity()
   PAY54_CONSTANTS.getHealth()
   PAY54_CONSTANTS.isLocked()
   PAY54_CONSTANTS.registerWithPlatformRegistry()

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL
    ====================================================================== */

    const GLOBAL = window;

    const VERSION =
        "12.0.0";

    const ENGINE =
        "PAY54 Constants Registry";

    const MODULE_ID =
        "CONSTANTS";

    const startedAt =
        new Date().toISOString();

    /* ======================================================================
       INTERNAL REGISTRY
    ====================================================================== */

    const registry =
        new Map();

    const state = {

        locked:
            false,

        registrations:
            0,

        duplicateRegistrations:
            0,

        rejectedRegistrations:
            0,

        unregisterOperations:
            0,

        integrityChecks:
            0,

        integrityFailures:
            0,

        registryIntegrationAttempted:
            false,

        registryIntegrated:
            false,

        lastIntegrityCheck:
            null,

        lastRegistrationAt:
            null,

        lastError:
            null

    };

    /* ======================================================================
       INTERNAL CONSTANTS
    ====================================================================== */

    const EVENTS = Object.freeze({

        REGISTERED:
            "constants.registered",

        UNREGISTERED:
            "constants.unregistered",

        LOCKED:
            "constants.locked",

        INTEGRITY_VERIFIED:
            "constants.integrity.verified",

        INTEGRITY_FAILED:
            "constants.integrity.failed",

        REGISTRY_INTEGRATED:
            "constants.registry.integrated",

        ERROR:
            "constants.error"

    });

    const UNSAFE_KEYS =
        new Set([
            "__proto__",
            "prototype",
            "constructor"
        ]);

    /* ======================================================================
       BASIC UTILITIES
    ====================================================================== */

    function nowISO() {

        return new Date()
            .toISOString();

    }

    function recordError(error) {

        const normalized =
            error instanceof Error
                ? error
                : new Error(String(error));

        state.lastError = Object.freeze({

            name:
                normalized.name,

            message:
                normalized.message,

            timestamp:
                nowISO()

        });

        return normalized;

    }

    function isPlainObject(value) {

        if (
            value === null ||
            typeof value !== "object"
        ) {
            return false;
        }

        const prototype =
            Object.getPrototypeOf(value);

        return (
            prototype === Object.prototype ||
            prototype === null
        );

    }

    /* ======================================================================
       NAME VALIDATION
    ====================================================================== */

    function normalizeName(name) {

        if (
            typeof name !== "string"
        ) {
            throw new TypeError(
                "Constants module name must be a string."
            );
        }

        const normalized =
            name.trim();

        if (!normalized) {
            throw new Error(
                "Constants module name cannot be empty."
            );
        }

        if (
            normalized.length > 128
        ) {
            throw new Error(
                "Constants module name exceeds the maximum supported length."
            );
        }

        return normalized;

    }

    /*
     * Legacy compatibility helper.
     *
     * Historically validateName() validated the input without transforming
     * the externally visible catalogue key.
     */

    function validateName(name) {

        normalizeName(name);

        return true;

    }

    /* ======================================================================
       CATALOGUE VALIDATION
    ====================================================================== */

    function validateModule(module) {

        if (
            !module ||
            typeof module !== "object" ||
            Array.isArray(module)
        ) {
            throw new TypeError(
                "Constants module must be an object."
            );
        }

        return true;

    }

    function validateSafeValue(
        value,
        path = "catalogue",
        seen = new WeakSet()
    ) {

        if (
            value === null ||
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            typeof value === "undefined"
        ) {
            return true;
        }

        if (
            typeof value === "function" ||
            typeof value === "symbol" ||
            typeof value === "bigint"
        ) {
            throw new TypeError(
                `[PAY54_CONSTANTS] Unsupported constant value at ${path}.`
            );
        }

        if (
            typeof value !== "object"
        ) {
            throw new TypeError(
                `[PAY54_CONSTANTS] Invalid constant value at ${path}.`
            );
        }

        if (
            seen.has(value)
        ) {
            throw new Error(
                `[PAY54_CONSTANTS] Circular constant structure detected at ${path}.`
            );
        }

        seen.add(value);

        if (Array.isArray(value)) {

            for (
                let index = 0;
                index < value.length;
                index += 1
            ) {

                validateSafeValue(
                    value[index],
                    `${path}[${index}]`,
                    seen
                );

            }

            seen.delete(value);

            return true;

        }

        if (!isPlainObject(value)) {
            throw new TypeError(
                `[PAY54_CONSTANTS] Constants must contain only plain objects and arrays. Invalid value at ${path}.`
            );
        }

        for (
            const [key, child]
            of Object.entries(value)
        ) {

            if (
                UNSAFE_KEYS.has(key)
            ) {
                throw new Error(
                    `[PAY54_CONSTANTS] Unsafe property "${key}" rejected at ${path}.`
                );
            }

            validateSafeValue(
                child,
                `${path}.${key}`,
                seen
            );

        }

        seen.delete(value);

        return true;

    }

    /* ======================================================================
       DEFENSIVE CLONING
    ====================================================================== */

    function cloneValue(
        value,
        seen = new WeakMap()
    ) {

        if (
            value === null ||
            typeof value !== "object"
        ) {
            return value;
        }

        if (
            seen.has(value)
        ) {
            return seen.get(value);
        }

        if (Array.isArray(value)) {

            const result = [];

            seen.set(
                value,
                result
            );

            for (
                const item of value
            ) {

                result.push(
                    cloneValue(
                        item,
                        seen
                    )
                );

            }

            return result;

        }

        const result =
            Object.create(null);

        seen.set(
            value,
            result
        );

        for (
            const [key, child]
            of Object.entries(value)
        ) {

            if (
                UNSAFE_KEYS.has(key)
            ) {
                throw new Error(
                    `[PAY54_CONSTANTS] Unsafe property "${key}" rejected during cloning.`
                );
            }

            result[key] =
                cloneValue(
                    child,
                    seen
                );

        }

        return result;

    }

    /* ======================================================================
       RECURSIVE IMMUTABILITY
    ====================================================================== */

    function deepFreeze(
        value,
        seen = new WeakSet()
    ) {

        if (
            value === null ||
            typeof value !== "object"
        ) {
            return value;
        }

        if (
            seen.has(value)
        ) {
            return value;
        }

        seen.add(value);

        for (
            const child
            of Object.values(value)
        ) {

            deepFreeze(
                child,
                seen
            );

        }

        return Object.freeze(value);

    }

    function createImmutableCatalogue(
        module,
        name
    ) {

        validateModule(module);

        validateSafeValue(
            module,
            name
        );

        const cloned =
            cloneValue(module);

        return deepFreeze(
            cloned
        );

    }

    /* ======================================================================
       STRUCTURAL COMPARISON
    ====================================================================== */

    function structurallyEqual(
        left,
        right
    ) {

        if (
            Object.is(
                left,
                right
            )
        ) {
            return true;
        }

        if (
            typeof left !==
                typeof right
        ) {
            return false;
        }

        if (
            left === null ||
            right === null
        ) {
            return false;
        }

        if (
            typeof left !== "object"
        ) {
            return false;
        }

        const leftIsArray =
            Array.isArray(left);

        const rightIsArray =
            Array.isArray(right);

        if (
            leftIsArray !==
            rightIsArray
        ) {
            return false;
        }

        if (leftIsArray) {

            if (
                left.length !==
                right.length
            ) {
                return false;
            }

            for (
                let index = 0;
                index < left.length;
                index += 1
            ) {

                if (
                    !structurallyEqual(
                        left[index],
                        right[index]
                    )
                ) {
                    return false;
                }

            }

            return true;

        }

        const leftKeys =
            Object.keys(left)
                .sort();

        const rightKeys =
            Object.keys(right)
                .sort();

        if (
            leftKeys.length !==
            rightKeys.length
        ) {
            return false;
        }

        for (
            let index = 0;
            index < leftKeys.length;
            index += 1
        ) {

            if (
                leftKeys[index] !==
                rightKeys[index]
            ) {
                return false;
            }

        }

        for (
            const key of leftKeys
        ) {

            if (
                !structurallyEqual(
                    left[key],
                    right[key]
                )
            ) {
                return false;
            }

        }

        return true;

    }

    /* ======================================================================
       EVENT BUS BRIDGE
    ====================================================================== */

    function publish(
        eventName,
        payload = {}
    ) {

        try {

            const eventBus =
                GLOBAL.PAY54_EVENTS;

            if (
                !eventBus ||
                typeof eventBus.publish !== "function"
            ) {
                return false;
            }

            eventBus.publish(
                eventName,
                Object.freeze({
                    ...payload,
                    timestamp:
                        nowISO()
                }),
                {
                    source:
                        "constants"
                }
            );

            return true;

        } catch (error) {

            console.warn(
                "[PAY54_CONSTANTS] Event publication failed:",
                error
            );

            return false;

        }

    }

    /* ======================================================================
       REGISTRATION
    ====================================================================== */

    function register(
        name,
        module
    ) {

        const normalizedName =
            normalizeName(name);

        validateModule(module);

        if (state.locked) {

            state.rejectedRegistrations += 1;

            const error =
                recordError(
                    new Error(
                        "PAY54 Constants Registry is locked."
                    )
                );

            publish(
                EVENTS.ERROR,
                {
                    operation:
                        "register",

                    module:
                        normalizedName,

                    message:
                        error.message
                }
            );

            throw error;

        }

        const candidate =
            createImmutableCatalogue(
                module,
                normalizedName
            );

        if (
            registry.has(
                normalizedName
            )
        ) {

            const existing =
                registry.get(
                    normalizedName
                );

            if (
                structurallyEqual(
                    existing,
                    candidate
                )
            ) {

                state.duplicateRegistrations += 1;

                console.warn(
                    `[PAY54_CONSTANTS] ${normalizedName} already registered with an identical catalogue.`
                );

                return existing;

            }

            state.rejectedRegistrations += 1;

            const error =
                recordError(
                    new Error(
                        `[PAY54_CONSTANTS] Incompatible duplicate registration rejected for "${normalizedName}".`
                    )
                );

            publish(
                EVENTS.ERROR,
                {
                    operation:
                        "register",

                    module:
                        normalizedName,

                    message:
                        error.message
                }
            );

            throw error;

        }

        registry.set(
            normalizedName,
            candidate
        );

        state.registrations += 1;

        state.lastRegistrationAt =
            nowISO();

        console.info(
            `[PAY54_CONSTANTS] Registered ${normalizedName}`
        );

        publish(
            EVENTS.REGISTERED,
            {
                module:
                    normalizedName,

                count:
                    registry.size
            }
        );

        return candidate;

    }

    /* ======================================================================
       UNREGISTER

       Legacy API preserved.

       Once the registry is locked, removal is rejected just as registration
       is rejected. This closes the mutation gap in the original registry.
    ====================================================================== */

    function unregister(name) {

        const normalizedName =
            normalizeName(name);

        if (state.locked) {

            const error =
                recordError(
                    new Error(
                        "PAY54 Constants Registry is locked."
                    )
                );

            publish(
                EVENTS.ERROR,
                {
                    operation:
                        "unregister",

                    module:
                        normalizedName,

                    message:
                        error.message
                }
            );

            throw error;

        }

        const removed =
            registry.delete(
                normalizedName
            );

        if (removed) {

            state.unregisterOperations += 1;

            publish(
                EVENTS.UNREGISTERED,
                {
                    module:
                        normalizedName,

                    count:
                        registry.size
                }
            );

        }

        return removed;

    }

    /* ======================================================================
       LOOKUP
    ====================================================================== */

    function get(name) {

        const normalizedName =
            normalizeName(name);

        return registry.get(
            normalizedName
        );

    }

    function requireCatalogue(name) {

        const normalizedName =
            normalizeName(name);

        const module =
            registry.get(
                normalizedName
            );

        if (!module) {

            throw new Error(
                `[PAY54_CONSTANTS] Required constants module "${normalizedName}" is not registered.`
            );

        }

        return module;

    }

    function has(name) {

        const normalizedName =
            normalizeName(name);

        return registry.has(
            normalizedName
        );

    }

    function list() {

        return Object.freeze(
            Array.from(
                registry.keys()
            ).sort()
        );

    }

    function count() {

        return registry.size;

    }

    function size() {

        return registry.size;

    }

    function entries() {

        const result =
            Array.from(
                registry.entries(),
                ([name, module]) =>
                    Object.freeze([
                        name,
                        module
                    ])
            );

        return Object.freeze(
            result
        );

    }

    function snapshot() {

        const result =
            Object.create(null);

        for (
            const [name, module]
            of registry.entries()
        ) {

            result[name] =
                module;

        }

        return deepFreeze(
            result
        );

    }

    /* ======================================================================
       PATH RESOLUTION

       Examples:

       PAY54_CONSTANTS.resolve("MODULES.CONTACTS")
       PAY54_CONSTANTS.resolve("VERSIONS.DOMAIN.CONTACTS.STORAGE")
       PAY54_CONSTANTS.resolve("CONTACTS.EVENTS.CREATED")
    ====================================================================== */

    function resolve(
        path,
        fallback
    ) {

        if (
            typeof path !== "string" ||
            !path.trim()
        ) {
            throw new TypeError(
                "Constants resolution path must be a non-empty string."
            );
        }

        const segments =
            path
                .split(".")
                .map(
                    segment =>
                        segment.trim()
                )
                .filter(Boolean);

        if (
            segments.length === 0
        ) {
            return fallback;
        }

        const catalogueName =
            segments.shift();

        let current =
            registry.get(
                catalogueName
            );

        if (
            current === undefined
        ) {
            return fallback;
        }

        for (
            const segment of segments
        ) {

            if (
                UNSAFE_KEYS.has(
                    segment
                )
            ) {
                return fallback;
            }

            if (
                current === null ||
                (
                    typeof current !== "object" &&
                    typeof current !== "function"
                ) ||
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

        return (
            current === undefined
                ? fallback
                : current
        );

    }

    /* ======================================================================
       INTEGRITY VERIFICATION
    ====================================================================== */

    function verifyFrozenTree(
        value,
        path,
        seen = new WeakSet()
    ) {

        if (
            value === null ||
            typeof value !== "object"
        ) {
            return true;
        }

        if (
            seen.has(value)
        ) {
            return true;
        }

        seen.add(value);

        if (
            !Object.isFrozen(value)
        ) {
            throw new Error(
                `[PAY54_CONSTANTS] Mutable catalogue node detected at ${path}.`
            );
        }

        if (
            !Array.isArray(value) &&
            !isPlainObject(value)
        ) {
            throw new Error(
                `[PAY54_CONSTANTS] Invalid catalogue object detected at ${path}.`
            );
        }

        for (
            const [key, child]
            of Object.entries(value)
        ) {

            if (
                UNSAFE_KEYS.has(key)
            ) {
                throw new Error(
                    `[PAY54_CONSTANTS] Unsafe property detected at ${path}.${key}.`
                );
            }

            verifyFrozenTree(
                child,
                `${path}.${key}`,
                seen
            );

        }

        return true;

    }

    function verifyIntegrity() {

        state.integrityChecks += 1;

        const checkedAt =
            nowISO();

        try {

            for (
                const [name, module]
                of registry.entries()
            ) {

                validateName(name);

                validateModule(module);

                validateSafeValue(
                    module,
                    name
                );

                verifyFrozenTree(
                    module,
                    name
                );

            }

            state.lastIntegrityCheck =
                Object.freeze({

                    healthy:
                        true,

                    checkedAt,

                    modules:
                        registry.size

                });

            publish(
                EVENTS.INTEGRITY_VERIFIED,
                {
                    modules:
                        registry.size
                }
            );

            return Object.freeze({

                healthy:
                    true,

                modules:
                    registry.size,

                checkedAt

            });

        } catch (error) {

            state.integrityFailures += 1;

            const normalized =
                recordError(error);

            state.lastIntegrityCheck =
                Object.freeze({

                    healthy:
                        false,

                    checkedAt,

                    modules:
                        registry.size,

                    error:
                        normalized.message

                });

            publish(
                EVENTS.INTEGRITY_FAILED,
                {
                    modules:
                        registry.size,

                    message:
                        normalized.message
                }
            );

            return Object.freeze({

                healthy:
                    false,

                modules:
                    registry.size,

                checkedAt,

                error:
                    normalized.message

            });

        }

    }

    /* ======================================================================
       REGISTRY LOCK
    ====================================================================== */

    function lock() {

        if (
            state.locked
        ) {
            return true;
        }

        const integrity =
            verifyIntegrity();

        if (
            !integrity.healthy
        ) {
            throw new Error(
                "PAY54 Constants Registry cannot be locked because integrity verification failed."
            );
        }

        state.locked =
            true;

        console.info(
            "[PAY54_CONSTANTS] Registry locked."
        );

        publish(
            EVENTS.LOCKED,
            {
                modules:
                    registry.size
            }
        );

        return true;

    }

    function isLocked() {

        return state.locked;

    }

    /* ======================================================================
       VERSION
    ====================================================================== */

    function version() {

        return VERSION;

    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    function health() {

        const integrity =
            verifyIntegrity();

        return Object.freeze({

            engine:
                ENGINE,

            module:
                MODULE_ID,

            version:
                VERSION,

            modules:
                registry.size,

            registered:
                list(),

            healthy:
                integrity.healthy,

            locked:
                state.locked,

            registrations:
                state.registrations,

            duplicateRegistrations:
                state.duplicateRegistrations,

            rejectedRegistrations:
                state.rejectedRegistrations,

            unregisterOperations:
                state.unregisterOperations,

            integrityChecks:
                state.integrityChecks,

            integrityFailures:
                state.integrityFailures,

            registryIntegrated:
                state.registryIntegrated,

            startedAt,

            lastRegistrationAt:
                state.lastRegistrationAt,

            lastIntegrityCheck:
                state.lastIntegrityCheck,

            lastError:
                state.lastError

        });

    }

    function getHealth() {

        return health();

    }

    /* ======================================================================
       PAY54 PLATFORM REGISTRY INTEGRATION

       Integration is intentionally progressive because PAY54 deployments may
       expose different registry APIs during the enterprise migration.

       Constants remain operational even if the platform registry has not yet
       loaded. Bootstrap may invoke this method again later.
    ====================================================================== */

    function registerWithPlatformRegistry() {

        state.registryIntegrationAttempted =
            true;

        const platformRegistry =
            GLOBAL.PAY54_REGISTRY;

        if (!platformRegistry) {
            return false;
        }

        const descriptor =
            Object.freeze({

                id:
                    MODULE_ID,

                name:
                    ENGINE,

                version:
                    VERSION,

                type:
                    "core",

                api:
                    CONSTANTS,

                health

            });

        try {

            if (
                typeof platformRegistry.registerModule ===
                "function"
            ) {

                platformRegistry.registerModule(
                    MODULE_ID,
                    descriptor
                );

            } else if (
                typeof platformRegistry.register ===
                "function"
            ) {

                platformRegistry.register(
                    MODULE_ID,
                    descriptor
                );

            } else if (
                typeof platformRegistry.set ===
                "function"
            ) {

                platformRegistry.set(
                    MODULE_ID,
                    descriptor
                );

            } else {

                return false;

            }

            state.registryIntegrated =
                true;

            publish(
                EVENTS.REGISTRY_INTEGRATED,
                {
                    module:
                        MODULE_ID
                }
            );

            return true;

        } catch (error) {

            recordError(error);

            console.warn(
                "[PAY54_CONSTANTS] Platform registry integration deferred:",
                error
            );

            return false;

        }

    }

    /* ======================================================================
       PUBLIC API
    ====================================================================== */

    const CONSTANTS =
        Object.freeze({

            /* --------------------------------------------------------------
               LEGACY PUBLIC API
            -------------------------------------------------------------- */

            register,

            unregister,

            get,

            has,

            list,

            entries,

            snapshot,

            count,

            version,

            health,

            lock,

            /* --------------------------------------------------------------
               ENTERPRISE PUBLIC API
            -------------------------------------------------------------- */

            require:
                requireCatalogue,

            resolve,

            size,

            verifyIntegrity,

            getHealth,

            isLocked,

            registerWithPlatformRegistry

        });

    /* ======================================================================
       GLOBAL INSTALLATION
    ====================================================================== */

    if (
        GLOBAL.PAY54_CONSTANTS
    ) {

        const existing =
            GLOBAL.PAY54_CONSTANTS;

        /*
         * Avoid replacing an already-installed immutable registry during
         * accidental duplicate script evaluation.
         *
         * An incompatible pre-existing implementation is rejected so PAY54
         * cannot silently boot with a different constants contract.
         */

        const compatible =
            typeof existing.register === "function" &&
            typeof existing.unregister === "function" &&
            typeof existing.get === "function" &&
            typeof existing.has === "function" &&
            typeof existing.list === "function" &&
            typeof existing.entries === "function" &&
            typeof existing.snapshot === "function" &&
            typeof existing.count === "function" &&
            typeof existing.version === "function" &&
            typeof existing.health === "function" &&
            typeof existing.lock === "function";

        if (!compatible) {

            throw new Error(
                "[PAY54] An incompatible PAY54_CONSTANTS implementation is already installed."
            );

        }

        console.warn(
            "[PAY54_CONSTANTS] Registry already installed. Duplicate bootstrap ignored."
        );

        return;

    }

    Object.defineProperty(
        GLOBAL,
        "PAY54_CONSTANTS",
        {

            value:
                CONSTANTS,

            writable:
                false,

            configurable:
                false,

            enumerable:
                true

        }
    );

    /* ======================================================================
       INITIAL INTEGRITY VERIFICATION
    ====================================================================== */

    const initialIntegrity =
        verifyIntegrity();

    if (
        !initialIntegrity.healthy
    ) {

        throw new Error(
            "PAY54 Constants Registry failed initial integrity verification."
        );

    }

    /* ======================================================================
       PROGRESSIVE PLATFORM REGISTRY INTEGRATION
    ====================================================================== */

    registerWithPlatformRegistry();

    /* ======================================================================
       STARTUP
    ====================================================================== */

    console.info(
        "✅ PAY54 Constants Registry",
        VERSION,
        "loaded."
    );

})();
