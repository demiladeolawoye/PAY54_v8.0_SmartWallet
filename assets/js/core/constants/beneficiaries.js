"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE BENEFICIARY CONSTANTS
   File: assets/js/core/constants/beneficiaries.js
   Version: v1.0.0

   Purpose
   -------
   Canonical constants catalogue for the PAY54 Beneficiaries domain.

   Responsibilities
   ----------------
   • Define canonical Beneficiary module metadata
   • Define Beneficiary persistence schema
   • Define payment-destination types
   • Define Beneficiary lifecycle states
   • Define trust and risk contracts
   • Define usage metadata
   • Define validation limits
   • Define repository configuration
   • Define migration configuration
   • Define integrity and security policy
   • Define Beneficiary domain events
   • Reuse the established pay54_beneficiaries storage key
   • Preserve Contacts as the canonical owner of person identity
   • Support progressive migration from legacy pay54_recipients
   • Preserve the legacy recipient repository during migration
   • Maintain zero-regression compatibility

   Dependencies
   ------------
   assets/js/core/constants/index.js
   assets/js/core/constants/modules.js
   assets/js/core/constants/versions.js
   assets/js/core/constants/contacts.js

   Architecture
   ------------
   Contacts
      ↓ contactId
   Beneficiaries
      ↓
   Payment Services
      ↓
   Transactions
      ↓
   Ledger

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL
    ====================================================================== */

    const GLOBAL =
        window;

    const VERSION =
        "1.0.0";

    const ENGINE =
        "PAY54 Beneficiary Constants";

    /* ======================================================================
       DEPENDENCY VERIFICATION
    ====================================================================== */

    const constants =
        GLOBAL.PAY54_CONSTANTS;

    if (
        !constants ||
        typeof constants.register !== "function" ||
        typeof constants.get !== "function" ||
        typeof constants.has !== "function"
    ) {

        throw new Error(
            "[PAY54] Constants Registry must load before beneficiaries.js."
        );

    }

    const MODULES =
        constants.get(
            "MODULES"
        );

    if (
        !MODULES ||
        typeof MODULES !== "object"
    ) {

        throw new Error(
            "[PAY54] Module identifiers must load before beneficiaries.js."
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
            "[PAY54] Version Catalogue must load before beneficiaries.js."
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
            "[PAY54] Contact Constants must load before beneficiaries.js."
        );

    }

    if (
        MODULES.BENEFICIARIES !==
        "BENEFICIARIES"
    ) {

        throw new Error(
            "[PAY54] MODULES.BENEFICIARIES compatibility verification failed."
        );

    }

    if (
        VERSIONS.BENEFICIARIES !==
        VERSION
    ) {

        throw new Error(
            `[PAY54] Beneficiaries version mismatch. Expected ${VERSION}.`
        );

    }

    if (
        CONTACTS.STORAGE_KEYS?.BENEFICIARIES !==
        "pay54_beneficiaries"
    ) {

        throw new Error(
            "[PAY54] Established Beneficiary storage key is unavailable from Contact Constants."
        );

    }

    /* ======================================================================
       BENEFICIARY CONSTANTS
    ====================================================================== */

    const BENEFICIARIES = {

        /* ==================================================================
           VERSION
        ================================================================== */

        VERSION,

        /* ==================================================================
           MODULE METADATA
        ================================================================== */

        MODULE: {

            ID:
                MODULES.BENEFICIARIES,

            NAME:
                "PAY54 Beneficiaries",

            CONSTANTS:
                MODULES.COMPONENTS
                    ?.CORE
                    ?.BENEFICIARY_CONSTANTS ??
                "core.constants.beneficiaries",

            ENGINE:
                MODULES.DOMAIN
                    ?.BENEFICIARIES
                    ?.ENGINE ??
                "beneficiaries.engine",

            CORE:
                MODULES.DOMAIN
                    ?.BENEFICIARIES
                    ?.CORE ??
                "beneficiaries.core",

            STORAGE:
                MODULES.DOMAIN
                    ?.BENEFICIARIES
                    ?.STORAGE ??
                "beneficiaries-storage",

            REPOSITORY:
                MODULES.DOMAIN
                    ?.BENEFICIARIES
                    ?.REPOSITORY ??
                "beneficiaries.repository",

            SERVICE:
                MODULES.DOMAIN
                    ?.BENEFICIARIES
                    ?.SERVICE ??
                "beneficiaries.service",

            VALIDATOR:
                MODULES.DOMAIN
                    ?.BENEFICIARIES
                    ?.VALIDATOR ??
                "beneficiaries.validator",

            NORMALIZER:
                MODULES.DOMAIN
                    ?.BENEFICIARIES
                    ?.NORMALIZER ??
                "beneficiaries.normalizer",

            EVENTS:
                MODULES.DOMAIN
                    ?.BENEFICIARIES
                    ?.EVENTS ??
                "beneficiaries.events",

            MIGRATION:
                MODULES.DOMAIN
                    ?.BENEFICIARIES
                    ?.MIGRATION ??
                "beneficiaries.migration",

            LEGACY_FACADE:
                MODULES.DOMAIN
                    ?.BENEFICIARIES
                    ?.LEGACY_FACADE ??
                "beneficiaries.legacy-facade"

        },

        /* ==================================================================
           STORAGE KEYS

           The primary Beneficiary key is inherited from the established
           Contacts constants contract.

           pay54_recipients remains read-only migration input during WP-011.
        ================================================================== */

        STORAGE_KEYS: {

            BENEFICIARIES:
                CONTACTS.STORAGE_KEYS.BENEFICIARIES,

            META:
                "pay54_beneficiary_meta",

            STAGING:
                "pay54_beneficiaries_staging",

            BACKUP:
                "pay54_beneficiaries_backup",

            QUARANTINE:
                "pay54_beneficiaries_quarantine",

            MIGRATION:
                "pay54_beneficiaries_migration",

            LEGACY_RECIPIENTS:
                "pay54_recipients"

        },

        /* ==================================================================
           SCHEMA
        ================================================================== */

        SCHEMA: {

            NAME:
                "pay54.beneficiaries",

            VERSION:
                1,

            MIN_SUPPORTED_VERSION:
                0,

            CURRENT_VERSION:
                1,

            RECORD_TYPE:
                "beneficiary",

            DOCUMENT_TYPE:
                "beneficiaries.repository"

        },

        /* ==================================================================
           BENEFICIARY TYPES

           These represent payment relationships, not person identity.
        ================================================================== */

        TYPES: {

            PAY54:
                "PAY54",

            BANK:
                "BANK",

            GLOBAL:
                "GLOBAL"

        },

        /* ==================================================================
           PAYMENT DESTINATION TYPES

           Existing Contacts beneficiary destination concepts are preserved
           where applicable and extended for the enterprise payment domain.
        ================================================================== */

        DESTINATION_TYPES: {

            PAY54:
                "PAY54",

            BANK:
                "BANK",

            GLOBAL:
                "GLOBAL",

            WALLET:
                "WALLET",

            CARD:
                "CARD",

            QR:
                "QR",

            CRYPTO:
                "CRYPTO"

        },

        /* ==================================================================
           STATUS
        ================================================================== */

        STATUS: {

            ACTIVE:
                "ACTIVE",

            BLOCKED:
                "BLOCKED",

            ARCHIVED:
                "ARCHIVED",

            DISABLED:
                "DISABLED"

        },

        /* ==================================================================
           TRUST
        ================================================================== */

        TRUST: {

            UNTRUSTED:
                "UNTRUSTED",

            TRUSTED:
                "TRUSTED"

        },

        /* ==================================================================
           RISK LEVELS
        ================================================================== */

        RISK_LEVELS: {

            UNKNOWN:
                "UNKNOWN",

            LOW:
                "LOW",

            MEDIUM:
                "MEDIUM",

            HIGH:
                "HIGH",

            BLOCKED:
                "BLOCKED"

        },

        /* ==================================================================
           CANONICAL BENEFICIARY FIELDS
        ================================================================== */

        FIELDS: {

            ID:
                "id",

            CONTACT_ID:
                "contactId",

            TYPE:
                "type",

            STATUS:
                "status",

            DESTINATIONS:
                "destinations",

            TRUSTED:
                "trusted",

            USAGE:
                "usage",

            RISK:
                "risk",

            METADATA:
                "metadata",

            CREATED_AT:
                "createdAt",

            UPDATED_AT:
                "updatedAt"

        },

        /* ==================================================================
           DESTINATION FIELDS
        ================================================================== */

        DESTINATION_FIELDS: {

            ID:
                "id",

            TYPE:
                "type",

            PAY54_ID:
                "pay54Id",

            BANK_ID:
                "bankId",

            BANK_NAME:
                "bankName",

            ACCOUNT_NUMBER:
                "accountNumber",

            ACCOUNT_NAME:
                "accountName",

            CURRENCY:
                "currency",

            COUNTRY:
                "country",

            ROUTING_CODE:
                "routingCode",

            IBAN:
                "iban",

            SWIFT_BIC:
                "swiftBic",

            METADATA:
                "metadata",

            CREATED_AT:
                "createdAt",

            UPDATED_AT:
                "updatedAt"

        },

        /* ==================================================================
           USAGE FIELDS
        ================================================================== */

        USAGE_FIELDS: {

            TRANSFER_COUNT:
                "transferCount",

            LAST_USED_AT:
                "lastUsedAt"

        },

        /* ==================================================================
           RISK FIELDS
        ================================================================== */

        RISK_FIELDS: {

            LEVEL:
                "level",

            SCORE:
                "score",

            ASSESSED_AT:
                "assessedAt"

        },

        /* ==================================================================
           REPOSITORY CONFIGURATION
        ================================================================== */

        REPOSITORY: {

            DOCUMENT_VERSION:
                1,

            ID_PREFIX:
                "beneficiary",

            DESTINATION_ID_PREFIX:
                "destination",

            REQUIRE_ID:
                true,

            /*
             * A beneficiary may represent a one-off payment destination
             * before it is associated with a PAY54 Contact.
             */

            REQUIRE_CONTACT_ID:
                false,

            REQUIRE_DESTINATION:
                true,

            SORT_FIELD:
                "updatedAt",

            CREATED_AT_FIELD:
                "createdAt",

            UPDATED_AT_FIELD:
                "updatedAt"

        },

        /* ==================================================================
           STORAGE CONFIGURATION
        ================================================================== */

        STORAGE: {

            PROVIDER:
                "localStorage",

            PRIMARY_KEY:
                CONTACTS.STORAGE_KEYS.BENEFICIARIES,

            META_KEY:
                "pay54_beneficiary_meta",

            STAGING_KEY:
                "pay54_beneficiaries_staging",

            BACKUP_KEY:
                "pay54_beneficiaries_backup",

            QUARANTINE_KEY:
                "pay54_beneficiaries_quarantine",

            MIGRATION_KEY:
                "pay54_beneficiaries_migration",

            LEGACY_RECIPIENTS_KEY:
                "pay54_recipients",

            SCHEMA_VERSION:
                1,

            VERIFY_AFTER_WRITE:
                true,

            VERIFY_ON_READ:
                true,

            RECOVER_CORRUPT_DATA:
                true,

            USE_STAGING_WRITES:
                true,

            PRESERVE_BACKUP:
                true

        },

        /* ==================================================================
           MIGRATION CONFIGURATION
        ================================================================== */

        MIGRATIONS: {

            CURRENT_SCHEMA_VERSION:
                1,

            MIN_SUPPORTED_SCHEMA_VERSION:
                0,

            LEGACY_SCHEMA_VERSION:
                0,

            TARGET_SCHEMA_VERSION:
                1,

            STRICT_ORDER:
                true,

            VERIFY_AFTER_MIGRATION:
                true,

            /*
             * Zero-regression requirement:
             *
             * pay54_recipients must remain intact throughout WP-011A/B.
             */

            PRESERVE_LEGACY_RECIPIENTS:
                true,

            DELETE_LEGACY_AFTER_MIGRATION:
                false

        },

        /* ==================================================================
           VALIDATION
        ================================================================== */

        VALIDATION: {

            MAX_BENEFICIARIES:
                5000,

            MAX_DESTINATIONS_PER_BENEFICIARY:
                20,

            MAX_CONTACT_ID_LENGTH:
                128,

            MAX_PAY54_ID_LENGTH:
                100,

            MAX_BANK_ID_LENGTH:
                128,

            MAX_BANK_NAME_LENGTH:
                160,

            MAX_ACCOUNT_NUMBER_LENGTH:
                64,

            MAX_ACCOUNT_NAME_LENGTH:
                160,

            MAX_CURRENCY_LENGTH:
                3,

            MAX_COUNTRY_LENGTH:
                2,

            MAX_ROUTING_CODE_LENGTH:
                64,

            MAX_IBAN_LENGTH:
                34,

            MAX_SWIFT_BIC_LENGTH:
                11,

            MAX_METADATA_KEYS:
                32,

            MIN_RISK_SCORE:
                0,

            MAX_RISK_SCORE:
                100

        },

        /* ==================================================================
           INTEGRITY
        ================================================================== */

        INTEGRITY: {

            VERIFY_SCHEMA:
                true,

            VERIFY_RECORDS:
                true,

            VERIFY_UNIQUE_IDS:
                true,

            VERIFY_DESTINATION_IDS:
                true,

            VERIFY_CONTACT_REFERENCES:
                true,

            REPAIR_INVALID_RECORDS:
                true,

            QUARANTINE_INVALID_DATA:
                true

        },

        /* ==================================================================
           SECURITY
        ================================================================== */

        SECURITY: {

            VERIFY_BOOTSTRAP:
                true,

            REJECT_FORBIDDEN_FIELDS:
                true,

            FORBIDDEN_FIELDS: [

                "pin",
                "password",
                "passcode",
                "secret",
                "token",
                "accessToken",
                "refreshToken",
                "cvv",
                "cvc",
                "cardNumber",
                "privateKey",
                "seedPhrase",
                "otp"

            ],

            ALLOWED_METADATA_FIELDS: [

                "source",
                "legacyRecipientId",
                "relationship",
                "country",
                "currency",
                "provider",
                "network",
                "lastUsedAt",
                "transferCount"

            ],

            ALLOWED_DESTINATION_METADATA_FIELDS: [

                "source",
                "provider",
                "network",
                "branchCode",
                "bankCode",
                "routingScheme"

            ]

        },

        /* ==================================================================
           EVENTS
        ================================================================== */

        EVENTS: {

            CREATED:
                "beneficiaries.created",

            UPDATED:
                "beneficiaries.updated",

            DELETED:
                "beneficiaries.deleted",

            TRUST_CHANGED:
                "beneficiaries.trust.changed",

            STATUS_CHANGED:
                "beneficiaries.status.changed",

            DESTINATION_ADDED:
                "beneficiaries.destination.added",

            DESTINATION_UPDATED:
                "beneficiaries.destination.updated",

            DESTINATION_REMOVED:
                "beneficiaries.destination.removed",

            USAGE_UPDATED:
                "beneficiaries.usage.updated",

            RISK_UPDATED:
                "beneficiaries.risk.updated",

            MIGRATION_STARTED:
                "beneficiaries.migration.started",

            MIGRATION_COMPLETED:
                "beneficiaries.migration.completed",

            MIGRATION_FAILED:
                "beneficiaries.migration.failed",

            STORAGE_READY:
                "beneficiaries.storage.ready",

            STORAGE_ERROR:
                "beneficiaries.storage.error",

            STORAGE_MIGRATED:
                "beneficiaries.storage.migrated",

            STORAGE_RECOVERED:
                "beneficiaries.storage.recovered",

            STORAGE_INTEGRITY_FAILED:
                "beneficiaries.storage.integrity_failed",

            REPOSITORY_READY:
                "beneficiaries.repository.ready",

            REPOSITORY_CHANGED:
                "beneficiaries.repository.changed",

            ERROR:
                "beneficiaries.error"

        }

    };

    /* ======================================================================
       VALIDATION HELPERS
    ====================================================================== */

    function assertString(
        value,
        path
    ) {

        if (
            typeof value !== "string" ||
            !value.trim()
        ) {

            throw new Error(
                `[PAY54] Invalid Beneficiary constant at ${path}.`
            );

        }

    }

    function assertPositiveInteger(
        value,
        path
    ) {

        if (
            !Number.isInteger(value) ||
            value <= 0
        ) {

            throw new Error(
                `[PAY54] Invalid positive integer at ${path}.`
            );

        }

    }

    /* ======================================================================
       STORAGE VALIDATION
    ====================================================================== */

    function validateStorageKeys() {

        const seen =
            new Set();

        for (
            const [name, key]
            of Object.entries(
                BENEFICIARIES.STORAGE_KEYS
            )
        ) {

            assertString(
                key,
                `BENEFICIARIES.STORAGE_KEYS.${name}`
            );

            if (
                seen.has(key)
            ) {

                throw new Error(
                    `[PAY54] Duplicate Beneficiary storage key detected: ${key}.`
                );

            }

            seen.add(key);

        }

        if (
            BENEFICIARIES.STORAGE.PRIMARY_KEY !==
            CONTACTS.STORAGE_KEYS.BENEFICIARIES
        ) {

            throw new Error(
                "[PAY54] Beneficiary primary storage key does not preserve the established Contacts beneficiary key."
            );

        }

        if (
            BENEFICIARIES.STORAGE.PRIMARY_KEY !==
            BENEFICIARIES.STORAGE_KEYS.BENEFICIARIES
        ) {

            throw new Error(
                "[PAY54] Beneficiary primary storage configuration mismatch."
            );

        }

        if (
            BENEFICIARIES.STORAGE.LEGACY_RECIPIENTS_KEY !==
            BENEFICIARIES.STORAGE_KEYS.LEGACY_RECIPIENTS
        ) {

            throw new Error(
                "[PAY54] Beneficiary legacy recipient storage configuration mismatch."
            );

        }

        return true;

    }

    /* ======================================================================
       SCHEMA VALIDATION
    ====================================================================== */

    function validateSchema() {

        assertPositiveInteger(
            BENEFICIARIES.SCHEMA.VERSION,
            "BENEFICIARIES.SCHEMA.VERSION"
        );

        assertPositiveInteger(
            BENEFICIARIES.SCHEMA.CURRENT_VERSION,
            "BENEFICIARIES.SCHEMA.CURRENT_VERSION"
        );

        if (
            !Number.isInteger(
                BENEFICIARIES.SCHEMA.MIN_SUPPORTED_VERSION
            ) ||
            BENEFICIARIES.SCHEMA.MIN_SUPPORTED_VERSION < 0
        ) {

            throw new Error(
                "[PAY54] Invalid Beneficiary minimum supported schema version."
            );

        }

        if (
            BENEFICIARIES.SCHEMA.VERSION !==
                BENEFICIARIES.SCHEMA.CURRENT_VERSION ||
            BENEFICIARIES.SCHEMA.VERSION !==
                BENEFICIARIES.STORAGE.SCHEMA_VERSION ||
            BENEFICIARIES.SCHEMA.VERSION !==
                BENEFICIARIES.MIGRATIONS.CURRENT_SCHEMA_VERSION ||
            BENEFICIARIES.SCHEMA.VERSION !==
                BENEFICIARIES.MIGRATIONS.TARGET_SCHEMA_VERSION
        ) {

            throw new Error(
                "[PAY54] Beneficiary schema version configuration is inconsistent."
            );

        }

        return true;

    }

    /* ======================================================================
       VALIDATION LIMIT VERIFICATION
    ====================================================================== */

    function validateLimits() {

        const positiveIntegerLimits = [

            "MAX_BENEFICIARIES",
            "MAX_DESTINATIONS_PER_BENEFICIARY",
            "MAX_CONTACT_ID_LENGTH",
            "MAX_PAY54_ID_LENGTH",
            "MAX_BANK_ID_LENGTH",
            "MAX_BANK_NAME_LENGTH",
            "MAX_ACCOUNT_NUMBER_LENGTH",
            "MAX_ACCOUNT_NAME_LENGTH",
            "MAX_CURRENCY_LENGTH",
            "MAX_COUNTRY_LENGTH",
            "MAX_ROUTING_CODE_LENGTH",
            "MAX_IBAN_LENGTH",
            "MAX_SWIFT_BIC_LENGTH",
            "MAX_METADATA_KEYS",
            "MAX_RISK_SCORE"

        ];

        for (
            const key
            of positiveIntegerLimits
        ) {

            assertPositiveInteger(
                BENEFICIARIES.VALIDATION[key],
                `BENEFICIARIES.VALIDATION.${key}`
            );

        }

        if (
            BENEFICIARIES.VALIDATION.MIN_RISK_SCORE !== 0 ||
            BENEFICIARIES.VALIDATION.MAX_RISK_SCORE !== 100
        ) {

            throw new Error(
                "[PAY54] Beneficiary risk score range must remain 0-100."
            );

        }

        return true;

    }

    /* ======================================================================
       SECURITY VALIDATION
    ====================================================================== */

    function validateSecurityConfiguration() {

        const forbidden =
            BENEFICIARIES.SECURITY
                .FORBIDDEN_FIELDS;

        const metadataLists = [

            BENEFICIARIES.SECURITY
                .ALLOWED_METADATA_FIELDS,

            BENEFICIARIES.SECURITY
                .ALLOWED_DESTINATION_METADATA_FIELDS

        ];

        if (
            !Array.isArray(forbidden) ||
            forbidden.length === 0
        ) {

            throw new Error(
                "[PAY54] Beneficiary forbidden-field security policy is unavailable."
            );

        }

        const forbiddenSet =
            new Set();

        for (
            const field
            of forbidden
        ) {

            assertString(
                field,
                "BENEFICIARIES.SECURITY.FORBIDDEN_FIELDS"
            );

            const normalized =
                field.toLowerCase();

            if (
                forbiddenSet.has(
                    normalized
                )
            ) {

                throw new Error(
                    `[PAY54] Duplicate forbidden Beneficiary field detected: ${field}.`
                );

            }

            forbiddenSet.add(
                normalized
            );

        }

        for (
            const list
            of metadataLists
        ) {

            if (
                !Array.isArray(list)
            ) {

                throw new Error(
                    "[PAY54] Beneficiary metadata allowlist is unavailable."
                );

            }

            const seen =
                new Set();

            for (
                const field
                of list
            ) {

                assertString(
                    field,
                    "BENEFICIARIES.SECURITY metadata allowlist"
                );

                const normalized =
                    field.toLowerCase();

                if (
                    seen.has(
                        normalized
                    )
                ) {

                    throw new Error(
                        `[PAY54] Duplicate Beneficiary metadata field detected: ${field}.`
                    );

                }

                if (
                    forbiddenSet.has(
                        normalized
                    )
                ) {

                    throw new Error(
                        `[PAY54] Beneficiary metadata field "${field}" conflicts with the forbidden-field policy.`
                    );

                }

                seen.add(
                    normalized
                );

            }

        }

        return true;

    }

    /* ======================================================================
       DOMAIN CONTRACT VALIDATION
    ====================================================================== */

    function validateDomainContract() {

        const requiredTypes = [

            "PAY54",
            "BANK",
            "GLOBAL"

        ];

        for (
            const key
            of requiredTypes
        ) {

            assertString(
                BENEFICIARIES.TYPES[key],
                `BENEFICIARIES.TYPES.${key}`
            );

        }

        const requiredDestinationTypes = [

            "PAY54",
            "BANK",
            "GLOBAL",
            "WALLET",
            "CARD",
            "QR",
            "CRYPTO"

        ];

        for (
            const key
            of requiredDestinationTypes
        ) {

            assertString(
                BENEFICIARIES.DESTINATION_TYPES[key],
                `BENEFICIARIES.DESTINATION_TYPES.${key}`
            );

        }

        /*
         * Compatibility bridge:
         * existing Contacts beneficiary types remain recognised.
         */

        const existingContactBeneficiaryTypes =
            CONTACTS.BENEFICIARY_TYPES;

        if (
            !existingContactBeneficiaryTypes ||
            typeof existingContactBeneficiaryTypes !== "object"
        ) {

            throw new Error(
                "[PAY54] Existing Contact beneficiary type catalogue is unavailable."
            );

        }

        for (
            const type
            of Object.values(
                existingContactBeneficiaryTypes
            )
        ) {

            if (
                typeof type !== "string" ||
                !Object.values(
                    BENEFICIARIES.DESTINATION_TYPES
                ).includes(type)
            ) {

                throw new Error(
                    `[PAY54] Existing Contact beneficiary type "${String(type)}" is not recognised by the enterprise Beneficiary destination catalogue.`
                );

            }

        }

        if (
            BENEFICIARIES.MIGRATIONS
                .DELETE_LEGACY_AFTER_MIGRATION !== false ||
            BENEFICIARIES.MIGRATIONS
                .PRESERVE_LEGACY_RECIPIENTS !== true
        ) {

            throw new Error(
                "[PAY54] WP-011 Beneficiary migration must preserve the legacy recipient repository."
            );

        }

        return true;

    }

    /* ======================================================================
       MODULE / VERSION CONTRACT VALIDATION
    ====================================================================== */

    function validatePlatformContract() {

        if (
            BENEFICIARIES.MODULE.ID !==
            MODULES.BENEFICIARIES
        ) {

            throw new Error(
                "[PAY54] Beneficiary module identifier mismatch."
            );

        }

        if (
            BENEFICIARIES.MODULE.STORAGE !==
            "beneficiaries-storage"
        ) {

            throw new Error(
                "[PAY54] Beneficiary storage module identifier mismatch."
            );

        }

        if (
            VERSIONS.DOMAIN
                ?.BENEFICIARIES
                ?.STORAGE !== VERSION ||
            VERSIONS.DOMAIN
                ?.BENEFICIARIES
                ?.ENGINE !== VERSION ||
            VERSIONS.DOMAIN
                ?.BENEFICIARIES
                ?.SERVICE !== VERSION
        ) {

            throw new Error(
                "[PAY54] Beneficiary component versions are inconsistent with the Version Catalogue."
            );

        }

        return true;

    }

    /* ======================================================================
       COMPLETE CATALOGUE VALIDATION
    ====================================================================== */

    function validateCatalogue() {

        if (
            BENEFICIARIES.VERSION !==
            VERSIONS.BENEFICIARIES
        ) {

            throw new Error(
                "[PAY54] Beneficiary catalogue version does not match the Version Catalogue."
            );

        }

        validateStorageKeys();

        validateSchema();

        validateLimits();

        validateSecurityConfiguration();

        validateDomainContract();

        validatePlatformContract();

        return true;

    }

    /* ======================================================================
       REGISTRATION
    ====================================================================== */

    try {

        validateCatalogue();

        /*
         * PAY54_CONSTANTS owns defensive cloning and recursive freezing.
         * Do not freeze this source object independently.
         */

        constants.register(
            MODULES.BENEFICIARIES,
            BENEFICIARIES
        );

        const registered =
            constants.get(
                MODULES.BENEFICIARIES
            );

        if (
            !registered
        ) {

            throw new Error(
                "[PAY54] Failed to register Beneficiary Constants."
            );

        }

        if (
            registered.VERSION !== VERSION ||
            registered.STORAGE
                .PRIMARY_KEY !==
                    "pay54_beneficiaries" ||
            registered.STORAGE
                .LEGACY_RECIPIENTS_KEY !==
                    "pay54_recipients" ||
            registered.SCHEMA
                .VERSION !== 1 ||
            registered.MODULE
                .STORAGE !==
                    "beneficiaries-storage"
        ) {

            throw new Error(
                "[PAY54] Beneficiary Constants post-registration verification failed."
            );

        }

    } catch (error) {

        console.error(
            "[PAY54] Beneficiary Constants bootstrap failed:",
            error
        );

        throw error;

    }

    /* ======================================================================
       STARTUP
    ====================================================================== */

    console.info(
        "✅ PAY54 Beneficiary Constants",
        VERSION,
        "loaded."
    );

})();
