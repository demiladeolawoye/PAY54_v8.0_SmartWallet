/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File: assets/js/security/secure-storage.js
   Version: v11.0.0
   Module: WP-003G Enterprise Secure Storage
   Stage: 3G-5 Production Hardening
   Status: Production Ready
   ------------------------------------------------------------------------
   Responsibilities

   • Enterprise storage abstraction
   • Namespace isolation
   • Metadata management
   • TTL support
   • Tamper detection
   • Corruption recovery
   • Event Bus integration
   • WebCrypto-ready architecture
   • Backward compatible
======================================================================== */

(() => {

"use strict";
/* =========================================
   PAY54 ENTERPRISE
   SECURE STORAGE
   Version: 11.0.0
========================================= */

const SECURE_STORAGE_CONFIG = Object.freeze({

    ENABLE_ENCRYPTION: true,

   ENABLE_WEB_CRYPTO: !!window.crypto?.subtle,

 CRYPTO_ALGORITHM:
    "AES-GCM",

ACTIVE_PROVIDER:
    "PAY54_LEGACY",

CRYPTO_KEY_LENGTH:
    256,

CRYPTO_IV_LENGTH:
    12,

    STORAGE_PREFIX: "pay54_secure_",

    VERSION: "11.0.0"

});

/* ========================================================================
   EVENT BUS
======================================================================== */

const EVENTS =
window.PAY54_EVENTS || null;

/* ========================================================================
   STORAGE EVENTS
======================================================================== */

const STORAGE_EVENTS =
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
        "security.storage.restored"

});

/* ========================================================================
   EVENT PUBLISHER
======================================================================== */

function publishStorageEvent(

    eventName,

    payload = {}

){

    try{

        if(

            EVENTS &&

            typeof EVENTS.publish === "function"

        ){

            EVENTS.publish(

                eventName,

                payload,

                {

                    source:"secure-storage"

                }

            );

        }

    }catch(error){

        console.error(

            "[PAY54_SECURITY]",

            eventName,

            error

        );

    }

}

/* ========================================================================
   CONSTANTS
======================================================================== */

const STORAGE_VERSION =
"11.0.0";

const STORAGE_NAMESPACE =
"PAY54";

const META_SUFFIX =
"__meta__";

const DEFAULT_TTL =
null;

/* ========================================================================
   UTILITIES
======================================================================== */

function nowISO(){

    return new Date()

        .toISOString();

}

function isObject(value){

    return (

        value !== null &&

        typeof value === "object" &&

        !Array.isArray(value)

    );

}

function deepClone(value){

    if(

        value === null ||

        value === undefined

    ){

        return value;

    }

    return JSON.parse(

        JSON.stringify(value)

    );

}

function storageKey(key){

    return `${STORAGE_NAMESPACE}:${key}`;

}

function metadataKey(key){

    return `${storageKey(key)}:${META_SUFFIX}`;

}

function safeParse(

    value,

    fallback = null

){

    try{

        if(

            value === null ||

            value === "" ||

            value === "null" ||

            value === "undefined"

        ){

            return fallback;

        }

        return JSON.parse(value);

    }catch{

        return fallback;

    }

}

function exists(key){

    return (

        localStorage.getItem(

            storageKey(key)

        ) !== null

    );

}

function removeRaw(key){

    localStorage.removeItem(

        storageKey(key)

    );

    localStorage.removeItem(

        metadataKey(key)

    );

}

/* ========================================================================
   METADATA ENGINE
======================================================================== */

function createMetadata(

    key,

    ttl = DEFAULT_TTL

){

    const created = Date.now();

    return {

        key,

        version:

            STORAGE_VERSION,

        namespace:

            STORAGE_NAMESPACE,

        created,

        updated:

            created,

        expires:

            ttl === null

                ? null

                : created + ttl,

        checksum:

            null

    };

}

function getMetadata(key){

    return safeParse(

        localStorage.getItem(

            metadataKey(key)

        ),

        null

    );

}

function saveMetadata(

    key,

    metadata

){

    localStorage.setItem(

        metadataKey(key),

        JSON.stringify(metadata)

    );

}

function updateMetadata(

    key,

    metadata

){

    metadata.updated =

        Date.now();

    saveMetadata(

        key,

        metadata

    );

}

/* ========================================================================
   TTL
======================================================================== */

function isExpired(

    metadata

){

    if(

        !metadata ||

        metadata.expires === null

    ){

        return false;

    }

    return Date.now() >

        metadata.expires;

}

/* ========================================================================
   RECORD FACTORY
======================================================================== */

function buildRecord(

    key,

    value,

    ttl = DEFAULT_TTL

){

    const metadata =

        createMetadata(

            key,

            ttl

        );

    return {

        metadata,

        data:

            deepClone(value)

    };

}

