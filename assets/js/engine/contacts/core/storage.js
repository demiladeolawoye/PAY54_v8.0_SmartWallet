"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE CONTACTS STORAGE
   File: assets/js/engine/contacts/core/storage.js
   Version: v12.0.0

   Purpose
   -------
   Enterprise persistence and repository layer for PAY54 Contacts.

   Responsibilities
   ----------------
   • Canonical contacts persistence
   • Repository CRUD operations
   • Schema normalisation
   • Storage migrations
   • Data integrity verification
   • Repository health reporting
   • Event Bus integration
   • Security bootstrap verification
   • Registry integration
   • Backward-compatible browser persistence
   • Defensive recovery from malformed storage

   Architecture
   ------------
   Core Constants
        ↓
   Security Bootstrap
        ↓
   Contacts Storage Repository
        ↓
   Contacts Services / Engines
        ↓
   Contacts UI

   Security
   --------
   This module never stores credentials, PINs, authentication tokens,
   CVVs, card secrets or other payment authentication material.

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL DEPENDENCIES
    ====================================================================== */

    const GLOBAL = window;

    const CONSTANTS =
        GLOBAL.PAY54_CONSTANTS || null;

    if (!CONSTANTS) {
        throw new Error(
            "[PAY54_CONTACTS_STORAGE] PAY54 Constants Registry must load before contacts storage."
        );
    }

    /* ======================================================================
       MODULE IDENTITY
    ====================================================================== */

    const MODULE_NAME =
        "contacts-storage";

    const MODULE_PATH =
        "assets/js/engine/contacts/core/storage.js";

    const DEFAULT_VERSION =
        "12.0.0";

    const SCHEMA_VERSION =
        1;

    /* ======================================================================
       CONSTANT RESOLUTION
    ====================================================================== */

    function getConstant(key, fallback = undefined) {

        try {

            if (
                CONSTANTS &&
                typeof CONSTANTS.get === "function"
            ) {

                const value =
                    CONSTANTS.get(key);

                if (value !== undefined && value !== null) {
                    return value;
                }

            }

        } catch (error) {

            console.warn(
                `[PAY54_CONTACTS_STORAGE] Unable to resolve constant "${key}".`,
                error
            );

        }

        return fallback;

    }

    const MODULES =
        getConstant(
            "MODULES",
            Object.freeze({})
        );

    const VERSIONS =
        getConstant(
            "VERSIONS",
            Object.freeze({})
        );

    const CONTACTS_CONSTANTS =
        getConstant(
            "CONTACTS",
            getConstant(
                "CONTACT_CONSTANTS",
                Object.freeze({})
            )
        );

    /* ======================================================================
       VERSION RESOLUTION
    ====================================================================== */

    function resolveVersion() {

        const candidates = [
            VERSIONS?.CONTACTS_STORAGE,
            VERSIONS?.CONTACTS?.STORAGE,
            VERSIONS?.CONTACTS,
            DEFAULT_VERSION
        ];

        for (const value of candidates) {

            if (
                typeof value === "string" &&
                value.trim()
            ) {
                return value.trim();
            }

        }

        return DEFAULT_VERSION;

    }

    const VERSION =
        resolveVersion();

    /* ======================================================================
       MODULE IDENTIFIER RESOLUTION
    ====================================================================== */

    function resolveModuleId() {

        const candidates = [
            MODULES?.CONTACTS_STORAGE,
            MODULES?.CONTACTS?.STORAGE,
            MODULES?.CONTACTS,
            MODULE_NAME
        ];

        for (const value of candidates) {

            if (
                typeof value === "string" &&
                value.trim()
            ) {
                return value.trim();
            }

        }

        return MODULE_NAME;

    }

    const MODULE_ID =
        resolveModuleId();

    /* ======================================================================
       STORAGE CONFIGURATION
    ====================================================================== */

    function resolveStorageKey() {

        const candidates = [
            CONTACTS_CONSTANTS?.STORAGE_KEY,
            CONTACTS_CONSTANTS?.STORAGE?.KEY,
            CONTACTS_CONSTANTS?.KEYS?.CONTACTS,
            CONTACTS_CONSTANTS?.KEYS?.STORAGE,
            "pay54_contacts"
        ];

        for (const value of candidates) {

            if (
                typeof value === "string" &&
                value.trim()
            ) {
                return value.trim();
            }

        }

        return "pay54_contacts";

    }

    function resolveMetadataKey() {

        const candidates = [
            CONTACTS_CONSTANTS?.METADATA_KEY,
            CONTACTS_CONSTANTS?.STORAGE?.METADATA_KEY,
            CONTACTS_CONSTANTS?.KEYS?.METADATA,
            "pay54_contacts_meta"
        ];

        for (const value of candidates) {

            if (
                typeof value === "string" &&
                value.trim()
            ) {
                return value.trim();
            }

        }

        return "pay54_contacts_meta";

    }

    const STORAGE_KEY =
        resolveStorageKey();

    const METADATA_KEY =
        resolveMetadataKey();

    /* ======================================================================
       EVENT DEFINITIONS
    ====================================================================== */

    const EVENTS =
        Object.freeze({

            READY:
                CONTACTS_CONSTANTS?.EVENTS?.STORAGE_READY ||
                "contacts.storage.ready",

            CREATED:
                CONTACTS_CONSTANTS?.EVENTS?.CREATED ||
                "contacts.created",

            UPDATED:
                CONTACTS_CONSTANTS?.EVENTS?.UPDATED ||
                "contacts.updated",

            DELETED:
                CONTACTS_CONSTANTS?.EVENTS?.DELETED ||
                "contacts.deleted",

            CLEARED:
                CONTACTS_CONSTANTS?.EVENTS?.CLEARED ||
                "contacts.cleared",

            MIGRATED:
                CONTACTS_CONSTANTS?.EVENTS?.MIGRATED ||
                "contacts.storage.migrated",

            RECOVERED:
                CONTACTS_CONSTANTS?.EVENTS?.RECOVERED ||
                "contacts.storage.recovered",

            INTEGRITY_FAILED:
                CONTACTS_CONSTANTS?.EVENTS?.INTEGRITY_FAILED ||
                "contacts.storage.integrity_failed",

            HEALTH_CHANGED:
                CONTACTS_CONSTANTS?.EVENTS?.HEALTH_CHANGED ||
                "contacts.storage.health_changed",

            ERROR:
                CONTACTS_CONSTANTS?.EVENTS?.ERROR ||
                "contacts.storage.error"

        });

    /* ======================================================================
       INTERNAL STATE
    ====================================================================== */

    const state = {

        initialized: false,

        storageAvailable: false,

        securityVerified: false,

        registryRegistered: false,

        migrationPerformed: false,

        recovered: false,

        lastError: null,

        initializedAt: null,

        lastIntegrityCheck: null

    };

    /* ======================================================================
       GENERIC UTILITIES
    ====================================================================== */

    function nowISO() {
        return new Date().toISOString();
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

    function clone(value) {

        if (value === undefined) {
            return undefined;
        }

        if (
            typeof structuredClone === "function"
        ) {

            try {
                return structuredClone(value);
            } catch {
                /* Continue to JSON-safe clone. */
            }

        }

        return JSON.parse(
            JSON.stringify(value)
        );

    }

    function deepFreeze(value) {

        if (
            !value ||
            typeof value !== "object" ||
            Object.isFrozen(value)
        ) {
            return value;
        }

        Object.freeze(value);

        for (
            const property
            of Object.getOwnPropertyNames(value)
        ) {

            const child =
                value[property];

            if (
                child &&
                typeof child === "object"
            ) {
                deepFreeze(child);
            }

        }

        return value;

    }

    function cleanString(
        value,
        maximumLength = 256
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/[\u0000-\u001F\u007F]/gu, "")
            .trim()
            .slice(0, maximumLength);

    }

    function normaliseEmail(value) {

        return cleanString(value, 320)
            .toLowerCase();

    }

    function normalisePhone(value) {

        const source =
            cleanString(value, 64);

        if (!source) {
            return "";
        }

        const hasLeadingPlus =
            source.startsWith("+");

        const digits =
            source.replace(/\D/gu, "");

        if (!digits) {
            return "";
        }

        return (
            hasLeadingPlus
                ? `+${digits}`
                : digits
        );

    }

    function normalisePay54Id(value) {

        return cleanString(value, 128)
            .replace(/^@/u, "")
            .toLowerCase();

    }

    function normaliseBoolean(value) {
        return value === true;
    }

    function normaliseTags(value) {

        if (!Array.isArray(value)) {
            return [];
        }

        return [
            ...new Set(
                value
                    .map(item =>
                        cleanString(item, 64)
                            .toLowerCase()
                    )
                    .filter(Boolean)
            )
        ].slice(0, 50);

    }

    function generateId() {

        if (
            GLOBAL.crypto &&
            typeof GLOBAL.crypto.randomUUID === "function"
        ) {

            return `contact_${GLOBAL.crypto.randomUUID()}`;

        }

        if (
            GLOBAL.crypto &&
            typeof GLOBAL.crypto.getRandomValues === "function"
        ) {

            const bytes =
                new Uint8Array(16);

            GLOBAL.crypto.getRandomValues(bytes);

            bytes[6] =
                (bytes[6] & 0x0f) | 0x40;

            bytes[8] =
                (bytes[8] & 0x3f) | 0x80;

            const hex =
                [...bytes]
                    .map(byte =>
                        byte
                            .toString(16)
                            .padStart(2, "0")
                    )
                    .join("");

            return (
                "contact_" +
                `${hex.slice(0, 8)}-` +
                `${hex.slice(8, 12)}-` +
                `${hex.slice(12, 16)}-` +
                `${hex.slice(16, 20)}-` +
                `${hex.slice(20)}`
            );

        }

        const entropy =
            `${Date.now()}_${performance?.now?.() || 0}`;

        let hash =
            2166136261;

        for (
            let index = 0;
            index < entropy.length;
            index += 1
        ) {

            hash ^=
                entropy.charCodeAt(index);

            hash =
                Math.imul(
                    hash,
                    16777619
                );

        }

        return (
            `contact_${Date.now().toString(36)}_` +
            `${(hash >>> 0).toString(36)}`
        );

    }

    /* ======================================================================
       SECURITY
    ====================================================================== */

    const FORBIDDEN_FIELDS =
        Object.freeze([
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
        ]);

    function assertSafePayload(payload) {

        if (!isPlainObject(payload)) {

            throw new TypeError(
                "[PAY54_CONTACTS_STORAGE] Contact payload must be an object."
            );

        }

        for (
            const forbidden
            of FORBIDDEN_FIELDS
        ) {

            if (
                Object.prototype.hasOwnProperty.call(
                    payload,
                    forbidden
                )
            ) {

                throw new Error(
                    `[PAY54_CONTACTS_STORAGE] Sensitive field "${forbidden}" cannot be persisted in contacts storage.`
                );

            }

        }

    }

    function verifySecurityBootstrap() {

        const securityCandidates = [
            GLOBAL.PAY54_SECURITY,
            GLOBAL.PAY54_SECURITY_BOOTSTRAP,
            GLOBAL.PAY54_SECURITY_SHIELD
        ];

        const security =
            securityCandidates.find(Boolean);

        /*
         * Security modules are permitted to be absent during legacy
         * migration/bootstrap so this storage layer remains zero-regression.
         * If a security runtime exists and explicitly reports an unsafe
         * state, storage initialisation is rejected.
         */

        if (!security) {

            state.securityVerified =
                true;

            return true;

        }

        const explicitUnsafe =
            security.ready === false ||
            security.initialized === false ||
            security.secure === false ||
            security.compromised === true;

        if (explicitUnsafe) {

            state.securityVerified =
                false;

            throw new Error(
                "[PAY54_CONTACTS_STORAGE] PAY54 security bootstrap reported an unsafe state."
            );

        }

        const verificationMethods = [
            "isReady",
            "isSecure",
            "verify",
            "verifyBootstrap"
        ];

        for (
            const method
            of verificationMethods
        ) {

            if (
                typeof security[method] === "function"
            ) {

                try {

                    const result =
                        security[method]();

                    if (
                        result === false ||
                        (
                            isPlainObject(result) &&
                            (
                                result.ok === false ||
                                result.secure === false ||
                                result.ready === false
                            )
                        )
                    ) {

                        state.securityVerified =
                            false;

                        throw new Error(
                            "[PAY54_CONTACTS_STORAGE] PAY54 security bootstrap verification failed."
                        );

                    }

                } catch (error) {

                    state.securityVerified =
                        false;

                    throw error;

                }

                break;

            }

        }

        state.securityVerified =
            true;

        return true;

    }

    /* ======================================================================
       STORAGE AVAILABILITY
    ====================================================================== */

    function getStorage() {

        if (!GLOBAL.localStorage) {

            throw new Error(
                "[PAY54_CONTACTS_STORAGE] Browser storage is unavailable."
            );

        }

        return GLOBAL.localStorage;

    }

    function verifyStorageAvailability() {

        const probeKey =
            `__pay54_contacts_probe_${Date.now()}`;

        try {

            const storage =
                getStorage();

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

            state.lastError =
                error;

            return false;

        }

    }

    /* ======================================================================
       SAFE STORAGE OPERATIONS
    ====================================================================== */

    function readRaw(key) {

        try {

            return getStorage()
                .getItem(key);

        } catch (error) {

            state.lastError =
                error;

            publishEvent(
                EVENTS.ERROR,
                {
                    operation: "read",
                    key,
                    message:
                        error instanceof Error
                            ? error.message
                            : String(error)
                }
            );

            throw error;

        }

    }

    function writeRaw(
        key,
        value
    ) {

        try {

            getStorage()
                .setItem(
                    key,
                    value
                );

            return true;

        } catch (error) {

            state.lastError =
                error;

            publishEvent(
                EVENTS.ERROR,
                {
                    operation: "write",
                    key,
                    message:
                        error instanceof Error
                            ? error.message
                            : String(error)
                }
            );

            throw error;

        }

    }

    function removeRaw(key) {

        try {

            getStorage()
                .removeItem(key);

            return true;

        } catch (error) {

            state.lastError =
                error;

            publishEvent(
                EVENTS.ERROR,
                {
                    operation: "remove",
                    key,
                    message:
                        error instanceof Error
                            ? error.message
                            : String(error)
                }
            );

            throw error;

        }

    }

    function parseJSON(
        raw,
        fallback
    ) {

        if (
            raw === null ||
            raw === "" ||
            raw === "null" ||
            raw === "undefined"
        ) {
            return clone(fallback);
        }

        try {

            return JSON.parse(raw);

        } catch {

            return clone(fallback);

        }

    }

    /* ======================================================================
       CONTACT SCHEMA
    ====================================================================== */

    function normaliseContact(
        input,
        existing = null
    ) {

        assertSafePayload(input);

        const timestamp =
            nowISO();

        const source =
            existing
                ? {
                    ...existing,
                    ...input
                }
                : {
                    ...input
                };

        const id =
            cleanString(
                existing?.id ||
                source.id,
                160
            ) ||
            generateId();

        const displayName =
            cleanString(
                source.displayName ??
                source.name ??
                source.fullName,
                160
            );

        const firstName =
            cleanString(
                source.firstName,
                80
            );

        const lastName =
            cleanString(
                source.lastName,
                80
            );

        const phone =
            normalisePhone(
                source.phone ??
                source.phoneNumber ??
                source.mobile
            );

        const email =
            normaliseEmail(
                source.email
            );

        const pay54Id =
            normalisePay54Id(
                source.pay54Id ??
                source.pay54Tag ??
                source.username
            );

        const resolvedDisplayName =
            displayName ||
            [firstName, lastName]
                .filter(Boolean)
                .join(" ") ||
            pay54Id ||
            phone ||
            email ||
            "PAY54 Contact";

        const createdAt =
            cleanString(
                existing?.createdAt ||
                source.createdAt,
                64
            ) ||
            timestamp;

        const updatedAt =
            timestamp;

        const contact =
            {
                id,
                displayName:
                    resolvedDisplayName,
                firstName,
                lastName,
                phone,
                email,
                pay54Id,
                avatar:
                    cleanString(
                        source.avatar,
                        2048
                    ),
                favourite:
                    normaliseBoolean(
                        source.favourite ??
                        source.favorite
                    ),
                tags:
                    normaliseTags(
                        source.tags
                    ),
                notes:
                    cleanString(
                        source.notes,
                        1000
                    ),
                metadata:
                    normaliseMetadata(
                        source.metadata
                    ),
                createdAt,
                updatedAt
            };

        return contact;

    }

    function normaliseMetadata(value) {

        if (!isPlainObject(value)) {
            return {};
        }

        const result = {};

        const allowedKeys = [
            "source",
            "relationship",
            "country",
            "currency",
            "bankName",
            "accountName",
            "accountNumberMasked",
            "lastUsedAt",
            "useCount"
        ];

        for (
            const key
            of allowedKeys
        ) {

            if (
                !Object.prototype.hasOwnProperty.call(
                    value,
                    key
                )
            ) {
                continue;
            }

            const item =
                value[key];

            if (
                key === "useCount"
            ) {

                const numeric =
                    Number(item);

                result[key] =
                    Number.isFinite(numeric) &&
                    numeric >= 0
                        ? Math.floor(numeric)
                        : 0;

                continue;

            }

            result[key] =
                cleanString(
                    item,
                    256
                );

        }

        return result;

    }

    function validateContact(contact) {

        if (!isPlainObject(contact)) {

            return {
                valid: false,
                errors: [
                    "Contact must be an object."
                ]
            };

        }

        const errors = [];

        if (
            typeof contact.id !== "string" ||
            !contact.id.trim()
        ) {
            errors.push(
                "Contact ID is required."
            );
        }

        if (
            typeof contact.displayName !== "string" ||
            !contact.displayName.trim()
        ) {
            errors.push(
                "Contact display name is required."
            );
        }

        if (
            !contact.phone &&
            !contact.email &&
            !contact.pay54Id
        ) {
            errors.push(
                "Contact requires at least one contact identifier."
            );
        }

        if (
            contact.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(
                contact.email
            )
        ) {
            errors.push(
                "Contact email is invalid."
            );
        }

        if (
            !Array.isArray(
                contact.tags
            )
        ) {
            errors.push(
                "Contact tags must be an array."
            );
        }

        if (
            !isPlainObject(
                contact.metadata
            )
        ) {
            errors.push(
                "Contact metadata must be an object."
            );
        }

        return {
            valid:
                errors.length === 0,
            errors
        };

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
            contacts: [],
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

    function normaliseRepository(
        repository
    ) {

        if (
            Array.isArray(repository)
        ) {

            repository = {
                schemaVersion: 0,
                contacts: repository,
                metadata: {}
            };

        }

        if (!isPlainObject(repository)) {

            return createEmptyRepository();

        }

        const rawContacts =
            Array.isArray(
                repository.contacts
            )
                ? repository.contacts
                : [];

        const contacts = [];

        const ids =
            new Set();

        for (
            const candidate
            of rawContacts
        ) {

            try {

                if (!isPlainObject(candidate)) {
                    continue;
                }

                const contact =
                    normaliseContactForRecovery(
                        candidate
                    );

                const validation =
                    validateContact(contact);

                if (
                    !validation.valid ||
                    ids.has(contact.id)
                ) {
                    continue;
                }

                ids.add(contact.id);
                contacts.push(contact);

            } catch {
                /* Invalid records are excluded during repository recovery. */
            }

        }

        const createdAt =
            cleanString(
                repository.metadata?.createdAt,
                64
            ) ||
            nowISO();

        const updatedAt =
            cleanString(
                repository.metadata?.updatedAt,
                64
            ) ||
            nowISO();

        return {
            schemaVersion:
                Number.isInteger(
                    repository.schemaVersion
                )
                    ? repository.schemaVersion
                    : 0,
            contacts,
            metadata: {
                createdAt,
                updatedAt,
                recordCount:
                    contacts.length
            }
        };

    }

    function normaliseContactForRecovery(
        source
    ) {

        assertSafePayload(source);

        const id =
            cleanString(
                source.id,
                160
            ) ||
            generateId();

        const createdAt =
            cleanString(
                source.createdAt ??
                source.created_at,
                64
            ) ||
            nowISO();

        const updatedAt =
            cleanString(
                source.updatedAt ??
                source.updated_at,
                64
            ) ||
            createdAt;

        const firstName =
            cleanString(
                source.firstName ??
                source.first_name,
                80
            );

        const lastName =
            cleanString(
                source.lastName ??
                source.last_name,
                80
            );

        const phone =
            normalisePhone(
                source.phone ??
                source.phoneNumber ??
                source.mobile
            );

        const email =
            normaliseEmail(
                source.email
            );

        const pay54Id =
            normalisePay54Id(
                source.pay54Id ??
                source.pay54Tag ??
                source.username
            );

        const displayName =
            cleanString(
                source.displayName ??
                source.name ??
                source.fullName,
                160
            ) ||
            [firstName, lastName]
                .filter(Boolean)
                .join(" ") ||
            pay54Id ||
            phone ||
            email ||
            "PAY54 Contact";

        return {
            id,
            displayName,
            firstName,
            lastName,
            phone,
            email,
            pay54Id,
            avatar:
                cleanString(
                    source.avatar,
                    2048
                ),
            favourite:
                normaliseBoolean(
                    source.favourite ??
                    source.favorite
                ),
            tags:
                normaliseTags(
                    source.tags
                ),
            notes:
                cleanString(
                    source.notes,
                    1000
                ),
            metadata:
                normaliseMetadata(
                    source.metadata
                ),
            createdAt,
            updatedAt
        };

    }

    /* ======================================================================
       MIGRATIONS
    ====================================================================== */

    const MIGRATIONS =
        new Map();

    MIGRATIONS.set(
        0,
        repository => {

            const normalised =
                normaliseRepository(
                    repository
                );

            normalised.schemaVersion =
                1;

            normalised.metadata.updatedAt =
                nowISO();

            return normalised;

        }
    );

    function migrateRepository(
        repository
    ) {

        let working =
            normaliseRepository(
                repository
            );

        let currentVersion =
            Number.isInteger(
                working.schemaVersion
            )
                ? working.schemaVersion
                : 0;

        if (
            currentVersion >
            SCHEMA_VERSION
        ) {

            throw new Error(
                `[PAY54_CONTACTS_STORAGE] Unsupported contacts schema version ${currentVersion}. Runtime supports schema ${SCHEMA_VERSION}.`
            );

        }

        const originalVersion =
            currentVersion;

        while (
            currentVersion <
            SCHEMA_VERSION
        ) {

            const migration =
                MIGRATIONS.get(
                    currentVersion
                );

            if (
                typeof migration !== "function"
            ) {

                throw new Error(
                    `[PAY54_CONTACTS_STORAGE] Missing migration from schema ${currentVersion}.`
                );

            }

            working =
                migration(
                    working
                );

            currentVersion =
                Number(
                    working.schemaVersion
                );

            if (
                !Number.isInteger(
                    currentVersion
                )
            ) {

                throw new Error(
                    "[PAY54_CONTACTS_STORAGE] Migration produced an invalid schema version."
                );

            }

        }

        if (
            originalVersion !==
            currentVersion
        ) {

            state.migrationPerformed =
                true;

            publishEvent(
                EVENTS.MIGRATED,
                {
                    fromVersion:
                        originalVersion,
                    toVersion:
                        currentVersion,
                    migratedAt:
                        nowISO()
                }
            );

        }

        return working;

    }

    /* ======================================================================
       INTEGRITY
    ====================================================================== */

    function verifyRepositoryIntegrity(
        repository
    ) {

        const errors = [];

        if (!isPlainObject(repository)) {

            errors.push(
                "Repository document is invalid."
            );

            return {
                valid: false,
                errors,
                recordCount: 0,
                checkedAt:
                    nowISO()
            };

        }

        if (
            repository.schemaVersion !==
            SCHEMA_VERSION
        ) {

            errors.push(
                `Unexpected schema version: ${repository.schemaVersion}.`
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

        }

        const ids =
            new Set();

        const identifiers =
            new Set();

        const contacts =
            Array.isArray(
                repository.contacts
            )
                ? repository.contacts
                : [];

        for (
            const contact
            of contacts
        ) {

            const validation =
                validateContact(contact);

            if (!validation.valid) {

                errors.push(
                    `Invalid contact "${contact?.id || "unknown"}": ${validation.errors.join(" ")}`
                );

                continue;

            }

            if (
                ids.has(contact.id)
            ) {

                errors.push(
                    `Duplicate contact ID "${contact.id}".`
                );

            }

            ids.add(contact.id);

            const identityKeys =
                buildIdentityKeys(
                    contact
                );

            for (
                const key
                of identityKeys
            ) {

                if (
                    identifiers.has(key)
                ) {

                    /*
                     * Duplicate identifiers are reported by integrity
                     * verification but do not destroy records automatically.
                     */
                    errors.push(
                        `Duplicate contact identifier "${key}".`
                    );

                } else {

                    identifiers.add(key);

                }

            }

        }

        const expectedCount =
            contacts.length;

        if (
            repository.metadata &&
            Number.isInteger(
                repository.metadata.recordCount
            ) &&
            repository.metadata.recordCount !==
                expectedCount
        ) {

            errors.push(
                "Repository record count metadata does not match stored contacts."
            );

        }

        const result = {
            valid:
                errors.length === 0,
            errors,
            recordCount:
                expectedCount,
            checkedAt:
                nowISO()
        };

        state.lastIntegrityCheck =
            result;

        if (!result.valid) {

            publishEvent(
                EVENTS.INTEGRITY_FAILED,
                clone(result)
            );

        }

        return result;

    }

    /* ======================================================================
       DUPLICATE DETECTION
    ====================================================================== */

    function buildIdentityKeys(
        contact
    ) {

        const keys = [];

        if (contact.pay54Id) {

            keys.push(
                `pay54:${normalisePay54Id(contact.pay54Id)}`
            );

        }

        if (contact.phone) {

            keys.push(
                `phone:${normalisePhone(contact.phone)}`
            );

        }

        if (contact.email) {

            keys.push(
                `email:${normaliseEmail(contact.email)}`
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

        return (
            contacts.find(contact => {

                if (
                    excludedId &&
                    contact.id === excludedId
                ) {
                    return false;
                }

                return buildIdentityKeys(
                    contact
                ).some(key =>
                    candidateKeys.has(key)
                );

            }) ||
            null
        );

    }

    /* ======================================================================
       PERSISTENCE
    ====================================================================== */

    function readRepository() {

        const raw =
            readRaw(
                STORAGE_KEY
            );

        if (raw === null) {

            return createEmptyRepository();

        }

        let parsed;

        try {

            parsed =
                JSON.parse(raw);

        } catch (error) {

            state.recovered =
                true;

            state.lastError =
                error;

            backupCorruptPayload(
                raw
            );

            const recovered =
                createEmptyRepository();

            writeRepository(
                recovered,
                {
                    skipIntegrity:
                        false
                }
            );

            publishEvent(
                EVENTS.RECOVERED,
                {
                    reason:
                        "malformed_json",
                    recoveredAt:
                        nowISO()
                }
            );

            return recovered;

        }

        const migrated =
            migrateRepository(
                parsed
            );

        const integrity =
            verifyRepositoryIntegrity(
                migrated
            );

        if (!integrity.valid) {

            const repaired =
                repairRepository(
                    migrated
                );

            const repairedIntegrity =
                verifyRepositoryIntegrity(
                    repaired
                );

            if (!repairedIntegrity.valid) {

                throw new Error(
                    `[PAY54_CONTACTS_STORAGE] Repository integrity failure: ${repairedIntegrity.errors.join(" ")}`
                );

            }

            state.recovered =
                true;

            writeRepository(
                repaired
            );

            publishEvent(
                EVENTS.RECOVERED,
                {
                    reason:
                        "integrity_repair",
                    recoveredAt:
                        nowISO()
                }
            );

            return repaired;

        }

        if (
            state.migrationPerformed
        ) {

            writeRepository(
                migrated
            );

        }

        return migrated;

    }

    function writeRepository(
        repository,
        {
            skipIntegrity = false
        } = {}
    ) {

        const working =
            normaliseRepository(
                repository
            );

        working.schemaVersion =
            SCHEMA_VERSION;

        working.metadata =
            {
                ...working.metadata,
                updatedAt:
                    nowISO(),
                recordCount:
                    working.contacts.length
            };

        if (!skipIntegrity) {

            const integrity =
                verifyRepositoryIntegrity(
                    working
                );

            if (!integrity.valid) {

                throw new Error(
                    `[PAY54_CONTACTS_STORAGE] Refusing to persist invalid repository: ${integrity.errors.join(" ")}`
                );

            }

        }

        const serialised =
            JSON.stringify(
                working
            );

        writeRaw(
            STORAGE_KEY,
            serialised
        );

        writeMetadata(
            working
        );

        return working;

    }

    function writeMetadata(
        repository
    ) {

        const metadata = {
            module:
                MODULE_ID,
            moduleVersion:
                VERSION,
            schemaVersion:
                SCHEMA_VERSION,
            recordCount:
                repository.contacts.length,
            updatedAt:
                repository.metadata.updatedAt,
            integrity:
                state.lastIntegrityCheck?.valid ??
                true
        };

        writeRaw(
            METADATA_KEY,
            JSON.stringify(metadata)
        );

    }

    function backupCorruptPayload(
        raw
    ) {

        if (
            typeof raw !== "string" ||
            !raw
        ) {
            return;
        }

        const backupKey =
            `${STORAGE_KEY}_corrupt_${Date.now()}`;

        try {

            writeRaw(
                backupKey,
                raw
            );

        } catch {

            /*
             * Recovery must continue even when backup persistence
             * cannot be completed because of storage quota/security.
             */

        }

    }

    function repairRepository(
        repository
    ) {

        const normalised =
            normaliseRepository(
                repository
            );

        const contacts = [];

        const ids =
            new Set();

        const identityKeys =
            new Set();

        for (
            const contact
            of normalised.contacts
        ) {

            const validation =
                validateContact(
                    contact
                );

            if (!validation.valid) {
                continue;
            }

            if (
                ids.has(contact.id)
            ) {
                continue;
            }

            const keys =
                buildIdentityKeys(
                    contact
                );

            const duplicateIdentity =
                keys.some(key =>
                    identityKeys.has(key)
                );

            if (duplicateIdentity) {
                continue;
            }

            ids.add(contact.id);

            for (
                const key
                of keys
            ) {
                identityKeys.add(key);
            }

            contacts.push(contact);

        }

        return {
            schemaVersion:
                SCHEMA_VERSION,
            contacts,
            metadata: {
                createdAt:
                    normalised.metadata.createdAt ||
                    nowISO(),
                updatedAt:
                    nowISO(),
                recordCount:
                    contacts.length
            }
        };

    }

    /* ======================================================================
       EVENT BUS
    ====================================================================== */

    function publishEvent(
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
                {
                    ...clone(payload),
                    module:
                        MODULE_ID,
                    timestamp:
                        nowISO()
                },
                {
                    source:
                        MODULE_NAME
                }
            );

            return true;

        } catch (error) {

            console.error(
                "[PAY54_CONTACTS_STORAGE] Event publication failed.",
                error
            );

            return false;

        }

    }

    /* ======================================================================
       REPOSITORY CRUD
    ====================================================================== */

    function getAll() {

        const repository =
            readRepository();

        return clone(
            repository.contacts
        );

    }

    function getById(id) {

        const safeId =
            cleanString(
                id,
                160
            );

        if (!safeId) {
            return null;
        }

        const repository =
            readRepository();

        const contact =
            repository.contacts.find(
                item =>
                    item.id === safeId
            );

        return contact
            ? clone(contact)
            : null;

    }

    function create(payload) {

        assertSafePayload(
            payload
        );

        const repository =
            readRepository();

        const contact =
            normaliseContact(
                payload
            );

        const validation =
            validateContact(
                contact
            );

        if (!validation.valid) {

            throw new Error(
                `[PAY54_CONTACTS_STORAGE] Invalid contact: ${validation.errors.join(" ")}`
            );

        }

        const duplicate =
            findDuplicate(
                repository.contacts,
                contact
            );

        if (duplicate) {

            throw new Error(
                `[PAY54_CONTACTS_STORAGE] Contact already exists as "${duplicate.id}".`
            );

        }

        repository.contacts.push(
            contact
        );

        const persisted =
            writeRepository(
                repository
            );

        const created =
            persisted.contacts.find(
                item =>
                    item.id === contact.id
            );

        publishEvent(
            EVENTS.CREATED,
            {
                contact:
                    clone(created)
            }
        );

        return clone(
            created
        );

    }

    function update(
        id,
        changes
    ) {

        const safeId =
            cleanString(
                id,
                160
            );

        if (!safeId) {

            throw new TypeError(
                "[PAY54_CONTACTS_STORAGE] Contact ID is required."
            );

        }

        assertSafePayload(
            changes
        );

        const repository =
            readRepository();

        const index =
            repository.contacts.findIndex(
                contact =>
                    contact.id === safeId
            );

        if (index < 0) {
            return null;
        }

        const existing =
            repository.contacts[index];

        const updated =
            normaliseContact(
                {
                    ...changes,
                    id:
                        existing.id,
                    createdAt:
                        existing.createdAt
                },
                existing
            );

        updated.id =
            existing.id;

        updated.createdAt =
            existing.createdAt;

        const validation =
            validateContact(
                updated
            );

        if (!validation.valid) {

            throw new Error(
                `[PAY54_CONTACTS_STORAGE] Invalid contact update: ${validation.errors.join(" ")}`
            );

        }

        const duplicate =
            findDuplicate(
                repository.contacts,
                updated,
                safeId
            );

        if (duplicate) {

            throw new Error(
                `[PAY54_CONTACTS_STORAGE] Updated contact conflicts with "${duplicate.id}".`
            );

        }

        repository.contacts[index] =
            updated;

        const persisted =
            writeRepository(
                repository
            );

        const result =
            persisted.contacts.find(
                contact =>
                    contact.id === safeId
            );

        publishEvent(
            EVENTS.UPDATED,
            {
                contact:
                    clone(result)
            }
        );

        return clone(
            result
        );

    }

    function remove(id) {

        const safeId =
            cleanString(
                id,
                160
            );

        if (!safeId) {
            return false;
        }

        const repository =
            readRepository();

        const index =
            repository.contacts.findIndex(
                contact =>
                    contact.id === safeId
            );

        if (index < 0) {
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
            EVENTS.DELETED,
            {
                contact:
                    clone(removed)
            }
        );

        return true;

    }

    function clear() {

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
            EVENTS.CLEARED,
            {
                previousCount
            }
        );

        return true;

    }

    /* ======================================================================
       QUERY OPERATIONS
    ====================================================================== */

    function count() {

        return readRepository()
            .contacts
            .length;

    }

    function exists(id) {

        return getById(id) !== null;

    }

    function findByPhone(phone) {

        const target =
            normalisePhone(
                phone
            );

        if (!target) {
            return null;
        }

        const contact =
            readRepository()
                .contacts
                .find(item =>
                    normalisePhone(
                        item.phone
                    ) === target
                );

        return contact
            ? clone(contact)
            : null;

    }

    function findByEmail(email) {

        const target =
            normaliseEmail(
                email
            );

        if (!target) {
            return null;
        }

        const contact =
            readRepository()
                .contacts
                .find(item =>
                    normaliseEmail(
                        item.email
                    ) === target
                );

        return contact
            ? clone(contact)
            : null;

    }

    function findByPay54Id(
        pay54Id
    ) {

        const target =
            normalisePay54Id(
                pay54Id
            );

        if (!target) {
            return null;
        }

        const contact =
            readRepository()
                .contacts
                .find(item =>
                    normalisePay54Id(
                        item.pay54Id
                    ) === target
                );

        return contact
            ? clone(contact)
            : null;

    }

    function search(
        query,
        options = {}
    ) {

        const needle =
            cleanString(
                query,
                256
            )
                .toLocaleLowerCase();

        const limitValue =
            Number(
                options?.limit
            );

        const limit =
            Number.isFinite(
                limitValue
            )
                ? Math.max(
                    1,
                    Math.min(
                        Math.floor(limitValue),
                        500
                    )
                )
                : 100;

        const favouritesOnly =
            options?.favouritesOnly === true ||
            options?.favoritesOnly === true;

        let contacts =
            readRepository()
                .contacts;

        if (favouritesOnly) {

            contacts =
                contacts.filter(
                    contact =>
                        contact.favourite === true
                );

        }

        if (needle) {

            contacts =
                contacts.filter(contact => {

                    const haystack = [
                        contact.displayName,
                        contact.firstName,
                        contact.lastName,
                        contact.phone,
                        contact.email,
                        contact.pay54Id,
                        ...(contact.tags || [])
                    ]
                        .join(" ")
                        .toLocaleLowerCase();

                    return haystack.includes(
                        needle
                    );

                });

        }

        return clone(
            contacts.slice(
                0,
                limit
            )
        );

    }

    function getFavourites() {

        return clone(
            readRepository()
                .contacts
                .filter(
                    contact =>
                        contact.favourite === true
                )
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
                    favourite === true
            }
        );

    }

    /* ======================================================================
       INTEGRITY PUBLIC OPERATIONS
    ====================================================================== */

    function verifyIntegrity() {

        try {

            const repository =
                readRepository();

            return clone(
                verifyRepositoryIntegrity(
                    repository
                )
            );

        } catch (error) {

            state.lastError =
                error;

            return {
                valid: false,
                errors: [
                    error instanceof Error
                        ? error.message
                        : String(error)
                ],
                recordCount: 0,
                checkedAt:
                    nowISO()
            };

        }

    }

    /* ======================================================================
       REPOSITORY HEALTH
    ====================================================================== */

    function health() {

        const storageAvailable =
            verifyStorageAvailability();

        let repositoryIntegrity = {
            valid: false,
            errors: [
                "Repository not checked."
            ],
            recordCount: 0,
            checkedAt:
                nowISO()
        };

        if (storageAvailable) {

            try {

                const repository =
                    readRepository();

                repositoryIntegrity =
                    verifyRepositoryIntegrity(
                        repository
                    );

            } catch (error) {

                state.lastError =
                    error;

                repositoryIntegrity = {
                    valid: false,
                    errors: [
                        error instanceof Error
                            ? error.message
                            : String(error)
                    ],
                    recordCount: 0,
                    checkedAt:
                        nowISO()
                };

            }

        }

        const healthy =
            state.initialized &&
            storageAvailable &&
            state.securityVerified &&
            repositoryIntegrity.valid;

        return deepFreeze({
            healthy,
            status:
                healthy
                    ? "healthy"
                    : "degraded",
            module:
                MODULE_ID,
            version:
                VERSION,
            schemaVersion:
                SCHEMA_VERSION,
            storageKey:
                STORAGE_KEY,
            storageAvailable,
            securityVerified:
                state.securityVerified,
            registryRegistered:
                state.registryRegistered,
            initialized:
                state.initialized,
            migrationPerformed:
                state.migrationPerformed,
            recovered:
                state.recovered,
            recordCount:
                repositoryIntegrity.recordCount,
            integrity:
                clone(
                    repositoryIntegrity
                ),
            initializedAt:
                state.initializedAt,
            lastError:
                state.lastError
                    ? (
                        state.lastError instanceof Error
                            ? state.lastError.message
                            : String(state.lastError)
                    )
                    : null,
            checkedAt:
                nowISO()
        });

    }

    /* ======================================================================
       REGISTRY INTEGRATION
    ====================================================================== */

    function registerWithRegistry(
        publicAPI
    ) {

        const registry =
            GLOBAL.PAY54_REGISTRY ||
            GLOBAL.PAY54_MODULE_REGISTRY ||
            null;

        if (!registry) {

            /*
             * Registry may initialise after this infrastructure module.
             * The global API remains available and bootstrap can register it
             * later without breaking legacy script loading.
             */

            state.registryRegistered =
                false;

            return false;

        }

        const descriptor = {
            id:
                MODULE_ID,
            name:
                MODULE_NAME,
            path:
                MODULE_PATH,
            version:
                VERSION,
            schemaVersion:
                SCHEMA_VERSION,
            type:
                "repository",
            domain:
                "contacts",
            api:
                publicAPI,
            health:
                () => health()
        };

        const methods = [
            "register",
            "registerModule",
            "set"
        ];

        for (
            const method
            of methods
        ) {

            if (
                typeof registry[method] !==
                "function"
            ) {
                continue;
            }

            try {

                if (method === "set") {

                    registry.set(
                        MODULE_ID,
                        publicAPI
                    );

                } else {

                    try {

                        registry[method](
                            MODULE_ID,
                            publicAPI,
                            descriptor
                        );

                    } catch {

                        registry[method](
                            descriptor
                        );

                    }

                }

                state.registryRegistered =
                    true;

                return true;

            } catch (error) {

                state.lastError =
                    error;

            }

        }

        state.registryRegistered =
            false;

        return false;

    }

    /* ======================================================================
       INITIALISATION
    ====================================================================== */

    function initialiseRepository() {

        if (state.initialized) {
            return true;
        }

        verifySecurityBootstrap();

        if (
            !verifyStorageAvailability()
        ) {

            throw new Error(
                "[PAY54_CONTACTS_STORAGE] Persistent browser storage is unavailable."
            );

        }

        const repository =
            readRepository();

        const integrity =
            verifyRepositoryIntegrity(
                repository
            );

        if (!integrity.valid) {

            throw new Error(
                `[PAY54_CONTACTS_STORAGE] Repository failed initial integrity verification: ${integrity.errors.join(" ")}`
            );

        }

        writeRepository(
            repository
        );

        state.initialized =
            true;

        state.initializedAt =
            nowISO();

        state.lastError =
            null;

        return true;

    }

    /* ======================================================================
       PUBLIC REPOSITORY API
    ====================================================================== */

    const repositoryAPI =
        Object.freeze({

            getAll,

            getById,

            create,

            update,

            remove,

            delete:
                remove,

            clear,

            count,

            exists,

            findByPhone,

            findByEmail,

            findByPay54Id,

            search,

            getFavourites,

            getFavorites:
                getFavourites,

            setFavourite,

            setFavorite:
                setFavourite

        });

    /* ======================================================================
       PUBLIC STORAGE API
    ====================================================================== */

    const publicAPI = {

        MODULE_ID,

        MODULE_NAME,

        MODULE_PATH,

        VERSION,

        SCHEMA_VERSION,

        STORAGE_KEY,

        METADATA_KEY,

        EVENTS,

        repository:
            repositoryAPI,

        initialize:
            initialiseRepository,

        initialise:
            initialiseRepository,

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

        health,

        getHealth:
            health,

        migrate() {

            const repository =
                readRepository();

            const migrated =
                migrateRepository(
                    repository
                );

            const persisted =
                writeRepository(
                    migrated
                );

            return clone(
                persisted
            );

        },

        getMetadata() {

            const raw =
                readRaw(
                    METADATA_KEY
                );

            return clone(
                parseJSON(
                    raw,
                    {}
                )
            );

        },

        register() {

            return registerWithRegistry(
                publicAPI
            );

        }

    };

    /* ======================================================================
       BOOTSTRAP
    ====================================================================== */

    try {

        initialiseRepository();

        GLOBAL.PAY54_CONTACTS_STORAGE =
            Object.freeze(
                publicAPI
            );

        /*
         * Domain namespace support allows later contacts modules to use
         * PAY54_CONTACTS.STORAGE without removing the canonical legacy-safe
         * PAY54_CONTACTS_STORAGE global.
         */

        const contactsNamespace =
            (
                GLOBAL.PAY54_CONTACTS &&
                typeof GLOBAL.PAY54_CONTACTS === "object"
            )
                ? GLOBAL.PAY54_CONTACTS
                : {};

        if (
            !Object.isFrozen(
                contactsNamespace
            )
        ) {

            contactsNamespace.STORAGE =
                GLOBAL.PAY54_CONTACTS_STORAGE;

            contactsNamespace.storage =
                GLOBAL.PAY54_CONTACTS_STORAGE;

            GLOBAL.PAY54_CONTACTS =
                contactsNamespace;

        }

        registerWithRegistry(
            GLOBAL.PAY54_CONTACTS_STORAGE
        );

        publishEvent(
            EVENTS.READY,
            {
                version:
                    VERSION,
                schemaVersion:
                    SCHEMA_VERSION,
                storageKey:
                    STORAGE_KEY,
                recordCount:
                    count(),
                securityVerified:
                    state.securityVerified,
                registryRegistered:
                    state.registryRegistered,
                readyAt:
                    nowISO()
            }
        );

    } catch (error) {

        state.lastError =
            error;

        publishEvent(
            EVENTS.ERROR,
            {
                operation:
                    "bootstrap",
                message:
                    error instanceof Error
                        ? error.message
                        : String(error)
            }
        );

        console.error(
            "[PAY54_CONTACTS_STORAGE] Bootstrap failed.",
            error
        );

        throw error;

    }

})();
