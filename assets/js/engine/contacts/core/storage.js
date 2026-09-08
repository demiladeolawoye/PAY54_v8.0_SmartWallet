"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE CONTACTS STORAGE
   File: assets/js/engine/contacts/core/storage.js
   Version: v1.0.0
   Work Package: WP-010A

   Purpose
   -------
   Enterprise persistence and repository layer for the PAY54 Contacts domain.

   Responsibilities
   ----------------
   • Contacts repository
   • CRUD persistence
   • Storage migrations
   • Repository integrity verification
   • Controlled corruption recovery
   • Atomic-style staged persistence
   • Repository health reporting
   • Event Bus integration
   • Security bootstrap verification
   • Registry integration
   • Legacy Contacts storage compatibility
   • Public Contacts Storage API

   Dependencies
   ------------
   assets/js/core/constants/index.js
   assets/js/core/constants/modules.js
   assets/js/core/constants/versions.js
   assets/js/core/constants/contacts.js

   Progressive Dependencies
   ------------------------
   PAY54 Event Bus
   PAY54 Security
   PAY54 Platform Registry

   Architecture
   ------------
   Core Constants
        ↓
   Security / Infrastructure
        ↓
   Contacts Core Storage
        ↓
   Contacts Repository / Services
        ↓
   Contacts Engine
        ↓
   UI / Dashboard / Mobile

   Enterprise Guarantees
   ---------------------
   • No monetary business logic
   • No UI logic
   • No DOM dependency
   • Defensive validation
   • Immutable outward-facing records
   • Schema-controlled persistence
   • Duplicate identity protection
   • Staged writes
   • Backup recovery
   • Migration verification
   • Security-sensitive field rejection
   • Event publication is non-blocking
   • Backward-compatible public aliases
   • Zero-regression legacy Contacts key support
