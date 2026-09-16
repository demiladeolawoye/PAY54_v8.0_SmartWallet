"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE BENEFICIARY MIGRATION ENGINE
   File: assets/js/engine/beneficiaries/migration.js
   Version: v1.0.0

   Work Package
   ------------
   WP-011B.2 — Legacy Recipient → Beneficiary Migration Engine

   Purpose
   -------
   Controlled, explicit and idempotent migration of legacy pay54_recipients
   records into the canonical PAY54 Beneficiaries domain.

   Security / Compatibility
   ------------------------
   • Never mutates or deletes pay54_recipients
   • Never runs migration automatically on module load
   • Uses PAY54_BENEFICIARIES_ENGINE for canonical writes
   • Reuses canonical domain validation and duplicate detection
   • Supports dry-run analysis before commit
   • Preserves migration evidence in pay54_beneficiaries_migration
   • Verifies repository integrity after committed migration
   • Best-effort event publication cannot break migration
   • Rejects unsafe/prototype-pollution fields
   • Does not migrate PINs, tokens, card secrets or other forbidden fields
   • Repeated execution does not create duplicate payment destinations

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
            "[PAY54] Constants Registry must load before Beneficiary Migration Engine."
        );
    }

    const MODULES =
        CONSTANTS.get("MODULES");

    if (
        !MODULES ||
        typeof MODULES !== "object"
    ) {
        throw new Error(
            "[PAY54] Module identifiers unavailable to Beneficiary Migration Engine."
        );
    }

    const VERSIONS =
        CONSTANTS.get(
            MODULES.VERSIONS
        );

    const BENEFICIARIES =
        CONSTANTS.get(
            MODULES.BENEFICIARIES
        );

    const ENGINE =
        GLOBAL.PAY54_BENEFICIARIES_ENGINE;

    const STORAGE_ENGINE =
        GLOBAL.PAY54_BENEFICIARIES_STORAGE;

    if (
        !VERSIONS ||
        !BENEFICIARIES ||
        !ENGINE ||
        !STORAGE_ENGINE
    ) {
        throw new Error(
            "[PAY54] Beneficiary Migration Engine dependencies are unavailable."
        );
    }

    if (
        BENEFICIARIES.VERSION !== VERSION ||
        VERSIONS.BENEFICIARIES !== VERSION ||
        ENGINE.version !== VERSION ||
        STORAGE_ENGINE.version !== VERSION
    ) {
        throw new Error(
            "[PAY54] Beneficiary Migration Engine version contract mismatch."
        );
    }

    const REQUIRED_ENGINE_METHODS = [
        "validateBeneficiary",
        "validateDestination",
        "findDuplicateDestination",
        "createBeneficiary",
        "getBeneficiaryById",
        "findByPay54Id",
        "findByBankAccount",
        "setTrusted",
        "recordUsage",
        "verifyIntegrity",
        "getHealth"
    ];

    for (
        const method
        of REQUIRED_ENGINE_METHODS
    ) {
        if (
            typeof ENGINE[method] !==
            "function"
        ) {
            throw new Error(
                `[PAY54] Beneficiary Engine method unavailable to migration: ${method}.`
            );
        }
    }

    /* ======================================================================
       CONSTANT REFERENCES
    ====================================================================== */

    const MODULE_ID =
        BENEFICIARIES.MODULE.MIGRATION;

    const EVENTS =
        BENEFICIARIES.EVENTS;

    const TYPES =
        BENEFICIARIES.TYPES;

    const DESTINATION_TYPES =
        BENEFICIARIES.DESTINATION_TYPES;

    const STATUS =
        BENEFICIARIES.STATUS;

    const VALIDATION =
        BENEFICIARIES.VALIDATION;

    const SECURITY =
        BENEFICIARIES.SECURITY;

    const MIGRATIONS =
        BENEFICIARIES.MIGRATIONS;

    const STORAGE =
        BENEFICIARIES.STORAGE;

    if (
        MIGRATIONS.PRESERVE_LEGACY_RECIPIENTS !==
            true ||
        MIGRATIONS.DELETE_LEGACY_AFTER_MIGRATION !==
            false
    ) {
        throw new Error(
            "[PAY54] Migration policy must preserve pay54_recipients."
        );
    }

    /* ======================================================================
       RUNTIME
    ====================================================================== */

    const runtime = {

        ready:
            false,

        running:
            false,

        lastAnalysisAt:
            null,

        lastMigrationAt:
            null,

        lastError:
            null,

        lastErrorAt:
            null

    };

    /* ======================================================================
       SECURITY
    ====================================================================== */

    const UNSAFE_KEYS =
        new Set([
            "__proto__",
            "prototype",
            "constructor"
        ]);

    const FORBIDDEN_FIELDS =
        new Set(
            (
                SECURITY.FORBIDDEN_FIELDS ||
                []
            )
                .map(
                    field =>
                        String(field)
                            .toLowerCase()
                )
        );

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

    function immutableClone(value) {

        return deepFreeze(
            deepClone(value)
        );
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

        const bus =
            GLOBAL.PAY54_EVENTS;

        if (
            !bus ||
            typeof bus.publish !==
                "function" ||
            !eventName
        ) {
            return false;
        }

        try {

            bus.publish(
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
                "[PAY54] Beneficiary Migration event publication failed:",
                eventName,
                error
            );

            return false;
        }
    }

    /* ======================================================================
       CONTROLLED STORAGE ACCESS

       This module may directly access ONLY:
       • the legacy migration source
       • the dedicated migration marker

       Canonical Beneficiary persistence always goes through the Domain Engine.
    ====================================================================== */

    function safeStorageGet(key) {

        try {

            return GLOBAL.localStorage
                .getItem(key);

        } catch (error) {

            throw new Error(
                `[PAY54] Unable to read migration storage key ${key}: ${error.message}`
            );
        }
    }

    function safeStorageSet(
        key,
        value
    ) {

        try {

            GLOBAL.localStorage
                .setItem(
                    key,
                    value
                );

            return true;

        } catch (error) {

            throw new Error(
                `[PAY54] Unable to write migration storage key ${key}: ${error.message}`
            );
        }
    }

    /* ======================================================================
       LEGACY SECURITY VALIDATION
    ====================================================================== */

    function assertSafeValue(
        value,
        path = "legacyRecipient",
        seen = new WeakSet()
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return true;
        }

        if (
            typeof value !==
            "object"
        ) {
            return true;
        }

        if (
            seen.has(value)
        ) {
            throw new Error(
                `[PAY54] Circular legacy recipient value rejected at ${path}.`
            );
        }

        seen.add(value);

        for (
            const key
            of Object.keys(value)
        ) {

            const normalized =
                key.toLowerCase();

            if (
                UNSAFE_KEYS.has(key) ||
                FORBIDDEN_FIELDS.has(
                    normalized
                )
            ) {
                throw new Error(
                    `[PAY54] Unsafe legacy recipient field rejected at ${path}.${key}.`
                );
            }

            assertSafeValue(
                value[key],
                `${path}.${key}`,
                seen
            );
        }

        return true;
    }

    /* ======================================================================
       NORMALISATION
    ====================================================================== */

    function normalizePay54Id(value) {

        let result =
            cleanString(
                value,
                VALIDATION
                    .MAX_PAY54_ID_LENGTH
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

    function normalizeAccountNumber(
        value
    ) {

        return cleanString(
            value,
            VALIDATION
                .MAX_ACCOUNT_NUMBER_LENGTH
        )
            .replace(
                /\s+/g,
                ""
            );
    }

    function normalizeCurrency(value) {

        const result =
            cleanString(
                value,
                VALIDATION
                    .MAX_CURRENCY_LENGTH
            )
                .toUpperCase();

        return /^[A-Z]{3}$/
            .test(result)
                ? result
                : "";
    }

    function normalizeCountry(value) {

        const result =
            cleanString(
                value,
                VALIDATION
                    .MAX_COUNTRY_LENGTH
            )
                .toUpperCase();

        return /^[A-Z]{2}$/
            .test(result)
                ? result
                : "";
    }

    function normalizeDate(value) {

        const text =
            cleanString(
                value,
                64
            );

        if (!text) {
            return null;
        }

        const time =
            Date.parse(text);

        return Number.isFinite(time)
            ? new Date(time)
                .toISOString()
            : null;
    }

    function normalizeCount(value) {

        const numeric =
            Number(value);

        return Number.isFinite(numeric)
            ? Math.max(
                0,
                Math.trunc(numeric)
            )
            : 0;
    }

    function normalizeBoolean(value) {

        if (
            value === true ||
            value === false
        ) {
            return value;
        }

        if (
            typeof value ===
            "string"
        ) {

            const normalized =
                value
                    .trim()
                    .toLowerCase();

            if (
                [
                    "true",
                    "1",
                    "yes",
                    "y"
                ].includes(normalized)
            ) {
                return true;
            }

            if (
                [
                    "false",
                    "0",
                    "no",
                    "n",
                    ""
                ].includes(normalized)
            ) {
                return false;
            }
        }

        return Boolean(value);
    }

    /* ======================================================================
       LEGACY CLASSIFICATION
    ====================================================================== */

    function legacyType(recipient) {

        const explicit =
            cleanString(
                recipient.type
            )
                .toLowerCase();

        if (
            [
                "pay54",
                "wallet",
                "user",
                "tag"
            ].includes(explicit)
        ) {
            return TYPES.PAY54;
        }

        if (
            [
                "bank",
                "bank_account",
                "bank-account"
            ].includes(explicit)
        ) {
            return TYPES.BANK;
        }

        if (
            [
                "global",
                "international",
                "iban",
                "swift"
            ].includes(explicit)
        ) {
            return TYPES.GLOBAL;
        }

        if (
            cleanString(
                recipient.tag ||
                recipient.pay54Id ||
                recipient.pay54Tag
            )
        ) {
            return TYPES.PAY54;
        }

        if (
            cleanString(
                recipient.iban ||
                recipient.swiftBic ||
                recipient.swift ||
                recipient.bic
            )
        ) {
            return TYPES.GLOBAL;
        }

        if (
            cleanString(
                recipient.accountNumber ||
                recipient.account
            )
        ) {
            return TYPES.BANK;
        }

        return "";
    }

    /* ======================================================================
       OPTIONAL CONTACT RESOLUTION

       Contacts remain canonical owners of identity.

       Migration never creates or mutates Contacts.
    ====================================================================== */

    function resolveContactId(recipient) {

        const direct =
            cleanString(
                recipient.contactId,
                VALIDATION
                    .MAX_CONTACT_ID_LENGTH
            );

        if (direct) {
            return direct;
        }

        const contacts =
            GLOBAL.PAY54_CONTACTS_SERVICE;

        if (
            !contacts ||
            typeof contacts !==
                "object"
        ) {
            return null;
        }

        try {

            const pay54Id =
                cleanString(
                    recipient.tag ||
                    recipient.pay54Id ||
                    recipient.pay54Tag
                );

            if (
                pay54Id &&
                typeof contacts.findByPay54Id ===
                    "function"
            ) {

                const matches =
                    contacts.findByPay54Id(
                        pay54Id
                    );

                const contact =
                    Array.isArray(matches)
                        ? matches[0]
                        : matches;

                if (
                    contact?.id
                ) {
                    return (
                        cleanString(
                            contact.id,
                            VALIDATION
                                .MAX_CONTACT_ID_LENGTH
                        ) ||
                        null
                    );
                }
            }

            const phone =
                cleanString(
                    recipient.phone ||
                    recipient.phoneNumber
                );

            if (
                phone &&
                typeof contacts.findByPhone ===
                    "function"
            ) {

                const matches =
                    contacts.findByPhone(
                        phone
                    );

                const contact =
                    Array.isArray(matches)
                        ? matches[0]
                        : matches;

                if (
                    contact?.id
                ) {
                    return (
                        cleanString(
                            contact.id,
                            VALIDATION
                                .MAX_CONTACT_ID_LENGTH
                        ) ||
                        null
                    );
                }
            }

            const email =
                cleanString(
                    recipient.email
                )
                    .toLowerCase();

            if (
                email &&
                typeof contacts.findByEmail ===
                    "function"
            ) {

                const matches =
                    contacts.findByEmail(
                        email
                    );

                const contact =
                    Array.isArray(matches)
                        ? matches[0]
                        : matches;

                if (
                    contact?.id
                ) {
                    return (
                        cleanString(
                            contact.id,
                            VALIDATION
                                .MAX_CONTACT_ID_LENGTH
                        ) ||
                        null
                    );
                }
            }

        } catch (error) {

            console.warn(
                "[PAY54] Legacy recipient Contact resolution skipped:",
                error
            );
        }

        return null;
    }

    /* ======================================================================
       DESTINATION TRANSFORMATION
    ====================================================================== */

    function destinationFromLegacy(
        recipient,
        type
    ) {

        const currency =
            normalizeCurrency(
                recipient.currency
            );

        const country =
            normalizeCountry(
                recipient.country ||
                recipient.countryCode
            );

        const accountName =
            cleanString(
                recipient.accountName ||
                recipient.displayName ||
                recipient.name,
                VALIDATION
                    .MAX_ACCOUNT_NAME_LENGTH
            );

        /* ------------------------------------------------------------------
           PAY54
        ------------------------------------------------------------------ */

        if (
            type ===
            TYPES.PAY54
        ) {

            const pay54Id =
                normalizePay54Id(
                    recipient.tag ||
                    recipient.pay54Id ||
                    recipient.pay54Tag
                );

            if (!pay54Id) {
                throw new Error(
                    "[PAY54] Legacy PAY54 recipient has no PAY54 identity."
                );
            }

            return {

                type:
                    DESTINATION_TYPES.PAY54,

                pay54Id,

                ...(
                    currency
                        ? { currency }
                        : {}
                ),

                ...(
                    accountName
                        ? { accountName }
                        : {}
                ),

                metadata: {
                    source:
                        "legacy-recipient-migration"
                }

            };
        }

        /* ------------------------------------------------------------------
           BANK / GLOBAL COMMON DATA
        ------------------------------------------------------------------ */

        const accountNumber =
            normalizeAccountNumber(
                recipient.accountNumber ||
                recipient.account
            );

        const bankId =
            cleanString(
                recipient.bankId ||
                recipient.bankCode ||
                recipient.bank ||
                recipient.bankName,
                VALIDATION
                    .MAX_BANK_ID_LENGTH
            );

        const bankName =
            cleanString(
                recipient.bankName ||
                recipient.bank,
                VALIDATION
                    .MAX_BANK_NAME_LENGTH
            );

        const routingCode =
            cleanString(
                recipient.routingCode ||
                recipient.sortCode ||
                recipient.routingNumber,
                VALIDATION
                    .MAX_ROUTING_CODE_LENGTH
            );

        const iban =
            cleanString(
                recipient.iban,
                VALIDATION
                    .MAX_IBAN_LENGTH
            )
                .replace(
                    /\s+/g,
                    ""
                )
                .toUpperCase();

        const swiftBic =
            cleanString(
                recipient.swiftBic ||
                recipient.swift ||
                recipient.bic,
                VALIDATION
                    .MAX_SWIFT_BIC_LENGTH
            )
                .replace(
                    /\s+/g,
                    ""
                )
                .toUpperCase();

        /* ------------------------------------------------------------------
           GLOBAL
        ------------------------------------------------------------------ */

        if (
            type ===
            TYPES.GLOBAL
        ) {

            if (
                !accountNumber &&
                !iban
            ) {
                throw new Error(
                    "[PAY54] Legacy GLOBAL recipient requires accountNumber or IBAN."
                );
            }

            return {

                type:
                    DESTINATION_TYPES.GLOBAL,

                ...(
                    bankId
                        ? { bankId }
                        : {}
                ),

                ...(
                    bankName
                        ? { bankName }
                        : {}
                ),

                ...(
                    accountNumber
                        ? { accountNumber }
                        : {}
                ),

                ...(
                    accountName
                        ? { accountName }
                        : {}
                ),

                ...(
                    currency
                        ? { currency }
                        : {}
                ),

                ...(
                    country
                        ? { country }
                        : {}
                ),

                ...(
                    routingCode
                        ? { routingCode }
                        : {}
                ),

                ...(
                    iban
                        ? { iban }
                        : {}
                ),

                ...(
                    swiftBic
                        ? { swiftBic }
                        : {}
                ),

                metadata: {
                    source:
                        "legacy-recipient-migration"
                }

            };
        }

        /* ------------------------------------------------------------------
           BANK
        ------------------------------------------------------------------ */

        if (!accountNumber) {
            throw new Error(
                "[PAY54] Legacy BANK recipient has no accountNumber."
            );
        }

        return {

            type:
                DESTINATION_TYPES.BANK,

            ...(
                bankId
                    ? { bankId }
                    : {}
            ),

            ...(
                bankName
                    ? { bankName }
                    : {}
            ),

            accountNumber,

            ...(
                accountName
                    ? { accountName }
                    : {}
            ),

            ...(
                currency
                    ? { currency }
                    : {}
            ),

            ...(
                country
                    ? { country }
                    : {}
            ),

            ...(
                routingCode
                    ? { routingCode }
                    : {}
            ),

            metadata: {
                source:
                    "legacy-recipient-migration"
            }

        };
    }

    /* ======================================================================
       LEGACY RECIPIENT → BENEFICIARY
    ====================================================================== */

    function transformLegacyRecipient(
        recipient,
        index = 0
    ) {

        if (
            !isPlainObject(recipient)
        ) {
            throw new TypeError(
                `[PAY54] Legacy recipient at index ${index} must be an object.`
            );
        }

        assertSafeValue(
            recipient,
            `legacyRecipients[${index}]`
        );

        const type =
            legacyType(recipient);

        if (!type) {
            throw new Error(
                `[PAY54] Unable to classify legacy recipient at index ${index}.`
            );
        }

        const destination =
            destinationFromLegacy(
                recipient,
                type
            );

        ENGINE.validateDestination(
            destination
        );

        const legacyRecipientId =
            cleanString(
                recipient.id,
                128
            );

        const contactId =
            resolveContactId(
                recipient
            );

        const transferCount =
            normalizeCount(
                recipient.transferCount
            );

        const lastUsedAt =
            normalizeDate(
                recipient.lastUsed ||
                recipient.lastUsedAt
            );

        const metadata = {

            source:
                "legacy-recipient-migration",

            ...(
                legacyRecipientId
                    ? {
                        legacyRecipientId
                    }
                    : {}
            ),

            ...(
                lastUsedAt
                    ? {
                        lastUsedAt
                    }
                    : {}
            ),

            ...(
                transferCount > 0
                    ? {
                        transferCount
                    }
                    : {}
            )

        };

        const payload = {

            type,

            status:
                STATUS.ACTIVE,

            contactId,

            trusted:
                normalizeBoolean(
                    recipient.trusted
                ),

            destinations: [
                destination
            ],

            metadata

        };

        ENGINE.validateBeneficiary(
            payload
        );

        return immutableClone({

            index,

            legacyRecipientId:
                legacyRecipientId ||
                null,

            favourite:
                normalizeBoolean(
                    recipient.favourite
                ),

            trusted:
                normalizeBoolean(
                    recipient.trusted
                ),

            transferCount,

            lastUsedAt,

            contactId,

            payload

        });
    }

    /* ======================================================================
       LEGACY REPOSITORY READER

       READ ONLY.
       No function in this module writes to LEGACY_RECIPIENTS_KEY.
    ====================================================================== */

    function parseLegacyRepository() {

        const raw =
            safeStorageGet(
                STORAGE
                    .LEGACY_RECIPIENTS_KEY
            );

        if (
            raw === null
        ) {
            return immutableClone({

                present:
                    false,

                records:
                    [],

                rawLength:
                    0

            });
        }

        let parsed;

        try {

            parsed =
                JSON.parse(raw);

        } catch (error) {

            throw new Error(
                `[PAY54] Legacy recipient repository contains invalid JSON: ${error.message}`
            );
        }

        const records =
            Array.isArray(parsed)
                ? parsed
                : Array.isArray(
                    parsed?.recipients
                )
                    ? parsed.recipients
                    : null;

        if (!records) {
            throw new Error(
                "[PAY54] Legacy recipient repository must contain an array of recipients."
            );
        }

        return immutableClone({

            present:
                true,

            records,

            rawLength:
                raw.length

        });
    }

    /* ======================================================================
       CANONICAL DUPLICATE RESOLUTION
    ====================================================================== */

    function existingForDestination(
        destination
    ) {

        const duplicate =
            ENGINE
                .findDuplicateDestination(
                    destination
                );

        return (
            duplicate?.beneficiary ||
            null
        );
    }

    /* ======================================================================
       DRY-RUN / ANALYSIS
    ====================================================================== */

    function analyse(
        options = {}
    ) {

        const repository =
            parseLegacyRepository();

        const items = [];

        const summary = {

            total:
                repository.records.length,

            migratable:
                0,

            existing:
                0,

            invalid:
                0,

            contactLinked:
                0,

            trusted:
                0,

            favouritesObserved:
                0

        };

        repository.records
            .forEach(
                (
                    recipient,
                    index
                ) => {

                    try {

                        const transformed =
                            transformLegacyRecipient(
                                recipient,
                                index
                            );

                        const existing =
                            existingForDestination(
                                transformed
                                    .payload
                                    .destinations[0]
                            );

                        if (existing) {
                            summary.existing += 1;
                        } else {
                            summary.migratable += 1;
                        }

                        if (
                            transformed.contactId
                        ) {
                            summary.contactLinked += 1;
                        }

                        if (
                            transformed.trusted
                        ) {
                            summary.trusted += 1;
                        }

                        if (
                            transformed.favourite
                        ) {
                            summary.favouritesObserved += 1;
                        }

                        items.push({

                            index,

                            legacyRecipientId:
                                transformed
                                    .legacyRecipientId,

                            status:
                                existing
                                    ? "existing"
                                    : "migratable",

                            existingBeneficiaryId:
                                existing?.id ||
                                null,

                            transformed

                        });

                    } catch (error) {

                        summary.invalid += 1;

                        items.push({

                            index,

                            legacyRecipientId:
                                isPlainObject(
                                    recipient
                                )
                                    ? (
                                        cleanString(
                                            recipient.id,
                                            128
                                        ) ||
                                        null
                                    )
                                    : null,

                            status:
                                "invalid",

                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error)

                        });
                    }
                }
            );

        runtime.lastAnalysisAt =
            nowISO();

        return immutableClone({

            mode:
                options.dryRun === false
                    ? "analysis"
                    : "dry-run",

            legacyRepositoryPresent:
                repository.present,

            legacyRepositoryKey:
                STORAGE
                    .LEGACY_RECIPIENTS_KEY,

            legacyRepositoryPreserved:
                true,

            summary,

            items,

            analysedAt:
                runtime.lastAnalysisAt

        });
    }

    /* ======================================================================
       MIGRATION MARKER
    ====================================================================== */

    function readMarker() {

        const raw =
            safeStorageGet(
                STORAGE.MIGRATION_KEY
            );

        if (!raw) {
            return null;
        }

        try {

            const marker =
                JSON.parse(raw);

            return isPlainObject(marker)
                ? immutableClone(marker)
                : null;

        } catch (_) {

            return null;
        }
    }

    function writeMarker(marker) {

        const clean = {

            module:
                MODULE_ID,

            version:
                VERSION,

            schemaVersion:
                MIGRATIONS
                    .TARGET_SCHEMA_VERSION,

            preserveLegacyRecipients:
                true,

            deleteLegacyAfterMigration:
                false,

            ...deepClone(marker)

        };

        safeStorageSet(
            STORAGE.MIGRATION_KEY,
            JSON.stringify(clean)
        );

        return immutableClone(
            clean
        );
    }

    /* ======================================================================
       LEGACY STATE APPLICATION

       Applied only to newly-created beneficiaries during this migration run.

       Existing Beneficiaries are not given historical usage again. This is
       essential for idempotency.
    ====================================================================== */

    function applyLegacyState(
        beneficiary,
        transformed
    ) {

        let current =
            beneficiary;

        if (
            transformed.trusted &&
            current?.trusted !== true
        ) {

            current =
                ENGINE.setTrusted(
                    current.id,
                    true
                );
        }

        if (
            transformed.transferCount > 0 ||
            transformed.lastUsedAt
        ) {

            current =
                ENGINE.recordUsage(
                    current.id,
                    {

                        increment:
                            transformed
                                .transferCount,

                        ...(
                            transformed.lastUsedAt
                                ? {
                                    lastUsedAt:
                                        transformed
                                            .lastUsedAt
                                }
                                : {}
                        )

                    }
                );
        }

        return current;
    }

    /* ======================================================================
       COMMITTED MIGRATION

       Explicit execution only.
       Calling initialise() or loading this script never calls migrate().
    ====================================================================== */

    function migrate(
        options = {}
    ) {

        if (
            runtime.running
        ) {
            throw new Error(
                "[PAY54] Beneficiary migration is already running."
            );
        }

        const strict =
            options.strict === true;

        runtime.running =
            true;

        runtime.lastError =
            null;

        runtime.lastErrorAt =
            null;

        const startedAt =
            nowISO();

        publish(
            EVENTS.MIGRATION_STARTED,
            {
                startedAt,
                strict
            }
        );

        try {

            const analysis =
                analyse({
                    dryRun:
                        false
                });

            const result = {

                total:
                    analysis
                        .summary
                        .total,

                created:
                    0,

                existing:
                    0,

                invalid:
                    analysis
                        .summary
                        .invalid,

                failed:
                    0,

                stateApplied:
                    0,

                skipped:
                    0

            };

            const records = [];

            if (
                strict &&
                analysis.summary.invalid >
                    0
            ) {
                throw new Error(
                    `[PAY54] Strict migration rejected ${analysis.summary.invalid} invalid legacy recipient record(s).`
                );
            }

            for (
                const item
                of analysis.items
            ) {

                if (
                    item.status ===
                    "invalid"
                ) {

                    result.skipped +=
                        1;

                    records.push({

                        index:
                            item.index,

                        legacyRecipientId:
                            item
                                .legacyRecipientId,

                        status:
                            "skipped-invalid",

                        error:
                            item.error

                    });

                    continue;
                }

                const transformed =
                    item.transformed;

                const destination =
                    transformed
                        .payload
                        .destinations[0];

                try {

                    let beneficiary =
                        existingForDestination(
                            destination
                        );

                    let status =
                        "existing";

                    if (!beneficiary) {

                        beneficiary =
                            ENGINE
                                .createBeneficiary(
                                    transformed
                                        .payload
                                );

                        result.created +=
                            1;

                        status =
                            "created";

                    } else {

                        result.existing +=
                            1;
                    }

                    /*
                     * Contact linkage may be safely added when the canonical
                     * Beneficiary does not already have a Contact relationship.
                     */

                    if (
                        transformed.contactId &&
                        !beneficiary.contactId &&
                        typeof ENGINE.linkContact ===
                            "function"
                    ) {

                        beneficiary =
                            ENGINE.linkContact(
                                beneficiary.id,
                                transformed
                                    .contactId
                            );
                    }

                    /*
                     * Historical state is applied only when this migration
                     * created the Beneficiary.
                     *
                     * Re-running migration therefore cannot repeatedly
                     * increase transferCount.
                     */

                    const shouldApplyState =
                        status ===
                        "created";

                    if (
                        shouldApplyState &&
                        (
                            transformed.trusted ||
                            transformed.transferCount >
                                0 ||
                            transformed.lastUsedAt
                        )
                    ) {

                        beneficiary =
                            applyLegacyState(
                                beneficiary,
                                transformed
                            );

                        result.stateApplied +=
                            1;
                    }

                    records.push({

                        index:
                            item.index,

                        legacyRecipientId:
                            transformed
                                .legacyRecipientId,

                        status,

                        beneficiaryId:
                            beneficiary.id,

                        contactId:
                            beneficiary
                                .contactId ||
                            null,

                        /*
                         * Favourite remains owned by the legacy repository
                         * until Contacts favourite convergence is performed
                         * in a later controlled work package.
                         */
                        favouritePreservedInLegacyOnly:
                            transformed
                                .favourite ===
                            true

                    });

                } catch (error) {

                    result.failed +=
                        1;

                    records.push({

                        index:
                            item.index,

                        legacyRecipientId:
                            transformed
                                .legacyRecipientId,

                        status:
                            "failed",

                        error:
                            error instanceof Error
                                ? error.message
                                : String(error)

                    });

                    if (strict) {
                        throw error;
                    }
                }
            }

            /* ==============================================================
               POST-MIGRATION INTEGRITY GATE
            ============================================================== */

            const integrity =
                ENGINE.verifyIntegrity();

            if (
                !integrity?.healthy ||
                integrity.status !==
                    "pass"
            ) {

                throw new Error(
                    `[PAY54] Beneficiary integrity failed after migration: ${(integrity?.errors || []).join(" | ")}`
                );
            }

            const completedAt =
                nowISO();

            runtime.lastMigrationAt =
                completedAt;

            const marker =
                writeMarker({

                    status:
                        result.failed === 0
                            ? "completed"
                            : "completed-with-errors",

                    startedAt,

                    completedAt,

                    sourceKey:
                        STORAGE
                            .LEGACY_RECIPIENTS_KEY,

                    targetKey:
                        STORAGE
                            .PRIMARY_KEY,

                    summary:
                        result,

                    integrity: {

                        healthy:
                            integrity
                                .healthy ===
                            true,

                        status:
                            integrity
                                .status,

                        recordCount:
                            integrity
                                .storage
                                ?.recordCount ??
                            null

                    }

                });

            /*
             * Verify that the legacy repository still exists when it existed
             * before migration. If no legacy repository existed originally,
             * absence remains valid and we do not manufacture one.
             */

            const response =
                immutableClone({

                    healthy:
                        result.failed ===
                        0,

                    status:
                        result.failed === 0
                            ? "completed"
                            : "completed-with-errors",

                    legacyRepositoryPreserved:
                        safeStorageGet(
                            STORAGE
                                .LEGACY_RECIPIENTS_KEY
                        ) !== null ||
                        analysis
                            .legacyRepositoryPresent ===
                            false,

                    summary:
                        result,

                    records,

                    integrity,

                    marker,

                    completedAt

                });

            publish(
                EVENTS.MIGRATION_COMPLETED,
                {

                    status:
                        response.status,

                    summary:
                        response.summary,

                    completedAt

                }
            );

            return response;

        } catch (error) {

            recordError(error);

            const failedAt =
                nowISO();

            writeMarker({

                status:
                    "failed",

                startedAt,

                failedAt,

                sourceKey:
                    STORAGE
                        .LEGACY_RECIPIENTS_KEY,

                targetKey:
                    STORAGE
                        .PRIMARY_KEY,

                error:
                    runtime.lastError

            });

            publish(
                EVENTS.MIGRATION_FAILED,
                {

                    startedAt,

                    failedAt,

                    error:
                        runtime.lastError

                }
            );

            throw error;

        } finally {

            runtime.running =
                false;
        }
    }

    /* ======================================================================
       STATUS
    ====================================================================== */

    function getStatus() {

        const storageStatus =
            typeof STORAGE_ENGINE
                .getMigrationStatus ===
                "function"
                ? STORAGE_ENGINE
                    .getMigrationStatus()
                : null;

        const marker =
            readMarker();

        const legacyPresent =
            safeStorageGet(
                STORAGE
                    .LEGACY_RECIPIENTS_KEY
            ) !== null;

        return immutableClone({

            healthy:
                runtime.ready ===
                    true &&
                runtime.running ===
                    false,

            status:
                runtime.running
                    ? "running"
                    : "ready",

            module:
                MODULE_ID,

            version:
                VERSION,

            migrationImplemented:
                true,

            automaticMigration:
                false,

            legacyRepositoryPresent:
                legacyPresent,

            legacyRepositoryKey:
                STORAGE
                    .LEGACY_RECIPIENTS_KEY,

            targetRepositoryKey:
                STORAGE
                    .PRIMARY_KEY,

            preserveLegacyRecipients:
                true,

            deleteLegacyAfterMigration:
                false,

            marker,

            storageStatus,

            lastAnalysisAt:
                runtime.lastAnalysisAt,

            lastMigrationAt:
                runtime.lastMigrationAt,

            lastErrorAt:
                runtime.lastErrorAt,

            lastError:
                runtime.lastError

        });
    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    function getHealth() {

        const engineHealth =
            ENGINE.getHealth();

        const integrity =
            ENGINE.verifyIntegrity();

        const healthy =
            runtime.ready ===
                true &&
            runtime.running ===
                false &&
            engineHealth?.healthy ===
                true &&
            integrity?.healthy ===
                true;

        return immutableClone({

            healthy,

            status:
                healthy
                    ? "ready"
                    : runtime.running
                        ? "running"
                        : "degraded",

            module:
                MODULE_ID,

            version:
                VERSION,

            automaticMigration:
                false,

            legacyRepositoryPreserved:
                true,

            engineHealthy:
                engineHealth
                    ?.healthy ===
                true,

            integrity,

            marker:
                readMarker(),

            lastAnalysisAt:
                runtime.lastAnalysisAt,

            lastMigrationAt:
                runtime.lastMigrationAt,

            lastErrorAt:
                runtime.lastErrorAt,

            lastError:
                runtime.lastError

        });
    }

    /* ======================================================================
       INITIALISATION

       IMPORTANT:
       Initialisation verifies readiness only.
       It NEVER executes migration.
    ====================================================================== */

    function initialise() {

        if (
            runtime.ready
        ) {
            return getHealth();
        }

        const health =
            ENGINE.getHealth();

        if (
            !health?.healthy
        ) {
            throw new Error(
                "[PAY54] Beneficiary Domain Engine is not healthy enough for migration."
            );
        }

        const integrity =
            ENGINE.verifyIntegrity();

        if (
            !integrity?.healthy
        ) {
            throw new Error(
                `[PAY54] Beneficiary repository integrity unavailable to migration: ${(integrity?.errors || []).join(" | ")}`
            );
        }

        runtime.ready =
            true;

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

        getMigrationStatus:
            getStatus,

        readMarker,

        inspectLegacyRepository:
            parseLegacyRepository,

        transformLegacyRecipient,

        analyse,

        analyze:
            analyse,

        dryRun:
            analyse,

        migrate,

        run:
            migrate

    };

    /* ======================================================================
       BOOTSTRAP
    ====================================================================== */

    try {

        if (
            !GLOBAL
                .PAY54_BENEFICIARIES
        ) {
            GLOBAL
                .PAY54_BENEFICIARIES =
                {};
        }

        if (
            typeof GLOBAL
                .PAY54_BENEFICIARIES !==
            "object"
        ) {
            throw new Error(
                "[PAY54] PAY54_BENEFICIARIES namespace is invalid."
            );
        }

        /*
         * Readiness verification only.
         *
         * migrate() is deliberately NOT invoked here.
         */

        initialise();

        const FROZEN_API =
            Object.freeze(API);

        /* Canonical global */

        GLOBAL
            .PAY54_BENEFICIARIES_MIGRATION =
            FROZEN_API;

        /* Progressive namespace */

        GLOBAL
            .PAY54_BENEFICIARIES
            .MIGRATION =
            FROZEN_API;

        GLOBAL
            .PAY54_BENEFICIARIES
            .migration =
            FROZEN_API;

        /* Optional platform registry */

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
                    "[PAY54] Beneficiary Migration platform registry registration skipped:",
                    error
                );
            }
        }

    } catch (error) {

        runtime.ready =
            false;

        recordError(error);

        console.error(
            "[PAY54] Beneficiary Migration Engine bootstrap failed:",
            error
        );

        throw error;
    }

    /* ======================================================================
       STARTUP
    ====================================================================== */

    console.info(
        "✅ PAY54 Beneficiary Migration Engine",
        VERSION,
        "loaded — explicit execution only."
    );

})();
