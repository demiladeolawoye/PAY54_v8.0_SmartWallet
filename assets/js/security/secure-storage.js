/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File: assets/js/security/secure-storage.js
   Version: v11.0.0
   Module: WP-003A Enterprise Secure Storage
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