========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL
    ====================================================================== */

    const GLOBAL = window;

    const FILE_PATH =
        "assets/js/engine/contacts/core/storage.js";

    /* ======================================================================
       CONSTANT DEPENDENCIES
    ====================================================================== */

    const CONSTANTS =
        GLOBAL.PAY54_CONSTANTS;

    if (
        !CONSTANTS ||
        typeof CONSTANTS.get !== "function" ||
        typeof CONSTANTS.has !== "function"
    ) {
        throw new Error(
            "[PAY54 Contacts Storage] PAY54 Constants Registry is unavailable."
        );
    }

    const MODULES =
        CONSTANTS.get("MODULES");

    if (
        !MODULES ||
        typeof MODULES !== "object"
    ) {
        throw new Error(
            "[PAY54 Contacts Storage] MODULES constants are unavailable."
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
            "[PAY54 Contacts Storage] VERSIONS constants are unavailable."
        );
    }

    const CONTACTS =
        CONSTANTS.get(
            MODULES.CONTACTS
        );

    if (
        !CONTACTS ||
        typeof CONTACTS !== "object"
    ) {
        throw new Error(
            "[PAY54 Contacts Storage] CONTACTS constants are unavailable."
        );
    }

    /* ======================================================================
       CANONICAL MODULE METADATA
    ====================================================================== */

    const MODULE_NAME =
        CONTACTS.MODULE?.STORAGE ??
        MODULES.DOMAIN?.CONTACTS?.STORAGE ??
        "contacts-storage";

    const MODULE_ID =
        MODULES.DOMAIN?.CONTACTS?.STORAGE ??
        MODULE_NAME;

    const VERSION =
        VERSIONS.DOMAIN?.CONTACTS?.STORAGE ??
        CONTACTS.VERSION ??
        VERSIONS.CONTACTS ??
        "1.0.0";

    const SCHEMA_VERSION =
        CONTACTS.SCHEMA?.CURRENT_VERSION ??
        CONTACTS.STORAGE?.SCHEMA_VERSION ??
        1;

    const MIN_SCHEMA_VERSION =
        CONTACTS.SCHEMA?.MIN_SUPPORTED_VERSION ??
        CONTACTS.MIGRATIONS?.MIN_SUPPORTED_SCHEMA_VERSION ??
        0;

    /* ======================================================================
       STORAGE CONFIGURATION
    ====================================================================== */

    const STORAGE_KEYS =
        CONTACTS.STORAGE_KEYS;

    if (
        !STORAGE_KEYS ||
        typeof STORAGE_KEYS !== "object"
    ) {
        throw new Error(
            "[PAY54 Contacts Storage] CONTACTS.STORAGE_KEYS is unavailable."
        );
    }

    const STORAGE_CONFIG =
        CONTACTS.STORAGE ?? {};

    const PRIMARY_KEY =
        STORAGE_CONFIG.PRIMARY_KEY ??
        STORAGE_KEYS.CONTACTS;

    const META_KEY =
        STORAGE_CONFIG.META_KEY ??
        STORAGE_KEYS.META;

    const STAGING_KEY =
        STORAGE_CONFIG.STAGING_KEY ??
        STORAGE_KEYS.STAGING ??
        "pay54_contacts_staging";

    const BACKUP_KEY =
        STORAGE_CONFIG.BACKUP_KEY ??
        STORAGE_KEYS.BACKUP ??
        "pay54_contacts_backup";

    const QUARANTINE_KEY =
        STORAGE_CONFIG.QUARANTINE_KEY ??
        STORAGE_KEYS.QUARANTINE ??
        "pay54_contacts_quarantine";

    const MIGRATION_KEY =
        STORAGE_CONFIG.MIGRATION_KEY ??
        STORAGE_KEYS.MIGRATION ??
        "pay54_contacts_migration";

    /* ======================================================================
       CONTACT CONFIGURATION
    ====================================================================== */

    const VALIDATION =
        CONTACTS.VALIDATION ?? {};

    const SEARCH_CONFIG =
        CONTACTS.SEARCH ?? {};

    const REPOSITORY_CONFIG =
        CONTACTS.REPOSITORY ?? {};

    const SECURITY_CONFIG =
        CONTACTS.SECURITY ?? {};

    const INTEGRITY_CONFIG =
        CONTACTS.INTEGRITY ?? {};

    const MIGRATION_CONFIG =
        CONTACTS.MIGRATIONS ?? {};

    const EVENTS =
        CONTACTS.EVENTS ?? {};

    const MAX_CONTACTS =
        Number.isInteger(
            VALIDATION.MAX_CONTACTS
        )
            ? VALIDATION.MAX_CONTACTS
            : 5000;

    const MAX_NAME_LENGTH =
        Number.isInteger(
            VALIDATION.MAX_NAME_LENGTH
        )
            ? VALIDATION.MAX_NAME_LENGTH
            : 100;

    const MAX_ALIAS_LENGTH =
        Number.isInteger(
            VALIDATION.MAX_ALIAS_LENGTH
        )
            ? VALIDATION.MAX_ALIAS_LENGTH
            : 50;

    const MAX_NOTE_LENGTH =
        Number.isInteger(
            VALIDATION.MAX_NOTE_LENGTH
        )
            ? VALIDATION.MAX_NOTE_LENGTH
            : 250;

    const MAX_EMAIL_LENGTH =
        Number.isInteger(
            VALIDATION.MAX_EMAIL_LENGTH
        )
            ? VALIDATION.MAX_EMAIL_LENGTH
            : 254;

    const MAX_PHONE_LENGTH =
        Number.isInteger(
            VALIDATION.MAX_PHONE_LENGTH
        )
            ? VALIDATION.MAX_PHONE_LENGTH
            : 32;

    const MAX_PAY54_ID_LENGTH =
        Number.isInteger(
            VALIDATION.MAX_PAY54_ID_LENGTH
        )
            ? VALIDATION.MAX_PAY54_ID_LENGTH
            : 100;

    const MAX_TAGS =
        Number.isInteger(
            VALIDATION.MAX_TAGS
        )
            ? VALIDATION.MAX_TAGS
            : 25;

    const MAX_TAG_LENGTH =
        Number.isInteger(
            VALIDATION.MAX_TAG_LENGTH
        )
            ? VALIDATION.MAX_TAG_LENGTH
            : 50;

    const MAX_METADATA_KEYS =
        Number.isInteger(
            VALIDATION.MAX_METADATA_KEYS
        )
            ? VALIDATION.MAX_METADATA_KEYS
            : 32;

    const MAX_SEARCH_QUERY_LENGTH =
        Number.isInteger(
            VALIDATION.MAX_SEARCH_QUERY_LENGTH
        )
            ? VALIDATION.MAX_SEARCH_QUERY_LENGTH
            : 200;

    const MAX_SEARCH_RESULTS =
        Number.isInteger(
            SEARCH_CONFIG.MAX_RESULTS
        )
            ? SEARCH_CONFIG.MAX_RESULTS
            : 100;

    const MIN_SEARCH_QUERY_LENGTH =
        Number.isInteger(
            SEARCH_CONFIG.MIN_QUERY_LENGTH
        )
            ? SEARCH_CONFIG.MIN_QUERY_LENGTH
            : 2;

    /* ======================================================================
       SECURITY POLICY
    ====================================================================== */

    const FORBIDDEN_FIELDS =
        new Set(
            (
                Array.isArray(
                    SECURITY_CONFIG.FORBIDDEN_FIELDS
                )
                    ? SECURITY_CONFIG.FORBIDDEN_FIELDS
                    : [
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
                    ]
            ).map(
                field =>
                    String(field)
                        .trim()
                        .toLowerCase()
            )
        );

    const ALLOWED_METADATA_FIELDS =
        new Set(
            (
                Array.isArray(
                    SECURITY_CONFIG.ALLOWED_METADATA_FIELDS
                )
                    ? SECURITY_CONFIG.ALLOWED_METADATA_FIELDS
                    : [
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
            ).map(String)
        );

    const PROHIBITED_OBJECT_KEYS =
        new Set([
            "__proto__",
            "prototype",
            "constructor"
        ]);

    /* ======================================================================
       INTERNAL STATE
    ====================================================================== */

    const state = {

        initialized:
            false,

        initializing:
            false,

        storageAvailable:
            false,

        securityVerified:
            false,

        securityMode:
            "unknown",

        registryRegistered:
            false,

        eventBusAvailable:
            false,

        recovered:
            false,

        lastMigration:
            null,

        lastIntegrityCheck:
            null,

        lastHealthStatus:
            null,

        lastError:
            null,

        initializedAt:
            null,

        lastReadAt:
            null,

        lastWriteAt:
            null

    };

    /* ======================================================================
       BASIC UTILITIES
    ====================================================================== */

    function nowISO() {
        return new Date().toISOString();
    }

    function isObject(value) {

        return (
            value !== null &&
            typeof value === "object"
        );
    }

    function isPlainObject(value) {

        if (!isObject(value)) {
            return false;
        }

        const prototype =
            Object.getPrototypeOf(value);

        return (
            prototype === Object.prototype ||
            prototype === null
        );
    }

    function assertSafeObjectKey(
        key,
        path
    ) {

        if (
            PROHIBITED_OBJECT_KEYS.has(
                key
            )
        ) {
            throw new Error(
                `[PAY54 Contacts Storage] Unsafe property "${key}" rejected at ${path}.`
            );
        }
    }

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

        if (
            Array.isArray(value)
        ) {

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
            const key of Object.keys(value)
        ) {

            assertSafeObjectKey(
                key,
                "clone"
            );

            result[key] =
                cloneValue(
                    value[key],
                    seen
                );
        }

        return result;
    }

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
            const key of Object.keys(value)
        ) {

            assertSafeObjectKey(
                key,
                "freeze"
            );

            deepFreeze(
                value[key],
                seen
            );
        }

        return Object.freeze(value);
    }

    function immutableClone(value) {

        return deepFreeze(
            cloneValue(value)
        );
    }

    function cleanString(
        value,
        maximumLength = Number.MAX_SAFE_INTEGER
    ) {

        if (
            value === null ||
            typeof value === "undefined"
        ) {
            return "";
        }

        return String(value)
            .trim()
            .slice(
                0,
                maximumLength
            );
    }

    function normalizeBoolean(value) {

        return (
            value === true ||
            value === 1 ||
            value === "1" ||
            value === "true"
        );
    }

    function normalizeEmail(value) {

        return cleanString(
            value,
            MAX_EMAIL_LENGTH
        ).toLowerCase();
    }

    function normalizePhone(value) {

        const input =
            cleanString(
                value,
                MAX_PHONE_LENGTH
            );

        if (!input) {
            return "";
        }

        const hasPlus =
            input.startsWith("+");

        const digits =
            input.replace(
                /\D/g,
                ""
            );

        if (!digits) {
            return "";
        }

        return (
            hasPlus
                ? `+${digits}`
                : digits
        ).slice(
            0,
            MAX_PHONE_LENGTH
        );
    }

    function normalizePay54Id(value) {

        return cleanString(
            value,
            MAX_PAY54_ID_LENGTH
        ).toLowerCase();
    }

    function normalizeTimestamp(
        value,
        fallback = null
    ) {

        if (
            typeof value === "string" &&
            value.trim()
        ) {

            const timestamp =
                Date.parse(value);

            if (
                Number.isFinite(timestamp)
            ) {
                return new Date(
                    timestamp
                ).toISOString();
            }
        }

        return fallback;
    }

    function generateId() {

        if (
            GLOBAL.crypto &&
            typeof GLOBAL.crypto.randomUUID ===
                "function"
        ) {
            return GLOBAL.crypto.randomUUID();
        }

        if (
            GLOBAL.crypto &&
            typeof GLOBAL.crypto.getRandomValues ===
                "function"
        ) {

            const bytes =
                new Uint8Array(16);

            GLOBAL.crypto.getRandomValues(
                bytes
            );

            bytes[6] =
                (bytes[6] & 0x0f) |
                0x40;

            bytes[8] =
                (bytes[8] & 0x3f) |
                0x80;

            const hex =
                Array.from(
                    bytes,
                    byte =>
                        byte
                            .toString(16)
                            .padStart(2, "0")
                );

            return [
                hex.slice(0, 4).join(""),
                hex.slice(4, 6).join(""),
                hex.slice(6, 8).join(""),
                hex.slice(8, 10).join(""),
                hex.slice(10, 16).join("")
            ].join("-");
        }

        /*
         * Browsers supported by PAY54 are expected to expose Web Crypto.
         * This final fallback preserves legacy operation without pretending
         * to provide cryptographic randomness.
         */

        return [
            "legacy",
            Date.now().toString(36),
            Math.random()
                .toString(36)
                .slice(2, 12)
        ].join("-");
    }

    function recordError(
        operation,
        error
    ) {

        const message =
            error instanceof Error
                ? error.message
                : String(error);

        state.lastError = {
            operation,
            message,
            timestamp:
                nowISO()
        };

        return message;
    }

    /* ======================================================================
       EVENT BUS
    ====================================================================== */

    function publishEvent(
        eventName,
        payload = {}
    ) {

        if (
            typeof eventName !== "string" ||
            !eventName
        ) {
            return false;
        }

        try {

            const eventBus =
                GLOBAL.PAY54_EVENTS;

            if (
                !eventBus ||
                typeof eventBus.publish !== "function"
            ) {
                state.eventBusAvailable =
                    false;

                return false;
            }

            state.eventBusAvailable =
                true;

            eventBus.publish(
                eventName,
                Object.freeze({
                    ...payload,
                    module:
                        MODULE_NAME,
                    version:
                        VERSION,
                    timestamp:
                        nowISO()
                }),
                {
                    source:
                        MODULE_NAME
                }
            );

            return true;

        } catch (error) {

            recordError(
                "event.publish",
                error
            );

            return false;
        }
    }

    /* ======================================================================
       SECURITY BOOTSTRAP VERIFICATION
    ====================================================================== */

    function interpretSecurityResult(
        result
    ) {

        if (
            result === false
        ) {
            return false;
        }

        if (
            result === true ||
            typeof result === "undefined" ||
            result === null
        ) {
            return true;
        }

        if (
            isObject(result)
        ) {

            if (
                result.ready === false ||
                result.healthy === false ||
                result.secure === false ||
                result.ok === false
            ) {
                return false;
            }

            return true;
        }

        return Boolean(result);
    }

    function verifySecurityBootstrap() {

        const security =
            GLOBAL.PAY54_SECURITY ??
            GLOBAL.PAY54_SECURITY_BOOTSTRAP ??
            GLOBAL.PAY54_SECURITY_SHIELD ??
            null;

        /*
         * PAY54 currently supports progressive bootstrap. Contacts storage
         * therefore remains compatible with legacy deployments where the
         * Security Shield has not yet exposed a public bootstrap API.
         *
         * Once a security implementation is present, an explicit unsafe or
         * failed state is treated as fatal.
         */

        if (!security) {

            state.securityVerified =
                true;

            state.securityMode =
                "legacy-compatible";

            return true;
        }

        const probes = [
            "verifyBootstrap",
            "verify",
            "isReady",
            "isSecure"
        ];

        let probed = false;

        for (
            const method of probes
        ) {

            if (
                typeof security[method] !==
                "function"
            ) {
                continue;
            }

            probed = true;

            const result =
                security[method]();

            if (
                result &&
                typeof result.then === "function"
            ) {
                throw new Error(
                    `[PAY54 Contacts Storage] Security method "${method}" is asynchronous; synchronous Contacts bootstrap cannot safely consume it.`
                );
            }

            if (
                !interpretSecurityResult(
                    result
                )
            ) {
                throw new Error(
                    `[PAY54 Contacts Storage] Security bootstrap verification failed via ${method}().`
                );
            }
        }

        if (
            security.ready === false ||
            security.secure === false ||
            security.healthy === false
        ) {
            throw new Error(
                "[PAY54 Contacts Storage] Security bootstrap reports an unsafe state."
            );
        }

        state.securityVerified =
            true;

        state.securityMode =
            probed
                ? "verified"
                : "present";

        return true;
    }

    /* ======================================================================
       PAYLOAD SECURITY
    ====================================================================== */

    function assertSafePayload(
        value,
        path = "contact",
        seen = new WeakSet()
    ) {

        if (
            value === null ||
            typeof value === "undefined"
        ) {
            return true;
        }

        if (
            typeof value !== "object"
        ) {
            return true;
        }

        if (
            seen.has(value)
        ) {
            throw new Error(
                `[PAY54 Contacts Storage] Circular payload rejected at ${path}.`
            );
        }

        seen.add(value);

        if (
            Array.isArray(value)
        ) {

            for (
                let index = 0;
                index < value.length;
                index += 1
            ) {
                assertSafePayload(
                    value[index],
                    `${path}[${index}]`,
                    seen
                );
            }

            seen.delete(value);

            return true;
        }

        if (
            !isPlainObject(value)
        ) {
            throw new TypeError(
                `[PAY54 Contacts Storage] Non-plain object rejected at ${path}.`
            );
        }

        for (
            const [key, child]
            of Object.entries(value)
        ) {

            assertSafeObjectKey(
                key,
                path
            );

            if (
                FORBIDDEN_FIELDS.has(
                    key.toLowerCase()
                )
            ) {
                throw new Error(
                    `[PAY54 Contacts Storage] Security-sensitive field "${key}" is not permitted in Contacts persistence.`
                );
            }

            assertSafePayload(
                child,
                `${path}.${key}`,
                seen
            );
        }

        seen.delete(value);

        return true;
    }

    /* ======================================================================
       STORAGE AVAILABILITY
    ====================================================================== */

    function getLocalStorage() {

        try {

            return GLOBAL.localStorage;

        } catch (error) {

            throw new Error(
                `[PAY54 Contacts Storage] Browser storage is inaccessible: ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`
            );
        }
    }

    function verifyStorageAvailability() {

        const storage =
            getLocalStorage();

        const probeKey =
            `${PRIMARY_KEY}.__probe__`;

        try {

            storage.setItem(
                probeKey,
                "1"
            );

            storage.removeItem(
                probeKey
            );

            state.storageAvailable =
                true;

            return true;

        } catch (error) {

            state.storageAvailable =
                false;

            throw new Error(
                `[PAY54 Contacts Storage] localStorage is unavailable: ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`
            );
        }
    }

    /* ======================================================================
       RAW STORAGE OPERATIONS
    ====================================================================== */

    function readRaw(key) {

        try {

            return getLocalStorage()
                .getItem(key);

        } catch (error) {

            recordError(
                `storage.read:${key}`,
                error
            );

            throw error;
        }
    }

    function writeRaw(
        key,
        value
    ) {

        try {

            getLocalStorage()
                .setItem(
                    key,
                    value
                );

            return true;

        } catch (error) {

            recordError(
                `storage.write:${key}`,
                error
            );

            throw error;
        }
    }

    function removeRaw(key) {

        try {

            getLocalStorage()
                .removeItem(key);

            return true;

        } catch (error) {

            recordError(
                `storage.remove:${key}`,
                error
            );

            throw error;
        }
    }

    function parseJSON(
        raw,
        key
    ) {

        try {

            return JSON.parse(raw);

        } catch (error) {

            throw new Error(
                `[PAY54 Contacts Storage] Invalid JSON in "${key}": ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`
            );
        }
    }

    /* ======================================================================
       NORMALISATION
    ====================================================================== */

    function normalizeTags(value) {

        if (
            !Array.isArray(value)
        ) {
            return [];
        }

        const result = [];
        const seen = new Set();

        for (
            const item of value
        ) {

            const tag =
                cleanString(
                    item,
                    MAX_TAG_LENGTH
                );

            if (!tag) {
                continue;
            }

            const identity =
                tag.toLowerCase();

            if (
                seen.has(identity)
            ) {
                continue;
            }

            seen.add(identity);

            result.push(tag);

            if (
                result.length >=
                MAX_TAGS
            ) {
                break;
            }
        }

        return result;
    }

    function normalizeGroups(value) {

        if (
            !Array.isArray(value)
        ) {
            return [];
        }

        const result = [];
        const seen = new Set();

        for (
            const item of value
        ) {

            const group =
                cleanString(
                    item,
                    MAX_NAME_LENGTH
                );

            if (!group) {
                continue;
            }

            const identity =
                group.toLowerCase();

            if (
                seen.has(identity)
            ) {
                continue;
            }

            seen.add(identity);
            result.push(group);
        }

        return result;
    }

    function normalizeMetadata(value) {

        if (
            !isPlainObject(value)
        ) {
            return Object.create(null);
        }

        assertSafePayload(
            value,
            "contact.metadata"
        );

        const metadata =
            Object.create(null);

        let count = 0;

        for (
            const [key, rawValue]
            of Object.entries(value)
        ) {

            if (
                !ALLOWED_METADATA_FIELDS.has(
                    key
                )
            ) {
                continue;
            }

            if (
                count >=
                MAX_METADATA_KEYS
            ) {
                break;
            }

            if (
                rawValue === null ||
                typeof rawValue === "undefined"
            ) {
                continue;
            }

            switch (key) {

                case "useCount": {

                    const numeric =
                        Number(rawValue);

                    metadata[key] =
                        Number.isFinite(numeric)
                            ? Math.max(
                                0,
                                Math.floor(numeric)
                            )
                            : 0;

                    break;
                }

                case "lastUsedAt": {

                    const timestamp =
                        normalizeTimestamp(
                            rawValue,
                            null
                        );

                    if (timestamp) {
                        metadata[key] =
                            timestamp;
                    }

                    break;
                }

                default: {

                    metadata[key] =
                        cleanString(
                            rawValue,
                            250
                        );

                    break;
                }
            }

            count += 1;
        }

        return metadata;
    }

    function normalizeType(value) {

        const type =
            cleanString(value)
                .toUpperCase();

        const allowed =
            Object.values(
                CONTACTS.TYPES ?? {}
            );

        if (
            allowed.includes(type)
        ) {
            return type;
        }

        return (
            CONTACTS.TYPES?.PERSONAL ??
            "PERSONAL"
        );
    }

    function normalizeStatus(value) {

        const status =
            cleanString(value)
                .toUpperCase();

        const allowed =
            Object.values(
                CONTACTS.STATUS ?? {}
            );

        if (
            allowed.includes(status)
        ) {
            return status;
        }

        return (
            CONTACTS.STATUS?.ACTIVE ??
            "ACTIVE"
        );
    }

    function buildDisplayName(
        input
    ) {

        const explicit =
            cleanString(
                input.displayName ??
                input.name,
                MAX_NAME_LENGTH
            );

        if (explicit) {
            return explicit;
        }

        const firstName =
            cleanString(
                input.firstName ??
                input.first_name,
                MAX_NAME_LENGTH
            );

        const lastName =
            cleanString(
                input.lastName ??
                input.last_name,
                MAX_NAME_LENGTH
            );

        const combined =
            `${firstName} ${lastName}`
                .trim();

        if (combined) {
            return combined.slice(
                0,
                MAX_NAME_LENGTH
            );
        }

        return (
            normalizePay54Id(
                input.pay54Id ??
                input.pay54Tag ??
                input.username
            ) ||
            normalizePhone(
                input.phone ??
                input.phoneNumber ??
                input.mobile
            ) ||
            normalizeEmail(
                input.email
            )
        ).slice(
            0,
            MAX_NAME_LENGTH
        );
    }

    function normalizeContact(
        input,
        options = {}
    ) {

        if (
            !isPlainObject(input)
        ) {
            throw new TypeError(
                "[PAY54 Contacts Storage] Contact must be a plain object."
            );
        }

        assertSafePayload(
            input
        );

        const currentTime =
            nowISO();

        const existing =
            options.existing &&
            isPlainObject(
                options.existing
            )
                ? options.existing
                : null;

        const preserveTimestamps =
            options.preserveTimestamps ===
            true;

        const id =
            cleanString(
                input.id ??
                existing?.id
            ) ||
            generateId();

        const firstName =
            cleanString(
                input.firstName ??
                input.first_name ??
                existing?.firstName,
                MAX_NAME_LENGTH
            );

        const lastName =
            cleanString(
                input.lastName ??
                input.last_name ??
                existing?.lastName,
                MAX_NAME_LENGTH
            );

        const displayName =
            buildDisplayName({
                ...existing,
                ...input,
                firstName,
                lastName
            });

        const alias =
            cleanString(
                input.alias ??
                existing?.alias,
                MAX_ALIAS_LENGTH
            );

        const phone =
            normalizePhone(
                input.phone ??
                input.phoneNumber ??
                input.mobile ??
                existing?.phone
            );

        const email =
            normalizeEmail(
                input.email ??
                existing?.email
            );

        const pay54Id =
            normalizePay54Id(
                input.pay54Id ??
                input.pay54Tag ??
                input.username ??
                existing?.pay54Id
            );

        const createdAt =
            preserveTimestamps
                ? (
                    normalizeTimestamp(
                        input.createdAt ??
                        input.created_at ??
                        existing?.createdAt,
                        currentTime
                    )
                )
                : (
                    normalizeTimestamp(
                        existing?.createdAt,
                        currentTime
                    )
                );

        const updatedAt =
            preserveTimestamps
                ? (
                    normalizeTimestamp(
                        input.updatedAt ??
                        input.updated_at ??
                        existing?.updatedAt,
                        createdAt
                    )
                )
                : currentTime;

        const favourite =
            normalizeBoolean(
                input.favourite ??
                input.favorite ??
                existing?.favourite
            );

        const record = {

            id,

            displayName,

            firstName,

            lastName,

            alias,

            phone,

            email,

            pay54Id,

            type:
                normalizeType(
                    input.type ??
                    existing?.type
                ),

            status:
                normalizeStatus(
                    input.status ??
                    existing?.status
                ),

            avatar:
                cleanString(
                    input.avatar ??
                    existing?.avatar,
                    2048
                ),

            favourite,

            tags:
                normalizeTags(
                    input.tags ??
                    existing?.tags
                ),

            groups:
                normalizeGroups(
                    input.groups ??
                    existing?.groups
                ),

            notes:
                cleanString(
                    input.notes ??
                    input.note ??
                    existing?.notes,
                    MAX_NOTE_LENGTH
                ),

            metadata:
                normalizeMetadata(
                    input.metadata ??
                    existing?.metadata
                ),

            createdAt,

            updatedAt
        };

        validateContact(
            record
        );

        return record;
    }

    /* ======================================================================
       CONTACT VALIDATION
    ====================================================================== */

    function isValidEmail(value) {

        if (!value) {
            return true;
        }

        if (
            value.length >
            MAX_EMAIL_LENGTH
        ) {
            return false;
        }

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(value);
    }

    function validateContact(
        contact
    ) {

        if (
            !isPlainObject(contact)
        ) {
            throw new TypeError(
                "[PAY54 Contacts Storage] Invalid Contact record."
            );
        }

        assertSafePayload(
            contact
        );

        if (
            !cleanString(
                contact.id
            )
        ) {
            throw new Error(
                "[PAY54 Contacts Storage] Contact id is required."
            );
        }

        if (
            !cleanString(
                contact.displayName,
                MAX_NAME_LENGTH
            )
        ) {
            throw new Error(
                "[PAY54 Contacts Storage] Contact display name is required."
            );
        }

        if (
            REPOSITORY_CONFIG.REQUIRE_IDENTIFIER !==
                false &&
            !contact.phone &&
            !contact.email &&
            !contact.pay54Id
        ) {
            throw new Error(
                "[PAY54 Contacts Storage] Contact requires a phone number, email address or PAY54 ID."
            );
        }

        if (
            !isValidEmail(
                contact.email
            )
        ) {
            throw new Error(
                "[PAY54 Contacts Storage] Contact email address is invalid."
            );
        }

        if (
            !Array.isArray(
                contact.tags
            )
        ) {
            throw new Error(
                "[PAY54 Contacts Storage] Contact tags must be an array."
            );
        }

        if (
            !Array.isArray(
                contact.groups
            )
        ) {
            throw new Error(
                "[PAY54 Contacts Storage] Contact groups must be an array."
            );
        }

        if (
            !isPlainObject(
                contact.metadata
            )
        ) {
            throw new Error(
                "[PAY54 Contacts Storage] Contact metadata must be a plain object."
            );
        }

        return true;
    }

    /* ======================================================================
       REPOSITORY DOCUMENT
    ====================================================================== */

    function createEmptyRepository() {

        const timestamp =
            nowISO();

        return {

            schemaVersion:
                SCHEMA_VERSION,

            contacts:
                [],

            metadata: {

                createdAt:
                    timestamp,

                updatedAt:
                    timestamp,

                recordCount:
                    0
            }
        };
    }

    function normalizeRepositoryMetadata(
        metadata,
        contacts,
        fallbackCreatedAt = null
    ) {

        const timestamp =
            nowISO();

        const source =
            isPlainObject(metadata)
                ? metadata
                : {};

        return {

            createdAt:
                normalizeTimestamp(
                    source.createdAt,
                    fallbackCreatedAt ??
                    timestamp
                ),

            updatedAt:
                normalizeTimestamp(
                    source.updatedAt,
                    timestamp
                ),

            recordCount:
                contacts.length
        };
    }

    function normalizeRepository(
        input
    ) {

        /*
         * Legacy PAY54 Contacts storage may contain a raw array.
         */

        if (
            Array.isArray(input)
        ) {

            const contacts =
                normalizeLegacyContacts(
                    input
                );

            return {

                schemaVersion:
                    0,

                contacts,

                metadata:
                    normalizeRepositoryMetadata(
                        null,
                        contacts
                    )
            };
        }

        if (
            !isPlainObject(input)
        ) {
            throw new Error(
                "[PAY54 Contacts Storage] Repository document is invalid."
            );
        }

        const schemaVersion =
            Number.isInteger(
                input.schemaVersion
            )
                ? input.schemaVersion
                : 0;

        const sourceContacts =
            Array.isArray(
                input.contacts
            )
                ? input.contacts
                : [];

        const contacts =
            normalizeLegacyContacts(
                sourceContacts
            );

        return {

            schemaVersion,

            contacts,

            metadata:
                normalizeRepositoryMetadata(
                    input.metadata,
                    contacts
                )
        };
    }

    function normalizeLegacyContacts(
        contacts
    ) {

        const normalized = [];

        for (
            const source of contacts
        ) {

            if (
                !isPlainObject(source)
            ) {
                continue;
            }

            try {

                normalized.push(
                    normalizeContact(
                        source,
                        {
                            preserveTimestamps:
                                true
                        }
                    )
                );

            } catch (error) {

                /*
                 * Invalid legacy records are not silently converted into
                 * valid records. Recovery policy handles them separately.
                 */

                continue;
            }
        }

        return normalized;
    }

    /* ======================================================================
       IDENTITY / DUPLICATE PROTECTION
    ====================================================================== */

    function buildIdentityKeys(
        contact
    ) {

        const keys = [];

        if (
            contact.pay54Id
        ) {
            keys.push(
                `pay54:${normalizePay54Id(
                    contact.pay54Id
                )}`
            );
        }

        if (
            contact.phone
        ) {
            keys.push(
                `phone:${normalizePhone(
                    contact.phone
                )}`
            );
        }

        if (
            contact.email
        ) {
            keys.push(
                `email:${normalizeEmail(
                    contact.email
                )}`
            );
        }

        return keys;
    }

    function findDuplicate(
        contacts,
        candidate,
        excludedId = null
    ) {

        const candidateKeys =
            new Set(
                buildIdentityKeys(
                    candidate
                )
            );

        if (
            candidateKeys.size === 0
        ) {
            return null;
        }

        for (
            const contact of contacts
        ) {

            if (
                excludedId &&
                contact.id ===
                    excludedId
            ) {
                continue;
            }

            for (
                const identity of
                buildIdentityKeys(
                    contact
                )
            ) {

                if (
                    candidateKeys.has(
                        identity
                    )
                ) {
                    return contact;
                }
            }
        }

        return null;
    }

    /* ======================================================================
       INTEGRITY VERIFICATION
    ====================================================================== */

    function verifyRepositoryIntegrity(
        repository
    ) {

        const errors = [];

        if (
            !isPlainObject(
                repository
            )
        ) {

            errors.push(
                "Repository is not a plain object."
            );

        } else {

            if (
                !Number.isInteger(
                    repository.schemaVersion
                )
            ) {
                errors.push(
                    "Repository schemaVersion is invalid."
                );
            }

            if (
                repository.schemaVersion >
                SCHEMA_VERSION
            ) {
                errors.push(
                    `Repository schema ${repository.schemaVersion} is newer than supported schema ${SCHEMA_VERSION}.`
                );
            }

            if (
                !Array.isArray(
                    repository.contacts
                )
            ) {

                errors.push(
                    "Repository contacts collection is invalid."
                );

            } else {

                if (
                    repository.contacts.length >
                    MAX_CONTACTS
                ) {
                    errors.push(
                        `Repository exceeds maximum Contact capacity of ${MAX_CONTACTS}.`
                    );
                }

                const ids =
                    new Set();

                const identities =
                    new Map();

                for (
                    let index = 0;
                    index <
                    repository.contacts.length;
                    index += 1
                ) {

                    const contact =
                        repository.contacts[index];

                    try {

                        validateContact(
                            contact
                        );

                    } catch (error) {

                        errors.push(
                            `Invalid Contact at index ${index}: ${
                                error instanceof Error
                                    ? error.message
                                    : String(error)
                            }`
                        );

                        continue;
                    }

                    if (
                        ids.has(
                            contact.id
                        )
                    ) {

                        errors.push(
                            `Duplicate Contact id detected: ${contact.id}.`
                        );

                    } else {

                        ids.add(
                            contact.id
                        );
                    }

                    for (
                        const identity of
                        buildIdentityKeys(
                            contact
                        )
                    ) {

                        if (
                            identities.has(
                                identity
                            )
                        ) {

                            errors.push(
                                `Duplicate Contact identity detected: ${identity}.`
                            );

                        } else {

                            identities.set(
                                identity,
                                contact.id
                            );
                        }
                    }
                }
            }

            if (
                !isPlainObject(
                    repository.metadata
                )
            ) {

                errors.push(
                    "Repository metadata is invalid."
                );

            } else if (
                Array.isArray(
                    repository.contacts
                ) &&
                repository.metadata.recordCount !==
                    repository.contacts.length
            ) {

                errors.push(
                    "Repository metadata recordCount does not match Contacts collection."
                );
            }
        }

        const result =
            Object.freeze({

                ok:
                    errors.length === 0,

                schemaVersion:
                    repository?.schemaVersion ??
                    null,

                recordCount:
                    Array.isArray(
                        repository?.contacts
                    )
                        ? repository.contacts.length
                        : 0,

                errors:
                    Object.freeze(
                        errors
                    ),

                checkedAt:
                    nowISO()
            });

        state.lastIntegrityCheck =
            result;

        return result;
    }

    /* ======================================================================
       QUARANTINE
    ====================================================================== */

    function quarantinePayload(
        raw,
        reason
    ) {

        if (
            INTEGRITY_CONFIG.QUARANTINE_INVALID_DATA ===
            false
        ) {
            return false;
        }

        /*
         * Contact data can contain personal information. Quarantine is
         * therefore bounded to one recovery payload rather than producing
         * timestamped copies indefinitely.
         */

        const payload = {

            reason:
                cleanString(
                    reason,
                    500
                ),

            quarantinedAt:
                nowISO(),

            sourceKey:
                PRIMARY_KEY,

            payload:
                typeof raw === "string"
                    ? raw
                    : JSON.stringify(raw)
        };

        writeRaw(
            QUARANTINE_KEY,
            JSON.stringify(
                payload
            )
        );

        return true;
    }

    /* ======================================================================
       REPOSITORY REPAIR
    ====================================================================== */

    function repairRepository(
        repository
    ) {

        const repaired =
            createEmptyRepository();

        const sourceContacts =
            Array.isArray(
                repository?.contacts
            )
                ? repository.contacts
                : [];

        const acceptedIds =
            new Set();

        const acceptedIdentities =
            new Set();

        for (
            const source of sourceContacts
        ) {

            try {

                const contact =
                    normalizeContact(
                        source,
                        {
                            preserveTimestamps:
                                true
                        }
                    );

                if (
                    acceptedIds.has(
                        contact.id
                    )
                ) {
                    continue;
                }

                const identities =
                    buildIdentityKeys(
                        contact
                    );

                if (
                    identities.some(
                        identity =>
                            acceptedIdentities.has(
                                identity
                            )
                    )
                ) {
                    continue;
                }

                acceptedIds.add(
                    contact.id
                );

                for (
                    const identity of identities
                ) {
                    acceptedIdentities.add(
                        identity
                    );
                }

                repaired.contacts.push(
                    contact
                );

                if (
                    repaired.contacts.length >=
                    MAX_CONTACTS
                ) {
                    break;
                }

            } catch (error) {

                continue;
            }
        }

        repaired.metadata =
            normalizeRepositoryMetadata(
                repository?.metadata,
                repaired.contacts,
                repository?.metadata
                    ?.createdAt
            );

        repaired.schemaVersion =
            SCHEMA_VERSION;

        return repaired;
    }

    /* ======================================================================
       MIGRATIONS
    ====================================================================== */

    const MIGRATIONS =
        new Map();

    MIGRATIONS.set(
        0,
        repository => {

            const migrated =
                createEmptyRepository();

            migrated.contacts =
                normalizeLegacyContacts(
                    repository.contacts
                );

            migrated.metadata =
                normalizeRepositoryMetadata(
                    repository.metadata,
                    migrated.contacts,
                    repository.metadata
                        ?.createdAt
                );

            migrated.schemaVersion =
                1;

            return migrated;
        }
    );

    function migrateRepository(
        repository
    ) {

        let current =
            normalizeRepository(
                repository
            );

        const fromVersion =
            current.schemaVersion;

        if (
            fromVersion >
            SCHEMA_VERSION
        ) {
            throw new Error(
                `[PAY54 Contacts Storage] Repository schema ${fromVersion} is newer than supported schema ${SCHEMA_VERSION}.`
            );
        }

        if (
            fromVersion <
            MIN_SCHEMA_VERSION
        ) {
            throw new Error(
                `[PAY54 Contacts Storage] Repository schema ${fromVersion} is older than minimum supported schema ${MIN_SCHEMA_VERSION}.`
            );
        }

        let migrated =
            false;

        const applied = [];

        while (
            current.schemaVersion <
            SCHEMA_VERSION
        ) {

            const migration =
                MIGRATIONS.get(
                    current.schemaVersion
                );

            if (
                typeof migration !==
                "function"
            ) {
                throw new Error(
                    `[PAY54 Contacts Storage] Missing migration from schema ${current.schemaVersion}.`
                );
            }

            const previousVersion =
                current.schemaVersion;

            current =
                migration(
                    current
                );

            if (
                !isPlainObject(
                    current
                ) ||
                !Number.isInteger(
                    current.schemaVersion
                ) ||
                current.schemaVersion <=
                    previousVersion
            ) {
                throw new Error(
                    `[PAY54 Contacts Storage] Migration from schema ${previousVersion} produced an invalid result.`
                );
            }

            applied.push({
                from:
                    previousVersion,
                to:
                    current.schemaVersion
            });

            migrated =
                true;
        }

        const result = {

            repository:
                current,

            migrated,

            fromVersion,

            toVersion:
                current.schemaVersion,

            applied
        };

        if (migrated) {

            state.lastMigration = {
                fromVersion,
                toVersion:
                    current.schemaVersion,
                applied:
                    immutableClone(
                        applied
                    ),
                migratedAt:
                    nowISO()
            };
        }

        return result;
    }

    /* ======================================================================
       ATOMIC-STYLE STAGED PERSISTENCE
    ====================================================================== */

    function buildMetadataDocument(
        repository
    ) {

        return {

            schemaVersion:
                repository.schemaVersion,

            recordCount:
                repository.contacts.length,

            module:
                MODULE_NAME,

            version:
                VERSION,

            updatedAt:
                repository.metadata
                    .updatedAt,

            integrityCheckedAt:
                state.lastIntegrityCheck
                    ?.checkedAt ??
                null
        };
    }

    function commitRepository(
        repository,
        options = {}
    ) {

        const normalized =
            normalizeRepository(
                repository
            );

        normalized.schemaVersion =
            SCHEMA_VERSION;

        normalized.metadata =
            normalizeRepositoryMetadata(
                normalized.metadata,
                normalized.contacts,
                normalized.metadata
                    ?.createdAt
            );

        normalized.metadata.updatedAt =
            nowISO();

        normalized.metadata.recordCount =
            normalized.contacts.length;

        const integrity =
            verifyRepositoryIntegrity(
                normalized
            );

        if (!integrity.ok) {
            throw new Error(
                `[PAY54 Contacts Storage] Repository integrity verification failed before persistence: ${integrity.errors.join(" | ")}`
            );
        }

        const serialized =
            JSON.stringify(
                normalized
            );

        const previousRaw =
            readRaw(
                PRIMARY_KEY
            );

        const useStaging =
            STORAGE_CONFIG.USE_STAGING_WRITES !==
            false;

        try {

            if (useStaging) {

                writeRaw(
                    STAGING_KEY,
                    serialized
                );

                const stagedRaw =
                    readRaw(
                        STAGING_KEY
                    );

                if (
                    stagedRaw !==
                    serialized
                ) {
                    throw new Error(
                        "[PAY54 Contacts Storage] Staging verification failed."
                    );
                }

                const stagedDocument =
                    parseJSON(
                        stagedRaw,
                        STAGING_KEY
                    );

                const stagedIntegrity =
                    verifyRepositoryIntegrity(
                        stagedDocument
                    );

                if (
                    !stagedIntegrity.ok
                ) {
                    throw new Error(
                        `[PAY54 Contacts Storage] Staged repository failed integrity verification: ${stagedIntegrity.errors.join(" | ")}`
                    );
                }
            }

            if (
                previousRaw !== null &&
                STORAGE_CONFIG.PRESERVE_BACKUP !==
                    false
            ) {

                writeRaw(
                    BACKUP_KEY,
                    previousRaw
                );
            }

            writeRaw(
                PRIMARY_KEY,
                serialized
            );

            if (
                STORAGE_CONFIG.VERIFY_AFTER_WRITE !==
                false
            ) {

                const committedRaw =
                    readRaw(
                        PRIMARY_KEY
                    );

                if (
                    committedRaw !==
                    serialized
                ) {
                    throw new Error(
                        "[PAY54 Contacts Storage] Committed storage verification failed."
                    );
                }

                const committedDocument =
                    parseJSON(
                        committedRaw,
                        PRIMARY_KEY
                    );

                const committedIntegrity =
                    verifyRepositoryIntegrity(
                        committedDocument
                    );

                if (
                    !committedIntegrity.ok
                ) {
                    throw new Error(
                        `[PAY54 Contacts Storage] Committed repository failed integrity verification: ${committedIntegrity.errors.join(" | ")}`
                    );
                }
            }

            writeRaw(
                META_KEY,
                JSON.stringify(
                    buildMetadataDocument(
                        normalized
                    )
                )
            );

            if (
                options.migration === true
            ) {

                writeRaw(
                    MIGRATION_KEY,
                    JSON.stringify({
                        schemaVersion:
                            normalized
                                .schemaVersion,
                        migratedAt:
                            nowISO(),
                        module:
                            MODULE_NAME,
                        version:
                            VERSION
                    })
                );
            }

            if (useStaging) {
                removeRaw(
                    STAGING_KEY
                );
            }

            state.lastWriteAt =
                nowISO();

            return normalized;

        } catch (error) {

            /*
             * If the primary write was changed but verification failed,
             * restore the last known payload where possible.
             */

            try {

                if (
                    previousRaw !== null
                ) {

                    writeRaw(
                        PRIMARY_KEY,
                        previousRaw
                    );

                } else {

                    removeRaw(
                        PRIMARY_KEY
                    );
                }

            } catch (rollbackError) {

                recordError(
                    "repository.rollback",
                    rollbackError
                );
            }

            try {
                removeRaw(
                    STAGING_KEY
                );
            } catch (cleanupError) {
                recordError(
                    "repository.staging.cleanup",
                    cleanupError
                );
            }

            throw error;
        }
    }

    /* ======================================================================
       RECOVERY
    ====================================================================== */

    function recoverFromBackup(
        reason
    ) {

        const backupRaw =
            readRaw(
                BACKUP_KEY
            );

        if (
            backupRaw === null
        ) {
            return null;
        }

        try {

            const backup =
                parseJSON(
                    backupRaw,
                    BACKUP_KEY
                );

            const migration =
                migrateRepository(
                    backup
                );

            let repository =
                migration.repository;

            let integrity =
                verifyRepositoryIntegrity(
                    repository
                );

            if (
                !integrity.ok &&
                INTEGRITY_CONFIG.REPAIR_INVALID_RECORDS !==
                    false
            ) {

                repository =
                    repairRepository(
                        repository
                    );

                integrity =
                    verifyRepositoryIntegrity(
                        repository
                    );
            }

            if (!integrity.ok) {
                return null;
            }

            const committed =
                commitRepository(
                    repository,
                    {
                        migration:
                            migration.migrated
                    }
                );

            state.recovered =
                true;

            publishEvent(
                EVENTS.STORAGE_RECOVERED ??
                "contacts.storage.recovered",
                {
                    reason,
                    source:
                        "backup",
                    recordCount:
                        committed.contacts.length
                }
            );

            return committed;

        } catch (error) {

            recordError(
                "repository.backup.recovery",
                error
            );

            return null;
        }
    }

    function recoverRepository(
        raw,
        reason
    ) {

        try {

            quarantinePayload(
                raw,
                reason
            );

        } catch (error) {

            recordError(
                "repository.quarantine",
                error
            );
        }

        const backup =
            recoverFromBackup(
                reason
            );

        if (backup) {
            return backup;
        }

        const empty =
            createEmptyRepository();

        const committed =
            commitRepository(
                empty
            );

        state.recovered =
            true;

        publishEvent(
            EVENTS.STORAGE_RECOVERED ??
            "contacts.storage.recovered",
            {
                reason,
                source:
                    "empty-repository",
                recordCount:
                    0
            }
        );

        return committed;
    }

    /* ======================================================================
       REPOSITORY READ
    ====================================================================== */

    function readRepository() {

        const raw =
            readRaw(
                PRIMARY_KEY
            );

        state.lastReadAt =
            nowISO();

        if (
            raw === null ||
            raw === ""
        ) {

            const empty =
                createEmptyRepository();

            return commitRepository(
                empty
            );
        }

        let parsed;

        try {

            parsed =
                parseJSON(
                    raw,
                    PRIMARY_KEY
                );

        } catch (error) {

            publishEvent(
                EVENTS.STORAGE_INTEGRITY_FAILED ??
                "contacts.storage.integrity_failed",
                {
                    reason:
                        "invalid-json",
                    message:
                        error.message
                }
            );

            return recoverRepository(
                raw,
                error.message
            );
        }

        let migration;

        try {

            migration =
                migrateRepository(
                    parsed
                );

        } catch (error) {

            publishEvent(
                EVENTS.STORAGE_INTEGRITY_FAILED ??
                "contacts.storage.integrity_failed",
                {
                    reason:
                        "migration-failed",
                    message:
                        error.message
                }
            );

            return recoverRepository(
                raw,
                error.message
            );
        }

        let repository =
            migration.repository;

        let integrity =
            verifyRepositoryIntegrity(
                repository
            );

        let repaired =
            false;

        if (
            !integrity.ok &&
            INTEGRITY_CONFIG.REPAIR_INVALID_RECORDS !==
                false
        ) {

            try {

                quarantinePayload(
                    raw,
                    integrity.errors.join(
                        " | "
                    )
                );

            } catch (error) {

                recordError(
                    "repository.integrity.quarantine",
                    error
                );
            }

            repository =
                repairRepository(
                    repository
                );

            integrity =
                verifyRepositoryIntegrity(
                    repository
                );

            repaired =
                integrity.ok;
        }

        if (!integrity.ok) {

            publishEvent(
                EVENTS.STORAGE_INTEGRITY_FAILED ??
                "contacts.storage.integrity_failed",
                {
                    reason:
                        "integrity-failed",
                    errors:
                        integrity.errors
                }
            );

            return recoverRepository(
                raw,
                integrity.errors.join(
                    " | "
                )
            );
        }

        /*
         * Migration persistence is intentionally local to this read.
         *
         * Unlike the previous WP-010A implementation, no permanent
         * migrationPerformed flag is retained. Therefore subsequent reads do
         * not repeatedly rewrite an already migrated repository.
         */

        if (
            migration.migrated ||
            repaired
        ) {

            const committed =
                commitRepository(
                    repository,
                    {
                        migration:
                            migration.migrated
                    }
                );

            if (
                migration.migrated
            ) {

                publishEvent(
                    EVENTS.STORAGE_MIGRATED ??
                    "contacts.storage.migrated",
                    {
                        fromVersion:
                            migration.fromVersion,
                        toVersion:
                            migration.toVersion,
                        applied:
                            migration.applied
                    }
                );
            }

            if (repaired) {

                state.recovered =
                    true;

                publishEvent(
                    EVENTS.STORAGE_RECOVERED ??
                    "contacts.storage.recovered",
                    {
                        reason:
                            "integrity-repair",
                        source:
                            "primary",
                        recordCount:
                            committed.contacts.length
                    }
                );
            }

            return committed;
        }

        return repository;
    }

    /* ======================================================================
       REPOSITORY WRITE
    ====================================================================== */

    function writeRepository(
        repository
    ) {

        return commitRepository(
            repository
        );
    }

    /* ======================================================================
       CRUD
    ====================================================================== */

    function getAll() {

        const repository =
            readRepository();

        return immutableClone(
            repository.contacts
        );
    }

    function getById(id) {

        const normalizedId =
            cleanString(id);

        if (!normalizedId) {
            return null;
        }

        const repository =
            readRepository();

        const contact =
            repository.contacts.find(
                item =>
                    item.id ===
                    normalizedId
            );

        return contact
            ? immutableClone(contact)
            : null;
    }

    function create(input) {

        ensureInitialized();

        const repository =
            readRepository();

        if (
            repository.contacts.length >=
            MAX_CONTACTS
        ) {
            throw new Error(
                `[PAY54 Contacts Storage] Maximum Contact capacity of ${MAX_CONTACTS} has been reached.`
            );
        }

        const contact =
            normalizeContact(
                input
            );

        if (
            repository.contacts.some(
                item =>
                    item.id ===
                    contact.id
            )
        ) {
            throw new Error(
                `[PAY54 Contacts Storage] Contact id "${contact.id}" already exists.`
            );
        }

        const duplicate =
            findDuplicate(
                repository.contacts,
                contact
            );

        if (duplicate) {
            throw new Error(
                `[PAY54 Contacts Storage] Contact duplicates an existing PAY54 ID, phone number or email address. Existing contact: ${duplicate.id}.`
            );
        }

        repository.contacts.push(
            contact
        );

        writeRepository(
            repository
        );

        publishEvent(
            EVENTS.CREATED ??
            "contacts.created",
            {
                contactId:
                    contact.id
            }
        );

        publishEvent(
            EVENTS.REPOSITORY_CHANGED ??
            "contacts.repository.changed",
            {
                operation:
                    "create",
                contactId:
                    contact.id
            }
        );

        return immutableClone(
            contact
        );
    }

    function update(
        id,
        changes
    ) {

        ensureInitialized();

        const normalizedId =
            cleanString(id);

        if (!normalizedId) {
            throw new Error(
                "[PAY54 Contacts Storage] Contact id is required for update."
            );
        }

        if (
            !isPlainObject(changes)
        ) {
            throw new TypeError(
                "[PAY54 Contacts Storage] Contact update must be a plain object."
            );
        }

        assertSafePayload(
            changes,
            "contact.update"
        );

        const repository =
            readRepository();

        const index =
            repository.contacts.findIndex(
                contact =>
                    contact.id ===
                    normalizedId
            );

        if (
            index < 0
        ) {
            throw new Error(
                `[PAY54 Contacts Storage] Contact "${normalizedId}" was not found.`
            );
        }

        const existing =
            repository.contacts[index];

        /*
         * Identity and creation timestamp are repository-owned.
         */

        const merged = {
            ...existing,
            ...changes,
            id:
                existing.id,
            createdAt:
                existing.createdAt
        };

        const updated =
            normalizeContact(
                merged,
                {
                    existing
                }
            );

        const duplicate =
            findDuplicate(
                repository.contacts,
                updated,
                existing.id
            );

        if (duplicate) {
            throw new Error(
                `[PAY54 Contacts Storage] Contact update duplicates another PAY54 ID, phone number or email address. Existing contact: ${duplicate.id}.`
            );
        }

        repository.contacts[index] =
            updated;

        writeRepository(
            repository
        );

        publishEvent(
            EVENTS.UPDATED ??
            "contacts.updated",
            {
                contactId:
                    updated.id
            }
        );

        publishEvent(
            EVENTS.REPOSITORY_CHANGED ??
            "contacts.repository.changed",
            {
                operation:
                    "update",
                contactId:
                    updated.id
            }
        );

        return immutableClone(
            updated
        );
    }

    function remove(id) {

        ensureInitialized();

        const normalizedId =
            cleanString(id);

        if (!normalizedId) {
            return false;
        }

        const repository =
            readRepository();

        const index =
            repository.contacts.findIndex(
                contact =>
                    contact.id ===
                    normalizedId
            );

        if (
            index < 0
        ) {
            return false;
        }

        const [removed] =
            repository.contacts.splice(
                index,
                1
            );

        writeRepository(
            repository
        );

        publishEvent(
            EVENTS.DELETED ??
            "contacts.deleted",
            {
                contactId:
                    removed.id
            }
        );

        publishEvent(
            EVENTS.REPOSITORY_CHANGED ??
            "contacts.repository.changed",
            {
                operation:
                    "delete",
                contactId:
                    removed.id
            }
        );

        return true;
    }

    function clear() {

        ensureInitialized();

        const repository =
            readRepository();

        const previousCount =
            repository.contacts.length;

        repository.contacts =
            [];

        writeRepository(
            repository
        );

        publishEvent(
            EVENTS.CLEARED ??
            "contacts.cleared",
            {
                previousCount
            }
        );

        publishEvent(
            EVENTS.REPOSITORY_CHANGED ??
            "contacts.repository.changed",
            {
                operation:
                    "clear",
                previousCount
            }
        );

        return previousCount;
    }

    /* ======================================================================
       QUERY API
    ====================================================================== */

    function count() {

        return readRepository()
            .contacts
            .length;
    }

    function exists(id) {

        return (
            getById(id) !==
            null
        );
    }

    function findByPhone(phone) {

        const normalized =
            normalizePhone(phone);

        if (!normalized) {
            return null;
        }

        const contact =
            readRepository()
                .contacts
                .find(
                    item =>
                        item.phone ===
                        normalized
                );

        return contact
            ? immutableClone(contact)
            : null;
    }

    function findByEmail(email) {

        const normalized =
            normalizeEmail(email);

        if (!normalized) {
            return null;
        }

        const contact =
            readRepository()
                .contacts
                .find(
                    item =>
                        item.email ===
                        normalized
                );

        return contact
            ? immutableClone(contact)
            : null;
    }

    function findByPay54Id(pay54Id) {

        const normalized =
            normalizePay54Id(
                pay54Id
            );

        if (!normalized) {
            return null;
        }

        const contact =
            readRepository()
                .contacts
                .find(
                    item =>
                        item.pay54Id ===
                        normalized
                );

        return contact
            ? immutableClone(contact)
            : null;
    }

    function search(
        query,
        options = {}
    ) {

        const normalizedQuery =
            cleanString(
                query,
                MAX_SEARCH_QUERY_LENGTH
            ).toLowerCase();

        if (
            normalizedQuery.length <
            MIN_SEARCH_QUERY_LENGTH
        ) {
            return Object.freeze([]);
        }

        const requestedLimit =
            Number.isInteger(
                options.limit
            )
                ? options.limit
                : MAX_SEARCH_RESULTS;

        const limit =
            Math.max(
                1,
                Math.min(
                    requestedLimit,
                    MAX_SEARCH_RESULTS
                )
            );

        const contacts =
            readRepository()
                .contacts;

        const results = [];

        for (
            const contact of contacts
        ) {

            const searchable = [
                contact.displayName,
                contact.firstName,
                contact.lastName,
                contact.alias,
                contact.phone,
                contact.email,
                contact.pay54Id,
                contact.type,
                contact.status,
                ...(contact.tags ?? []),
                ...(contact.groups ?? [])
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            if (
                searchable.includes(
                    normalizedQuery
                )
            ) {
                results.push(
                    contact
                );
            }

            if (
                results.length >=
                limit
            ) {
                break;
            }
        }

        publishEvent(
            EVENTS.SEARCHED ??
            "contacts.searched",
            {
                queryLength:
                    normalizedQuery.length,
                resultCount:
                    results.length
            }
        );

        return immutableClone(
            results
        );
    }

    function getFavourites() {

        const contacts =
            readRepository()
                .contacts
                .filter(
                    contact =>
                        contact.favourite ===
                        true
                );

        return immutableClone(
            contacts
        );
    }

    function setFavourite(
        id,
        favourite = true
    ) {

        return update(
            id,
            {
                favourite:
                    Boolean(favourite)
            }
        );
    }

    /* ======================================================================
       PUBLIC INTEGRITY API
    ====================================================================== */

    function verifyIntegrity() {

        ensureInitialized();

        const raw =
            readRaw(
                PRIMARY_KEY
            );

        if (
            raw === null
        ) {

            const result =
                verifyRepositoryIntegrity(
                    createEmptyRepository()
                );

            return result;
        }

        try {

            const parsed =
                parseJSON(
                    raw,
                    PRIMARY_KEY
                );

            const normalized =
                normalizeRepository(
                    parsed
                );

            return verifyRepositoryIntegrity(
                normalized
            );

        } catch (error) {

            const result =
                Object.freeze({

                    ok:
                        false,

                    schemaVersion:
                        null,

                    recordCount:
                        0,

                    errors:
                        Object.freeze([
                            error instanceof Error
                                ? error.message
                                : String(error)
                        ]),

                    checkedAt:
                        nowISO()
                });

            state.lastIntegrityCheck =
                result;

            return result;
        }
    }

    /* ======================================================================
       EXPLICIT MIGRATION API
    ====================================================================== */

    function migrate() {

        ensureInitialized();

        const raw =
            readRaw(
                PRIMARY_KEY
            );

        if (
            raw === null
        ) {

            const repository =
                commitRepository(
                    createEmptyRepository()
                );

            return Object.freeze({

                migrated:
                    false,

                fromVersion:
                    SCHEMA_VERSION,

                toVersion:
                    SCHEMA_VERSION,

                recordCount:
                    repository.contacts.length
            });
        }

        const parsed =
            parseJSON(
                raw,
                PRIMARY_KEY
            );

        const result =
            migrateRepository(
                parsed
            );

        const integrity =
            verifyRepositoryIntegrity(
                result.repository
            );

        if (!integrity.ok) {
            throw new Error(
                `[PAY54 Contacts Storage] Migrated repository failed integrity verification: ${integrity.errors.join(" | ")}`
            );
        }

        if (
            result.migrated
        ) {

            commitRepository(
                result.repository,
                {
                    migration:
                        true
                }
            );

            publishEvent(
                EVENTS.STORAGE_MIGRATED ??
                "contacts.storage.migrated",
                {
                    fromVersion:
                        result.fromVersion,
                    toVersion:
                        result.toVersion,
                    applied:
                        result.applied
                }
            );
        }

        return Object.freeze({

            migrated:
                result.migrated,

            fromVersion:
                result.fromVersion,

            toVersion:
                result.toVersion,

            recordCount:
                result.repository
                    .contacts
                    .length,

            applied:
                immutableClone(
                    result.applied
                )
        });
    }

    /* ======================================================================
       METADATA
    ====================================================================== */

    function getMetadata() {

        ensureInitialized();

        const repository =
            readRepository();

        return immutableClone({

            module:
                MODULE_NAME,

            moduleId:
                MODULE_ID,

            version:
                VERSION,

            schemaVersion:
                repository.schemaVersion,

            recordCount:
                repository.contacts.length,

            repository:
                repository.metadata,

            lastMigration:
                state.lastMigration,

            lastIntegrityCheck:
                state.lastIntegrityCheck
        });
    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    function calculateHealth() {

        let integrity = null;
        let recordCount = 0;
        let status = "ready";
        let healthy = true;

        try {

            const raw =
                readRaw(
                    PRIMARY_KEY
                );

            if (
                raw === null
            ) {

                integrity =
                    verifyRepositoryIntegrity(
                        createEmptyRepository()
                    );

            } else {

                const parsed =
                    parseJSON(
                        raw,
                        PRIMARY_KEY
                    );

                const normalized =
                    normalizeRepository(
                        parsed
                    );

                integrity =
                    verifyRepositoryIntegrity(
                        normalized
                    );

                recordCount =
                    normalized.contacts.length;
            }

            if (
                !integrity.ok
            ) {

                healthy =
                    false;

                status =
                    "error";
            }

        } catch (error) {

            healthy =
                false;

            status =
                "error";

            integrity =
                Object.freeze({

                    ok:
                        false,

                    errors:
                        Object.freeze([
                            error instanceof Error
                                ? error.message
                                : String(error)
                        ]),

                    checkedAt:
                        nowISO()
                });
        }

        if (
            healthy &&
            state.lastError
        ) {
            status =
                "degraded";
        }

        return Object.freeze({

            healthy,

            ok:
                healthy,

            status,

            module:
                MODULE_NAME,

            moduleId:
                MODULE_ID,

            path:
                FILE_PATH,

            version:
                VERSION,

            schemaVersion:
                SCHEMA_VERSION,

            initialized:
                state.initialized,

            storageAvailable:
                state.storageAvailable,

            securityVerified:
                state.securityVerified,

            securityMode:
                state.securityMode,

            eventBusAvailable:
                Boolean(
                    GLOBAL.PAY54_EVENTS &&
                    typeof GLOBAL
                        .PAY54_EVENTS
                        .publish === "function"
                ),

            registryRegistered:
                state.registryRegistered,

            recovered:
                state.recovered,

            recordCount,

            integrity,

            initializedAt:
                state.initializedAt,

            lastReadAt:
                state.lastReadAt,

            lastWriteAt:
                state.lastWriteAt,

            lastMigration:
                state.lastMigration
                    ? immutableClone(
                        state.lastMigration
                    )
                    : null,

            lastError:
                state.lastError
                    ? immutableClone(
                        state.lastError
                    )
                    : null,

            checkedAt:
                nowISO()
        });
    }

    function health() {

        const result =
            calculateHealth();

        const healthSignature =
            [
                result.status,
                result.storageAvailable,
                result.securityVerified,
                result.integrity?.ok
            ].join(":");

        if (
            state.lastHealthStatus !==
            null &&
            state.lastHealthStatus !==
            healthSignature
        ) {

            publishEvent(
                EVENTS.STORAGE_HEALTH_CHANGED ??
                "contacts.storage.health_changed",
                {
                    status:
                        result.status,
                    healthy:
                        result.healthy
                }
            );
        }

        state.lastHealthStatus =
            healthSignature;

        return result;
    }

    /* ======================================================================
       PLATFORM REGISTRY INTEGRATION
    ====================================================================== */

    function integrateRegistry(
        publicAPI
    ) {

        const registry =
            GLOBAL.PAY54_REGISTRY ??
            GLOBAL.PAY54_MODULE_REGISTRY ??
            null;

        if (!registry) {
            return false;
        }

        const descriptor =
            Object.freeze({

                id:
                    MODULE_ID,

                name:
                    MODULE_NAME,

                path:
                    FILE_PATH,

                version:
                    VERSION,

                schemaVersion:
                    SCHEMA_VERSION,

                type:
                    "engine-core",

                domain:
                    MODULES.CONTACTS,

                layer:
                    MODULES.LAYERS
                        ?.ENGINES ??
                    "layer.engines",

                api:
                    publicAPI,

                health
            });

        try {

            if (
                typeof registry.registerModule ===
                "function"
            ) {

                registry.registerModule(
                    MODULE_ID,
                    descriptor
                );

                state.registryRegistered =
                    true;

                return true;
            }

            if (
                typeof registry.register ===
                "function"
            ) {

                try {

                    registry.register(
                        MODULE_ID,
                        descriptor
                    );

                } catch (firstError) {

                    registry.register(
                        descriptor
                    );
                }

                state.registryRegistered =
                    true;

                return true;
            }

            if (
                typeof registry.set ===
                "function"
            ) {

                registry.set(
                    MODULE_ID,
                    descriptor
                );

                state.registryRegistered =
                    true;

                return true;
            }

        } catch (error) {

            recordError(
                "registry.integration",
                error
            );

            return false;
        }

        return false;
    }

    /* ======================================================================
       INITIALIZATION
    ====================================================================== */

    function ensureInitialized() {

        if (
            state.initialized
        ) {
            return true;
        }

        return initialize();
    }

    function initialize() {

        if (
            state.initialized
        ) {
            return true;
        }

        if (
            state.initializing
        ) {
            return false;
        }

        state.initializing =
            true;

        try {

            verifySecurityBootstrap();

            verifyStorageAvailability();

            /*
             * readRepository performs migration/recovery only when required.
             */

            const repository =
                readRepository();

            const integrity =
                verifyRepositoryIntegrity(
                    repository
                );

            if (!integrity.ok) {
                throw new Error(
                    `[PAY54 Contacts Storage] Initialization integrity verification failed: ${integrity.errors.join(" | ")}`
                );
            }

            state.initialized =
                true;

            state.initializedAt =
                nowISO();

            state.initializing =
                false;

            publishEvent(
                EVENTS.STORAGE_READY ??
                "contacts.storage.ready",
                {
                    schemaVersion:
                        repository
                            .schemaVersion,
                    recordCount:
                        repository
                            .contacts
                            .length,
                    securityMode:
                        state.securityMode
                }
            );

            publishEvent(
                EVENTS.REPOSITORY_READY ??
                "contacts.repository.ready",
                {
                    schemaVersion:
                        repository
                            .schemaVersion,
                    recordCount:
                        repository
                            .contacts
                            .length
                }
            );

            return true;

        } catch (error) {

            state.initializing =
                false;

            state.initialized =
                false;

            const message =
                recordError(
                    "initialize",
                    error
                );

            publishEvent(
                EVENTS.STORAGE_ERROR ??
                "contacts.storage.error",
                {
                    operation:
                        "initialize",
                    message
                }
            );

            publishEvent(
                EVENTS.ERROR ??
                "contacts.error",
                {
                    operation:
                        "storage.initialize",
                    message
                }
            );

            console.error(
                "[PAY54 Contacts Storage] Initialization failed:",
                error
            );

            throw error;
        }
    }

    /* ======================================================================
       REPOSITORY API
    ====================================================================== */

    const repositoryAPI =
        Object.freeze({

            getAll,

            getById,

            create,

            update,

            remove,

            clear,

            count,

            exists,

            findByPhone,

            findByEmail,

            findByPay54Id,

            search,

            getFavourites,

            setFavourite,

            verifyIntegrity,

            migrate,

            getMetadata,

            health
        });

    /* ======================================================================
       PUBLIC API
    ====================================================================== */

    const publicAPI =
        Object.freeze({

            version:
                VERSION,

            schemaVersion:
                SCHEMA_VERSION,

            module:
                MODULE_NAME,

            moduleId:
                MODULE_ID,

            repository:
                repositoryAPI,

            initialize,

            initialise:
                initialize,

            getAll,

            getContacts:
                getAll,

            getById,

            getContactById:
                getById,

            create,

            createContact:
                create,

            add:
                create,

            addContact:
                create,

            update,

            updateContact:
                update,

            remove,

            removeContact:
                remove,

            delete:
                remove,

            deleteContact:
                remove,

            clear,

            clearContacts:
                clear,

            count,

            exists,

            findByPhone,

            findByEmail,

            findByPay54Id,

            search,

            searchContacts:
                search,

            getFavourites,

            getFavorites:
                getFavourites,

            setFavourite,

            setFavorite:
                setFavourite,

            verifyIntegrity,

            migrate,

            getMetadata,

            health,

            getHealth:
                health,

            register() {

                return integrateRegistry(
                    publicAPI
                );
            }

        });

    /* ======================================================================
       GLOBAL INSTALLATION
    ====================================================================== */

    function installGlobalAPI() {

        const existing =
            GLOBAL.PAY54_CONTACTS_STORAGE;

        if (
            existing &&
            existing !== publicAPI
        ) {

            if (
                typeof existing.getAll ===
                    "function" &&
                typeof existing.create ===
                    "function" &&
                typeof existing.update ===
                    "function" &&
                typeof existing.remove ===
                    "function"
            ) {

                /*
                 * Never replace a live compatible repository because other
                 * modules may already hold references to it.
                 */

                return existing;
            }

            throw new Error(
                "[PAY54 Contacts Storage] window.PAY54_CONTACTS_STORAGE already exists with an incompatible implementation."
            );
        }

        if (!existing) {

            Object.defineProperty(
                GLOBAL,
                "PAY54_CONTACTS_STORAGE",
                {
                    value:
                        publicAPI,
                    enumerable:
                        true,
                    configurable:
                        false,
                    writable:
                        false
                }
            );
        }

        return GLOBAL
            .PAY54_CONTACTS_STORAGE;
    }

    function installContactsNamespace(
        api
    ) {

        let namespace =
            GLOBAL.PAY54_CONTACTS;

        if (!namespace) {

            namespace = {};

            GLOBAL.PAY54_CONTACTS =
                namespace;
        }

        if (
            !isObject(namespace) ||
            Object.isFrozen(namespace)
        ) {
            return false;
        }

        if (
            !Object.prototype
                .hasOwnProperty.call(
                    namespace,
                    "STORAGE"
                )
        ) {
            Object.defineProperty(
                namespace,
                "STORAGE",
                {
                    value:
                        api,
                    enumerable:
                        true,
                    configurable:
                        false,
                    writable:
                        false
                }
            );
        }

        if (
            !Object.prototype
                .hasOwnProperty.call(
                    namespace,
                    "storage"
                )
        ) {
            Object.defineProperty(
                namespace,
                "storage",
                {
                    value:
                        api,
                    enumerable:
                        true,
                    configurable:
                        false,
                    writable:
                        false
                }
            );
        }

        return true;
    }

    /* ======================================================================
       BOOTSTRAP
    ====================================================================== */

    try {

        const installedAPI =
            installGlobalAPI();

        installContactsNamespace(
            installedAPI
        );

        if (
            installedAPI ===
            publicAPI
        ) {

            initialize();

            integrateRegistry(
                publicAPI
            );
        }

        console.info(
            "✅ PAY54 Contacts Storage",
            VERSION,
            "loaded."
        );

    } catch (error) {

        const message =
            recordError(
                "bootstrap",
                error
            );

        publishEvent(
            EVENTS.STORAGE_ERROR ??
            "contacts.storage.error",
            {
                operation:
                    "bootstrap",
                message
            }
        );

        publishEvent(
            EVENTS.ERROR ??
            "contacts.error",
            {
                operation:
                    "storage.bootstrap",
                message
            }
        );

        console.error(
            "[PAY54 Contacts Storage] Bootstrap failed:",
            error
        );

        throw error;
    }

})();