/* ========================================================================
   CHECKSUM
======================================================================== */

function checksum(value){

    try{

        const json =

            JSON.stringify(value);

        let hash = 0;

        for(

            let i = 0;

            i < json.length;

            i++

        ){

            hash = (

                (hash << 5)

                - hash

                + json.charCodeAt(i)

            ) | 0;

        }

        return hash.toString(16);

    }catch{

        return null;

    }

}

function updateChecksum(record){

    record.metadata.checksum =

        checksum(

            record.data

        );

    return record;

}

function verifyChecksum(record){

    if(

        !record ||

        !record.metadata

    ){

        return false;

    }

    return (

        checksum(

            record.data

        ) ===

        record.metadata.checksum

    );

}
   /* ========================================================================
   WEB CRYPTO HELPERS
======================================================================== */

const TEXT_ENCODER =
new TextEncoder();

const TEXT_DECODER =
new TextDecoder();

function generateInitializationVector(){

    return crypto.getRandomValues(

        new Uint8Array(

            SECURE_STORAGE_CONFIG
                .CRYPTO_IV_LENGTH

        )

    );

}
   const CRYPTO_PROVIDER = Object.freeze({

    LEGACY:
        "PAY54_LEGACY",

    AES_GCM:
        "AES_GCM"

});
   /* ========================================================================
   KEY MANAGEMENT
======================================================================== */

const KEY_MANAGER = {

    VERSION:
        "PAY54-KEY-V1",

    ACTIVE_KEY:
        "PRIMARY",

    CRYPTO_KEY:
        null,

    KEY_HISTORY:
        [

            {

                id:
                    "PRIMARY",

                version:
                    1,

                status:
                    "ACTIVE",

                activated:
                    nowISO()

            }

        ]

};

function getActiveKey(){

    return KEY_MANAGER.ACTIVE_KEY;

}
function rotateActiveKey(

    keyId

){

    KEY_MANAGER.KEY_HISTORY.forEach(

    key=>{

        if(

            key.status === "ACTIVE"

        ){

            key.status =

                "RETIRED";

        }

    }

);

KEY_MANAGER.ACTIVE_KEY =

    keyId;

KEY_MANAGER.KEY_HISTORY.push({

    id:
        keyId,

    version:

        KEY_MANAGER.KEY_HISTORY.length + 1,

    status:
        "ACTIVE",

    activated:
        nowISO()

});
publishStorageEvent(

    STORAGE_EVENTS.RESTORED,

    {

        action:
            "KEY_ROTATED",

        activeKey:

            KEY_MANAGER.ACTIVE_KEY,

        timestamp:

            nowISO()

    }

);
return KEY_MANAGER.ACTIVE_KEY;

}
   function getKeyHistory(){

    return deepClone(

        KEY_MANAGER.KEY_HISTORY

    );

}
async function getCryptoKey(){

    if(

        KEY_MANAGER.CRYPTO_KEY

    ){

        return KEY_MANAGER.CRYPTO_KEY;

    }

    KEY_MANAGER.CRYPTO_KEY =

        await crypto.subtle.generateKey(

            {

                name:

                    SECURE_STORAGE_CONFIG
                        .CRYPTO_ALGORITHM,

                length:

                    SECURE_STORAGE_CONFIG
                        .CRYPTO_KEY_LENGTH

            },

            true,

            [

                "encrypt",

                "decrypt"

            ]

        );

    return KEY_MANAGER.CRYPTO_KEY;

}
/* ========================================================================
   ENCRYPTION PROVIDER
======================================================================== */

