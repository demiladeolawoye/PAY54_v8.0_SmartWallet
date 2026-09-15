"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE BENEFICIARY SERVICE
   File: assets/js/services/beneficiaries.js
   Version: v1.0.0

   Work Package
   ------------
   WP-011A.4 — Beneficiary Service Boundary

   Purpose
   -------
   Canonical application/service boundary for PAY54 Beneficiaries.

   Architecture
   ------------
   UI / Payment Modules / Compatibility Facades
                        ↓
              Beneficiary Service
                        ↓
            Beneficiary Domain Engine
                        ↓
              Beneficiary Storage

   Responsibilities
   ----------------
   • Provide the canonical application-facing Beneficiary API
   • Protect the Beneficiary Domain Engine from direct UI coupling
   • Provide stable service contracts for future PAY54_RECIPIENT migration
   • Provide Beneficiary lookup and resolution
   • Provide lifecycle operations
   • Provide destination management
   • Provide Contact linking
   • Provide trust/status operations
   • Provide usage/risk operations
   • Provide health and integrity diagnostics
   • Return immutable service results
   • Preserve the frozen legacy PAY54_SERVICES catalogue

   Non-Responsibilities
   --------------------
   • Does NOT access localStorage
   • Does NOT access Beneficiary Storage directly
   • Does NOT own Contact identity
   • Does NOT modify Contacts
   • Does NOT move money
   • Does NOT modify PAY54_LEDGER
   • Does NOT modify PAY54_TX
   • Does NOT modify PAY54_SERVICES
   • Does NOT migrate pay54_recipients
   • Does NOT contain UI logic

   Dependencies
   ------------
   assets/js/core/constants/index.js
   assets/js/core/constants/modules.js
   assets/js/core/constants/versions.js
   assets/js/core/constants/beneficiaries.js
   assets/js/core/events.js
   assets/js/engine/beneficiaries/core/storage.js
   assets/js/engine/beneficiaries/beneficiaries.js

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL
    ====================================================================== */

    const GLOBAL = window;

    const VERSION = "1.0.0";

    /* ======================================================================
       DEPENDENCIES
    ====================================================================== */

    const CONSTANTS =
        GLOBAL.PAY54_CONSTANTS;

    if (
        !CONSTANTS ||
        typeof CONSTANTS.get !== "function"
    ) {
        throw new Error(
            "[PAY54] Constants Registry must load before Beneficiary Service."
        );
    }

    const MODULES =
        CONSTANTS.get("MODULES");

    if (
        !MODULES ||
        typeof MODULES !== "object"
    ) {
        throw new Error(
            "[PAY54] Module identifiers unavailable to Beneficiary Service."
        );
    }

    const VERSIONS =
        CONSTANTS.get(
            MODULES.VERSIONS
        );

    if (
        !VERSIONS ||
        typeof VERSIONS !== "object"
    ) {
        throw new Error(
            "[PAY54] Version Catalogue unavailable to Beneficiary Service."
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
            "[PAY54] Beneficiary Constants unavailable to Beneficiary Service."
        );
    }

    const ENGINE =
        GLOBAL.PAY54_BENEFICIARIES_ENGINE;

    if (
        !ENGINE ||
        typeof ENGINE !== "object"
    ) {
        throw new Error(
            "[PAY54] Beneficiary Domain Engine must load before Beneficiary Service."
        );
    }

    /* ======================================================================
       CONTRACT
    ====================================================================== */

    const REQUIRED_ENGINE_METHODS = Object.freeze([
        "getBeneficiaries",
        "getBeneficiaryById",
        "exists",
        "count",
        "findByContactId",
        "findByPay54Id",
        "findByBankAccount",
        "getTrusted",
        "getByStatus",
        "getActive",
        "searchBeneficiaries",
        "resolvePay54",
        "resolveBank",
        "resolveDestination",
        "createBeneficiary",
        "updateBeneficiary",
        "deleteBeneficiary",
        "addDestination",
        "updateDestination",
        "removeDestination",
        "getDestinations",
        "linkContact",
        "unlinkContact",
        "setTrusted",
        "trustBeneficiary",
        "untrustBeneficiary",
        "setStatus",
        "activateBeneficiary",
        "blockBeneficiary",
        "archiveBeneficiary",
        "disableBeneficiary",
        "recordUsage",
        "setRisk",
        "validateBeneficiary",
        "validateDestination",
        "verifyIntegrity",
        "getHealth"
    ]);

    for (const method of REQUIRED_ENGINE_METHODS) {

        if (
            typeof ENGINE[method] !== "function"
        ) {
            throw new Error(
                `[PAY54] Beneficiary Domain Engine method unavailable: ${method}.`
            );
        }
    }

    if (
        ENGINE.version !== VERSION ||
        BENEFICIARY_CONSTANTS.VERSION !== VERSION ||
        VERSIONS.BENEFICIARIES !== VERSION
    ) {
        throw new Error(
            "[PAY54] Beneficiary Service version contract mismatch."
        );
    }

    /* ======================================================================
       IDENTIFIERS
    ====================================================================== */

    const SERVICE_ID =
        BENEFICIARY_CONSTANTS?.MODULE?.SERVICE ||
        "services.beneficiaries";

    const MODULE_ID =
        SERVICE_ID;

    /* ======================================================================
       RUNTIME
    ====================================================================== */

    const runtime = {

        ready: false,

        startedAt: null,

        lastOperationAt: null,

        lastError: null,

        lastErrorAt: null

    };

    /* ======================================================================
       INTERNAL HELPERS
    ====================================================================== */

    function nowISO() {

        return new Date()
            .toISOString();
    }

    function clone(value) {

        if (value === undefined) {
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
            JSON.stringify(value)
        );
    }

    function deepFreeze(value) {

        if (
            value === null ||
            typeof value !== "object" ||
            Object.isFrozen(value)
        ) {
            return value;
        }

        Object.freeze(value);

        for (
            const child
            of Object.values(value)
        ) {
            deepFreeze(child);
        }

        return value;
    }

    function immutable(value) {

        return deepFreeze(
            clone(value)
        );
    }

    function markOperation() {

        runtime.lastOperationAt =
            nowISO();
    }

    function recordError(error) {

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

            markOperation();

            return immutable(
                result
            );

        } catch (error) {

            recordError(error);

            console.error(
                `[PAY54] Beneficiary Service operation failed: ${operation}`,
                error
            );

            throw error;
        }
    }

    /* ======================================================================
       READ OPERATIONS
    ====================================================================== */

    function getBeneficiaries() {

        return execute(
            "getBeneficiaries",
            () =>
                ENGINE.getBeneficiaries()
        );
    }

    function getBeneficiaryById(id) {

        return execute(
            "getBeneficiaryById",
            () =>
                ENGINE.getBeneficiaryById(id)
        );
    }

    function exists(id) {

        try {

            const result =
                ENGINE.exists(id);

            markOperation();

            return Boolean(result);

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    function count() {

        try {

            const result =
                ENGINE.count();

            markOperation();

            return Number.isFinite(
                Number(result)
            )
                ? Number(result)
                : 0;

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    function findByContactId(
        contactId
    ) {

        return execute(
            "findByContactId",
            () =>
                ENGINE.findByContactId(
                    contactId
                )
        );
    }

    function findByPay54Id(
        pay54Id
    ) {

        return execute(
            "findByPay54Id",
            () =>
                ENGINE.findByPay54Id(
                    pay54Id
                )
        );
    }

    function findByBankAccount(
        accountNumber,
        bankId = ""
    ) {

        return execute(
            "findByBankAccount",
            () =>
                ENGINE.findByBankAccount(
                    accountNumber,
                    bankId
                )
        );
    }

    function getTrusted() {

        return execute(
            "getTrusted",
            () =>
                ENGINE.getTrusted()
        );
    }

    function getByStatus(status) {

        return execute(
            "getByStatus",
            () =>
                ENGINE.getByStatus(
                    status
                )
        );
    }

    function getActive() {

        return execute(
            "getActive",
            () =>
                ENGINE.getActive()
        );
    }

    function searchBeneficiaries(
        query
    ) {

        return execute(
            "searchBeneficiaries",
            () =>
                ENGINE.searchBeneficiaries(
                    query
                )
        );
    }

    /* ======================================================================
       RESOLUTION
    ====================================================================== */

    function resolvePay54(
        pay54Id
    ) {

        return execute(
            "resolvePay54",
            () =>
                ENGINE.resolvePay54(
                    pay54Id
                )
        );
    }

    function resolveBank(
        accountNumber,
        bankId = ""
    ) {

        return execute(
            "resolveBank",
            () =>
                ENGINE.resolveBank(
                    accountNumber,
                    bankId
                )
        );
    }

    function resolveDestination(
        query
    ) {

        return execute(
            "resolveDestination",
            () =>
                ENGINE.resolveDestination(
                    clone(query)
                )
        );
    }

    /*
     * Compatibility-oriented resolver.
     *
     * This does NOT expose PAY54_RECIPIENT yet.
     * It gives the future compatibility facade a single service-level
     * method capable of resolving the two principal legacy payment
     * identities.
     */

    function resolveRecipient(
        query
    ) {

        if (
            query === null ||
            query === undefined
        ) {
            return null;
        }

        if (
            typeof query === "string"
        ) {

            const value =
                query.trim();

            if (!value) {
                return null;
            }

            if (
                value.startsWith("@")
            ) {
                return resolvePay54(
                    value
                );
            }

            /*
             * Try PAY54 identity first because existing PAY54 tags may
             * historically have been stored without an @ prefix.
             */

            const pay54 =
                resolvePay54(
                    value
                );

            if (pay54) {
                return pay54;
            }

            return resolveBank(
                value
            );
        }

        if (
            typeof query !== "object" ||
            Array.isArray(query)
        ) {
            return null;
        }

        if (
            query.pay54Id ||
            query.tag ||
            query.pay54Tag
        ) {
            return resolvePay54(
                query.pay54Id ||
                query.pay54Tag ||
                query.tag
            );
        }

        if (
            query.accountNumber
        ) {
            return resolveBank(
                query.accountNumber,
                query.bankId ||
                query.bank ||
                ""
            );
        }

        if (query.type) {
            return resolveDestination(
                query
            );
        }

        return null;
    }

    /* ======================================================================
       CREATE / UPDATE / DELETE
    ====================================================================== */

    function createBeneficiary(
        payload
    ) {

        return execute(
            "createBeneficiary",
            () =>
                ENGINE.createBeneficiary(
                    clone(payload)
                )
        );
    }

    function updateBeneficiary(
        id,
        patch
    ) {

        return execute(
            "updateBeneficiary",
            () =>
                ENGINE.updateBeneficiary(
                    id,
                    clone(patch)
                )
        );
    }

    function deleteBeneficiary(id) {

        return execute(
            "deleteBeneficiary",
            () =>
                ENGINE.deleteBeneficiary(
                    id
                )
        );
    }

    /* ======================================================================
       DESTINATIONS
    ====================================================================== */

    function addDestination(
        beneficiaryId,
        destination
    ) {

        return execute(
            "addDestination",
            () =>
                ENGINE.addDestination(
                    beneficiaryId,
                    clone(destination)
                )
        );
    }

    function updateDestination(
        beneficiaryId,
        destinationId,
        patch
    ) {

        return execute(
            "updateDestination",
            () =>
                ENGINE.updateDestination(
                    beneficiaryId,
                    destinationId,
                    clone(patch)
                )
        );
    }

    function removeDestination(
        beneficiaryId,
        destinationId
    ) {

        return execute(
            "removeDestination",
            () =>
                ENGINE.removeDestination(
                    beneficiaryId,
                    destinationId
                )
        );
    }

    function getDestinations(
        beneficiaryId
    ) {

        return execute(
            "getDestinations",
            () =>
                ENGINE.getDestinations(
                    beneficiaryId
                )
        );
    }

    /* ======================================================================
       CONTACT RELATIONSHIP
    ====================================================================== */

    function linkContact(
        beneficiaryId,
        contactId
    ) {

        return execute(
            "linkContact",
            () =>
                ENGINE.linkContact(
                    beneficiaryId,
                    contactId
                )
        );
    }

    function unlinkContact(
        beneficiaryId
    ) {

        return execute(
            "unlinkContact",
            () =>
                ENGINE.unlinkContact(
                    beneficiaryId
                )
        );
    }

    /* ======================================================================
       TRUST
    ====================================================================== */

    function setTrusted(
        beneficiaryId,
        trusted
    ) {

        return execute(
            "setTrusted",
            () =>
                ENGINE.setTrusted(
                    beneficiaryId,
                    Boolean(trusted)
                )
        );
    }

    function trustBeneficiary(
        beneficiaryId
    ) {

        return execute(
            "trustBeneficiary",
            () =>
                ENGINE.trustBeneficiary(
                    beneficiaryId
                )
        );
    }

    function untrustBeneficiary(
        beneficiaryId
    ) {

        return execute(
            "untrustBeneficiary",
            () =>
                ENGINE.untrustBeneficiary(
                    beneficiaryId
                )
        );
    }

    /* ======================================================================
       STATUS
    ====================================================================== */

    function setStatus(
        beneficiaryId,
        status
    ) {

        return execute(
            "setStatus",
            () =>
                ENGINE.setStatus(
                    beneficiaryId,
                    status
                )
        );
    }

    function activateBeneficiary(id) {

        return execute(
            "activateBeneficiary",
            () =>
                ENGINE.activateBeneficiary(
                    id
                )
        );
    }

    function blockBeneficiary(id) {

        return execute(
            "blockBeneficiary",
            () =>
                ENGINE.blockBeneficiary(
                    id
                )
        );
    }

    function archiveBeneficiary(id) {

        return execute(
            "archiveBeneficiary",
            () =>
                ENGINE.archiveBeneficiary(
                    id
                )
        );
    }

    function disableBeneficiary(id) {

        return execute(
            "disableBeneficiary",
            () =>
                ENGINE.disableBeneficiary(
                    id
                )
        );
    }

    /* ======================================================================
       USAGE
    ====================================================================== */

    function recordUsage(
        beneficiaryId,
        options = {}
    ) {

        return execute(
            "recordUsage",
            () =>
                ENGINE.recordUsage(
                    beneficiaryId,
                    clone(options)
                )
        );
    }

    /* ======================================================================
       RISK
    ====================================================================== */

    function setRisk(
        beneficiaryId,
        payload
    ) {

        return execute(
            "setRisk",
            () =>
                ENGINE.setRisk(
                    beneficiaryId,
                    clone(payload)
                )
        );
    }

    /* ======================================================================
       VALIDATION
    ====================================================================== */

    function validateBeneficiary(
        payload
    ) {

        try {

            const result =
                ENGINE.validateBeneficiary(
                    clone(payload)
                );

            markOperation();

            return result === true;

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    function validateDestination(
        destination
    ) {

        try {

            const result =
                ENGINE.validateDestination(
                    clone(destination)
                );

            markOperation();

            return result === true;

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    /* ======================================================================
       INTEGRITY
    ====================================================================== */

    function verifyIntegrity() {

        return execute(
            "verifyIntegrity",
            () =>
                ENGINE.verifyIntegrity()
        );
    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    function getHealth() {

        const engineHealth =
            ENGINE.getHealth();

        const legacyServices =
            GLOBAL.PAY54_SERVICES;

        const legacyServicesPreserved =
            Boolean(legacyServices);

        const servicesCatalogueProtected =
            !legacyServices ||
            Object.isFrozen(
                legacyServices
            ) ||
            !Object.isExtensible(
                legacyServices
            );

        const healthy =
            runtime.ready === true &&
            engineHealth?.healthy === true;

        return immutable({

            healthy,

            status:
                healthy
                    ? "ready"
                    : "degraded",

            module:
                MODULE_ID,

            serviceId:
                SERVICE_ID,

            version:
                VERSION,

            engineHealthy:
                engineHealth?.healthy === true,

            engine:
                engineHealth,

            beneficiaryCount:
                Number(
                    engineHealth?.beneficiaryCount ??
                    0
                ),

            legacyServicesPreserved,

            servicesCatalogueProtected,

            startedAt:
                runtime.startedAt,

            lastOperationAt:
                runtime.lastOperationAt,

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

        if (runtime.ready) {
            return getHealth();
        }

        const engineHealth =
            ENGINE.getHealth();

        if (
            !engineHealth ||
            engineHealth.healthy !== true
        ) {
            throw new Error(
                "[PAY54] Beneficiary Domain Engine is not healthy."
            );
        }

        /*
         * PAY54_SERVICES is intentionally NOT modified here.
         *
         * The existing Services catalogue is frozen/non-extensible.
         * Beneficiaries therefore follows the same standalone-service
         * architecture established by PAY54_CONTACTS_SERVICE.
         */

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

        serviceId:
            SERVICE_ID,

        initialise,

        initialize:
            initialise,

        getHealth,

        health:
            getHealth,

        verifyIntegrity,

        validateBeneficiary,

        validateDestination,

        getBeneficiaries,

        getAll:
            getBeneficiaries,

        list:
            getBeneficiaries,

        getById:
            getBeneficiaryById,

        getBeneficiaryById,

        exists,

        count,

        findByContactId,

        findByPay54Id,

        findByBankAccount,

        getTrusted,

        getByStatus,

        getActive,

        search:
            searchBeneficiaries,

        searchBeneficiaries,

        resolve:
            resolveRecipient,

        resolveRecipient,

        resolvePay54,

        resolveBank,

        resolveDestination,

        create:
            createBeneficiary,

        add:
            createBeneficiary,

        createBeneficiary,

        addBeneficiary:
            createBeneficiary,

        update:
            updateBeneficiary,

        updateBeneficiary,

        remove:
            deleteBeneficiary,

        delete:
            deleteBeneficiary,

        deleteBeneficiary,

        addDestination,

        updateDestination,

        removeDestination,

        getDestinations,

        linkContact,

        unlinkContact,

        setTrusted,

        trustBeneficiary,

        untrustBeneficiary,

        setStatus,

        activateBeneficiary,

        blockBeneficiary,

        archiveBeneficiary,

        disableBeneficiary,

        recordUsage,

        updateUsage:
            recordUsage,

        setRisk

    };

    /* ======================================================================
       BOOTSTRAP
    ====================================================================== */

    try {

        initialise();

        const FROZEN_API =
            Object.freeze(API);

        /*
         * Canonical standalone service.
         */

        GLOBAL.PAY54_BENEFICIARIES_SERVICE =
            FROZEN_API;

        /*
         * Additive Beneficiary namespace integration.
         *
         * This namespace belongs to the Beneficiary subsystem and is
         * intentionally separate from the frozen PAY54_SERVICES catalogue.
         */

        if (
            GLOBAL.PAY54_BENEFICIARIES &&
            typeof GLOBAL.PAY54_BENEFICIARIES ===
                "object"
        ) {

            GLOBAL.PAY54_BENEFICIARIES.SERVICE =
                FROZEN_API;

            GLOBAL.PAY54_BENEFICIARIES.service =
                FROZEN_API;
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
                    SERVICE_ID,
                    FROZEN_API
                );

            } catch (error) {

                console.warn(
                    "[PAY54] Beneficiary Service platform registry registration skipped:",
                    error
                );
            }
        }

    } catch (error) {

        runtime.ready =
            false;

        recordError(error);

        console.error(
            "[PAY54] Beneficiary Service bootstrap failed:",
            error
        );

        throw error;
    }

    /* ======================================================================
       STARTUP
    ====================================================================== */

    console.info(
        "✅ PAY54 Beneficiary Service",
        VERSION,
        "loaded."
    );

})();
