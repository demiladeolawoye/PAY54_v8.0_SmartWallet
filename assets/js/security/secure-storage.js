"use strict";

/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File: assets/js/security/secure-storage.js
   Version: v12.0.0
   Module: Titan Secure Storage
   Status: Production Candidate
   ------------------------------------------------------------------------
   Purpose
   -------
   Safe synchronous browser-storage abstraction for non-secret PAY54 state.

   Security model
   --------------
   • Browser localStorage is NOT a secure secret vault.
   • This module does NOT claim client-side encryption-at-rest.
   • It provides namespace isolation, strict key handling, TTL, schema
     metadata, corruption detection, controlled maintenance operations,
     diagnostics and platform lifecycle integration.
   • Production secrets, refresh tokens, private keys and equivalent
     credentials must be held server-side and/or in appropriately configured
     secure HttpOnly cookies, not JavaScript-readable localStorage.

   Compatibility
   -------------
   Preserves the synchronous API required by the current Session Manager and
   Transaction Guard while removing the previous misleading crypto-provider
   surface.
======================================================================== */

(() => {

    "use strict";

    /* ====================================================================
       IDENTITY
    ==================================================================== */

    const GLOBAL =
        window;

    const MODULE_ID =
        "security.secure-storage";

    const MODULE_NAME =
        "PAY54 Titan Secure Storage";

    const FILE_PATH =
        "assets/js/security/secure-storage.js";

    const VERSION =
        "12.0.0";

    const STORAGE_SCHEMA =
        "PAY54-STORAGE-V12";

    const STARTED_AT =
        new Date()
            .toISOString();

    const STORAGE_NAMESPACE =
        "PAY54";

    const META_SUFFIX =
        "__meta__";

    const DEFAULT_TTL =
        null;

    const INTEGRITY_ALGORITHM =
        "FNV1A-32";

    /* ====================================================================
       EVENTS
    ==================================================================== */

    const EVENTS =
        Object.freeze({

            SAVED:
                "security.storage.saved",

            LOADED:
                "security.storage.loaded",

            REMOVED:
                "security.storage.removed",

            EXPIRED:
                "security.storage.expired",

            CORRUPTED:
                "security.storage.corrupted",

            RESTORED:
                "security.storage.restored",

            READY:
                "security.storage.ready",

            WARNING:
                "security.storage.warning",

            IMPORTED:
                "security.storage.imported",

            CLEARED:
                "security.storage.cleared"
        });

    /* ====================================================================
       SAFETY CONSTANTS
    ==================================================================== */

    const UNSAFE_OBJECT_KEYS =
        new Set([
            "__proto__",
            "prototype",
            "constructor"
        ]);

    const RESERVED_KEY_PATTERN =
        /[:\u0000-\u001f\u007f]/;

    /*
     * JavaScript-readable browser persistence must never become the
     * production home for credentials or equivalent secrets.
     */
    const PRODUCTION_SECRET_KEY_PATTERN =
        /(?:^|[_\-.])(refresh[_\-.]?token|access[_\-.]?token|id[_\-.]?token|private[_\-.]?key|api[_\-.]?secret|client[_\-.]?secret|password|passwd|cvv|pin|otp|secret)(?:$|[_\-.])/i;

    /* ====================================================================
       CORE DEPENDENCIES
    ==================================================================== */

    const registry =
        GLOBAL.PAY54_REGISTRY ||
        null;

    const config =
        GLOBAL.PAY54_CONFIG ||
        null;

    if (
        !registry ||
        typeof registry.registerModule !==
            "function"
    ) {

        throw new Error(
            "[PAY54_SECURE_STORAGE] Platform Registry must load before Secure Storage."
        );
    }

    if (
        !config ||
        typeof config.get !==
            "function" ||
        typeof config.isProduction !==
            "function"
    ) {

        throw new Error(
            "[PAY54_SECURE_STORAGE] Runtime Config must load before Secure Storage."
        );
    }

    /* ====================================================================
       SAFE RELOAD GUARD
    ==================================================================== */

    const existingSecurity =
        GLOBAL.PAY54_SECURITY;

    const existingStorage =
        existingSecurity?.storage ||
        null;

    if (
        existingStorage
    ) {

        if (
            existingStorage.id ===
                MODULE_ID &&
            existingStorage.version ===
                VERSION &&
            typeof existingStorage.get ===
                "function" &&
            typeof existingStorage.set ===
                "function" &&
            typeof existingStorage.health ===
                "function"
        ) {

            console.info(
                "[PAY54_SECURE_STORAGE] Existing Titan Secure Storage preserved."
            );

            return;
        }

        throw new Error(
            "[PAY54_SECURE_STORAGE] PAY54_SECURITY.storage already exists with an incompatible contract."
        );
    }

    /* ====================================================================
       PRIVATE STATE
    ==================================================================== */

    const state = {

        available:
            false,

        ready:
            false,

        writes:
            0,

        reads:
            0,

        removals:
            0,

        expiries:
            0,

        corruptions:
            0,

        legacyEnvelopeReads:
            0,

        lastError:
            null,

        readyAt:
            null
    };

    /* ====================================================================
       HELPERS
    ==================================================================== */

    function nowISO() {

        return new Date()
            .toISOString();
    }


    function isPlainObject(
        value
    ) {

        if (
            value === null ||
            typeof value !==
                "object"
        ) {

            return false;
        }

        const prototype =
            Object.getPrototypeOf(
                value
            );

        return (
            prototype ===
                Object.prototype ||
            prototype ===
                null
        );
    }


    function assertSafeObjectGraph(
        value,
        path = "value",
        seen = new WeakSet()
    ) {

        if (
            value === null ||
            typeof value !==
                "object"
        ) {

            return;
        }

        if (
            seen.has(
                value
            )
        ) {

            throw new TypeError(
                `[PAY54_SECURE_STORAGE] Circular structure rejected at ${path}.`
            );
        }

        seen.add(
            value
        );

        if (
            Array.isArray(
                value
            )
        ) {

            value.forEach(
                (
                    item,
                    index
                ) => {

                    assertSafeObjectGraph(
                        item,
                        `${path}[${index}]`,
                        seen
                    );
                }
            );

            seen.delete(
                value
            );

            return;
        }

        for (
            const key
            of Object.keys(
                value
            )
        ) {

            if (
                UNSAFE_OBJECT_KEYS.has(
                    key
                )
            ) {

                throw new Error(
                    `[PAY54_SECURE_STORAGE] Unsafe object key rejected at ${path}.${key}.`
                );
            }

            assertSafeObjectGraph(
                value[key],
                `${path}.${key}`,
                seen
            );
        }

        seen.delete(
            value
        );
    }


    function cloneSerializable(
        value
    ) {

        if (
            value ===
                undefined
        ) {

            throw new TypeError(
                "[PAY54_SECURE_STORAGE] undefined cannot be persisted."
            );
        }

        assertSafeObjectGraph(
            value
        );

        let serialized;

        try {

            serialized =
                JSON.stringify(
                    value
                );

        } catch (
            error
        ) {

            throw new TypeError(
                `[PAY54_SECURE_STORAGE] Value is not JSON serializable: ${error.message}`
            );
        }

        if (
            serialized ===
                undefined
        ) {

            throw new TypeError(
                "[PAY54_SECURE_STORAGE] Value is not JSON serializable."
            );
        }

        const clone =
            JSON.parse(
                serialized
            );

        assertSafeObjectGraph(
            clone
        );

        return clone;
    }


    function normaliseKey(
        value
    ) {

        const key =
            String(
                value ??
                ""
            ).trim();

        if (
            !key
        ) {

            throw new TypeError(
                "[PAY54_SECURE_STORAGE] Storage key is required."
            );
        }

        if (
            key.length > 160 ||
            RESERVED_KEY_PATTERN.test(
                key
            )
        ) {

            throw new TypeError(
                `[PAY54_SECURE_STORAGE] Invalid storage key: ${key}`
            );
        }

        return key;
    }


    function storageKey(
        key
    ) {

        return (
            `${STORAGE_NAMESPACE}:${normaliseKey(key)}`
        );
    }


    function metadataKey(
        key
    ) {

        return (
            `${storageKey(key)}:${META_SUFFIX}`
        );
    }


    function logicalKeyFromPhysicalKey(
        key
    ) {

        const prefix =
            `${STORAGE_NAMESPACE}:`;

        if (
            !key ||
            !key.startsWith(
                prefix
            )
        ) {

            return null;
        }

        const logical =
            key.slice(
                prefix.length
            );

        if (
            !logical ||
            logical.endsWith(
                `:${META_SUFFIX}`
            )
        ) {

            return null;
        }

        return logical;
    }


    function safeParse(
        raw,
        fallback = null
    ) {

        if (
            raw === null ||
            raw === "" ||
            raw === "null" ||
            raw === "undefined"
        ) {

            return fallback;
        }

        try {

            const parsed =
                JSON.parse(
                    raw
                );

            assertSafeObjectGraph(
                parsed
            );

            return parsed;

        } catch {

            return fallback;
        }
    }


    function isProduction() {

        try {

            return (
                config.isProduction() ===
                true
            );

        } catch {

            return false;
        }
    }


    function publish(
        eventName,
        payload = {}
    ) {

        try {

            const events =
                GLOBAL.PAY54_EVENTS;

            if (
                !events ||
                typeof events.publish !==
                    "function"
            ) {

                return false;
            }

            events.publish(

                eventName,

                Object.freeze({

                    moduleId:
                        MODULE_ID,

                    occurredAt:
                        nowISO(),

                    ...payload
                }),

                {

                    source:
                        MODULE_ID
                }
            );

            return true;

        } catch (
            error
        ) {

            console.warn(
                "[PAY54_SECURE_STORAGE] Event publication failed.",
                error
            );

            return false;
        }
    }


    function rememberError(
        error
    ) {

        state.lastError =
            Object.freeze({

                name:
                    error?.name ||
                    "Error",

                message:
                    error?.message ||
                    String(
                        error
                    ),

                timestamp:
                    nowISO()
            });
    }


    function assertStorageAvailable() {

        if (
            !state.available
        ) {

            throw new Error(
                "[PAY54_SECURE_STORAGE] localStorage is unavailable."
            );
        }
    }


    function probeStorageAvailability() {

        const probeKey =
            `${STORAGE_NAMESPACE}:__storage_probe__`;

        try {

            localStorage.setItem(
                probeKey,
                "1"
            );

            const ok =
                localStorage.getItem(
                    probeKey
                ) ===
                "1";

            localStorage.removeItem(
                probeKey
            );

            state.available =
                ok;

            return ok;

        } catch (
            error
        ) {

            state.available =
                false;

            rememberError(
                error
            );

            return false;
        }
    }


    function validateTTL(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return null;
        }

        const ttl =
            Number(
                value
            );

        if (
            !Number.isFinite(
                ttl
            ) ||
            ttl <= 0
        ) {

            throw new TypeError(
                "[PAY54_SECURE_STORAGE] ttl must be null or a positive finite number of milliseconds."
            );
        }

        return ttl;
    }


    function assertProductionPersistencePolicy(
        key
    ) {

        if (
            !isProduction()
        ) {

            return;
        }

        if (
            PRODUCTION_SECRET_KEY_PATTERN.test(
                key
            )
        ) {

            throw new Error(
                `[PAY54_SECURE_STORAGE] Refusing to persist secret-like key "${key}" in production browser storage.`
            );
        }
    }

    /* ====================================================================
       INTEGRITY / CORRUPTION DETECTION

       This is intentionally not described as cryptographic tamper
       protection.

       It detects accidental corruption and malformed records.
    ==================================================================== */

    function fnv1a32(
        raw
    ) {

        let hash =
            0x811c9dc5;

        for (
            let index = 0;
            index < raw.length;
            index += 1
        ) {

            hash ^=
                raw.charCodeAt(
                    index
                );

            hash =
                Math.imul(
                    hash,
                    0x01000193
                );
        }

        return (
            (hash >>> 0)
                .toString(
                    16
                )
                .padStart(
                    8,
                    "0"
                )
        );
    }


    function legacyChecksum(
        value
    ) {

        try {

            const json =
                JSON.stringify(
                    value
                );

            let hash =
                0;

            for (
                let index = 0;
                index < json.length;
                index += 1
            ) {

                hash =
                    (
                        (
                            hash << 5
                        )
                        -
                        hash
                        +
                        json.charCodeAt(
                            index
                        )
                    )
                    |
                    0;
            }

            return hash.toString(
                16
            );

        } catch {

            return null;
        }
    }


    function checksumForRaw(
        raw
    ) {

        return fnv1a32(
            raw
        );
    }


    function verifyStoredIntegrity(
        raw,
        parsedData,
        metadata
    ) {

        if (
            !metadata ||
            typeof metadata !==
                "object"
        ) {

            return false;
        }

        if (
            typeof metadata.checksum !==
                "string" ||
            !metadata.checksum
        ) {

            return false;
        }

        if (
            metadata.integrityAlgorithm ===
                INTEGRITY_ALGORITHM
        ) {

            return (
                checksumForRaw(
                    raw
                ) ===
                metadata.checksum
            );
        }

        /*
         * Compatibility with v11 rolling checksum.
         * v11 metadata did not identify the algorithm explicitly.
         */
        return (
            legacyChecksum(
                parsedData
            ) ===
            metadata.checksum
        );
    }

    /* ====================================================================
       METADATA
    ==================================================================== */

    function createMetadata(
        key,
        ttl,
        existing = null
    ) {

        const timestamp =
            Date.now();

        return {

            key,

            schema:
                STORAGE_SCHEMA,

            version:
                VERSION,

            namespace:
                STORAGE_NAMESPACE,

            created:

                Number.isFinite(
                    existing?.created
                )

                    ? existing.created

                    : timestamp,

            updated:
                timestamp,

            expires:

                ttl === null

                    ? null

                    : timestamp +
                      ttl,

            integrityType:
                "corruption-detection",

            integrityAlgorithm:
                INTEGRITY_ALGORITHM,

            checksum:
                null,

            confidentiality:
                "none"
        };
    }


    function getMetadata(
        key
    ) {

        assertStorageAvailable();

        const logicalKey =
            normaliseKey(
                key
            );

        const raw =
            localStorage.getItem(
                metadataKey(
                    logicalKey
                )
            );

        const metadata =
            safeParse(
                raw,
                null
            );

        return (
            metadata

                ? cloneSerializable(
                    metadata
                )

                : null
        );
    }


    function saveMetadata(
        key,
        metadata
    ) {

        localStorage.setItem(

            metadataKey(
                key
            ),

            JSON.stringify(
                metadata
            )
        );
    }


    function isExpired(
        metadata
    ) {

        if (
            !metadata ||
            metadata.expires ===
                null ||
            metadata.expires ===
                undefined
        ) {

            return false;
        }

        return (
            Number(
                metadata.expires
            ) <=
            Date.now()
        );
    }

    /* ====================================================================
       LEGACY ENVELOPE COMPATIBILITY

       v11 labelled plaintext payloads as PAY54-V1/AES-GCM without actually
       encrypting them.

       We safely unwrap those legacy envelopes on read only.

       No automatic persistence rewrite is performed here.
    ==================================================================== */

    function unwrapLegacyEnvelope(
        value
    ) {

        if (
            isPlainObject(
                value
            ) &&
            Object.prototype
                .hasOwnProperty.call(
                    value,
                    "payload"
                ) &&
            (
                value.algorithm ===
                    "PAY54-V1" ||
                value.algorithm ===
                    "AES-GCM"
            )
        ) {

            state.legacyEnvelopeReads +=
                1;

            return value.payload;
        }

        return value;
    }

    /* ====================================================================
       RAW MAINTENANCE
    ==================================================================== */

    function exists(
        key
    ) {

        assertStorageAvailable();

        return (
            localStorage.getItem(
                storageKey(
                    key
                )
            ) !==
            null
        );
    }


    function removeRaw(
        key
    ) {

        const logicalKey =
            normaliseKey(
                key
            );

        localStorage.removeItem(
            storageKey(
                logicalKey
            )
        );

        localStorage.removeItem(
            metadataKey(
                logicalKey
            )
        );
    }


    function markCorrupted(
        key,
        reason
    ) {

        state.corruptions +=
            1;

        removeRaw(
            key
        );

        publish(

            EVENTS.CORRUPTED,

            {

                key,

                reason
            }
        );
    }

    /* ====================================================================
       WRITE
    ==================================================================== */

    function set(
        key,
        value,
        options = {}
    ) {

        assertStorageAvailable();

        const logicalKey =
            normaliseKey(
                key
            );

        assertProductionPersistencePolicy(
            logicalKey
        );

        if (
            !isPlainObject(
                options
            )
        ) {

            throw new TypeError(
                "[PAY54_SECURE_STORAGE] options must be a plain object."
            );
        }

        const ttl =
            validateTTL(
                options.ttl ??
                DEFAULT_TTL
            );

        const safeValue =
            cloneSerializable(
                value
            );

        const raw =
            JSON.stringify(
                safeValue
            );

        const previousMetadata =
            getMetadata(
                logicalKey
            );

        const metadata =
            createMetadata(
                logicalKey,
                ttl,
                previousMetadata
            );

        metadata.checksum =
            checksumForRaw(
                raw
            );

        /*
         * Metadata is written first and data second.
         *
         * If the second write fails, the subsequent read fails closed
         * through integrity validation.
         */
        try {

            saveMetadata(
                logicalKey,
                metadata
            );

            localStorage.setItem(
                storageKey(
                    logicalKey
                ),
                raw
            );

        } catch (
            error
        ) {

            rememberError(
                error
            );

            removeRaw(
                logicalKey
            );

            throw error;
        }

        state.writes +=
            1;

        publish(

            EVENTS.SAVED,

            {

                key:
                    logicalKey,

                namespace:
                    STORAGE_NAMESPACE,

                updatedAt:
                    nowISO()
            }
        );

        return cloneSerializable(
            safeValue
        );
    }

    /* ====================================================================
       READ
    ==================================================================== */

    function get(
        key,
        fallback = null
    ) {

        assertStorageAvailable();

        const logicalKey =
            normaliseKey(
                key
            );

        const physicalKey =
            storageKey(
                logicalKey
            );

        const raw =
            localStorage.getItem(
                physicalKey
            );

        if (
            raw === null
        ) {

            return fallback;
        }

        const metadata =
            getMetadata(
                logicalKey
            );

        if (
            !metadata
        ) {

            markCorrupted(
                logicalKey,
                "Metadata missing"
            );

            return fallback;
        }

        const parsed =
            safeParse(
                raw,
                undefined
            );

        if (
            parsed ===
                undefined
        ) {

            markCorrupted(
                logicalKey,
                "Stored JSON is invalid"
            );

            return fallback;
        }

        if (
            !verifyStoredIntegrity(
                raw,
                parsed,
                metadata
            )
        ) {

            markCorrupted(
                logicalKey,
                "Integrity checksum mismatch"
            );

            return fallback;
        }

        if (
            isExpired(
                metadata
            )
        ) {

            removeRaw(
                logicalKey
            );

            state.expiries +=
                1;

            publish(

                EVENTS.EXPIRED,

                {

                    key:
                        logicalKey
                }
            );

            return fallback;
        }

        const unwrapped =
            unwrapLegacyEnvelope(
                parsed
            );

        const result =
            cloneSerializable(
                unwrapped
            );

        state.reads +=
            1;

        publish(

            EVENTS.LOADED,

            {

                key:
                    logicalKey,

                loadedAt:
                    nowISO()
            }
        );

        return result;
    }

    /* ====================================================================
       REMOVE
    ==================================================================== */

    function remove(
        key
    ) {

        assertStorageAvailable();

        const logicalKey =
            normaliseKey(
                key
            );

        if (
            !exists(
                logicalKey
            )
        ) {

            return false;
        }

        removeRaw(
            logicalKey
        );

        state.removals +=
            1;

        publish(

            EVENTS.REMOVED,

            {

                key:
                    logicalKey,

                removedAt:
                    nowISO()
            }
        );

        return true;
    }

    /* ====================================================================
       RESTORE
    ==================================================================== */

    function restore(
        key,
        value,
        options = {}
    ) {

        const restored =
            set(
                key,
                value,
                options
            );

        publish(

            EVENTS.RESTORED,

            {

                key:
                    normaliseKey(
                        key
                    ),

                restoredAt:
                    nowISO()
            }
        );

        return restored;
    }

    /* ====================================================================
       EXPIRY MAINTENANCE
    ==================================================================== */

    function purgeExpired() {

        assertStorageAvailable();

        const prefix =
            `${STORAGE_NAMESPACE}:`;

        const candidates =
            [];

        for (
            let index = 0;
            index < localStorage.length;
            index += 1
        ) {

            const physicalKey =
                localStorage.key(
                    index
                );

            const logicalKey =
                logicalKeyFromPhysicalKey(
                    physicalKey
                );

            if (
                physicalKey &&
                physicalKey.startsWith(
                    prefix
                ) &&
                logicalKey
            ) {

                candidates.push(
                    logicalKey
                );
            }
        }

        let removed =
            0;

        for (
            const logicalKey
            of candidates
        ) {

            const metadata =
                getMetadata(
                    logicalKey
                );

            if (
                metadata &&
                isExpired(
                    metadata
                )
            ) {

                removeRaw(
                    logicalKey
                );

                removed +=
                    1;

                state.expiries +=
                    1;
            }
        }

        if (
            removed > 0
        ) {

            publish(

                EVENTS.EXPIRED,

                {

                    removed
                }
            );
        }

        return removed;
    }

    /* ====================================================================
       CONTROLLED NAMESPACE MAINTENANCE
    ==================================================================== */

    function assertDevelopmentMaintenanceAllowed(
        operation
    ) {

        if (
            isProduction()
        ) {

            throw new Error(
                `[PAY54_SECURE_STORAGE] ${operation} is disabled in production browser runtime.`
            );
        }
    }


    function clearNamespace() {

        assertStorageAvailable();

        assertDevelopmentMaintenanceAllowed(
            "Namespace clearing"
        );

        const prefix =
            `${STORAGE_NAMESPACE}:`;

        const keys =
            [];

        for (
            let index = 0;
            index < localStorage.length;
            index += 1
        ) {

            const key =
                localStorage.key(
                    index
                );

            if (
                key &&
                key.startsWith(
                    prefix
                )
            ) {

                keys.push(
                    key
                );
            }
        }

        keys.forEach(
            key => {

                localStorage.removeItem(
                    key
                );
            }
        );

        publish(

            EVENTS.CLEARED,

            {

                namespace:
                    STORAGE_NAMESPACE,

                removedKeyCount:
                    keys.length
            }
        );

        return keys.length;
    }


    function exportNamespace() {

        assertStorageAvailable();

        assertDevelopmentMaintenanceAllowed(
            "Namespace export"
        );

        const prefix =
            `${STORAGE_NAMESPACE}:`;

        const exported =
            {};

        for (
            let index = 0;
            index < localStorage.length;
            index += 1
        ) {

            const key =
                localStorage.key(
                    index
                );

            if (
                key &&
                key.startsWith(
                    prefix
                )
            ) {

                exported[key] =
                    localStorage.getItem(
                        key
                    );
            }
        }

        return Object.freeze({
            ...exported
        });
    }


    function importNamespace(
        payload = {}
    ) {

        assertStorageAvailable();

        assertDevelopmentMaintenanceAllowed(
            "Namespace import"
        );

        if (
            !isPlainObject(
                payload
            )
        ) {

            throw new TypeError(
                "[PAY54_SECURE_STORAGE] Import payload must be a plain object."
            );
        }

        const prefix =
            `${STORAGE_NAMESPACE}:`;

        const approvedEntries =
            [];

        for (
            const [
                key,
                value
            ]
            of Object.entries(
                payload
            )
        ) {

            if (
                !key.startsWith(
                    prefix
                )
            ) {

                continue;
            }

            if (
                typeof value !==
                    "string"
            ) {

                throw new TypeError(
                    `[PAY54_SECURE_STORAGE] Imported value for ${key} must be a string.`
                );
            }

            approvedEntries.push([
                key,
                value
            ]);
        }

        /*
         * Validate the complete payload before writing anything.
         */
        for (
            const [
                key,
                value
            ]
            of approvedEntries
        ) {

            if (
                key.endsWith(
                    `:${META_SUFFIX}`
                )
            ) {

                if (
                    safeParse(
                        value,
                        undefined
                    ) === undefined
                ) {

                    throw new Error(
                        `[PAY54_SECURE_STORAGE] Invalid metadata JSON for ${key}.`
                    );
                }

            } else if (
                safeParse(
                    value,
                    undefined
                ) === undefined
            ) {

                throw new Error(
                    `[PAY54_SECURE_STORAGE] Invalid record JSON for ${key}.`
                );
            }
        }

        approvedEntries.forEach(
            ([
                key,
                value
            ]) => {

                localStorage.setItem(
                    key,
                    value
                );
            }
        );

        publish(

            EVENTS.IMPORTED,

            {

                importedKeyCount:
                    approvedEntries.length
            }
        );

        return approvedEntries.length;
    }

    /* ====================================================================
       DIAGNOSTICS
    ==================================================================== */

    function countNamespaceRecords() {

        if (
            !state.available
        ) {

            return 0;
        }

        let count =
            0;

        for (
            let index = 0;
            index < localStorage.length;
            index += 1
        ) {

            const key =
                localStorage.key(
                    index
                );

            if (
                logicalKeyFromPhysicalKey(
                    key
                )
            ) {

                count +=
                    1;
            }
        }

        return count;
    }


    function verifyIntegrity() {

        const errors =
            [];

        if (
            !state.available
        ) {

            errors.push(
                "localStorage is unavailable."
            );
        }

        if (
            !GLOBAL.PAY54_REGISTRY
        ) {

            errors.push(
                "Platform Registry is unavailable."
            );
        }

        if (
            !GLOBAL.PAY54_CONFIG
        ) {

            errors.push(
                "Runtime Config is unavailable."
            );
        }

        return Object.freeze({

            ok:
                errors.length ===
                0,

            status:

                errors.length ===
                    0

                    ? "HEALTHY"

                    : "DEGRADED",

            errors:
                Object.freeze(
                    errors
                ),

            checkedAt:
                nowISO()
        });
    }


    function getSecureStorageHealth() {

        const integrity =
            verifyIntegrity();

        return Object.freeze({

            ok:
                integrity.ok,

            healthy:
                integrity.ok,

            status:
                integrity.status,

            id:
                MODULE_ID,

            name:
                MODULE_NAME,

            version:
                VERSION,

            schema:
                STORAGE_SCHEMA,

            file:
                FILE_PATH,

            namespace:
                STORAGE_NAMESPACE,

            startedAt:
                STARTED_AT,

            ready:
                state.ready,

            readyAt:
                state.readyAt,

            storageAvailable:
                state.available,

            environment:
                config.get(
                    "environment.name",
                    null
                ),

            production:
                isProduction(),

            /*
             * Explicit truth:
             * no client-side confidentiality guarantee is claimed.
             */
            encryptionAtRest:
                false,

            confidentiality:
                "NOT_PROVIDED_BY_BROWSER_STORAGE",

            corruptionDetection:
                true,

            integrityAlgorithm:
                INTEGRITY_ALGORITHM,

            ttlSupported:
                true,

            recordCount:
                countNamespaceRecords(),

            writes:
                state.writes,

            reads:
                state.reads,

            removals:
                state.removals,

            expiries:
                state.expiries,

            corruptions:
                state.corruptions,

            legacyEnvelopeReads:
                state.legacyEnvelopeReads,

            lastError:
                state.lastError,

            integrity
        });
    }


    function selfTest() {

        const integrity =
            verifyIntegrity();

        return Object.freeze({

            ok:
                integrity.ok,

            version:
                VERSION,

            schema:
                STORAGE_SCHEMA,

            namespace:
                STORAGE_NAMESPACE,

            storageAvailable:
                state.available,

            encryptionAtRest:
                false,

            corruptionDetection:
                true,

            ttlSupported:
                true,

            productionMaintenanceRestricted:
                true,

            timestamp:
                nowISO()
        });
    }


    function health() {

        return getSecureStorageHealth();
    }

    /* ====================================================================
       PUBLIC API
    ==================================================================== */

    const storage =
        Object.freeze({

            id:
                MODULE_ID,

            name:
                MODULE_NAME,

            version:
                VERSION,

            file:
                FILE_PATH,

            set,

            get,

            remove,

            exists,

            restore,

            clearNamespace,

            purgeExpired,

            export:
                exportNamespace,

            import:
                importNamespace,

            getMetadata,

            getSecureStorageHealth,

            verifyIntegrity,

            selfTest,

            health
        });

    /* ====================================================================
       STARTUP STORAGE PROBE

       Complete this before exposing the module.
    ==================================================================== */

    if (
        !probeStorageAvailability()
    ) {

        throw new Error(
            "[PAY54_SECURE_STORAGE] localStorage availability probe failed."
        );
    }

    try {

        purgeExpired();

    } catch (
        error
    ) {

        rememberError(
            error
        );

        throw error;
    }

    /* ====================================================================
       PAY54 SECURITY ROOT
    ==================================================================== */

    if (
        !GLOBAL.PAY54_SECURITY
    ) {

        Object.defineProperty(

            GLOBAL,

            "PAY54_SECURITY",

            {

                value:
                    {},

                writable:
                    false,

                configurable:
                    false,

                enumerable:
                    true
            }
        );
    }

    if (
        !GLOBAL.PAY54_SECURITY ||
        typeof GLOBAL.PAY54_SECURITY !==
            "object"
    ) {

        throw new Error(
            "[PAY54_SECURE_STORAGE] PAY54_SECURITY root is incompatible."
        );
    }

    Object.defineProperty(

        GLOBAL.PAY54_SECURITY,

        "storage",

        {

            value:
                storage,

            writable:
                false,

            configurable:
                false,

            enumerable:
                true
        }
    );

    /* ====================================================================
       REGISTRY INTEGRATION
    ==================================================================== */

    registry.registerModule(

        MODULE_ID,

        Object.freeze({

            id:
                MODULE_ID,

            name:
                MODULE_NAME,

            version:
                VERSION,

            type:
                "security",

            layer:
                "layer.security",

            path:
                FILE_PATH,

            api:
                storage,

            health
        })
    );

    /* ====================================================================
       READY
    ==================================================================== */

    state.ready =
        true;

    state.readyAt =
        nowISO();

    publish(

        EVENTS.READY,

        {

            version:
                VERSION,

            schema:
                STORAGE_SCHEMA,

            namespace:
                STORAGE_NAMESPACE,

            encryptionAtRest:
                false,

            readyAt:
                state.readyAt
        }
    );

    console.info(
        `[PAY54_SECURE_STORAGE] ${MODULE_NAME} v${VERSION} ready — browser encryption-at-rest intentionally disabled.`
    );

})();
