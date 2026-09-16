"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE RECIPIENT ↔ BENEFICIARY COMPATIBILITY ADAPTER
   File: assets/js/engine/beneficiaries/recipient-compat.js
   Version: v1.0.0

   Work Package
   ------------
   WP-011B.5 — PAY54_RECIPIENT Compatibility Adapter

   Purpose
   -------
   Progressive, zero-regression bridge between the legacy PAY54_RECIPIENT
   contract and the canonical PAY54 Beneficiary architecture.

   Responsibilities
   ----------------
   • Preserve window.PAY54_RECIPIENT
   • Preserve the legacy recipient repository
   • Resolve legacy recipients through the Beneficiary Service
   • Delegate legacy migration to the tested Beneficiary Migration Engine
   • Provide explicit, idempotent legacy → Beneficiary synchronisation
   • Provide canonical trust and usage operations
   • Provide health, status and integrity diagnostics

   Non-Responsibilities
   --------------------
   • Does NOT replace PAY54_RECIPIENT
   • Does NOT access localStorage
   • Does NOT access PAY54_BENEFICIARIES_STORAGE
   • Does NOT automatically execute migration
   • Does NOT move money
   • Does NOT modify PAY54_LEDGER
   • Does NOT modify PAY54_TX
   • Does NOT mutate PAY54_SERVICES
   • Does NOT create or mutate Contacts
   • Does NOT duplicate Beneficiary transformation rules

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL / VERSION
    ====================================================================== */

    const GLOBAL =
        window;

    const VERSION =
        "1.0.0";

    /* ======================================================================
       CONSTANTS
    ====================================================================== */

    const CONSTANTS =
        GLOBAL.PAY54_CONSTANTS;

    if (
        !CONSTANTS ||
        typeof CONSTANTS.get !== "function"
    ) {
        throw new Error(
            "[PAY54] Constants Registry must load before Recipient Compatibility Adapter."
        );
    }

    const MODULES =
        CONSTANTS.get(
            "MODULES"
        );

    if (
        !MODULES ||
        typeof MODULES !== "object"
    ) {
        throw new Error(
            "[PAY54] Module identifiers unavailable to Recipient Compatibility Adapter."
        );
    }

    const BENEFICIARY_CONSTANTS =
        CONSTANTS.get(
            MODULES.BENEFICIARIES
        );

    if (
        !BENEFICIARY_CONSTANTS ||
        typeof BENEFICIARY_CONSTANTS !== "object"
    ) {
        throw new Error(
            "[PAY54] Beneficiary Constants unavailable to Recipient Compatibility Adapter."
        );
    }

    if (
        BENEFICIARY_CONSTANTS.VERSION !== VERSION
    ) {
        throw new Error(
            "[PAY54] Recipient Compatibility Adapter Beneficiary version contract mismatch."
        );
    }

    const MODULE_ID =
        BENEFICIARY_CONSTANTS?.MODULE?.LEGACY_FACADE ||
        "beneficiaries.legacy-facade";

    /* ======================================================================
       RUNTIME STATE
    ====================================================================== */

    const runtime = {

        ready:
            false,

        startedAt:
            null,

        lastOperationAt:
            null,

        lastSyncAt:
            null,

        lastSyncStatus:
            null,

        lastError:
            null,

        lastErrorAt:
            null

    };

    /* ======================================================================
       GENERAL HELPERS
    ====================================================================== */

    function nowISO() {

        return new Date()
            .toISOString();
    }

    function clone(
        value
    ) {

        if (
            value === undefined
        ) {
            return undefined;
        }

        if (
            typeof structuredClone === "function"
        ) {

            try {

                return structuredClone(
                    value
                );

            } catch (_) {

                /* JSON fallback */

            }
        }

        return JSON.parse(
            JSON.stringify(
                value
            )
        );
    }

    function deepFreeze(
        value
    ) {

        if (
            value === null ||
            typeof value !== "object" ||
            Object.isFrozen(value)
        ) {
            return value;
        }

        Object.freeze(
            value
        );

        for (
            const child
            of Object.values(value)
        ) {

            deepFreeze(
                child
            );
        }

        return value;
    }

    function immutable(
        value
    ) {

        return deepFreeze(
            clone(
                value
            )
        );
    }

    function isObject(
        value
    ) {

        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );
    }

    function normaliseIdentifier(
        value
    ) {

        return String(
            value ?? ""
        )
            .trim()
            .toLowerCase();
    }

    function normaliseDigits(
        value
    ) {

        return String(
            value ?? ""
        )
            .replace(
                /\D/g,
                ""
            );
    }

    function markOperation() {

        runtime.lastOperationAt =
            nowISO();
    }

    function clearError() {

        runtime.lastError =
            null;

        runtime.lastErrorAt =
            null;
    }

    function recordError(
        error
    ) {

        runtime.lastError =
            error instanceof Error
                ? error.message
                : String(error);

        runtime.lastErrorAt =
            nowISO();
    }

    function execute(
        operation,
        callback
    ) {

        try {

            const result =
                callback();

            clearError();

            markOperation();

            return immutable(
                result
            );

        } catch (
            error
        ) {

            recordError(
                error
            );

            console.error(
                `[PAY54] Recipient Compatibility Adapter operation failed: ${operation}`,
                error
            );

            throw error;
        }
    }

    /* ======================================================================
       DEPENDENCY RESOLUTION
    ====================================================================== */

    function getLegacyAPI() {

        const api =
            GLOBAL.PAY54_RECIPIENT;

        if (
            !api ||
            typeof api !== "object"
        ) {

            throw new Error(
                "[PAY54] PAY54_RECIPIENT unavailable."
            );
        }

        const required = [
            "getRecipients",
            "findRecipient"
        ];

        for (
            const method
            of required
        ) {

            if (
                typeof api[method] !== "function"
            ) {

                throw new Error(
                    `[PAY54] PAY54_RECIPIENT method unavailable: ${method}.`
                );
            }
        }

        return api;
    }

    function getBeneficiaryService() {

        const service =
            GLOBAL.PAY54_BENEFICIARIES_SERVICE;

        if (
            !service ||
            typeof service !== "object"
        ) {

            throw new Error(
                "[PAY54] Beneficiary Service unavailable."
            );
        }

        const required = [
            "getBeneficiaries",
            "getBeneficiaryById",
            "resolveRecipient",
            "findByPay54Id",
            "findByBankAccount",
            "setTrusted",
            "recordUsage",
            "verifyIntegrity",
            "getHealth"
        ];

        for (
            const method
            of required
        ) {

            if (
                typeof service[method] !== "function"
            ) {

                throw new Error(
                    `[PAY54] Beneficiary Service method unavailable: ${method}.`
                );
            }
        }

        return service;
    }

    function getMigrationEngine() {

        const migration =
            GLOBAL.PAY54_BENEFICIARIES_MIGRATION;

        if (
            !migration ||
            typeof migration !== "object"
        ) {

            throw new Error(
                "[PAY54] Beneficiary Migration Engine unavailable."
            );
        }

        const required = [
            "dryRun",
            "migrate",
            "getStatus",
            "getHealth"
        ];

        for (
            const method
            of required
        ) {

            if (
                typeof migration[method] !== "function"
            ) {

                throw new Error(
                    `[PAY54] Beneficiary Migration Engine method unavailable: ${method}.`
                );
            }
        }

        return migration;
    }

    /* ======================================================================
       LEGACY RECIPIENT LOOKUP
    ====================================================================== */

    function findLegacyRecipientInternal(
        identifier
    ) {

        if (
            isObject(
                identifier
            )
        ) {

            return identifier;
        }

        const api =
            getLegacyAPI();

        const direct =
            api.findRecipient(
                identifier
            );

        if (
            direct
        ) {

            return direct;
        }

        const target =
            normaliseIdentifier(
                identifier
            );

        const digits =
            normaliseDigits(
                identifier
            );

        const recipients =
            api.getRecipients();

        if (
            !Array.isArray(
                recipients
            )
        ) {

            return null;
        }

        return recipients.find(
            recipient => {

                if (
                    !recipient ||
                    typeof recipient !== "object"
                ) {

                    return false;
                }

                const id =
                    normaliseIdentifier(
                        recipient.id
                    );

                const tag =
                    normaliseIdentifier(
                        recipient.tag
                    );

                const account =
                    normaliseDigits(
                        recipient.accountNumber
                    );

                return (
                    (
                        target &&
                        (
                            id === target ||
                            tag === target
                        )
                    ) ||
                    (
                        digits &&
                        account === digits
                    )
                );
            }
        ) || null;
    }

    /* ======================================================================
       LEGACY READ BOUNDARY
    ====================================================================== */

    function getLegacyRecipients() {

        return execute(
            "getLegacyRecipients",
            () => {

                const recipients =
                    getLegacyAPI()
                        .getRecipients();

                return Array.isArray(
                    recipients
                )
                    ? recipients
                    : [];
            }
        );
    }

    function getLegacyRecipient(
        identifier
    ) {

        return execute(
            "getLegacyRecipient",
            () =>
                findLegacyRecipientInternal(
                    identifier
                )
        );
    }

    /* ======================================================================
       CANONICAL BENEFICIARY READ BOUNDARY
    ====================================================================== */

    function getBeneficiaries() {

        return execute(
            "getBeneficiaries",
            () =>
                getBeneficiaryService()
                    .getBeneficiaries()
        );
    }

    function getBeneficiaryById(
        id
    ) {

        return execute(
            "getBeneficiaryById",
            () =>
                getBeneficiaryService()
                    .getBeneficiaryById(
                        id
                    )
        );
    }

    /* ======================================================================
       RECIPIENT → BENEFICIARY RESOLUTION
    ====================================================================== */

    function resolveLegacyRecipient(
        recipientOrIdentifier
    ) {

        return execute(
            "resolveLegacyRecipient",
            () => {

                const service =
                    getBeneficiaryService();

                const recipient =
                    findLegacyRecipientInternal(
                        recipientOrIdentifier
                    );

                if (
                    !recipient
                ) {

                    return null;
                }

                /*
                 * Canonical Beneficiary Service owns resolution.
                 *
                 * The compatibility adapter deliberately does not reproduce
                 * PAY54/bank destination mapping rules.
                 */

                return service.resolveRecipient(
                    clone(
                        recipient
                    )
                );
            }
        );
    }

    function resolveRecipient(
        query
    ) {

        return execute(
            "resolveRecipient",
            () => {

                const service =
                    getBeneficiaryService();

                /*
                 * Canonical resolution first.
                 */

                const canonical =
                    service.resolveRecipient(
                        clone(
                            query
                        )
                    );

                if (
                    canonical
                ) {

                    return canonical;
                }

                /*
                 * Compatibility fallback for legacy identifiers.
                 */

                if (
                    typeof query === "string"
                ) {

                    const legacy =
                        findLegacyRecipientInternal(
                            query
                        );

                    if (
                        legacy
                    ) {

                        return service.resolveRecipient(
                            clone(
                                legacy
                            )
                        );
                    }
                }

                return null;
            }
        );
    }

    /* ======================================================================
       MIGRATION / SYNCHRONISATION

       The compatibility adapter does not implement migration rules.

       Transformation, validation, duplicate protection, persistence,
       verification and legacy-preservation policy remain owned by:

       PAY54_BENEFICIARIES_MIGRATION
    ====================================================================== */

    function dryRun() {

        return execute(
            "dryRun",
            () =>
                getMigrationEngine()
                    .dryRun()
        );
    }

    function synchronise(
        options = {}
    ) {

        return execute(
            "synchronise",
            () => {

                const migration =
                    getMigrationEngine();

                const strict =
                    options?.strict !== false;

                const result =
                    migration.migrate({
                        strict
                    });

                runtime.lastSyncAt =
                    nowISO();

                runtime.lastSyncStatus =
                    result?.status ||
                    "unknown";

                return result;
            }
        );
    }

    function sync(
        options = {}
    ) {

        return synchronise(
            options
        );
    }

    function reconcile(
        options = {}
    ) {

        return synchronise(
            options
        );
    }

    function getMigrationStatus() {

        return execute(
            "getMigrationStatus",
            () =>
                getMigrationEngine()
                    .getStatus()
        );
    }

    /* ======================================================================
       CONTROLLED CANONICAL TRUST OPERATION
    ====================================================================== */

    function setTrusted(
        recipientOrIdentifier,
        trusted
    ) {

        return execute(
            "setTrusted",
            () => {

                const service =
                    getBeneficiaryService();

                const recipient =
                    findLegacyRecipientInternal(
                        recipientOrIdentifier
                    );

                if (
                    !recipient
                ) {

                    return null;
                }

                const beneficiary =
                    service.resolveRecipient(
                        clone(
                            recipient
                        )
                    );

                if (
                    !beneficiary ||
                    !beneficiary.id
                ) {

                    return null;
                }

                return service.setTrusted(
                    beneficiary.id,
                    Boolean(
                        trusted
                    )
                );
            }
        );
    }

    /* ======================================================================
       CONTROLLED CANONICAL USAGE OPERATION
    ====================================================================== */

    function recordUsage(
        recipientOrIdentifier,
        options = {}
    ) {

        return execute(
            "recordUsage",
            () => {

                const service =
                    getBeneficiaryService();

                const recipient =
                    findLegacyRecipientInternal(
                        recipientOrIdentifier
                    );

                if (
                    !recipient
                ) {

                    return null;
                }

                const beneficiary =
                    service.resolveRecipient(
                        clone(
                            recipient
                        )
                    );

                if (
                    !beneficiary ||
                    !beneficiary.id
                ) {

                    return null;
                }

                return service.recordUsage(
                    beneficiary.id,
                    clone(
                        options
                    )
                );
            }
        );
    }

    /* ======================================================================
       INTEGRITY
    ====================================================================== */

    function verifyIntegrity() {

        return execute(
            "verifyIntegrity",
            () =>
                getBeneficiaryService()
                    .verifyIntegrity()
        );
    }

    /* ======================================================================
       STATUS
    ====================================================================== */

    function getStatus() {

        const legacy =
            getLegacyAPI();

        const service =
            getBeneficiaryService();

        const migration =
            getMigrationEngine();

        const recipients =
            legacy.getRecipients();

        const beneficiaries =
            service.getBeneficiaries();

        const migrationStatus =
            migration.getStatus();

        return immutable({

            module:
                MODULE_ID,

            version:
                VERSION,

            ready:
                runtime.ready,

            automaticMigration:
                false,

            legacyContractPreserved:
                GLOBAL.PAY54_RECIPIENT ===
                legacy,

            legacyRecipientCount:
                Array.isArray(
                    recipients
                )
                    ? recipients.length
                    : 0,

            beneficiaryCount:
                Array.isArray(
                    beneficiaries
                )
                    ? beneficiaries.length
                    : 0,

            preserveLegacyRecipients:
                migrationStatus
                    ?.preserveLegacyRecipients ===
                true,

            deleteLegacyAfterMigration:
                migrationStatus
                    ?.deleteLegacyAfterMigration ===
                true,

            lastSyncAt:
                runtime.lastSyncAt,

            lastSyncStatus:
                runtime.lastSyncStatus,

            lastOperationAt:
                runtime.lastOperationAt

        });
    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    function getHealth() {

        let legacyHealthy =
            false;

        let beneficiaryHealthy =
            false;

        let migrationHealthy =
            false;

        let legacyContractPreserved =
            false;

        let beneficiaryHealth =
            null;

        let migrationHealth =
            null;

        try {

            const legacy =
                getLegacyAPI();

            legacyHealthy =
                true;

            legacyContractPreserved =
                GLOBAL.PAY54_RECIPIENT ===
                legacy;

        } catch (_) {

            legacyHealthy =
                false;
        }

        try {

            beneficiaryHealth =
                getBeneficiaryService()
                    .getHealth();

            beneficiaryHealthy =
                beneficiaryHealth
                    ?.healthy === true;

        } catch (_) {

            beneficiaryHealthy =
                false;
        }

        try {

            migrationHealth =
                getMigrationEngine()
                    .getHealth();

            migrationHealthy =
                migrationHealth
                    ?.healthy === true;

        } catch (_) {

            migrationHealthy =
                false;
        }

        const healthy =
            runtime.ready === true &&
            legacyHealthy === true &&
            beneficiaryHealthy === true &&
            migrationHealthy === true &&
            legacyContractPreserved === true;

        return immutable({

            healthy,

            status:
                healthy
                    ? "ready"
                    : "degraded",

            module:
                MODULE_ID,

            version:
                VERSION,

            automaticMigration:
                false,

            legacyHealthy,

            legacyContractPreserved,

            beneficiaryHealthy,

            migrationHealthy,

            beneficiary:
                beneficiaryHealth,

            migration:
                migrationHealth,

            startedAt:
                runtime.startedAt,

            lastOperationAt:
                runtime.lastOperationAt,

            lastSyncAt:
                runtime.lastSyncAt,

            lastSyncStatus:
                runtime.lastSyncStatus,

            lastErrorAt:
                runtime.lastErrorAt,

            lastError:
                runtime.lastError

        });
    }

    /* ======================================================================
       INITIALISATION
    ====================================================================== */

    function initialise() {

        if (
            runtime.ready
        ) {

            return getHealth();
        }

        /*
         * Validate all boundaries.
         *
         * IMPORTANT:
         * No migration is executed during initialisation.
         */

        const legacy =
            getLegacyAPI();

        const service =
            getBeneficiaryService();

        const migration =
            getMigrationEngine();

        const serviceHealth =
            service.getHealth();

        const migrationHealth =
            migration.getHealth();

        if (
            serviceHealth?.healthy !== true
        ) {

            throw new Error(
                "[PAY54] Beneficiary Service is not healthy."
            );
        }

        if (
            migrationHealth?.healthy !== true
        ) {

            throw new Error(
                "[PAY54] Beneficiary Migration Engine is not healthy."
            );
        }

        if (
            GLOBAL.PAY54_RECIPIENT !==
            legacy
        ) {

            throw new Error(
                "[PAY54] Legacy PAY54_RECIPIENT contract verification failed."
            );
        }

        runtime.ready =
            true;

        runtime.startedAt =
            nowISO();

        runtime.lastOperationAt =
            runtime.startedAt;

        return getHealth();
    }

    /* ======================================================================
       PUBLIC API
    ====================================================================== */

    const API = {

        version:
            VERSION,

        module:
            MODULE_ID,

        moduleId:
            MODULE_ID,

        initialise,

        initialize:
            initialise,

        getHealth,

        health:
            getHealth,

        getStatus,

        status:
            getStatus,

        verifyIntegrity,

        getLegacyRecipients,

        getLegacyRecipient,

        getBeneficiaries,

        getAllBeneficiaries:
            getBeneficiaries,

        getBeneficiaryById,

        resolve:
            resolveRecipient,

        resolveRecipient,

        resolveLegacyRecipient,

        dryRun,

        synchronise,

        synchronize:
            synchronise,

        sync,

        reconcile,

        getMigrationStatus,

        setTrusted,

        recordUsage

    };

    /* ======================================================================
       BOOTSTRAP / EXPORTS
    ====================================================================== */

    try {

        initialise();

        const FROZEN_API =
            Object.freeze(
                API
            );

        /*
         * Canonical standalone compatibility API.
         */

        GLOBAL.PAY54_RECIPIENT_COMPAT =
            FROZEN_API;

        /*
         * Additive Beneficiary namespace integration.
         */

        if (
            GLOBAL.PAY54_BENEFICIARIES &&
            typeof GLOBAL.PAY54_BENEFICIARIES ===
                "object"
        ) {

            GLOBAL.PAY54_BENEFICIARIES.RECIPIENT_COMPAT =
                FROZEN_API;

            GLOBAL.PAY54_BENEFICIARIES.recipientCompat =
                FROZEN_API;
        }

        /*
         * Additive legacy bridge.
         *
         * Existing PAY54_RECIPIENT functions are never replaced.
         */

        const legacy =
            GLOBAL.PAY54_RECIPIENT;

        if (
            legacy &&
            typeof legacy === "object" &&
            Object.isExtensible(
                legacy
            ) &&
            !Object.prototype.hasOwnProperty.call(
                legacy,
                "beneficiaryCompat"
            )
        ) {

            Object.defineProperty(
                legacy,
                "beneficiaryCompat",
                {

                    value:
                        FROZEN_API,

                    enumerable:
                        false,

                    configurable:
                        false,

                    writable:
                        false

                }
            );
        }

        /*
         * Optional platform registry integration.
         */

        const registry =
            GLOBAL.PAY54_REGISTRY;

        if (
            registry &&
            typeof registry.register ===
                "function"
        ) {

            try {

                registry.register(
                    MODULE_ID,
                    FROZEN_API
                );

            } catch (
                error
            ) {

                console.warn(
                    "[PAY54] Recipient Compatibility Adapter platform registry registration skipped:",
                    error
                );
            }
        }

    } catch (
        error
    ) {

        runtime.ready =
            false;

        recordError(
            error
        );

        console.error(
            "[PAY54] Recipient Compatibility Adapter bootstrap failed:",
            error
        );

        throw error;
    }

    /* ======================================================================
       STARTUP
    ====================================================================== */

    console.info(
        "✅ PAY54 Recipient Compatibility Adapter",
        VERSION,
        "loaded — legacy contract preserved; automatic migration disabled."
    );

})();
