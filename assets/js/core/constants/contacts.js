"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE CONTACT CONSTANTS
   File: assets/js/core/constants/contacts.js
   Version: v1.0.0

   Purpose
   -------
   Canonical constants catalogue for the PAY54 Contacts domain.

   Responsibilities
   ----------------
   • Preserve all existing Contacts public constants
   • Centralise Contacts storage keys
   • Define Contacts persistence schema
   • Define storage migration configuration
   • Define Contacts event names
   • Define contact and beneficiary types
   • Define contact statuses and groups
   • Define validation and search limits
   • Define repository and integrity configuration
   • Support WP-010A Contacts Storage
   • Maintain zero-regression compatibility

   Dependencies
   ------------
   assets/js/core/constants/index.js
   assets/js/core/constants/modules.js
   assets/js/core/constants/versions.js

   Compatibility
   -------------
   Existing public constants are intentionally preserved:

   CONTACTS.VERSION
   CONTACTS.STORAGE_KEYS
   CONTACTS.TYPES
   CONTACTS.BENEFICIARY_TYPES
   CONTACTS.STATUS
   CONTACTS.GROUPS
   CONTACTS.VALIDATION
   CONTACTS.SEARCH
   CONTACTS.EVENTS

   Enterprise extensions are additive and exposed through:

   CONTACTS.MODULE
   CONTACTS.SCHEMA
   CONTACTS.STORAGE
   CONTACTS.REPOSITORY
   CONTACTS.INTEGRITY
   CONTACTS.MIGRATIONS
   CONTACTS.SECURITY
   CONTACTS.FIELDS

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL
    ====================================================================== */

    const GLOBAL = window;

    const VERSION = "1.0.0";

    const ENGINE =
        "PAY54 Contact Constants";

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
            "[PAY54] Constants Registry must load before contacts.js."
        );
    }

    const MODULES =
        constants.get("MODULES");

    if (
        !MODULES ||
        typeof MODULES !== "object"
    ) {
        throw new Error(
            "[PAY54] Module identifiers must load before contacts.js."
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
            "[PAY54] Version Catalogue must load before contacts.js."
        );
    }

    if (
        MODULES.CONTACTS !== "CONTACTS"
    ) {
        throw new Error(
            "[PAY54] MODULES.CONTACTS compatibility verification failed."
        );
    }

    if (
        VERSIONS.CONTACTS !== VERSION
    ) {
        throw new Error(
            `[PAY54] Contacts version mismatch. Expected ${VERSION}.`
        );
    }

    /* ======================================================================
       CONTACT CONSTANTS
    ====================================================================== */

    const CONTACTS = {

        /* ==================================================================
           EXISTING PUBLIC VERSION
        ================================================================== */

        VERSION,

        /* ==================================================================
           MODULE METADATA
        ================================================================== */

        MODULE: {

            ID:
                MODULES.CONTACTS,

            NAME:
                "PAY54 Contacts",

            ENGINE:
                MODULES.DOMAIN?.CONTACTS?.ENGINE ??
                "contacts.engine",

            CORE:
                MODULES.DOMAIN?.CONTACTS?.CORE ??
                "contacts.core",

            STORAGE:
                MODULES.DOMAIN?.CONTACTS?.STORAGE ??
                "contacts-storage",

            REPOSITORY:
                MODULES.DOMAIN?.CONTACTS?.REPOSITORY ??
                "contacts.repository",

            SERVICE:
                MODULES.DOMAIN?.CONTACTS?.SERVICE ??
                "contacts.service",

            VALIDATOR:
                MODULES.DOMAIN?.CONTACTS?.VALIDATOR ??
                "contacts.validator",

            NORMALIZER:
                MODULES.DOMAIN?.CONTACTS?.NORMALIZER ??
                "contacts.normalizer",

            SEARCH:
                MODULES.DOMAIN?.CONTACTS?.SEARCH ??
                "contacts.search",

            EVENTS:
                MODULES.DOMAIN?.CONTACTS?.EVENTS ??
                "contacts.events",

            UI:
                MODULES.DOMAIN?.CONTACTS?.UI ??
                "contacts.ui",

            PICKER:
                MODULES.DOMAIN?.CONTACTS?.PICKER ??
                "contacts.picker",

            IMPORT:
                MODULES.DOMAIN?.CONTACTS?.IMPORT ??
                "contacts.import",

            EXPORT:
                MODULES.DOMAIN?.CONTACTS?.EXPORT ??
                "contacts.export",

            SYNC:
                MODULES.DOMAIN?.CONTACTS?.SYNC ??
                "contacts.sync"
        },

        /* ==================================================================
           EXISTING STORAGE KEYS

           Existing values are preserved exactly.
        ================================================================== */

        STORAGE_KEYS: {

            CONTACTS:
                "pay54_contacts",

            BENEFICIARIES:
                "pay54_beneficiaries",

            RECENT:
                "pay54_recent_contacts",

            GROUPS:
                "pay54_contact_groups",

            META:
                "pay54_contact_meta",

            SETTINGS:
                "pay54_contact_settings",

            /*
             * Enterprise persistence keys.
             *
             * These are additive and do not replace existing storage keys.
             */

            STAGING:
                "pay54_contacts_staging",

            BACKUP:
                "pay54_contacts_backup",

            QUARANTINE:
                "pay54_contacts_quarantine",

            MIGRATION:
                "pay54_contacts_migration"
        },

        /* ==================================================================
           EXISTING CONTACT TYPES
        ================================================================== */

        TYPES: {

            PERSONAL:
                "PERSONAL",

            BUSINESS:
                "BUSINESS",

            MERCHANT:
                "MERCHANT",

            PAY54:
                "PAY54",

            BANK:
                "BANK",

            QR:
                "QR",

            CRYPTO:
                "CRYPTO",

            INTERNATIONAL:
                "INTERNATIONAL"
        },

        /* ==================================================================
           EXISTING BENEFICIARY TYPES
        ================================================================== */

        BENEFICIARY_TYPES: {

            BANK:
                "BANK",

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
           EXISTING STATUS VALUES
        ================================================================== */

        STATUS: {

            ACTIVE:
                "ACTIVE",

            BLOCKED:
                "BLOCKED",

            ARCHIVED:
                "ARCHIVED",

            VERIFIED:
                "VERIFIED",

            FAVOURITE:
                "FAVOURITE"
        },

        /* ==================================================================
           EXISTING DEFAULT GROUPS
        ================================================================== */

        GROUPS: {

            FAMILY:
                "Family",

            FRIENDS:
                "Friends",

            BUSINESS:
                "Business",

            MERCHANTS:
                "Merchants",

            UTILITIES:
                "Utilities",

            PAY54:
                "PAY54"
        },

        /* ==================================================================
           EXISTING VALIDATION LIMITS

           Existing values are preserved exactly.
        ================================================================== */

        VALIDATION: {

            MAX_CONTACTS:
                5000,

            MAX_GROUPS:
                100,

            MAX_NAME_LENGTH:
                100,

            MAX_ALIAS_LENGTH:
                50,

            MAX_NOTE_LENGTH:
                250,

            MAX_EMAIL_LENGTH:
                254,

            MAX_PHONE_LENGTH:
                32,

            MAX_PAY54_ID_LENGTH:
                100,

            MAX_TAGS:
                25,

            MAX_TAG_LENGTH:
                50,

            MAX_METADATA_KEYS:
                32,

            MAX_SEARCH_QUERY_LENGTH:
                200
        },

        /* ==================================================================
           EXISTING SEARCH CONFIGURATION
        ================================================================== */

        SEARCH: {

            MIN_QUERY_LENGTH:
                2,

            MAX_RESULTS:
                100,

            CASE_SENSITIVE:
                false,

            TRIM_QUERY:
                true
        },

        /* ==================================================================
           CONTACT RECORD SCHEMA
        ================================================================== */

        SCHEMA: {

            NAME:
                "pay54.contacts",

            VERSION:
                1,

            MIN_SUPPORTED_VERSION:
                0,

            CURRENT_VERSION:
                1,

            RECORD_TYPE:
                "contact",

            DOCUMENT_TYPE:
                "contacts.repository"
        },

        /* ==================================================================
           CANONICAL CONTACT FIELDS

           These constants describe the storage contract. They do not contain
           UI labels and therefore remain safe for use across services,
           engines and future mobile clients.
        ================================================================== */

        FIELDS: {

            ID:
                "id",

            DISPLAY_NAME:
                "displayName",

            FIRST_NAME:
                "firstName",

            LAST_NAME:
                "lastName",

            ALIAS:
                "alias",

            PHONE:
                "phone",

            EMAIL:
                "email",

            PAY54_ID:
                "pay54Id",

            TYPE:
                "type",

            STATUS:
                "status",

            AVATAR:
                "avatar",

            FAVOURITE:
                "favourite",

            TAGS:
                "tags",

            GROUPS:
                "groups",

            NOTES:
                "notes",

            METADATA:
                "metadata",

            CREATED_AT:
                "createdAt",

            UPDATED_AT:
                "updatedAt"
        },

        /* ==================================================================
           REPOSITORY CONFIGURATION
        ================================================================== */

        REPOSITORY: {

            DOCUMENT_VERSION:
                1,

            ID_PREFIX:
                "contact",

            REQUIRE_ID:
                true,

            REQUIRE_DISPLAY_NAME:
                true,

            REQUIRE_IDENTIFIER:
                true,

            IDENTIFIER_FIELDS: [
                "pay54Id",
                "phone",
                "email"
            ],

            UNIQUE_IDENTIFIER_FIELDS: [
                "pay54Id",
                "phone",
                "email"
            ],

            SORT_FIELD:
                "displayName",

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
                "pay54_contacts",

            META_KEY:
                "pay54_contact_meta",

            STAGING_KEY:
                "pay54_contacts_staging",

            BACKUP_KEY:
                "pay54_contacts_backup",

            QUARANTINE_KEY:
                "pay54_contacts_quarantine",

            MIGRATION_KEY:
                "pay54_contacts_migration",

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
                true
        },

        /* ==================================================================
           INTEGRITY CONFIGURATION
        ================================================================== */

        INTEGRITY: {

            VERIFY_SCHEMA:
                true,

            VERIFY_RECORDS:
                true,

            VERIFY_UNIQUE_IDS:
                true,

            VERIFY_UNIQUE_IDENTIFIERS:
                true,

            VERIFY_METADATA_COUNT:
                true,

            REPAIR_INVALID_RECORDS:
                true,

            QUARANTINE_INVALID_DATA:
                true
        },

        /* ==================================================================
           SECURITY CONFIGURATION
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
                "relationship",
                "country",
                "currency",
                "bankName",
                "accountName",
                "accountNumberMasked",
                "lastUsedAt",
                "useCount"
            ]
        },

        /* ==================================================================
           EVENTS

           All existing event names are preserved exactly.

           Storage/repository lifecycle events are additive.
        ================================================================== */

        EVENTS: {

            /* --------------------------------------------------------------
               EXISTING EVENTS
            -------------------------------------------------------------- */

            CREATED:
                "contacts.created",

            UPDATED:
                "contacts.updated",

            DELETED:
                "contacts.deleted",

            IMPORTED:
                "contacts.imported",

            EXPORTED:
                "contacts.exported",

            SEARCHED:
                "contacts.searched",

            GROUP_CREATED:
                "contacts.group.created",

            GROUP_UPDATED:
                "contacts.group.updated",

            GROUP_DELETED:
                "contacts.group.deleted",

            ERROR:
                "contacts.error",

            /* --------------------------------------------------------------
               STORAGE EVENTS
            -------------------------------------------------------------- */

            STORAGE_READY:
                "contacts.storage.ready",

            STORAGE_ERROR:
                "contacts.storage.error",

            STORAGE_MIGRATED:
                "contacts.storage.migrated",

            STORAGE_RECOVERED:
                "contacts.storage.recovered",

            STORAGE_INTEGRITY_FAILED:
                "contacts.storage.integrity_failed",

            STORAGE_HEALTH_CHANGED:
                "contacts.storage.health_changed",

            /* --------------------------------------------------------------
               REPOSITORY EVENTS
            -------------------------------------------------------------- */

            CLEARED:
                "contacts.cleared",

            REPOSITORY_READY:
                "contacts.repository.ready",

            REPOSITORY_CHANGED:
                "contacts.repository.changed",

            REPOSITORY_ERROR:
                "contacts.repository.error"
        }

    };

    /* ======================================================================
       VALIDATION
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
                `[PAY54] Invalid Contact constant at ${path}.`
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

    function validateStorageKeys() {

        const seen =
            new Set();

        for (
            const [name, key]
            of Object.entries(
                CONTACTS.STORAGE_KEYS
            )
        ) {

            assertString(
                key,
                `CONTACTS.STORAGE_KEYS.${name}`
            );

            if (
                seen.has(key)
            ) {
                throw new Error(
                    `[PAY54] Duplicate Contact storage key detected: ${key}.`
                );
            }

            seen.add(key);
        }

        if (
            CONTACTS.STORAGE.PRIMARY_KEY !==
            CONTACTS.STORAGE_KEYS.CONTACTS
        ) {
            throw new Error(
                "[PAY54] Contacts primary storage key configuration mismatch."
            );
        }

        if (
            CONTACTS.STORAGE.META_KEY !==
            CONTACTS.STORAGE_KEYS.META
        ) {
            throw new Error(
                "[PAY54] Contacts metadata storage key configuration mismatch."
            );
        }

        return true;
    }

    function validateSchema() {

        assertPositiveInteger(
            CONTACTS.SCHEMA.VERSION,
            "CONTACTS.SCHEMA.VERSION"
        );

        assertPositiveInteger(
            CONTACTS.SCHEMA.CURRENT_VERSION,
            "CONTACTS.SCHEMA.CURRENT_VERSION"
        );

        if (
            !Number.isInteger(
                CONTACTS.SCHEMA.MIN_SUPPORTED_VERSION
            ) ||
            CONTACTS.SCHEMA.MIN_SUPPORTED_VERSION < 0
        ) {
            throw new Error(
                "[PAY54] Invalid Contacts minimum supported schema version."
            );
        }

        if (
            CONTACTS.SCHEMA.VERSION !==
            CONTACTS.STORAGE.SCHEMA_VERSION ||
            CONTACTS.SCHEMA.VERSION !==
            CONTACTS.MIGRATIONS.CURRENT_SCHEMA_VERSION ||
            CONTACTS.SCHEMA.VERSION !==
            CONTACTS.MIGRATIONS.TARGET_SCHEMA_VERSION
        ) {
            throw new Error(
                "[PAY54] Contacts schema version configuration is inconsistent."
            );
        }

        return true;
    }

    function validateValidationLimits() {

        const integerLimits = [
            "MAX_CONTACTS",
            "MAX_GROUPS",
            "MAX_NAME_LENGTH",
            "MAX_ALIAS_LENGTH",
            "MAX_NOTE_LENGTH",
            "MAX_EMAIL_LENGTH",
            "MAX_PHONE_LENGTH",
            "MAX_PAY54_ID_LENGTH",
            "MAX_TAGS",
            "MAX_TAG_LENGTH",
            "MAX_METADATA_KEYS",
            "MAX_SEARCH_QUERY_LENGTH"
        ];

        for (
            const key of integerLimits
        ) {

            assertPositiveInteger(
                CONTACTS.VALIDATION[key],
                `CONTACTS.VALIDATION.${key}`
            );
        }

        assertPositiveInteger(
            CONTACTS.SEARCH.MIN_QUERY_LENGTH,
            "CONTACTS.SEARCH.MIN_QUERY_LENGTH"
        );

        assertPositiveInteger(
            CONTACTS.SEARCH.MAX_RESULTS,
            "CONTACTS.SEARCH.MAX_RESULTS"
        );

        if (
            CONTACTS.SEARCH.MIN_QUERY_LENGTH >
            CONTACTS.VALIDATION.MAX_SEARCH_QUERY_LENGTH
        ) {
            throw new Error(
                "[PAY54] Contacts minimum search query length exceeds maximum query length."
            );
        }

        return true;
    }

    function validateRepositoryIdentifiers() {

        const identifierFields =
            CONTACTS.REPOSITORY
                .IDENTIFIER_FIELDS;

        const uniqueIdentifierFields =
            CONTACTS.REPOSITORY
                .UNIQUE_IDENTIFIER_FIELDS;

        if (
            !Array.isArray(identifierFields) ||
            identifierFields.length === 0
        ) {
            throw new Error(
                "[PAY54] Contacts repository identifier fields are unavailable."
            );
        }

        if (
            !Array.isArray(
                uniqueIdentifierFields
            ) ||
            uniqueIdentifierFields.length === 0
        ) {
            throw new Error(
                "[PAY54] Contacts repository unique identifier fields are unavailable."
            );
        }

        for (
            const field of identifierFields
        ) {
            assertString(
                field,
                "CONTACTS.REPOSITORY.IDENTIFIER_FIELDS"
            );
        }

        for (
            const field of uniqueIdentifierFields
        ) {

            assertString(
                field,
                "CONTACTS.REPOSITORY.UNIQUE_IDENTIFIER_FIELDS"
            );

            if (
                !identifierFields.includes(field)
            ) {
                throw new Error(
                    `[PAY54] Unique Contact identifier "${field}" is not defined as an identifier field.`
                );
            }
        }

        return true;
    }

    function validateSecurityConfiguration() {

        const forbidden =
            CONTACTS.SECURITY
                .FORBIDDEN_FIELDS;

        const allowedMetadata =
            CONTACTS.SECURITY
                .ALLOWED_METADATA_FIELDS;

        if (
            !Array.isArray(forbidden) ||
            forbidden.length === 0
        ) {
            throw new Error(
                "[PAY54] Contacts forbidden-field security policy is unavailable."
            );
        }

        if (
            !Array.isArray(allowedMetadata)
        ) {
            throw new Error(
                "[PAY54] Contacts metadata allowlist is unavailable."
            );
        }

        const forbiddenSet =
            new Set();

        for (
            const field of forbidden
        ) {

            assertString(
                field,
                "CONTACTS.SECURITY.FORBIDDEN_FIELDS"
            );

            const normalized =
                field.toLowerCase();

            if (
                forbiddenSet.has(
                    normalized
                )
            ) {
                throw new Error(
                    `[PAY54] Duplicate forbidden Contact field detected: ${field}.`
                );
            }

            forbiddenSet.add(
                normalized
            );
        }

        const metadataSet =
            new Set();

        for (
            const field of allowedMetadata
        ) {

            assertString(
                field,
                "CONTACTS.SECURITY.ALLOWED_METADATA_FIELDS"
            );

            const normalized =
                field.toLowerCase();

            if (
                metadataSet.has(
                    normalized
                )
            ) {
                throw new Error(
                    `[PAY54] Duplicate Contact metadata field detected: ${field}.`
                );
            }

            if (
                forbiddenSet.has(
                    normalized
                )
            ) {
                throw new Error(
                    `[PAY54] Contact metadata field "${field}" conflicts with the forbidden-field policy.`
                );
            }

            metadataSet.add(
                normalized
            );
        }

        return true;
    }

    /* ======================================================================
       LEGACY COMPATIBILITY VERIFICATION
    ====================================================================== */

    function verifyLegacyCompatibility() {

        const expectedStorageKeys = {

            CONTACTS:
                "pay54_contacts",

            BENEFICIARIES:
                "pay54_beneficiaries",

            RECENT:
                "pay54_recent_contacts",

            GROUPS:
                "pay54_contact_groups",

            META:
                "pay54_contact_meta",

            SETTINGS:
                "pay54_contact_settings"
        };

        for (
            const [name, expected]
            of Object.entries(
                expectedStorageKeys
            )
        ) {

            if (
                CONTACTS.STORAGE_KEYS[name] !==
                expected
            ) {
                throw new Error(
                    `[PAY54] Contacts storage-key regression detected for ${name}.`
                );
            }
        }

        const expectedEvents = {

            CREATED:
                "contacts.created",

            UPDATED:
                "contacts.updated",

            DELETED:
                "contacts.deleted",

            IMPORTED:
                "contacts.imported",

            EXPORTED:
                "contacts.exported",

            SEARCHED:
                "contacts.searched",

            GROUP_CREATED:
                "contacts.group.created",

            GROUP_UPDATED:
                "contacts.group.updated",

            GROUP_DELETED:
                "contacts.group.deleted",

            ERROR:
                "contacts.error"
        };

        for (
            const [name, expected]
            of Object.entries(
                expectedEvents
            )
        ) {

            if (
                CONTACTS.EVENTS[name] !==
                expected
            ) {
                throw new Error(
                    `[PAY54] Contacts event regression detected for ${name}.`
                );
            }
        }

        if (
            CONTACTS.VALIDATION.MAX_CONTACTS !== 5000 ||
            CONTACTS.VALIDATION.MAX_GROUPS !== 100 ||
            CONTACTS.VALIDATION.MAX_NAME_LENGTH !== 100 ||
            CONTACTS.VALIDATION.MAX_ALIAS_LENGTH !== 50 ||
            CONTACTS.VALIDATION.MAX_NOTE_LENGTH !== 250
        ) {
            throw new Error(
                "[PAY54] Contacts validation compatibility verification failed."
            );
        }

        if (
            CONTACTS.SEARCH.MIN_QUERY_LENGTH !== 2 ||
            CONTACTS.SEARCH.MAX_RESULTS !== 100
        ) {
            throw new Error(
                "[PAY54] Contacts search compatibility verification failed."
            );
        }

        return true;
    }

    /* ======================================================================
       COMPLETE CATALOGUE VALIDATION
    ====================================================================== */

    function validateCatalogue() {

        if (
            CONTACTS.VERSION !==
            VERSIONS.CONTACTS
        ) {
            throw new Error(
                "[PAY54] Contacts catalogue version does not match the Version Catalogue."
            );
        }

        validateStorageKeys();

        validateSchema();

        validateValidationLimits();

        validateRepositoryIdentifiers();

        validateSecurityConfiguration();

        verifyLegacyCompatibility();

        return true;
    }

    /* ======================================================================
       REGISTRATION
    ====================================================================== */

    try {

        validateCatalogue();

        /*
         * PAY54_CONSTANTS performs defensive cloning and recursive freezing.
         * The source catalogue is deliberately passed as a normal object so
         * the central registry remains the single owner of immutability.
         */

        constants.register(
            MODULES.CONTACTS,
            CONTACTS
        );

        const registered =
            constants.get(
                MODULES.CONTACTS
            );

        if (!registered) {
            throw new Error(
                "[PAY54] Failed to register Contact Constants."
            );
        }

        if (
            registered.VERSION !== VERSION ||
            registered.STORAGE_KEYS.CONTACTS !==
                "pay54_contacts" ||
            registered.SCHEMA.VERSION !== 1 ||
            registered.MODULE.STORAGE !==
                "contacts-storage"
        ) {
            throw new Error(
                "[PAY54] Contact Constants post-registration verification failed."
            );
        }

    } catch (error) {

        console.error(
            "[PAY54] Contact Constants bootstrap failed:",
            error
        );

        throw error;
    }

    /* ======================================================================
       STARTUP
    ====================================================================== */

    console.info(
        "✅ PAY54 Contact Constants",
        VERSION,
        "loaded."
    );

})();