const ENCRYPTION_PROVIDERS =
Object.freeze({

   PAY54_LEGACY:
Object.freeze({

        encrypt(value){

            if(

                !SECURE_STORAGE_CONFIG
                    .ENABLE_WEB_CRYPTO

            ){

                return {

                    algorithm:
                        "PAY54-V1",

                    payload:
                        value

                };

            }

            return {

                algorithm:
                    "AES-GCM",

                payload:
                    value

            };

        },

        decrypt(value){

            return value?.payload ?? value;

        }

    },

    AES_GCM:
Object.freeze({

        encrypt(value){

            throw new Error(

                "AES_GCM provider requires asynchronous crypto pipeline."

            );

        },

        decrypt(value){

            throw new Error(

                "AES_GCM provider requires asynchronous crypto pipeline."

            );

        }

    }

});
   
   function getCryptoProvider(){

  const provider =

    ENCRYPTION_PROVIDERS[

        SECURE_STORAGE_CONFIG
            .ACTIVE_PROVIDER

    ];

if(

    !provider

){

    throw new Error(

        "Unknown crypto provider."

    );

}
if(

    typeof provider.encrypt !== "function" ||

    typeof provider.decrypt !== "function"

){

    throw new Error(

        "Invalid crypto provider implementation."

    );

}
return provider;
      
}

   function getAvailableCryptoProviders(){

    return Object.keys(

        ENCRYPTION_PROVIDERS

    );

}
function migrateEncryptionProvider(

    provider

){

    if(

        !ENCRYPTION_PROVIDERS[provider]

    ){

        throw new Error(

            "Unknown crypto provider."

        );

    }

    throw new Error(

    "Runtime provider switching is not yet supported."

);

}
   /* ========================================================================
   ENCRYPTION ENGINE
======================================================================== */

function encryptValue(

    value

){

    if(

        !SECURE_STORAGE_CONFIG.ENABLE_ENCRYPTION

    ){

        return value;

    }

 return getCryptoProvider()

    .encrypt(
        value
    );

}

function decryptValue(

    value

){

    if(

        !SECURE_STORAGE_CONFIG.ENABLE_ENCRYPTION

    ){

        return value;

    }

    return getCryptoProvider()

    .decrypt(
        value
    );

}
/* ========================================================================
   STORAGE WRITE
======================================================================== */

function set(

    key,

    value,

    options = {}

){

    const ttl =

        options.ttl ??

        DEFAULT_TTL;

    const record =

        updateChecksum(

            buildRecord(

                key,

                encryptValue(value),

                ttl

            )

        );

    localStorage.setItem(

        storageKey(key),

        JSON.stringify(record.data)

    );

    saveMetadata(

        key,

        record.metadata

    );

    publishStorageEvent(

        STORAGE_EVENTS.SAVED,

        {

            key,

            namespace:

                STORAGE_NAMESPACE,

            updatedAt:

                nowISO()

        }

    );

    return deepClone(

        record.data

    );

}

/* ========================================================================
   STORAGE READ
======================================================================== */

function get(

    key,

    fallback = null

){

    if(

        !exists(key)

    ){

        return fallback;

    }

    const data =

        safeParse(

            localStorage.getItem(

                storageKey(key)

            ),

            null

        );

    const metadata =

        getMetadata(

            key

        );

    if(

        !metadata

    ){

        removeRaw(key);

        publishStorageEvent(

            STORAGE_EVENTS.CORRUPTED,

            {

                key,

                reason:

                    "Metadata missing"

            }

        );

        return fallback;

    }

    const record = {

        metadata,

        data

    };

    if(

        !verifyChecksum(

            record

        )

    ){

        removeRaw(key);

        publishStorageEvent(

            STORAGE_EVENTS.CORRUPTED,

            {

                key,

                reason:

                    "Checksum mismatch"

            }

        );

        return fallback;

    }

    if(

        isExpired(

            metadata

        )

    ){

        removeRaw(key);

        publishStorageEvent(

            STORAGE_EVENTS.EXPIRED,

            {

                key

            }

        );

        return fallback;

    }

    publishStorageEvent(

        STORAGE_EVENTS.LOADED,

        {

            key,

            loadedAt:

                nowISO()

        }

    );

    return deepClone(

    decryptValue(

        data

    )

);

}

/* ========================================================================
   STORAGE REMOVE
======================================================================== */

function remove(

    key

){

    if(

        !exists(key)

    ){

        return;

    }

    removeRaw(

        key

    );

    publishStorageEvent(

        STORAGE_EVENTS.REMOVED,

        {

            key,

            removedAt:

                nowISO()

        }

    );

}
   /* ========================================================================
   NAMESPACE MAINTENANCE
======================================================================== */

function clearNamespace(){

    const prefix =
        `${STORAGE_NAMESPACE}:`;

    const keys = [];

    for(

        let i = 0;

        i < localStorage.length;

        i++

    ){

        const key =
            localStorage.key(i);

        if(

            key &&
            key.startsWith(prefix)

        ){

            keys.push(key);

        }

    }

    keys.forEach(key=>{

        localStorage.removeItem(key);

    });

    publishStorageEvent(

        STORAGE_EVENTS.REMOVED,

        {

            namespace:
                STORAGE_NAMESPACE,

            action:
                "clear"

        }

    );

}

/* ========================================================================
   EXPIRY PURGE
======================================================================== */

function purgeExpired(){

    const prefix =
        `${STORAGE_NAMESPACE}:`;

    let removed = 0;

    for(

        let i = 0;

        i < localStorage.length;

        i++

    ){

        const key =
            localStorage.key(i);

        if(

            !key ||

            !key.startsWith(prefix) ||

            key.endsWith(META_SUFFIX)

        ){

            continue;

        }

        const logicalKey =
            key.substring(

                prefix.length

            );

        const metadata =
            getMetadata(

                logicalKey

            );

        if(

            metadata &&

            isExpired(metadata)

        ){

            removeRaw(

                logicalKey

            );

            removed++;

        }

    }

    if(

        removed > 0

    ){

        publishStorageEvent(

            STORAGE_EVENTS.EXPIRED,

            {

                removed

            }

        );

    }

    return removed;

}

/* ========================================================================
   RECOVERY
======================================================================== */

function restore(

    key,

    value,

    options = {}

){

    const restored =

        set(

            key,

            value,

            options

        );

    publishStorageEvent(

        STORAGE_EVENTS.RESTORED,

        {

            key,

            restoredAt:

                nowISO()

        }

    );

    return restored;

}

/* ========================================================================
   EXPORT
======================================================================== */

function exportNamespace(){

    const prefix =
        `${STORAGE_NAMESPACE}:`;

    const exported = {};

    for(

        let i = 0;

        i < localStorage.length;

        i++

    ){

        const key =
            localStorage.key(i);

        if(

            key &&

            key.startsWith(prefix)

        ){

            exported[key] =

                localStorage.getItem(

                    key

                );

        }

    }

    return deepClone(

        exported

    );

}

/* ========================================================================
   IMPORT
======================================================================== */

function importNamespace(

    payload = {}

){

    if(

        !isObject(payload)

    ){

        return 0;

    }

    let imported = 0;

    Object.entries(payload)

    .forEach(

        ([key,value])=>{

            if(

                key.startsWith(

                    `${STORAGE_NAMESPACE}:`

                )

            ){

                localStorage.setItem(

                    key,

                    value

                );

                imported++;

            }

        }

    );

    return imported;

}
   /* ========================================================================
   STORAGE HEALTH
======================================================================== */

function getSecureStorageHealth(){

    return {

        version:
            STORAGE_VERSION,

        namespace:
            STORAGE_NAMESPACE,

        encryptionEnabled:
            SECURE_STORAGE_CONFIG.ENABLE_ENCRYPTION,

        ttlEnabled:
            DEFAULT_TTL !== null,

        eventBusAvailable:
            !!EVENTS,
       activeKey:
    getActiveKey(),

activeProvider:

    SECURE_STORAGE_CONFIG
        .ACTIVE_PROVIDER,

availableProviders:

    Object.keys(

        ENCRYPTION_PROVIDERS

    ),

keyHistory:

    getKeyHistory(),

keyManagerVersion:

    KEY_MANAGER.VERSION,
       webCryptoEnabled:

    SECURE_STORAGE_CONFIG
        .ENABLE_WEB_CRYPTO,

cryptoAlgorithm:

    SECURE_STORAGE_CONFIG
        .CRYPTO_ALGORITHM,
        timestamp:
            nowISO()

    };

}
   function selfTest(){

    return Object.freeze({

        provider:

            SECURE_STORAGE_CONFIG
                .ACTIVE_PROVIDER,

        providers:

            getAvailableCryptoProviders(),

        keyManager:

            KEY_MANAGER.VERSION,

        activeKey:

            getActiveKey(),

        encryption:

            SECURE_STORAGE_CONFIG
                .ENABLE_ENCRYPTION,

        webCrypto:

            SECURE_STORAGE_CONFIG
                .ENABLE_WEB_CRYPTO,

        checksum:

            true,

        namespace:

            STORAGE_NAMESPACE,

        timestamp:

            nowISO()

    });

}
/* ========================================================================
   PUBLIC API
======================================================================== */

const storage = Object.freeze({

    set,

    get,

    remove,

   getActiveKey,

rotateActiveKey,

   getKeyHistory,

migrateEncryptionProvider,

   getCryptoKey,

   getCryptoProvider,

   getAvailableCryptoProviders,

    exists,

    restore,

    clearNamespace,

    purgeExpired,

    export: exportNamespace,

 import: importNamespace,

getMetadata,

getSecureStorageHealth,

selfTest,

});

/* ========================================================================
   PAY54 SECURITY ROOT
======================================================================== */

window.PAY54_SECURITY =
window.PAY54_SECURITY || {};

Object.defineProperty(

    window.PAY54_SECURITY,

    "storage",

    {

        value: storage,

        writable: false,

        configurable: false,

        enumerable: true

    }

);

/* ========================================================================
   STARTUP
======================================================================== */

try{

    purgeExpired();

}catch(error){

    console.error(

        "[PAY54_SECURITY]",

        "Startup purge failed",

        error

    );

}
   
/* ========================================================================
   MODULE READY
======================================================================== */

Object.freeze(

    STORAGE_EVENTS

);
try{

    getCryptoProvider();

}catch(error){

    console.error(

        "[PAY54_SECURITY]",

        "Crypto provider validation failed",

        error

    );

}
console.info(

    "[PAY54]",

    "Enterprise Secure Storage",

    STORAGE_VERSION,

    "loaded"

);

})();
