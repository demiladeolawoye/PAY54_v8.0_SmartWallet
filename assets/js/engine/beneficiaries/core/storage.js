"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE BENEFICIARY STORAGE
   File: assets/js/engine/beneficiaries/core/storage.js
   Version: v1.0.0

   Work Package
   ------------
   WP-011A.2 — Enterprise Beneficiary Secure Storage

   Purpose
   -------
   Canonical persistence and repository boundary for PAY54 Beneficiaries.

   Responsibilities
   ----------------
   • Own Beneficiary persistence
   • Enforce the canonical Beneficiary schema
   • Validate and normalise Beneficiary records
   • Validate and normalise payment destinations
   • Protect against unsafe/prototype-pollution fields
   • Provide staged atomic-style localStorage writes
   • Maintain verified backup data
   • Detect and recover corrupt repository data
   • Quarantine invalid data
   • Provide immutable outward records
   • Provide Beneficiary CRUD
   • Provide payment-destination CRUD
   • Provide Contact relationship queries
   • Persist trust state
   • Persist usage information
   • Persist risk information
   • Publish repository lifecycle events
   • Provide runtime health and integrity diagnostics
   • Prepare for later legacy recipient migration

   Non-Responsibilities
   --------------------
   • Does NOT migrate pay54_recipients
   • Does NOT delete or mutate pay54_recipients
   • Does NOT own Contact identity
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

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL / MODULE
    ====================================================================== */

    const GLOBAL = window;

    const VERSION = "1.0.0";

    const ENGINE =
        "PAY54 Beneficiary Storage";

    /* ======================================================================
       DEPENDENCY VERIFICATION
    ====================================================================== */

    const constants =
        GLOBAL.PAY54_CONSTANTS;

    if (
        !constants ||
        typeof constants.get !== "function" ||
        typeof constants.has !== "function"
    ) {
        throw new Error(
            "[PAY54] Constants Registry must load before Beneficiary Storage."
        );
    }

    const MODULES =
        constants.get("MODULES");

    if (
        !MODULES ||
        typeof MODULES !== "object"
    ) {
        throw new Error(
            "[PAY54] Module identifiers unavailable to Beneficiary Storage."
        );
    }

    const VERSIONS =
        constants.get(
            MODULES.VERSIONS
        );

    if (
        !VERSIONS ||
        typeof VERSIONS !== "object"
    ) {
        throw new Error(
            "[PAY54] Version Catalogue unavailable to Beneficiary Storage."
        );
    }

    const CONTACTS =
        constants.get(
            MODULES.CONTACTS
        );

    if (
        !CONTACTS ||
        typeof CONTACTS !== "object"
    ) {
        throw new Error(
            "[PAY54] Contact Constants unavailable to Beneficiary Storage."
        );
    }

    const BENEFICIARIES =
        constants.get(
            MODULES.BENEFICIARIES
        );

    if (
        !BENEFICIARIES ||
        typeof BENEFICIARIES !== "object"
    ) {
        throw new Error(
            "[PAY54] Beneficiary Constants must load before Beneficiary Storage."
        );
    }

    if (
        BENEFICIARIES.VERSION !== VERSION ||
        VERSIONS.BENEFICIARIES !== VERSION
    ) {
        throw new Error(
            "[PAY54] Beneficiary Storage version contract mismatch."
        );
    }

    /* ======================================================================
       CONSTANT REFERENCES
    ====================================================================== */

    const STORAGE =
        BENEFICIARIES.STORAGE;

    const STORAGE_KEYS =
        BENEFICIARIES.STORAGE_KEYS;

    const VALIDATION =
        BENEFICIARIES.VALIDATION;

    const SECURITY =
        BENEFICIARIES.SECURITY;

    const EVENTS =
        BENEFICIARIES.EVENTS;

    const STATUS =
        BENEFICIARIES.STATUS;

    const TRUST =
        BENEFICIARIES.TRUST;

    const RISK_LEVELS =
        BENEFICIARIES.RISK_LEVELS;

    const DESTINATION_TYPES =
        BENEFICIARIES.DESTINATION_TYPES;

    const MODULE_ID =
        BENEFICIARIES.MODULE.STORAGE;

    const REPOSITORY_ID =
        BENEFICIARIES.MODULE.REPOSITORY;

    const SCHEMA_VERSION =
        BENEFICIARIES.SCHEMA.VERSION;

    /* ======================================================================
       RUNTIME STATE
    ====================================================================== */

    const runtime = {

        ready:
            false,

        storageAvailable:
            false,

        securityVerified:
            false,

        recovered:
            false,

        lastRecoveryAt:
            null,

        lastIntegrityCheckAt:
            null,

        lastWriteAt:
            null,

        lastErrorAt:
            null,

        lastError:
            null

    };

    /* ======================================================================
       GENERIC HELPERS
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
                return structuredClone(
                    value
                );
            } catch (_) {
                /* fall through */
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

    function safeArray(value) {

        return Array.isArray(value)
            ? value
            : [];

    }

    function clamp(
        value,
        minimum,
        maximum
    ) {

        return Math.min(
            maximum,
            Math.max(
                minimum,
                value
            )
        );

    }

    /* ======================================================================
       SECURITY — UNSAFE FIELD DEFENCE
    ====================================================================== */

    const forbiddenFieldNames =
        new Set(
            safeArray(
                SECURITY.FORBIDDEN_FIELDS
            ).map(
                field =>
                    String(field)
                        .toLowerCase()
            )
        );

    const prototypePollutionFields =
        new Set([
            "__proto__",
            "prototype",
            "constructor"
        ]);

    function assertSafeObject(
        value,
        path = "value",
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
            throw new Error(
                `[PAY54] Circular structure rejected at ${path}.`
            );
        }

        seen.add(value);

        if (
            !Array.isArray(value) &&
            !isPlainObject(value)
        ) {
            throw new Error(
                `[PAY54] Unsafe object type rejected at ${path}.`
            );
        }

        for (
            const key
            of Object.keys(value)
        ) {

            const lower =
                key.toLowerCase();

            if (
                prototypePollutionFields
                    .has(key)
            ) {
                throw new Error(
                    `[PAY54] Prototype-pollution field rejected at ${path}.${key}.`
                );
            }

            if (
                SECURITY.REJECT_FORBIDDEN_FIELDS &&
                forbiddenFieldNames
                    .has(lower)
            ) {
                throw new Error(
                    `[PAY54] Forbidden Beneficiary field rejected at ${path}.${key}.`
                );
            }

            assertSafeObject(
                value[key],
                `${path}.${key}`,
                seen
            );
        }

        seen.delete(value);

        return true;

    }

    function sanitiseMetadata(
        value,
        allowedFields
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return {};
        }

        if (
            !isPlainObject(value)
        ) {
            throw new TypeError(
                "[PAY54] Beneficiary metadata must be a plain object."
            );
        }

        assertSafeObject(
            value,
            "metadata"
        );

        const allowed =
            new Set(
                safeArray(
                    allowedFields
                )
            );

        const result = {};

        let count = 0;

        for (
            const [key, rawValue]
            of Object.entries(value)
        ) {

            if (
                !allowed.has(key)
            ) {
                continue;
            }

            if (
                count >=
                VALIDATION.MAX_METADATA_KEYS
            ) {
                break;
            }

            if (
                rawValue === null ||
                rawValue === undefined
            ) {
                continue;
            }

            if (
                typeof rawValue ===
                    "string"
            ) {
                result[key] =
                    cleanString(
                        rawValue,
                        250
                    );
            } else if (
                typeof rawValue ===
                    "number" &&
                Number.isFinite(rawValue)
            ) {
                result[key] =
                    rawValue;
            } else if (
                typeof rawValue ===
                    "boolean"
            ) {
                result[key] =
                    rawValue;
            }

            count += 1;
        }

        return result;

    }

    /* ======================================================================
       SECURITY BOOTSTRAP VERIFICATION
    ====================================================================== */

    function verifySecurityBootstrap() {

        if (
            !SECURITY.VERIFY_BOOTSTRAP
        ) {
            runtime.securityVerified =
                true;

            return true;
        }

        /*
         * Security Shield is progressively integrated across PAY54.
         * The storage engine therefore verifies available security
         * components without making an optional component a hard runtime
         * dependency.
         */

        const shield =
            GLOBAL.PAY54_SECURITY ??
            GLOBAL.PAY54_SECURITY_SHIELD ??
            null;

        if (
            shield &&
            typeof shield === "object"
        ) {

            const healthFunction =
                typeof shield.getHealth ===
                    "function"
                    ? shield.getHealth
                    : (
                        typeof shield.health ===
                            "function"
                            ? shield.health
                            : null
                    );

            if (healthFunction) {
                try {

                    const health =
                        healthFunction.call(
                            shield
                        );

                    if (
                        health &&
                        health.healthy === false
                    ) {
                        throw new Error(
                            "[PAY54] Security Shield reports an unhealthy state."
                        );
                    }

                } catch (error) {

                    runtime.securityVerified =
                        false;

                    throw error;
                }
            }
        }

        runtime.securityVerified =
            true;

        return true;

    }

    /* ======================================================================
       EVENT BUS
    ====================================================================== */

    function publish(
        eventName,
        payload = {}
    ) {

        if (
            typeof eventName !== "string" ||
            !eventName
        ) {
            return false;
        }

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
                "[PAY54] Beneficiary Storage event publication failed:",
                eventName,
                error
            );

            return false;
        }

    }

    /* ======================================================================
       STORAGE AVAILABILITY
    ====================================================================== */

    function probeStorage() {

        const key =
            "__pay54_beneficiary_storage_probe__";

        try {

            GLOBAL.localStorage
                .setItem(
                    key,
                    "1"
                );

            GLOBAL.localStorage
                .removeItem(
                    key
                );

            runtime.storageAvailable =
                true;

            return true;

        } catch (error) {

            runtime.storageAvailable =
                false;

            runtime.lastError =
                error instanceof Error
                    ? error.message
                    : String(error);

            runtime.lastErrorAt =
                nowISO();

            return false;
        }

    }

    function requireStorage() {

        if (
            runtime.storageAvailable
        ) {
            return true;
        }

        if (
            probeStorage()
        ) {
            return true;
        }

        throw new Error(
            "[PAY54] Beneficiary persistence storage is unavailable."
        );

    }

    /* ======================================================================
       IDENTIFIERS
    ====================================================================== */

    function randomIdSegment() {

        if (
            GLOBAL.crypto &&
            typeof GLOBAL.crypto
                .randomUUID ===
                "function"
        ) {
            return GLOBAL.crypto
                .randomUUID();
        }

        if (
            GLOBAL.crypto &&
            typeof GLOBAL.crypto
                .getRandomValues ===
                "function"
        ) {

            const bytes =
                new Uint32Array(4);

            GLOBAL.crypto
                .getRandomValues(bytes);

            return Array
                .from(bytes)
                .map(
                    value =>
                        value.toString(16)
                            .padStart(8, "0")
                )
                .join("");
        }

        return [
            Date.now()
                .toString(36),
            Math.random()
                .toString(36)
                .slice(2),
            Math.random()
                .toString(36)
                .slice(2)
        ].join("-");
    }

    function createBeneficiaryId() {

        return [
            BENEFICIARIES.REPOSITORY
                .ID_PREFIX,
            randomIdSegment()
        ].join("-");
    }

    function createDestinationId() {

        return [
            BENEFICIARIES.REPOSITORY
                .DESTINATION_ID_PREFIX,
            randomIdSegment()
        ].join("-");
    }

    /* ======================================================================
       TYPE NORMALISATION
    ====================================================================== */

    function normaliseBeneficiaryType(
        value
    ) {

        const candidate =
            cleanString(value)
                .toUpperCase();

        const allowed =
            Object.values(
                BENEFICIARIES.TYPES
            );

        if (
            allowed.includes(candidate)
        ) {
            return candidate;
        }

        return BENEFICIARIES.TYPES.PAY54;
    }

    function normaliseDestinationType(
        value
    ) {

        const candidate =
            cleanString(value)
                .toUpperCase();

        const allowed =
            Object.values(
                DESTINATION_TYPES
            );

        if (
            !allowed.includes(candidate)
        ) {
            throw new Error(
                `[PAY54] Unsupported Beneficiary destination type: ${candidate || "(empty)"}.`
            );
        }

        return candidate;
    }

    function normaliseStatus(
        value
    ) {

        const candidate =
            cleanString(value)
                .toUpperCase();

        const allowed =
            Object.values(
                STATUS
            );

        return allowed.includes(candidate)
            ? candidate
            : STATUS.ACTIVE;
    }

    function normaliseTrusted(
        value
    ) {

        if (
            value === true ||
            value === TRUST.TRUSTED ||
            String(value)
                .toUpperCase() ===
                TRUST.TRUSTED
        ) {
            return true;
        }

        return false;
    }

    /* ======================================================================
       DESTINATION NORMALISATION
    ====================================================================== */

    function normaliseDestination(
        input,
        options = {}
    ) {

        if (
            !isPlainObject(input)
        ) {
            throw new TypeError(
                "[PAY54] Beneficiary destination must be a plain object."
            );
        }

        assertSafeObject(
            input,
            "destination"
        );

        const type =
            normaliseDestinationType(
                input.type
            );

        const existingId =
            cleanString(
                input.id,
                160
            );

        const timestamp =
            nowISO();

        const createdAt =
            cleanString(
                input.createdAt,
                40
            ) ||
            timestamp;

        const destination = {

            id:
                existingId ||
                createDestinationId(),

            type,

            pay54Id:
                cleanString(
                    input.pay54Id,
                    VALIDATION
                        .MAX_PAY54_ID_LENGTH
                ),

            bankId:
                cleanString(
                    input.bankId,
                    VALIDATION
                        .MAX_BANK_ID_LENGTH
                ),

            bankName:
                cleanString(
                    input.bankName,
                    VALIDATION
                        .MAX_BANK_NAME_LENGTH
                ),

            accountNumber:
                cleanString(
                    input.accountNumber,
                    VALIDATION
                        .MAX_ACCOUNT_NUMBER_LENGTH
                ),

            accountName:
                cleanString(
                    input.accountName,
                    VALIDATION
                        .MAX_ACCOUNT_NAME_LENGTH
                ),

            currency:
                cleanString(
                    input.currency,
                    VALIDATION
                        .MAX_CURRENCY_LENGTH
                )
                    .toUpperCase(),

            country:
                cleanString(
                    input.country,
                    VALIDATION
                        .MAX_COUNTRY_LENGTH
                )
                    .toUpperCase(),

            routingCode:
                cleanString(
                    input.routingCode,
                    VALIDATION
                        .MAX_ROUTING_CODE_LENGTH
                ),

            iban:
                cleanString(
                    input.iban,
                    VALIDATION
                        .MAX_IBAN_LENGTH
                )
                    .replace(/\s+/g, "")
                    .toUpperCase(),

            swiftBic:
                cleanString(
                    input.swiftBic,
                    VALIDATION
                        .MAX_SWIFT_BIC_LENGTH
                )
                    .replace(/\s+/g, "")
                    .toUpperCase(),

            metadata:
                sanitiseMetadata(
                    input.metadata,
                    SECURITY
                        .ALLOWED_DESTINATION_METADATA_FIELDS
                ),

            createdAt,

            updatedAt:
                options.preserveUpdatedAt
                    ? (
                        cleanString(
                            input.updatedAt,
                            40
                        ) ||
                        timestamp
                    )
                    : timestamp

        };

        validateDestination(
            destination
        );

        return destination;
    }

    function validateDestination(
        destination
    ) {

        if (
            !isPlainObject(destination)
        ) {
            throw new TypeError(
                "[PAY54] Invalid Beneficiary destination."
            );
        }

        if (
            !cleanString(destination.id)
        ) {
            throw new Error(
                "[PAY54] Beneficiary destination requires an id."
            );
        }

        const type =
            normaliseDestinationType(
                destination.type
            );

        switch (type) {

            case DESTINATION_TYPES.PAY54:
            case DESTINATION_TYPES.WALLET:

                if (
                    !cleanString(
                        destination.pay54Id
                    )
                ) {
                    throw new Error(
                        "[PAY54] PAY54/WALLET destination requires pay54Id."
                    );
                }

                break;

            case DESTINATION_TYPES.BANK:

                if (
                    !cleanString(
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
                    !cleanString(
                        destination.accountNumber
                    ) &&
                    !cleanString(
                        destination.iban
                    )
                ) {
                    throw new Error(
                        "[PAY54] Global destination requires accountNumber or IBAN."
                    );
                }

                break;

            case DESTINATION_TYPES.CARD:

                /*
                 * Raw card numbers are forbidden.
                 * CARD destinations may reference an internal card identifier
                 * through bankId until a dedicated destination reference field
                 * is introduced by the Cards/payment-domain integration.
                 */

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

                /*
                 * These rails are recognised for compatibility but detailed
                 * rail-specific contracts belong to their dedicated engines.
                 * A provider/network reference may be carried in metadata.
                 */

                break;

            default:

                throw new Error(
                    `[PAY54] Unsupported destination type: ${type}.`
                );
        }

        return true;
    }

    /* ======================================================================
       USAGE / RISK NORMALISATION
    ====================================================================== */

    function normaliseUsage(
        value
    ) {

        const input =
            isPlainObject(value)
                ? value
                : {};

        const transferCount =
            Number.isFinite(
                Number(
                    input.transferCount
                )
            )
                ? Math.max(
                    0,
                    Math.trunc(
                        Number(
                            input.transferCount
                        )
                    )
                )
                : 0;

        return {

            transferCount,

            lastUsedAt:
                cleanString(
                    input.lastUsedAt,
                    40
                ) ||
                null

        };
    }

    function normaliseRisk(
        value
    ) {

        const input =
            isPlainObject(value)
                ? value
                : {};

        const candidateLevel =
            cleanString(
                input.level
            )
                .toUpperCase();

        const allowedLevels =
            Object.values(
                RISK_LEVELS
            );

        const numericScore =
            Number(
                input.score
            );

        const score =
            Number.isFinite(
                numericScore
            )
                ? clamp(
                    numericScore,
                    VALIDATION
                        .MIN_RISK_SCORE,
                    VALIDATION
                        .MAX_RISK_SCORE
                )
                : VALIDATION
                    .MIN_RISK_SCORE;

        return {

            level:
                allowedLevels.includes(
                    candidateLevel
                )
                    ? candidateLevel
                    : RISK_LEVELS.UNKNOWN,

            score,

            assessedAt:
                cleanString(
                    input.assessedAt,
                    40
                ) ||
                null

        };
    }

    /* ======================================================================
       BENEFICIARY NORMALISATION
    ====================================================================== */

    function normaliseBeneficiary(
        input,
        options = {}
    ) {

        if (
            !isPlainObject(input)
        ) {
            throw new TypeError(
                "[PAY54] Beneficiary must be a plain object."
            );
        }

        assertSafeObject(
            input,
            "beneficiary"
        );

        const timestamp =
            nowISO();

        const destinations =
            safeArray(
                input.destinations
            )
                .slice(
                    0,
                    VALIDATION
                        .MAX_DESTINATIONS_PER_BENEFICIARY
                )
                .map(
                    destination =>
                        normaliseDestination(
                            destination,
                            {
                                preserveUpdatedAt:
                                    options
                                        .preserveUpdatedAt ===
                                        true
                            }
                        )
                );

        const beneficiary = {

            id:
                cleanString(
                    input.id,
                    160
                ) ||
                createBeneficiaryId(),

            contactId:
                cleanString(
                    input.contactId,
                    VALIDATION
                        .MAX_CONTACT_ID_LENGTH
                ) ||
                null,

            type:
                normaliseBeneficiaryType(
                    input.type
                ),

            status:
                normaliseStatus(
                    input.status
                ),

            destinations,

            trusted:
                normaliseTrusted(
                    input.trusted
                ),

            usage:
                normaliseUsage(
                    input.usage
                ),

            risk:
                normaliseRisk(
                    input.risk
                ),

            metadata:
                sanitiseMetadata(
                    input.metadata,
                    SECURITY
                        .ALLOWED_METADATA_FIELDS
                ),

            createdAt:
                cleanString(
                    input.createdAt,
                    40
                ) ||
                timestamp,

            updatedAt:
                options.preserveUpdatedAt
                    ? (
                        cleanString(
                            input.updatedAt,
                            40
                        ) ||
                        timestamp
                    )
                    : timestamp

        };

        validateBeneficiary(
            beneficiary
        );

        return beneficiary;
    }

    function validateBeneficiary(
        beneficiary
    ) {

        if (
            !isPlainObject(beneficiary)
        ) {
            throw new TypeError(
                "[PAY54] Invalid Beneficiary record."
            );
        }

        assertSafeObject(
            beneficiary,
            "beneficiary"
        );

        if (
            BENEFICIARIES.REPOSITORY
                .REQUIRE_ID &&
            !cleanString(
                beneficiary.id
            )
        ) {
            throw new Error(
                "[PAY54] Beneficiary id is required."
            );
        }

        if (
            BENEFICIARIES.REPOSITORY
                .REQUIRE_CONTACT_ID &&
            !cleanString(
                beneficiary.contactId
            )
        ) {
            throw new Error(
                "[PAY54] Beneficiary contactId is required."
            );
        }

        if (
            !Array.isArray(
                beneficiary.destinations
            )
        ) {
            throw new Error(
                "[PAY54] Beneficiary destinations must be an array."
            );
        }

        if (
            BENEFICIARIES.REPOSITORY
                .REQUIRE_DESTINATION &&
            beneficiary.destinations
                .length === 0
        ) {
            throw new Error(
                "[PAY54] Beneficiary requires at least one payment destination."
            );
        }

        if (
            beneficiary.destinations
                .length >
            VALIDATION
                .MAX_DESTINATIONS_PER_BENEFICIARY
        ) {
            throw new Error(
                "[PAY54] Beneficiary destination limit exceeded."
            );
        }

        const destinationIds =
            new Set();

        for (
            const destination
            of beneficiary.destinations
        ) {

            validateDestination(
                destination
            );

            if (
                destinationIds.has(
                    destination.id
                )
            ) {
                throw new Error(
                    `[PAY54] Duplicate destination id detected: ${destination.id}.`
                );
            }

            destinationIds.add(
                destination.id
            );
        }

        return true;
    }

    /* ======================================================================
       REPOSITORY DOCUMENT
    ====================================================================== */

    function emptyDocument() {

        const timestamp =
            nowISO();

        return {

            schemaVersion:
                SCHEMA_VERSION,

            documentType:
                BENEFICIARIES.SCHEMA
                    .DOCUMENT_TYPE,

            records:
                [],

            createdAt:
                timestamp,

            updatedAt:
                timestamp

        };
    }

    function normaliseDocument(
        input,
        options = {}
    ) {

        if (
            Array.isArray(input)
        ) {

            /*
             * Schema-v0 compatibility:
             * an array stored under pay54_beneficiaries is interpreted as
             * a pre-document repository and upgraded in memory.
             */

            input = {

                schemaVersion:
                    0,

                documentType:
                    BENEFICIARIES.SCHEMA
                        .DOCUMENT_TYPE,

                records:
                    input,

                createdAt:
                    nowISO(),

                updatedAt:
                    nowISO()

            };
        }

        if (
            !isPlainObject(input)
        ) {
            throw new Error(
                "[PAY54] Beneficiary repository document is invalid."
            );
        }

        assertSafeObject(
            input,
            "repository"
        );

        const schemaVersion =
            Number.isInteger(
                input.schemaVersion
            )
                ? input.schemaVersion
                : 0;

        if (
            schemaVersion <
                BENEFICIARIES.SCHEMA
                    .MIN_SUPPORTED_VERSION ||
            schemaVersion >
                SCHEMA_VERSION
        ) {
            throw new Error(
                `[PAY54] Unsupported Beneficiary schema version: ${schemaVersion}.`
            );
        }

        const rawRecords =
            safeArray(
                input.records
            );

        if (
            rawRecords.length >
            VALIDATION.MAX_BENEFICIARIES
        ) {
            throw new Error(
                "[PAY54] Beneficiary repository exceeds the configured record limit."
            );
        }

        const records = [];

        const invalid = [];

        for (
            let index = 0;
            index < rawRecords.length;
            index += 1
        ) {

            try {

                records.push(
                    normaliseBeneficiary(
                        rawRecords[index],
                        {
                            preserveUpdatedAt:
                                true
                        }
                    )
                );

            } catch (error) {

                invalid.push({

                    index,

                    record:
                        deepClone(
                            rawRecords[index]
                        ),

                    reason:
                        error instanceof Error
                            ? error.message
                            : String(error)

                });
            }
        }

        if (
            invalid.length > 0 &&
            !options.allowRepair
        ) {
            throw new Error(
                `[PAY54] Beneficiary repository contains ${invalid.length} invalid record(s).`
            );
        }

        const document = {

            schemaVersion:
                SCHEMA_VERSION,

            documentType:
                BENEFICIARIES.SCHEMA
                    .DOCUMENT_TYPE,

            records,

            createdAt:
                cleanString(
                    input.createdAt,
                    40
                ) ||
                nowISO(),

            updatedAt:
                options.preserveUpdatedAt
                    ? (
                        cleanString(
                            input.updatedAt,
                            40
                        ) ||
                        nowISO()
                    )
                    : nowISO()

        };

        return {
            document,
            invalid
        };
    }

    /* ======================================================================
       INTEGRITY
    ====================================================================== */

    function verifyDocumentIntegrity(
        document
    ) {

        const errors = [];

        if (
            !isPlainObject(document)
        ) {

            errors.push(
                "Repository document is not an object."
            );

            return {
                valid:
                    false,
                errors
            };
        }

        if (
            document.schemaVersion !==
            SCHEMA_VERSION
        ) {
            errors.push(
                `Schema version must be ${SCHEMA_VERSION}.`
            );
        }

        if (
            document.documentType !==
            BENEFICIARIES.SCHEMA
                .DOCUMENT_TYPE
        ) {
            errors.push(
                "Repository document type is invalid."
            );
        }

        if (
            !Array.isArray(
                document.records
            )
        ) {
            errors.push(
                "Repository records are not an array."
            );

            return {
                valid:
                    false,
                errors
            };
        }

        if (
            document.records.length >
            VALIDATION.MAX_BENEFICIARIES
        ) {
            errors.push(
                "Repository record limit exceeded."
            );
        }

        const ids =
            new Set();

        const destinationIds =
            new Set();

        for (
            let index = 0;
            index < document.records.length;
            index += 1
        ) {

            const record =
                document.records[index];

            try {

                validateBeneficiary(
                    record
                );

            } catch (error) {

                errors.push(
                    `Record ${index}: ${
                        error instanceof Error
                            ? error.message
                            : String(error)
                    }`
                );

                continue;
            }

            if (
                ids.has(
                    record.id
                )
            ) {
                errors.push(
                    `Duplicate Beneficiary id: ${record.id}.`
                );
            }

            ids.add(
                record.id
            );

            for (
                const destination
                of record.destinations
            ) {

                if (
                    destinationIds.has(
                        destination.id
                    )
                ) {
                    errors.push(
                        `Duplicate repository destination id: ${destination.id}.`
                    );
                }

                destinationIds.add(
                    destination.id
                );
            }
        }

        runtime.lastIntegrityCheckAt =
            nowISO();

        return {

            valid:
                errors.length === 0,

            errors

        };
    }

    /* ======================================================================
       RAW STORAGE
    ====================================================================== */

    function rawRead(key) {

        requireStorage();

        return GLOBAL.localStorage
            .getItem(key);
    }

    function rawWrite(
        key,
        value
    ) {

        requireStorage();

        GLOBAL.localStorage
            .setItem(
                key,
                value
            );
    }

    function rawRemove(key) {

        requireStorage();

        GLOBAL.localStorage
            .removeItem(key);
    }

    function parseJSON(
        raw,
        key
    ) {

        try {

            return JSON.parse(raw);

        } catch (error) {

            throw new Error(
                `[PAY54] Invalid JSON detected in ${key}: ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`
            );
        }
    }

    /* ======================================================================
       QUARANTINE
    ====================================================================== */

    function quarantine(
        payload,
        reason
    ) {

        try {

            const existingRaw =
                rawRead(
                    STORAGE.QUARANTINE_KEY
                );

            let existing = [];

            if (existingRaw) {

                try {

                    const parsed =
                        JSON.parse(
                            existingRaw
                        );

                    existing =
                        Array.isArray(parsed)
                            ? parsed
                            : [];

                } catch (_) {

                    existing = [];
                }
            }

            existing.unshift({

                timestamp:
                    nowISO(),

                reason:
                    cleanString(
                        reason,
                        500
                    ),

                payload:
                    deepClone(payload)

            });

            /*
             * Bound quarantine growth.
             */

            existing =
                existing.slice(
                    0,
                    50
                );

            rawWrite(
                STORAGE.QUARANTINE_KEY,
                JSON.stringify(existing)
            );

            return true;

        } catch (error) {

            console.warn(
                "[PAY54] Beneficiary quarantine write failed:",
                error
            );

            return false;
        }
    }

    /* ======================================================================
       VERIFIED WRITE
    ====================================================================== */

    function writeDocument(
        document
    ) {

        requireStorage();

        const normalised =
            normaliseDocument(
                document,
                {
                    allowRepair:
                        false,
                    preserveUpdatedAt:
                        false
                }
            ).document;

        const integrity =
            verifyDocumentIntegrity(
                normalised
            );

        if (
            !integrity.valid
        ) {
            throw new Error(
                `[PAY54] Refusing to persist invalid Beneficiary repository: ${integrity.errors.join(" | ")}`
            );
        }

        const serialized =
            JSON.stringify(
                normalised
            );

        const existing =
            rawRead(
                STORAGE.PRIMARY_KEY
            );

        try {

            if (
                STORAGE.USE_STAGING_WRITES
            ) {

                rawWrite(
                    STORAGE.STAGING_KEY,
                    serialized
                );

                if (
                    STORAGE.VERIFY_AFTER_WRITE
                ) {

                    const stagedRaw =
                        rawRead(
                            STORAGE.STAGING_KEY
                        );

                    if (
                        stagedRaw !== serialized
                    ) {
                        throw new Error(
                            "[PAY54] Beneficiary staging verification failed."
                        );
                    }

                    const stagedParsed =
                        parseJSON(
                            stagedRaw,
                            STORAGE.STAGING_KEY
                        );

                    const stagedIntegrity =
                        verifyDocumentIntegrity(
                            stagedParsed
                        );

                    if (
                        !stagedIntegrity.valid
                    ) {
                        throw new Error(
                            `[PAY54] Beneficiary staged repository failed integrity verification: ${stagedIntegrity.errors.join(" | ")}`
                        );
                    }
                }
            }

            if (
                STORAGE.PRESERVE_BACKUP &&
                existing !== null
            ) {
                rawWrite(
                    STORAGE.BACKUP_KEY,
                    existing
                );
            }

            rawWrite(
                STORAGE.PRIMARY_KEY,
                serialized
            );

            if (
                STORAGE.VERIFY_AFTER_WRITE
            ) {

                const persistedRaw =
                    rawRead(
                        STORAGE.PRIMARY_KEY
                    );

                if (
                    persistedRaw !==
                    serialized
                ) {
                    throw new Error(
                        "[PAY54] Beneficiary persistence verification failed."
                    );
                }

                const persisted =
                    parseJSON(
                        persistedRaw,
                        STORAGE.PRIMARY_KEY
                    );

                const persistedIntegrity =
                    verifyDocumentIntegrity(
                        persisted
                    );

                if (
                    !persistedIntegrity.valid
                ) {
                    throw new Error(
                        `[PAY54] Persisted Beneficiary repository failed integrity verification: ${persistedIntegrity.errors.join(" | ")}`
                    );
                }
            }

            rawRemove(
                STORAGE.STAGING_KEY
            );

            runtime.lastWriteAt =
                nowISO();

            publish(
                EVENTS.REPOSITORY_CHANGED,
                {
                    recordCount:
                        normalised.records.length
                }
            );

            return normalised;

        } catch (error) {

            runtime.lastError =
                error instanceof Error
                    ? error.message
                    : String(error);

            runtime.lastErrorAt =
                nowISO();

            publish(
                EVENTS.STORAGE_ERROR,
                {
                    operation:
                        "write",
                    message:
                        runtime.lastError
                }
            );

            throw error;
        }
    }

    /* ======================================================================
       RECOVERY
    ====================================================================== */

    function recoverRepository(
        corruptPayload,
        originalError
    ) {

        if (
            !STORAGE.RECOVER_CORRUPT_DATA
        ) {
            throw originalError;
        }

        quarantine(
            corruptPayload,
            originalError instanceof Error
                ? originalError.message
                : String(originalError)
        );

        const recoveryCandidates = [

            {
                key:
                    STORAGE.STAGING_KEY,
                source:
                    "staging"
            },

            {
                key:
                    STORAGE.BACKUP_KEY,
                source:
                    "backup"
            }

        ];

        for (
            const candidate
            of recoveryCandidates
        ) {

            const raw =
                rawRead(
                    candidate.key
                );

            if (!raw) {
                continue;
            }

            try {

                const parsed =
                    parseJSON(
                        raw,
                        candidate.key
                    );

                const result =
                    normaliseDocument(
                        parsed,
                        {
                            allowRepair:
                                true,
                            preserveUpdatedAt:
                                true
                        }
                    );

                if (
                    result.invalid.length > 0
                ) {

                    quarantine(
                        result.invalid,
                        `${candidate.source} recovery invalid records`
                    );
                }

                const integrity =
                    verifyDocumentIntegrity(
                        result.document
                    );

                if (
                    !integrity.valid
                ) {
                    continue;
                }

                const recovered =
                    writeDocument(
                        result.document
                    );

                runtime.recovered =
                    true;

                runtime.lastRecoveryAt =
                    nowISO();

                publish(
                    EVENTS.STORAGE_RECOVERED,
                    {
                        source:
                            candidate.source,
                        recordCount:
                            recovered.records.length
                    }
                );

                return recovered;

            } catch (_) {

                /* try next candidate */
            }
        }

        /*
         * If no verified recovery source exists, initialise a clean repository
         * but preserve the corrupt payload in quarantine.
         */

        const clean =
            writeDocument(
                emptyDocument()
            );

        runtime.recovered =
            true;

        runtime.lastRecoveryAt =
            nowISO();

        publish(
            EVENTS.STORAGE_RECOVERED,
            {
                source:
                    "clean_repository",
                recordCount:
                    0
            }
        );

        return clean;
    }

    /* ======================================================================
       READ REPOSITORY
    ====================================================================== */

    function readDocument() {

        requireStorage();

        const raw =
            rawRead(
                STORAGE.PRIMARY_KEY
            );

        if (
            raw === null ||
            raw === ""
        ) {

            return writeDocument(
                emptyDocument()
            );
        }

        try {

            const parsed =
                parseJSON(
                    raw,
                    STORAGE.PRIMARY_KEY
                );

            const result =
                normaliseDocument(
                    parsed,
                    {
                        allowRepair:
                            BENEFICIARIES
                                .INTEGRITY
                                .REPAIR_INVALID_RECORDS,
                        preserveUpdatedAt:
                            true
                    }
                );

            if (
                result.invalid.length > 0
            ) {

                quarantine(
                    result.invalid,
                    "Invalid Beneficiary records repaired during repository read."
                );

                const repaired =
                    writeDocument(
                        result.document
                    );

                publish(
                    EVENTS.STORAGE_RECOVERED,
                    {
                        source:
                            "record_repair",
                        removedRecords:
                            result.invalid.length,
                        recordCount:
                            repaired.records.length
                    }
                );

                return repaired;
            }

            if (
                STORAGE.VERIFY_ON_READ
            ) {

                const integrity =
                    verifyDocumentIntegrity(
                        result.document
                    );

                if (
                    !integrity.valid
                ) {
                    throw new Error(
                        `[PAY54] Beneficiary repository integrity failure: ${integrity.errors.join(" | ")}`
                    );
                }
            }

            /*
             * Schema-v0/array repositories are upgraded to the canonical
             * document shape when safely readable.
             */

            if (
                Array.isArray(parsed) ||
                parsed.schemaVersion !==
                    SCHEMA_VERSION
            ) {

                const migrated =
                    writeDocument(
                        result.document
                    );

                publish(
                    EVENTS.STORAGE_MIGRATED,
                    {
                        fromSchema:
                            Array.isArray(parsed)
                                ? 0
                                : parsed.schemaVersion,
                        toSchema:
                            SCHEMA_VERSION,
                        recordCount:
                            migrated.records.length
                    }
                );

                return migrated;
            }

            return result.document;

        } catch (error) {

            publish(
                EVENTS.STORAGE_INTEGRITY_FAILED,
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : String(error)
                }
            );

            return recoverRepository(
                raw,
                error
            );
        }
    }

    /* ======================================================================
       COLLECTION HELPERS
    ====================================================================== */

    function getRecordsMutable() {

        return readDocument()
            .records;
    }

    function persistRecords(
        records
    ) {

        if (
            !Array.isArray(records)
        ) {
            throw new TypeError(
                "[PAY54] Beneficiary records must be an array."
            );
        }

        if (
            records.length >
            VALIDATION.MAX_BENEFICIARIES
        ) {
            throw new Error(
                "[PAY54] Beneficiary record limit exceeded."
            );
        }

        const current =
            readDocument();

        return writeDocument({

            ...current,

            records,

            updatedAt:
                nowISO()

        }).records;
    }

    function findIndexById(
        records,
        id
    ) {

        const cleanId =
            cleanString(id);

        return records
            .findIndex(
                record =>
                    record.id === cleanId
            );
    }

    function findDestinationLocation(
        records,
        destinationId
    ) {

        const cleanId =
            cleanString(
                destinationId
            );

        for (
            let beneficiaryIndex = 0;
            beneficiaryIndex <
                records.length;
            beneficiaryIndex += 1
        ) {

            const beneficiary =
                records[
                    beneficiaryIndex
                ];

            const destinationIndex =
                beneficiary
                    .destinations
                    .findIndex(
                        destination =>
                            destination.id ===
                            cleanId
                    );

            if (
                destinationIndex !== -1
            ) {
                return {
                    beneficiaryIndex,
                    destinationIndex
                };
            }
        }

        return null;
    }

    /* ======================================================================
       READ API
    ====================================================================== */

    function getBeneficiaries() {

        return immutableClone(
            getRecordsMutable()
        );
    }

    function getBeneficiaryById(
        id
    ) {

        const cleanId =
            cleanString(id);

        if (!cleanId) {
            return null;
        }

        const record =
            getRecordsMutable()
                .find(
                    item =>
                        item.id === cleanId
                ) ??
            null;

        return record
            ? immutableClone(record)
            : null;
    }

    function exists(id) {

        return Boolean(
            getBeneficiaryById(id)
        );
    }

    function count() {

        return getRecordsMutable()
            .length;
    }

    function findByContactId(
        contactId
    ) {

        const cleanId =
            cleanString(
                contactId,
                VALIDATION
                    .MAX_CONTACT_ID_LENGTH
            );

        if (!cleanId) {
            return [];
        }

        return immutableClone(
            getRecordsMutable()
                .filter(
                    record =>
                        record.contactId ===
                        cleanId
                )
        );
    }

    function findByPay54Id(
        pay54Id
    ) {

        const target =
            cleanString(
                pay54Id,
                VALIDATION
                    .MAX_PAY54_ID_LENGTH
            )
                .toLowerCase();

        if (!target) {
            return [];
        }

        return immutableClone(
            getRecordsMutable()
                .filter(
                    beneficiary =>
                        beneficiary
                            .destinations
                            .some(
                                destination =>
                                    cleanString(
                                        destination
                                            .pay54Id
                                    )
                                        .toLowerCase() ===
                                    target
                            )
                )
        );
    }

    function findByBankAccount(
        accountNumber,
        bankId = ""
    ) {

        const targetAccount =
            cleanString(
                accountNumber,
                VALIDATION
                    .MAX_ACCOUNT_NUMBER_LENGTH
            );

        const targetBank =
            cleanString(
                bankId,
                VALIDATION
                    .MAX_BANK_ID_LENGTH
            )
                .toLowerCase();

        if (!targetAccount) {
            return [];
        }

        return immutableClone(
            getRecordsMutable()
                .filter(
                    beneficiary =>
                        beneficiary
                            .destinations
                            .some(
                                destination => {

                                    if (
                                        destination
                                            .accountNumber !==
                                        targetAccount
                                    ) {
                                        return false;
                                    }

                                    if (
                                        !targetBank
                                    ) {
                                        return true;
                                    }

                                    return cleanString(
                                        destination
                                            .bankId
                                    )
                                        .toLowerCase() ===
                                        targetBank;
                                }
                            )
                )
        );
    }

    function getTrusted() {

        return immutableClone(
            getRecordsMutable()
                .filter(
                    record =>
                        record.trusted === true
                )
        );
    }

    function getByStatus(
        status
    ) {

        const target =
            normaliseStatus(
                status
            );

        return immutableClone(
            getRecordsMutable()
                .filter(
                    record =>
                        record.status ===
                        target
                )
        );
    }

    /* ======================================================================
       CREATE
    ====================================================================== */

    function createBeneficiary(
        payload
    ) {

        const records =
            getRecordsMutable();

        if (
            records.length >=
            VALIDATION.MAX_BENEFICIARIES
        ) {
            throw new Error(
                "[PAY54] Beneficiary record limit reached."
            );
        }

        const beneficiary =
            normaliseBeneficiary(
                payload
            );

        if (
            records.some(
                record =>
                    record.id ===
                    beneficiary.id
            )
        ) {
            throw new Error(
                `[PAY54] Beneficiary id already exists: ${beneficiary.id}.`
            );
        }

        const existingDestinationIds =
            new Set(
                records.flatMap(
                    record =>
                        record.destinations
                            .map(
                                destination =>
                                    destination.id
                            )
                )
            );

        for (
            const destination
            of beneficiary.destinations
        ) {
            if (
                existingDestinationIds
                    .has(
                        destination.id
                    )
            ) {
                throw new Error(
                    `[PAY54] Beneficiary destination id already exists: ${destination.id}.`
                );
            }
        }

        records.push(
            beneficiary
        );

        persistRecords(
            records
        );

        publish(
            EVENTS.CREATED,
            {
                beneficiaryId:
                    beneficiary.id,
                contactId:
                    beneficiary.contactId,
                type:
                    beneficiary.type
            }
        );

        return getBeneficiaryById(
            beneficiary.id
        );
    }

    /* ======================================================================
       UPDATE
    ====================================================================== */

    function updateBeneficiary(
        id,
        patch
    ) {

        if (
            !isPlainObject(patch)
        ) {
            throw new TypeError(
                "[PAY54] Beneficiary update must be a plain object."
            );
        }

        assertSafeObject(
            patch,
            "beneficiaryPatch"
        );

        const records =
            getRecordsMutable();

        const index =
            findIndexById(
                records,
                id
            );

        if (
            index === -1
        ) {
            throw new Error(
                `[PAY54] Beneficiary not found: ${cleanString(id)}.`
            );
        }

        const current =
            records[index];

        /*
         * id and createdAt are immutable repository fields.
         */

        const candidate = {

            ...current,

            ...deepClone(patch),

            id:
                current.id,

            createdAt:
                current.createdAt,

            updatedAt:
                nowISO()

        };

        const normalised =
            normaliseBeneficiary(
                candidate,
                {
                    preserveUpdatedAt:
                        false
                }
            );

        records[index] =
            normalised;

        persistRecords(
            records
        );

        publish(
            EVENTS.UPDATED,
            {
                beneficiaryId:
                    normalised.id,
                contactId:
                    normalised.contactId
            }
        );

        return getBeneficiaryById(
            normalised.id
        );
    }

    /* ======================================================================
       DELETE
    ====================================================================== */

    function deleteBeneficiary(
        id
    ) {

        const records =
            getRecordsMutable();

        const index =
            findIndexById(
                records,
                id
            );

        if (
            index === -1
        ) {
            return false;
        }

        const [
            removed
        ] =
            records.splice(
                index,
                1
            );

        persistRecords(
            records
        );

        publish(
            EVENTS.DELETED,
            {
                beneficiaryId:
                    removed.id,
                contactId:
                    removed.contactId
            }
        );

        return true;
    }

    /* ======================================================================
       DESTINATION CRUD
    ====================================================================== */

    function addDestination(
        beneficiaryId,
        payload
    ) {

        const records =
            getRecordsMutable();

        const index =
            findIndexById(
                records,
                beneficiaryId
            );

        if (
            index === -1
        ) {
            throw new Error(
                `[PAY54] Beneficiary not found: ${cleanString(beneficiaryId)}.`
            );
        }

        const beneficiary =
            records[index];

        if (
            beneficiary
                .destinations
                .length >=
            VALIDATION
                .MAX_DESTINATIONS_PER_BENEFICIARY
        ) {
            throw new Error(
                "[PAY54] Beneficiary destination limit reached."
            );
        }

        const destination =
            normaliseDestination(
                payload
            );

        const location =
            findDestinationLocation(
                records,
                destination.id
            );

        if (location) {
            throw new Error(
                `[PAY54] Destination id already exists: ${destination.id}.`
            );
        }

        beneficiary
            .destinations
            .push(
                destination
            );

        beneficiary.updatedAt =
            nowISO();

        records[index] =
            normaliseBeneficiary(
                beneficiary,
                {
                    preserveUpdatedAt:
                        false
                }
            );

        persistRecords(
            records
        );

        publish(
            EVENTS.DESTINATION_ADDED,
            {
                beneficiaryId:
                    records[index].id,
                destinationId:
                    destination.id,
                type:
                    destination.type
            }
        );

        return getBeneficiaryById(
            records[index].id
        );
    }

    function updateDestination(
        beneficiaryId,
        destinationId,
        patch
    ) {

        if (
            !isPlainObject(patch)
        ) {
            throw new TypeError(
                "[PAY54] Destination update must be a plain object."
            );
        }

        assertSafeObject(
            patch,
            "destinationPatch"
        );

        const records =
            getRecordsMutable();

        const beneficiaryIndex =
            findIndexById(
                records,
                beneficiaryId
            );

        if (
            beneficiaryIndex === -1
        ) {
            throw new Error(
                `[PAY54] Beneficiary not found: ${cleanString(beneficiaryId)}.`
            );
        }

        const beneficiary =
            records[
                beneficiaryIndex
            ];

        const destinationIndex =
            beneficiary
                .destinations
                .findIndex(
                    destination =>
                        destination.id ===
                        cleanString(
                            destinationId
                        )
                );

        if (
            destinationIndex === -1
        ) {
            throw new Error(
                `[PAY54] Beneficiary destination not found: ${cleanString(destinationId)}.`
            );
        }

        const current =
            beneficiary
                .destinations[
                    destinationIndex
                ];

        const updated =
            normaliseDestination(
                {
                    ...current,
                    ...deepClone(patch),
                    id:
                        current.id,
                    createdAt:
                        current.createdAt
                }
            );

        beneficiary
            .destinations[
                destinationIndex
            ] = updated;

        beneficiary.updatedAt =
            nowISO();

        records[
            beneficiaryIndex
        ] =
            normaliseBeneficiary(
                beneficiary,
                {
                    preserveUpdatedAt:
                        false
                }
            );

        persistRecords(
            records
        );

        publish(
            EVENTS.DESTINATION_UPDATED,
            {
                beneficiaryId:
                    beneficiary.id,
                destinationId:
                    updated.id,
                type:
                    updated.type
            }
        );

        return getBeneficiaryById(
            beneficiary.id
        );
    }

    function removeDestination(
        beneficiaryId,
        destinationId
    ) {

        const records =
            getRecordsMutable();

        const beneficiaryIndex =
            findIndexById(
                records,
                beneficiaryId
            );

        if (
            beneficiaryIndex === -1
        ) {
            return false;
        }

        const beneficiary =
            records[
                beneficiaryIndex
            ];

        const destinationIndex =
            beneficiary
                .destinations
                .findIndex(
                    destination =>
                        destination.id ===
                        cleanString(
                            destinationId
                        )
                );

        if (
            destinationIndex === -1
        ) {
            return false;
        }

        if (
            BENEFICIARIES.REPOSITORY
                .REQUIRE_DESTINATION &&
            beneficiary
                .destinations
                .length <= 1
        ) {
            throw new Error(
                "[PAY54] Cannot remove the final destination from a Beneficiary."
            );
        }

        const [
            removed
        ] =
            beneficiary
                .destinations
                .splice(
                    destinationIndex,
                    1
                );

        beneficiary.updatedAt =
            nowISO();

        records[
            beneficiaryIndex
        ] =
            normaliseBeneficiary(
                beneficiary,
                {
                    preserveUpdatedAt:
                        false
                }
            );

        persistRecords(
            records
        );

        publish(
            EVENTS.DESTINATION_REMOVED,
            {
                beneficiaryId:
                    beneficiary.id,
                destinationId:
                    removed.id,
                type:
                    removed.type
            }
        );

        return true;
    }

    function getDestinations(
        beneficiaryId
    ) {

        const beneficiary =
            getBeneficiaryById(
                beneficiaryId
            );

        if (!beneficiary) {
            return [];
        }

        return immutableClone(
            beneficiary.destinations
        );
    }

    /* ======================================================================
       TRUST
    ====================================================================== */

    function setTrusted(
        beneficiaryId,
        trusted
    ) {

        const result =
            updateBeneficiary(
                beneficiaryId,
                {
                    trusted:
                        Boolean(trusted)
                }
            );

        publish(
            EVENTS.TRUST_CHANGED,
            {
                beneficiaryId:
                    result.id,
                trusted:
                    result.trusted
            }
        );

        return result;
    }

    /* ======================================================================
       STATUS
    ====================================================================== */

    function setStatus(
        beneficiaryId,
        status
    ) {

        const target =
            normaliseStatus(
                status
            );

        const result =
            updateBeneficiary(
                beneficiaryId,
                {
                    status:
                        target
                }
            );

        publish(
            EVENTS.STATUS_CHANGED,
            {
                beneficiaryId:
                    result.id,
                status:
                    result.status
            }
        );

        return result;
    }

    /* ======================================================================
       USAGE
    ====================================================================== */

    function updateUsage(
        beneficiaryId,
        payload = {}
    ) {

        const current =
            getBeneficiaryById(
                beneficiaryId
            );

        if (!current) {
            throw new Error(
                `[PAY54] Beneficiary not found: ${cleanString(beneficiaryId)}.`
            );
        }

        const increment =
            Number.isFinite(
                Number(
                    payload.increment
                )
            )
                ? Math.max(
                    0,
                    Math.trunc(
                        Number(
                            payload.increment
                        )
                    )
                )
                : 1;

        const usage = {

            transferCount:
                current.usage
                    .transferCount +
                increment,

            lastUsedAt:
                cleanString(
                    payload.lastUsedAt,
                    40
                ) ||
                nowISO()

        };

        const result =
            updateBeneficiary(
                beneficiaryId,
                {
                    usage
                }
            );

        publish(
            EVENTS.USAGE_UPDATED,
            {
                beneficiaryId:
                    result.id,
                transferCount:
                    result.usage
                        .transferCount,
                lastUsedAt:
                    result.usage
                        .lastUsedAt
            }
        );

        return result;
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
                "[PAY54] Beneficiary risk update must be a plain object."
            );
        }

        const risk =
            normaliseRisk({

                ...payload,

                assessedAt:
                    cleanString(
                        payload.assessedAt,
                        40
                    ) ||
                    nowISO()

            });

        const result =
            updateBeneficiary(
                beneficiaryId,
                {
                    risk
                }
            );

        publish(
            EVENTS.RISK_UPDATED,
            {
                beneficiaryId:
                    result.id,
                level:
                    result.risk.level,
                score:
                    result.risk.score
            }
        );

        return result;
    }

    /* ======================================================================
       CONTACT RELATIONSHIP
    ====================================================================== */

    function linkContact(
        beneficiaryId,
        contactId
    ) {

        const cleanId =
            cleanString(
                contactId,
                VALIDATION
                    .MAX_CONTACT_ID_LENGTH
            );

        if (!cleanId) {
            throw new Error(
                "[PAY54] contactId is required."
            );
        }

        return updateBeneficiary(
            beneficiaryId,
            {
                contactId:
                    cleanId
            }
        );
    }

    function unlinkContact(
        beneficiaryId
    ) {

        return updateBeneficiary(
            beneficiaryId,
            {
                contactId:
                    null
            }
        );
    }

    /* ======================================================================
       CLEAR

       This affects ONLY the new Beneficiary repository.
       pay54_recipients is deliberately untouched.
    ====================================================================== */

    function clearBeneficiaries() {

        const clean =
            writeDocument(
                emptyDocument()
            );

        return immutableClone(
            clean.records
        );
    }

    /* ======================================================================
       MIGRATION READINESS

       WP-011A.2 MUST NOT migrate legacy recipients.
    ====================================================================== */

    function getMigrationStatus() {

        const legacyExists =
            rawRead(
                STORAGE.LEGACY_RECIPIENTS_KEY
            ) !== null;

        const markerRaw =
            rawRead(
                STORAGE.MIGRATION_KEY
            );

        let marker = null;

        if (markerRaw) {
            try {
                marker =
                    JSON.parse(
                        markerRaw
                    );
            } catch (_) {
                marker = null;
            }
        }

        return immutableClone({

            migrationImplemented:
                false,

            legacyRepositoryPresent:
                legacyExists,

            legacyRepositoryKey:
                STORAGE
                    .LEGACY_RECIPIENTS_KEY,

            preserveLegacyRecipients:
                BENEFICIARIES
                    .MIGRATIONS
                    .PRESERVE_LEGACY_RECIPIENTS,

            deleteLegacyAfterMigration:
                BENEFICIARIES
                    .MIGRATIONS
                    .DELETE_LEGACY_AFTER_MIGRATION,

            marker

        });
    }

    /* ======================================================================
       INTEGRITY API
    ====================================================================== */

    function verifyIntegrity() {

        try {

            const document =
                readDocument();

            const result =
                verifyDocumentIntegrity(
                    document
                );

            return immutableClone({

                healthy:
                    result.valid,

                status:
                    result.valid
                        ? "pass"
                        : "fail",

                errors:
                    result.errors,

                recordCount:
                    document.records
                        .length,

                checkedAt:
                    runtime
                        .lastIntegrityCheckAt

            });

        } catch (error) {

            return immutableClone({

                healthy:
                    false,

                status:
                    "fail",

                errors: [
                    error instanceof Error
                        ? error.message
                        : String(error)
                ],

                recordCount:
                    0,

                checkedAt:
                    nowISO()

            });
        }
    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    function getHealth() {

        let recordCount = 0;

        let integrity = {

            healthy:
                false,

            status:
                "unavailable",

            errors:
                []

        };

        try {

            recordCount =
                count();

            integrity =
                verifyIntegrity();

        } catch (error) {

            runtime.lastError =
                error instanceof Error
                    ? error.message
                    : String(error);

            runtime.lastErrorAt =
                nowISO();
        }

        const healthy =
            runtime.ready === true &&
            runtime.storageAvailable ===
                true &&
            runtime.securityVerified ===
                true &&
            integrity.healthy === true;

        return immutableClone({

            healthy,

            status:
                healthy
                    ? "ready"
                    : "degraded",

            module:
                MODULE_ID,

            repository:
                REPOSITORY_ID,

            version:
                VERSION,

            schemaVersion:
                SCHEMA_VERSION,

            storageAvailable:
                runtime
                    .storageAvailable,

            securityVerified:
                runtime
                    .securityVerified,

            recordCount,

            integrity,

            recovered:
                runtime.recovered,

            lastRecoveryAt:
                runtime
                    .lastRecoveryAt,

            lastIntegrityCheckAt:
                runtime
                    .lastIntegrityCheckAt,

            lastWriteAt:
                runtime
                    .lastWriteAt,

            lastErrorAt:
                runtime
                    .lastErrorAt,

            lastError:
                runtime
                    .lastError

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

        verifySecurityBootstrap();

        requireStorage();

        /*
         * Reading initialises the canonical repository if it does not exist
         * and verifies/recoveries it if required.
         */

        const document =
            readDocument();

        const integrity =
            verifyDocumentIntegrity(
                document
            );

        if (
            !integrity.valid
        ) {
            throw new Error(
                `[PAY54] Beneficiary Storage initialisation failed integrity verification: ${integrity.errors.join(" | ")}`
            );
        }

        runtime.ready =
            true;

        publish(
            EVENTS.STORAGE_READY,
            {
                version:
                    VERSION,
                schemaVersion:
                    SCHEMA_VERSION,
                recordCount:
                    document.records.length
            }
        );

        publish(
            EVENTS.REPOSITORY_READY,
            {
                repository:
                    REPOSITORY_ID,
                recordCount:
                    document.records.length
            }
        );

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

        repository:
            REPOSITORY_ID,

        schemaVersion:
            SCHEMA_VERSION,

        initialise,

        initialize:
            initialise,

        getHealth,

        health:
            getHealth,

        verifyIntegrity,

        getMigrationStatus,

        getBeneficiaries,

        getAll:
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

        create:
            createBeneficiary,

        createBeneficiary,

        add:
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

        setTrusted,

        setStatus,

        updateUsage,

        setRisk,

        linkContact,

        unlinkContact,

        clear:
            clearBeneficiaries,

        clearBeneficiaries

    };

    /* ======================================================================
       BOOTSTRAP / GLOBAL EXPORT
    ====================================================================== */

    try {

        initialise();

        /*
         * Canonical standalone global.
         *
         * We deliberately do not mutate PAY54_SERVICES or Contacts.
         */

        GLOBAL.PAY54_BENEFICIARIES_STORAGE =
            Object.freeze(API);

        /*
         * Progressive namespace for later Beneficiary Engine components.
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

        GLOBAL.PAY54_BENEFICIARIES.STORAGE =
            GLOBAL
                .PAY54_BENEFICIARIES_STORAGE;

        GLOBAL.PAY54_BENEFICIARIES.storage =
            GLOBAL
                .PAY54_BENEFICIARIES_STORAGE;

        /*
         * Optional platform registry integration.
         *
         * The exact PAY54 registry implementation is progressive, therefore
         * registration is best-effort and cannot break persistence.
         */

        const platformRegistry =
            GLOBAL.PAY54_REGISTRY;

        if (
            platformRegistry &&
            typeof platformRegistry.register ===
                "function"
        ) {
            try {

                platformRegistry.register(
                    MODULE_ID,
                    GLOBAL
                        .PAY54_BENEFICIARIES_STORAGE
                );

            } catch (error) {

                console.warn(
                    "[PAY54] Beneficiary Storage platform registry registration skipped:",
                    error
                );
            }
        }

    } catch (error) {

        runtime.ready =
            false;

        runtime.lastError =
            error instanceof Error
                ? error.message
                : String(error);

        runtime.lastErrorAt =
            nowISO();

        publish(
            EVENTS.STORAGE_ERROR,
            {
                operation:
                    "bootstrap",
                message:
                    runtime.lastError
            }
        );

        console.error(
            "[PAY54] Beneficiary Storage bootstrap failed:",
            error
        );

        throw error;
    }

    /* ======================================================================
       STARTUP
    ====================================================================== */

    console.info(
        "✅ PAY54 Beneficiary Storage",
        VERSION,
        "loaded."
    );

})();
