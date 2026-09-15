"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE BENEFICIARY DOMAIN ENGINE
   File: assets/js/engine/beneficiaries/beneficiaries.js
   Version: v1.0.0

   Work Package
   ------------
   WP-011A.3 — Enterprise Beneficiary Domain Engine

   Purpose
   -------
   Canonical business/domain layer for PAY54 payment beneficiaries.

   Architecture
   ------------
   Contacts
      ↓ contactId
   Beneficiary Domain Engine
      ↓
   Beneficiary Storage
      ↓
   Payment Services
      ↓
   Transactions
      ↓
   Ledger

   Responsibilities
   ----------------
   • Own Beneficiary domain behaviour
   • Enforce payment-destination business rules
   • Prevent duplicate payment destinations
   • Manage Beneficiary lifecycle
   • Manage payment destinations
   • Manage Contact relationships
   • Manage trusted-beneficiary state
   • Manage usage information
   • Manage risk state
   • Resolve Beneficiaries by payment identity
   • Provide search/query capabilities
   • Provide immutable outward results
   • Provide domain health/integrity diagnostics
   • Preserve storage abstraction
   • Prepare for PAY54_RECIPIENT compatibility migration

   Non-Responsibilities
   --------------------
   • Does NOT access localStorage
   • Does NOT migrate pay54_recipients
   • Does NOT own Contact identity
   • Does NOT mutate Contacts
   • Does NOT move money
   • Does NOT modify PAY54_LEDGER
   • Does NOT modify PAY54_TX
   • Does NOT contain UI logic

   Dependencies
   ------------
   assets/js/core/constants/index.js
   assets/js/core/constants/modules.js
   assets/js/core/constants/versions.js
   assets/js/core/constants/contacts.js
   assets/js/core/constants/beneficiaries.js
   assets/js/core/events.js
   assets/js/engine/beneficiaries/core/storage.js

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL / VERSION
    ====================================================================== */

    const GLOBAL = window;

    const VERSION = "1.0.0";

    /* ======================================================================
       DEPENDENCY VERIFICATION
    ====================================================================== */

    const CONSTANTS =
        GLOBAL.PAY54_CONSTANTS;

    if (
        !CONSTANTS ||
        typeof CONSTANTS.get !== "function"
    ) {
        throw new Error(
            "[PAY54] Constants Registry must load before Beneficiary Engine."
        );
    }

    const MODULES =
        CONSTANTS.get("MODULES");

    if (
        !MODULES ||
        typeof MODULES !== "object"
    ) {
        throw new Error(
            "[PAY54] Module identifiers unavailable to Beneficiary Engine."
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
            "[PAY54] Version Catalogue unavailable to Beneficiary Engine."
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
            "[PAY54] Beneficiary Constants unavailable to Beneficiary Engine."
        );
    }

    const STORAGE =
        GLOBAL.PAY54_BENEFICIARIES_STORAGE;

    if (
        !STORAGE ||
        typeof STORAGE !== "object"
    ) {
        throw new Error(
            "[PAY54] Beneficiary Storage must load before Beneficiary Engine."
        );
    }

    const REQUIRED_STORAGE_METHODS = [
        "getBeneficiaries",
        "getBeneficiaryById",
        "createBeneficiary",
        "updateBeneficiary",
        "deleteBeneficiary",
        "addDestination",
        "updateDestination",
        "removeDestination",
        "getDestinations",
        "findByContactId",
        "findByPay54Id",
        "findByBankAccount",
        "getTrusted",
        "getByStatus",
        "setTrusted",
        "setStatus",
        "updateUsage",
        "setRisk",
        "linkContact",
        "unlinkContact",
        "verifyIntegrity",
        "getHealth"
    ];

    for (
        const method
        of REQUIRED_STORAGE_METHODS
    ) {
        if (
            typeof STORAGE[method] !==
            "function"
        ) {
            throw new Error(
                `[PAY54] Beneficiary Storage method unavailable: ${method}.`
            );
        }
    }

    if (
        STORAGE.version !== VERSION ||
        BENEFICIARY_CONSTANTS.VERSION !== VERSION ||
        VERSIONS.BENEFICIARIES !== VERSION
    ) {
        throw new Error(
            "[PAY54] Beneficiary Engine version contract mismatch."
        );
    }

    /* ======================================================================
       CONSTANT REFERENCES
    ====================================================================== */

    const TYPES =
        BENEFICIARY_CONSTANTS.TYPES;

    const DESTINATION_TYPES =
        BENEFICIARY_CONSTANTS.DESTINATION_TYPES;

    const STATUS =
        BENEFICIARY_CONSTANTS.STATUS;

    const RISK_LEVELS =
        BENEFICIARY_CONSTANTS.RISK_LEVELS;

    const VALIDATION =
        BENEFICIARY_CONSTANTS.VALIDATION;

    const EVENTS =
        BENEFICIARY_CONSTANTS.EVENTS;

    const MODULE_ID =
        BENEFICIARY_CONSTANTS.MODULE.ENGINE;

    /* ======================================================================
       RUNTIME
    ====================================================================== */

    const runtime = {

        ready:
            false,

        lastError:
            null,

        lastErrorAt:
            null,

        lastOperationAt:
            null

    };

    /* ======================================================================
       HELPERS
    ====================================================================== */

    function nowISO() {

        return new Date()
            .toISOString();

    }

    function cleanString(
        value,
        maxLength = 0
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        let result =
            String(value)
                .trim();

        if (
            maxLength > 0 &&
            result.length > maxLength
        ) {
            result =
                result.slice(
                    0,
                    maxLength
                );
        }

        return result;
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
            prototype ===
                Object.prototype ||
            prototype === null
        );
    }

    function deepClone(value) {

        if (
            value === undefined
        ) {
            return undefined;
        }

        if (
            typeof structuredClone ===
            "function"
        ) {
            try {
                return structuredClone(value);
            } catch (_) {
                /* fallback */
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

    function immutableClone(value) {

        return deepFreeze(
            deepClone(value)
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

    /* ======================================================================
       EVENT BRIDGE
    ====================================================================== */

    function publish(
        eventName,
        payload = {}
    ) {

        const eventBus =
            GLOBAL.PAY54_EVENTS;

        if (
            !eventBus ||
            typeof eventBus.publish !==
                "function"
        ) {
            return false;
        }

        try {

            eventBus.publish(
                eventName,
                {
                    ...deepClone(payload),
                    timestamp:
                        nowISO()
                },
                {
                    source:
                        MODULE_ID
                }
            );

            return true;

        } catch (error) {

            console.warn(
                "[PAY54] Beneficiary Engine event publication failed:",
                eventName,
                error
            );

            return false;
        }
    }

    /* ======================================================================
       TYPE HELPERS
    ====================================================================== */

    function normalizeType(value) {

        const candidate =
            cleanString(value)
                .toUpperCase();

        if (
            Object.values(TYPES)
                .includes(candidate)
        ) {
            return candidate;
        }

        throw new Error(
            `[PAY54] Unsupported Beneficiary type: ${candidate || "(empty)"}.`
        );
    }

    function normalizeDestinationType(
        value
    ) {

        const candidate =
            cleanString(value)
                .toUpperCase();

        if (
            Object.values(
                DESTINATION_TYPES
            ).includes(candidate)
        ) {
            return candidate;
        }

        throw new Error(
            `[PAY54] Unsupported payment destination type: ${candidate || "(empty)"}.`
        );
    }

    function normalizeStatus(value) {

        const candidate =
            cleanString(value)
                .toUpperCase();

        if (
            Object.values(STATUS)
                .includes(candidate)
        ) {
            return candidate;
        }

        throw new Error(
            `[PAY54] Unsupported Beneficiary status: ${candidate || "(empty)"}.`
        );
    }

    /* ======================================================================
       PAYMENT IDENTITY NORMALISATION
    ====================================================================== */

    function normalizePay54Id(value) {

        let result =
            cleanString(
                value,
                VALIDATION.MAX_PAY54_ID_LENGTH
            );

        if (
            result.startsWith("@")
        ) {
            result =
                result.slice(1);
        }

        return result
            .trim()
            .toLowerCase();
    }

    function normalizeAccountNumber(value) {

        return cleanString(
            value,
            VALIDATION.MAX_ACCOUNT_NUMBER_LENGTH
        )
            .replace(/\s+/g, "");
    }

    function normalizeBankId(value) {

        return cleanString(
            value,
            VALIDATION.MAX_BANK_ID_LENGTH
        )
            .toLowerCase();
    }

    function normalizeIban(value) {

        return cleanString(
            value,
            VALIDATION.MAX_IBAN_LENGTH
        )
            .replace(/\s+/g, "")
            .toUpperCase();
    }

    /* ======================================================================
       DOMAIN VALIDATION
    ====================================================================== */

    function validateDestination(
        destination
    ) {

        if (
            !isPlainObject(destination)
        ) {
            throw new TypeError(
                "[PAY54] Payment destination must be an object."
            );
        }

        const type =
            normalizeDestinationType(
                destination.type
            );

        switch (type) {

            case DESTINATION_TYPES.PAY54:
            case DESTINATION_TYPES.WALLET:

                if (
                    !normalizePay54Id(
                        destination.pay54Id
                    )
                ) {
                    throw new Error(
                        "[PAY54] PAY54 destination requires pay54Id."
                    );
                }

                break;

            case DESTINATION_TYPES.BANK:

                if (
                    !normalizeAccountNumber(
                        destination.accountNumber
                    )
                ) {
                    throw new Error(
                        "[PAY54] Bank destination requires accountNumber."
                    );
                }

                break;

            case DESTINATION_TYPES.GLOBAL:

                if (
                    !normalizeAccountNumber(
                        destination.accountNumber
                    ) &&
                    !normalizeIban(
                        destination.iban
                    )
                ) {
                    throw new Error(
                        "[PAY54] Global destination requires accountNumber or IBAN."
                    );
                }

                break;

            case DESTINATION_TYPES.CARD:

                if (
                    !cleanString(
                        destination.bankId
                    )
                ) {
                    throw new Error(
                        "[PAY54] Card destination requires an internal reference."
                    );
                }

                break;

            case DESTINATION_TYPES.QR:
            case DESTINATION_TYPES.CRYPTO:

                break;

            default:

                throw new Error(
                    `[PAY54] Unsupported destination type: ${type}.`
                );
        }

        return true;
    }

    function validateBeneficiaryPayload(
        payload
    ) {

        if (
            !isPlainObject(payload)
        ) {
            throw new TypeError(
                "[PAY54] Beneficiary payload must be an object."
            );
        }

        normalizeType(
            payload.type
        );

        const destinations =
            Array.isArray(
                payload.destinations
            )
                ? payload.destinations
                : [];

        if (
            destinations.length === 0
        ) {
            throw new Error(
                "[PAY54] Beneficiary requires at least one payment destination."
            );
        }

        if (
            destinations.length >
            VALIDATION.MAX_DESTINATIONS_PER_BENEFICIARY
        ) {
            throw new Error(
                "[PAY54] Beneficiary destination limit exceeded."
            );
        }

        for (
            const destination
            of destinations
        ) {
            validateDestination(
                destination
            );
        }

        return true;
    }

    /* ======================================================================
       DUPLICATE DETECTION
    ====================================================================== */

    function destinationFingerprint(
        destination
    ) {

        validateDestination(
            destination
        );

        const type =
            normalizeDestinationType(
                destination.type
            );

        switch (type) {

            case DESTINATION_TYPES.PAY54:
            case DESTINATION_TYPES.WALLET:

                return [
                    type,
                    normalizePay54Id(
                        destination.pay54Id
                    )
                ].join(":");

            case DESTINATION_TYPES.BANK:

                return [
                    type,
                    normalizeBankId(
                        destination.bankId
                    ),
                    normalizeAccountNumber(
                        destination.accountNumber
                    )
                ].join(":");

            case DESTINATION_TYPES.GLOBAL:

                return [
                    type,
                    normalizeBankId(
                        destination.bankId
                    ),
                    normalizeAccountNumber(
                        destination.accountNumber
                    ),
                    normalizeIban(
                        destination.iban
                    )
                ].join(":");

            case DESTINATION_TYPES.CARD:

                return [
                    type,
                    cleanString(
                        destination.bankId
                    )
                        .toLowerCase()
                ].join(":");

            case DESTINATION_TYPES.QR:
            case DESTINATION_TYPES.CRYPTO:

                return [
                    type,
                    cleanString(
                        destination.id
                    )
                ].join(":");

            default:

                throw new Error(
                    "[PAY54] Unable to fingerprint payment destination."
                );
        }
    }

    function findDuplicateDestination(
        destination,
        excludeBeneficiaryId = "",
        excludeDestinationId = ""
    ) {

        const fingerprint =
            destinationFingerprint(
                destination
            );

        const beneficiaryExclusion =
            cleanString(
                excludeBeneficiaryId
            );

        const destinationExclusion =
            cleanString(
                excludeDestinationId
            );

        const beneficiaries =
            STORAGE.getBeneficiaries();

        for (
            const beneficiary
            of beneficiaries
        ) {

            for (
                const candidate
                of beneficiary.destinations
            ) {

                if (
                    beneficiary.id ===
                        beneficiaryExclusion &&
                    candidate.id ===
                        destinationExclusion
                ) {
                    continue;
                }

                try {

                    if (
                        destinationFingerprint(
                            candidate
                        ) ===
                        fingerprint
                    ) {
                        return immutableClone({
                            beneficiary,
                            destination:
                                candidate
                        });
                    }

                } catch (_) {
                    /* storage integrity owns malformed persisted records */
                }
            }
        }

        return null;
    }

    function assertNoDuplicateDestination(
        destination,
        excludeBeneficiaryId = "",
        excludeDestinationId = ""
    ) {

        const duplicate =
            findDuplicateDestination(
                destination,
                excludeBeneficiaryId,
                excludeDestinationId
            );

        if (duplicate) {

            throw new Error(
                `[PAY54] Payment destination already belongs to Beneficiary ${duplicate.beneficiary.id}.`
            );
        }

        return true;
    }

    /* ======================================================================
       READ OPERATIONS
    ====================================================================== */

    function getBeneficiaries() {

        markOperation();

        return STORAGE
            .getBeneficiaries();
    }

    function getBeneficiaryById(id) {

        markOperation();

        return STORAGE
            .getBeneficiaryById(id);
    }

    function exists(id) {

        return Boolean(
            getBeneficiaryById(id)
        );
    }

    function count() {

        markOperation();

        return STORAGE.count();
    }

    function findByContactId(
        contactId
    ) {

        markOperation();

        return STORAGE
            .findByContactId(
                cleanString(
                    contactId,
                    VALIDATION.MAX_CONTACT_ID_LENGTH
                )
            );
    }

    function findByPay54Id(
        pay54Id
    ) {

        markOperation();

        const normalized =
            normalizePay54Id(
                pay54Id
            );

        if (!normalized) {
            return [];
        }

        /*
         * Storage performs a case-insensitive search but historically may
         * contain @-prefixed values. The domain layer therefore provides
         * the canonical PAY54 identity comparison.
         */

        return immutableClone(
            STORAGE
                .getBeneficiaries()
                .filter(
                    beneficiary =>
                        beneficiary.destinations
                            .some(
                                destination =>
                                    (
                                        destination.type ===
                                            DESTINATION_TYPES.PAY54 ||
                                        destination.type ===
                                            DESTINATION_TYPES.WALLET
                                    ) &&
                                    normalizePay54Id(
                                        destination.pay54Id
                                    ) ===
                                    normalized
                            )
                )
        );
    }

    function findByBankAccount(
        accountNumber,
        bankId = ""
    ) {

        markOperation();

        const account =
            normalizeAccountNumber(
                accountNumber
            );

        if (!account) {
            return [];
        }

        return STORAGE
            .findByBankAccount(
                account,
                cleanString(
                    bankId,
                    VALIDATION.MAX_BANK_ID_LENGTH
                )
            );
    }

    function getTrusted() {

        markOperation();

        return STORAGE
            .getTrusted();
    }

    function getByStatus(status) {

        markOperation();

        return STORAGE
            .getByStatus(
                normalizeStatus(status)
            );
    }

    function getActive() {

        return getByStatus(
            STATUS.ACTIVE
        );
    }

    /* ======================================================================
       CREATE BENEFICIARY
    ====================================================================== */

    function createBeneficiary(
        payload
    ) {

        try {

            validateBeneficiaryPayload(
                payload
            );

            for (
                const destination
                of payload.destinations
            ) {
                assertNoDuplicateDestination(
                    destination
                );
            }

            const result =
                STORAGE.createBeneficiary(
                    deepClone(payload)
                );

            markOperation();

            return result;

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    /* ======================================================================
       UPDATE BENEFICIARY
    ====================================================================== */

    function updateBeneficiary(
        id,
        patch
    ) {

        try {

            if (
                !isPlainObject(patch)
            ) {
                throw new TypeError(
                    "[PAY54] Beneficiary update must be an object."
                );
            }

            const current =
                STORAGE.getBeneficiaryById(
                    id
                );

            if (!current) {
                throw new Error(
                    `[PAY54] Beneficiary not found: ${cleanString(id)}.`
                );
            }

            if (
                Object.prototype
                    .hasOwnProperty
                    .call(
                        patch,
                        "type"
                    )
            ) {
                normalizeType(
                    patch.type
                );
            }

            if (
                Object.prototype
                    .hasOwnProperty
                    .call(
                        patch,
                        "status"
                    )
            ) {
                normalizeStatus(
                    patch.status
                );
            }

            if (
                Object.prototype
                    .hasOwnProperty
                    .call(
                        patch,
                        "destinations"
                    )
            ) {

                if (
                    !Array.isArray(
                        patch.destinations
                    ) ||
                    patch.destinations.length === 0
                ) {
                    throw new Error(
                        "[PAY54] Beneficiary must retain at least one payment destination."
                    );
                }

                if (
                    patch.destinations.length >
                    VALIDATION.MAX_DESTINATIONS_PER_BENEFICIARY
                ) {
                    throw new Error(
                        "[PAY54] Beneficiary destination limit exceeded."
                    );
                }

                for (
                    const destination
                    of patch.destinations
                ) {

                    validateDestination(
                        destination
                    );

                    assertNoDuplicateDestination(
                        destination,
                        current.id,
                        cleanString(
                            destination.id
                        )
                    );
                }
            }

            const result =
                STORAGE.updateBeneficiary(
                    current.id,
                    deepClone(patch)
                );

            markOperation();

            return result;

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    /* ======================================================================
       DELETE BENEFICIARY
    ====================================================================== */

    function deleteBeneficiary(id) {

        try {

            const result =
                STORAGE.deleteBeneficiary(
                    id
                );

            markOperation();

            return result;

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    /* ======================================================================
       DESTINATION MANAGEMENT
    ====================================================================== */

    function addDestination(
        beneficiaryId,
        destination
    ) {

        try {

            validateDestination(
                destination
            );

            assertNoDuplicateDestination(
                destination
            );

            const result =
                STORAGE.addDestination(
                    beneficiaryId,
                    deepClone(destination)
                );

            markOperation();

            return result;

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    function updateDestination(
        beneficiaryId,
        destinationId,
        patch
    ) {

        try {

            if (
                !isPlainObject(patch)
            ) {
                throw new TypeError(
                    "[PAY54] Destination update must be an object."
                );
            }

            const beneficiary =
                STORAGE.getBeneficiaryById(
                    beneficiaryId
                );

            if (!beneficiary) {
                throw new Error(
                    `[PAY54] Beneficiary not found: ${cleanString(beneficiaryId)}.`
                );
            }

            const current =
                beneficiary.destinations
                    .find(
                        destination =>
                            destination.id ===
                            cleanString(
                                destinationId
                            )
                    );

            if (!current) {
                throw new Error(
                    `[PAY54] Destination not found: ${cleanString(destinationId)}.`
                );
            }

            const candidate = {
                ...deepClone(current),
                ...deepClone(patch),
                id:
                    current.id
            };

            validateDestination(
                candidate
            );

            assertNoDuplicateDestination(
                candidate,
                beneficiary.id,
                current.id
            );

            const result =
                STORAGE.updateDestination(
                    beneficiary.id,
                    current.id,
                    deepClone(patch)
                );

            markOperation();

            return result;

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    function removeDestination(
        beneficiaryId,
        destinationId
    ) {

        try {

            const result =
                STORAGE.removeDestination(
                    beneficiaryId,
                    destinationId
                );

            markOperation();

            return result;

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    function getDestinations(
        beneficiaryId
    ) {

        markOperation();

        return STORAGE
            .getDestinations(
                beneficiaryId
            );
    }

    /* ======================================================================
       CONTACT RELATIONSHIP
    ====================================================================== */

    function linkContact(
        beneficiaryId,
        contactId
    ) {

        const cleanContactId =
            cleanString(
                contactId,
                VALIDATION.MAX_CONTACT_ID_LENGTH
            );

        if (!cleanContactId) {
            throw new Error(
                "[PAY54] contactId is required."
            );
        }

        try {

            const result =
                STORAGE.linkContact(
                    beneficiaryId,
                    cleanContactId
                );

            markOperation();

            return result;

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    function unlinkContact(
        beneficiaryId
    ) {

        try {

            const result =
                STORAGE.unlinkContact(
                    beneficiaryId
                );

            markOperation();

            return result;

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    /* ======================================================================
       TRUST / STATUS
    ====================================================================== */

    function setTrusted(
        beneficiaryId,
        trusted
    ) {

        try {

            const result =
                STORAGE.setTrusted(
                    beneficiaryId,
                    Boolean(trusted)
                );

            markOperation();

            return result;

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    function trustBeneficiary(
        beneficiaryId
    ) {

        return setTrusted(
            beneficiaryId,
            true
        );
    }

    function untrustBeneficiary(
        beneficiaryId
    ) {

        return setTrusted(
            beneficiaryId,
            false
        );
    }

    function setStatus(
        beneficiaryId,
        status
    ) {

        try {

            const result =
                STORAGE.setStatus(
                    beneficiaryId,
                    normalizeStatus(
                        status
                    )
                );

            markOperation();

            return result;

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    function activateBeneficiary(id) {

        return setStatus(
            id,
            STATUS.ACTIVE
        );
    }

    function blockBeneficiary(id) {

        return setStatus(
            id,
            STATUS.BLOCKED
        );
    }

    function archiveBeneficiary(id) {

        return setStatus(
            id,
            STATUS.ARCHIVED
        );
    }

    function disableBeneficiary(id) {

        return setStatus(
            id,
            STATUS.DISABLED
        );
    }

    /* ======================================================================
       USAGE
    ====================================================================== */

    function recordUsage(
        beneficiaryId,
        options = {}
    ) {

        try {

            const result =
                STORAGE.updateUsage(
                    beneficiaryId,
                    {
                        increment:
                            Number.isFinite(
                                Number(
                                    options.increment
                                )
                            )
                                ? Math.max(
                                    0,
                                    Math.trunc(
                                        Number(
                                            options.increment
                                        )
                                    )
                                )
                                : 1,

                        lastUsedAt:
                            cleanString(
                                options.lastUsedAt,
                                40
                            ) ||
                            nowISO()
                    }
                );

            markOperation();

            return result;

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    /* ======================================================================
       RISK
    ====================================================================== */

    function setRisk(
        beneficiaryId,
        payload
    ) {

        if (
            !isPlainObject(payload)
        ) {
            throw new TypeError(
                "[PAY54] Risk payload must be an object."
            );
        }

        const level =
            cleanString(
                payload.level
            )
                .toUpperCase();

        if (
            level &&
            !Object.values(
                RISK_LEVELS
            ).includes(level)
        ) {
            throw new Error(
                `[PAY54] Unsupported Beneficiary risk level: ${level}.`
            );
        }

        const numericScore =
            Number(
                payload.score
            );

        if (
            Number.isFinite(
                numericScore
            ) &&
            (
                numericScore <
                    VALIDATION.MIN_RISK_SCORE ||
                numericScore >
                    VALIDATION.MAX_RISK_SCORE
            )
        ) {
            throw new Error(
                `[PAY54] Beneficiary risk score must be between ${VALIDATION.MIN_RISK_SCORE} and ${VALIDATION.MAX_RISK_SCORE}.`
            );
        }

        try {

            const result =
                STORAGE.setRisk(
                    beneficiaryId,
                    deepClone(payload)
                );

            markOperation();

            return result;

        } catch (error) {

            recordError(error);

            throw error;
        }
    }

    /* ======================================================================
       RESOLUTION
    ====================================================================== */

    function resolvePay54(
        pay54Id
    ) {

        const matches =
            findByPay54Id(
                pay54Id
            );

        return matches.length
            ? matches[0]
            : null;
    }

    function resolveBank(
        accountNumber,
        bankId = ""
    ) {

        const matches =
            findByBankAccount(
                accountNumber,
                bankId
            );

        return matches.length
            ? matches[0]
            : null;
    }

    function resolveDestination(
        query
    ) {

        if (
            !isPlainObject(query)
        ) {
            return null;
        }

        const type =
            cleanString(
                query.type
            )
                .toUpperCase();

        switch (type) {

            case DESTINATION_TYPES.PAY54:
            case DESTINATION_TYPES.WALLET:

                return resolvePay54(
                    query.pay54Id
                );

            case DESTINATION_TYPES.BANK:
            case DESTINATION_TYPES.GLOBAL:

                return resolveBank(
                    query.accountNumber,
                    query.bankId
                );

            default:

                return null;
        }
    }

    /* ======================================================================
       SEARCH
    ====================================================================== */

    function searchBeneficiaries(
        query
    ) {

        const term =
            cleanString(query)
                .toLowerCase();

        if (!term) {
            return getBeneficiaries();
        }

        const normalizedPay54 =
            normalizePay54Id(
                term
            );

        const normalizedAccount =
            normalizeAccountNumber(
                term
            );

        return immutableClone(
            STORAGE
                .getBeneficiaries()
                .filter(
                    beneficiary => {

                        if (
                            cleanString(
                                beneficiary.id
                            )
                                .toLowerCase()
                                .includes(term)
                        ) {
                            return true;
                        }

                        if (
                            cleanString(
                                beneficiary.contactId
                            )
                                .toLowerCase()
                                .includes(term)
                        ) {
                            return true;
                        }

                        return beneficiary
                            .destinations
                            .some(
                                destination => {

                                    const values = [
                                        destination.pay54Id,
                                        destination.bankId,
                                        destination.bankName,
                                        destination.accountNumber,
                                        destination.accountName,
                                        destination.currency,
                                        destination.country,
                                        destination.routingCode,
                                        destination.iban,
                                        destination.swiftBic
                                    ];

                                    if (
                                        values.some(
                                            value =>
                                                cleanString(
                                                    value
                                                )
                                                    .toLowerCase()
                                                    .includes(
                                                        term
                                                    )
                                        )
                                    ) {
                                        return true;
                                    }

                                    if (
                                        normalizedPay54 &&
                                        normalizePay54Id(
                                            destination.pay54Id
                                        ) ===
                                        normalizedPay54
                                    ) {
                                        return true;
                                    }

                                    return (
                                        normalizedAccount &&
                                        normalizeAccountNumber(
                                            destination.accountNumber
                                        ) ===
                                        normalizedAccount
                                    );
                                }
                            );
                    }
                )
        );
    }

    /* ======================================================================
       DOMAIN INTEGRITY
    ====================================================================== */

    function verifyIntegrity() {

        const storageIntegrity =
            STORAGE.verifyIntegrity();

        const errors =
            Array.isArray(
                storageIntegrity.errors
            )
                ? [
                    ...storageIntegrity.errors
                ]
                : [];

        try {

            const beneficiaries =
                STORAGE.getBeneficiaries();

            const fingerprints =
                new Map();

            for (
                const beneficiary
                of beneficiaries
            ) {

                for (
                    const destination
                    of beneficiary.destinations
                ) {

                    validateDestination(
                        destination
                    );

                    const fingerprint =
                        destinationFingerprint(
                            destination
                        );

                    if (
                        fingerprints.has(
                            fingerprint
                        )
                    ) {

                        const existing =
                            fingerprints.get(
                                fingerprint
                            );

                        errors.push(
                            `Duplicate payment destination detected between ${existing.beneficiaryId} and ${beneficiary.id}.`
                        );

                    } else {

                        fingerprints.set(
                            fingerprint,
                            {
                                beneficiaryId:
                                    beneficiary.id,

                                destinationId:
                                    destination.id
                            }
                        );
                    }
                }
            }

        } catch (error) {

            errors.push(
                error instanceof Error
                    ? error.message
                    : String(error)
            );
        }

        return immutableClone({

            healthy:
                storageIntegrity.healthy ===
                    true &&
                errors.length === 0,

            status:
                storageIntegrity.healthy ===
                    true &&
                errors.length === 0
                    ? "pass"
                    : "fail",

            errors,

            storage:
                storageIntegrity,

            checkedAt:
                nowISO()

        });
    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    function getHealth() {

        const storageHealth =
            STORAGE.getHealth();

        const integrity =
            verifyIntegrity();

        const healthy =
            runtime.ready === true &&
            storageHealth.healthy === true &&
            integrity.healthy === true;

        return immutableClone({

            healthy,

            status:
                healthy
                    ? "ready"
                    : "degraded",

            module:
                MODULE_ID,

            version:
                VERSION,

            storageHealthy:
                storageHealth.healthy ===
                true,

            storage:
                storageHealth,

            integrity,

            beneficiaryCount:
                storageHealth.recordCount ??
                0,

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

        if (
            runtime.ready
        ) {
            return getHealth();
        }

        const storageHealth =
            STORAGE.getHealth();

        if (
            !storageHealth ||
            storageHealth.healthy !== true
        ) {
            throw new Error(
                "[PAY54] Beneficiary Storage is not healthy."
            );
        }

        const integrity =
            verifyIntegrity();

        if (
            !integrity.healthy
        ) {
            throw new Error(
                `[PAY54] Beneficiary domain integrity failed: ${integrity.errors.join(" | ")}`
            );
        }

        runtime.ready =
            true;

        runtime.lastOperationAt =
            nowISO();

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

        verifyIntegrity,

        validateBeneficiary:
            validateBeneficiaryPayload,

        validateDestination,

        destinationFingerprint,

        findDuplicateDestination,

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

        /*
         * Keep the existing progressive Beneficiary namespace created by
         * core/storage.js.
         */

        if (
            !GLOBAL.PAY54_BENEFICIARIES
        ) {
            GLOBAL.PAY54_BENEFICIARIES =
                {};
        }

        if (
            typeof GLOBAL.PAY54_BENEFICIARIES !==
            "object"
        ) {
            throw new Error(
                "[PAY54] PAY54_BENEFICIARIES namespace is invalid."
            );
        }

        initialise();

        const FROZEN_API =
            Object.freeze(API);

        /*
         * Canonical domain global.
         */

        GLOBAL.PAY54_BENEFICIARIES_ENGINE =
            FROZEN_API;

        /*
         * Progressive namespace aliases.
         */

        GLOBAL.PAY54_BENEFICIARIES.ENGINE =
            FROZEN_API;

        GLOBAL.PAY54_BENEFICIARIES.engine =
            FROZEN_API;

        /*
         * Preserve the Storage aliases established by WP-011A.2.
         */

        if (
            !GLOBAL.PAY54_BENEFICIARIES.STORAGE
        ) {
            GLOBAL.PAY54_BENEFICIARIES.STORAGE =
                STORAGE;
        }

        if (
            !GLOBAL.PAY54_BENEFICIARIES.storage
        ) {
            GLOBAL.PAY54_BENEFICIARIES.storage =
                STORAGE;
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

            } catch (error) {

                console.warn(
                    "[PAY54] Beneficiary Engine platform registry registration skipped:",
                    error
                );
            }
        }

    } catch (error) {

        runtime.ready =
            false;

        recordError(error);

        publish(
            EVENTS.ERROR,
            {
                operation:
                    "bootstrap",

                message:
                    runtime.lastError
            }
        );

        console.error(
            "[PAY54] Beneficiary Domain Engine bootstrap failed:",
            error
        );

        throw error;
    }

    /* ======================================================================
       STARTUP
    ====================================================================== */

    console.info(
        "✅ PAY54 Beneficiary Domain Engine",
        VERSION,
        "loaded."
    );

})();
