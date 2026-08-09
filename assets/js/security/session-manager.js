/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File: assets/js/security/session-manager.js
   Version: v11.0.0
   Module: WP-003B Enterprise Session Manager
   ------------------------------------------------------------------------
   Responsibilities

   • Enterprise session lifecycle
   • Idle timeout management
   • Absolute session expiry
   • Session rotation
   • Multi-tab synchronisation
   • Session fingerprint validation
   • Automatic logout
   • Event Bus integration
   • Secure Storage integration
======================================================================== */

(() => {

"use strict";

/* ========================================================================
   DEPENDENCIES
======================================================================== */

const EVENTS =
window.PAY54_EVENTS || null;

const STORAGE =
window.PAY54_SECURITY?.storage || null;

if(!STORAGE){

    console.error(

        "[PAY54_SESSION]",

        "Secure Storage module not available."

    );

    return;

}

/* ========================================================================
   SESSION CONSTANTS
======================================================================== */

const STORAGE_KEY =
"session";

const SESSION_REGISTRY_KEY =
"session_registry";

const TRUSTED_DEVICE_KEY =
"trusted_devices";

const REFRESH_TOKEN_KEY =
"refresh_token";

const SESSION_VERSION =
"11.0.0";

const DEFAULT_IDLE_TIMEOUT =
15 * 60 * 1000;

const DEFAULT_MAX_SESSION =
8 * 60 * 60 * 1000;

/* ========================================================================
   SESSION EVENTS
======================================================================== */

const SESSION_EVENTS =
Object.freeze({

    CREATED:
        "session.created",

    RESTORED:
        "session.restored",

    UPDATED:
        "session.updated",

    ROTATED:
        "session.rotated",

    EXPIRED:
        "session.expired",

    IDLE:
        "session.idle",

    LOGOUT:
        "session.logout",

    INVALID:
        "session.invalid"

});

/* ========================================================================
   EVENT PUBLISHER
======================================================================== */

function publishSessionEvent(

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

                    source:

                    "session-manager"

                }

            );

        }

    }catch(error){

        console.error(

            "[PAY54_SESSION]",

            eventName,

            error

        );

    }

}

/* ========================================================================
   RUNTIME
======================================================================== */

let activityTimer = null;

let currentSession = null;

/* ========================================================================
   UTILITIES
======================================================================== */

function now(){

    return Date.now();

}

function nowISO(){

    return new Date()

    .toISOString();

}

function uuid(){

    if(

        crypto?.randomUUID

    ){

        return crypto.randomUUID();

    }

    return (

        Date.now()

        .toString(36)

        +

        Math.random()

        .toString(36)

        .substring(2)

    );

}

/* ========================================================================
   DEVICE FINGERPRINT
======================================================================== */

function createFingerprint(){

    return [

        navigator.userAgent,

        navigator.language,

        screen.width,

        screen.height,

        Intl.DateTimeFormat()

        .resolvedOptions()

        .timeZone

    ].join("|");

}
/* ========================================================================
   SESSION FACTORY
======================================================================== */

function createSession(

    options = {}

){

    const timestamp =
        now();

    return {

        id:

            uuid(),

        version:

            SESSION_VERSION,

        created:

            timestamp,

        updated:

            timestamp,

        expires:

            timestamp +

            DEFAULT_MAX_SESSION,

        lastActivity:

            timestamp,

        idleTimeout:

            options.idleTimeout ??

            DEFAULT_IDLE_TIMEOUT,

        maxSession:

            options.maxSession ??

            DEFAULT_MAX_SESSION,

        fingerprint:

            createFingerprint(),

        authenticated:

            Boolean(

                options.authenticated

            ),

        userId:

            options.userId ??

            null,

        roles:

            Array.isArray(

                options.roles

            )

            ?

            [...options.roles]

            :

            [],

        metadata:

            isObject(

                options.metadata

            )

            ?

            structuredClone(

                options.metadata

            )

            :

            {}

    };

}
/* ========================================================================
   SESSION REGISTRY
======================================================================== */

function getSessionRegistry(){

    return STORAGE.get(

        SESSION_REGISTRY_KEY,

        []

    );

}

function saveSessionRegistry(

    registry

){

    STORAGE.set(

        SESSION_REGISTRY_KEY,

        registry

    );

}

function registerSession(

    session

){

    const registry =

        getSessionRegistry();

    const exists =

        registry.some(

            item =>

                item.id ===

                session.id

        );

    if(

        exists

    ){

        return;

    }

    registry.push({

        id:

            session.id,

        userId:

            session.userId,

        created:

            session.created,

        fingerprint:

            session.fingerprint

    });

    saveSessionRegistry(

        registry

    );

}

function unregisterSession(

    sessionId

){

    const registry =

        getSessionRegistry()

        .filter(

            item =>

                item.id !==

                sessionId

        );

    saveSessionRegistry(

        registry

    );

}
   /* ========================================================================
   TRUSTED DEVICES
======================================================================== */

function getTrustedDevices(){

    return STORAGE.get(

        TRUSTED_DEVICE_KEY,

        []

    );

}

function saveTrustedDevices(

    devices

){

    STORAGE.set(

        TRUSTED_DEVICE_KEY,

        devices

    );

}

function trustCurrentDevice(){

    if(

        !currentSession

    ){

        return;

    }

    const devices =

        getTrustedDevices();

    const exists =

        devices.some(

            item =>

                item.fingerprint ===

                currentSession.fingerprint

        );

    if(

        exists

    ){

        return;

    }

    devices.push({

        fingerprint:

            currentSession.fingerprint,

        trustedAt:

            nowISO()

    });

    saveTrustedDevices(

        devices

    );

}
   /* ========================================================================
   REFRESH TOKEN
======================================================================== */

function createRefreshToken(){

    return {

        id:

            uuid(),

        created:

            now(),

        expires:

            now() +

            (30 * 24 * 60 * 60 * 1000)

    };

}

function saveRefreshToken(

    token

){

    STORAGE.set(

        REFRESH_TOKEN_KEY,

        token

    );

}

function getRefreshToken(){

    return STORAGE.get(

        REFRESH_TOKEN_KEY,

        null

    );

}

function revokeRefreshToken(){

    STORAGE.remove(

        REFRESH_TOKEN_KEY

    );

}
/* ========================================================================
   SESSION PERSISTENCE
======================================================================== */

function saveSession(

    session

){

    session.updated =

        now();

    STORAGE.set(

        STORAGE_KEY,

        session,

        {

            ttl:

            session.maxSession

        }

    );

    currentSession =

        structuredClone(

            session

        );

    publishSessionEvent(

        SESSION_EVENTS.UPDATED,

        {

            sessionId:

                session.id,

            updatedAt:

                nowISO()

        }

    );

    return currentSession;

}

function loadSession(){

    const session =

        STORAGE.get(

            STORAGE_KEY,

            null

        );

    if(

        !session

    ){

        currentSession =

            null;

        return null;

    }

    currentSession =

        structuredClone(

            session

        );

    return currentSession;

}

/* ========================================================================
   SESSION VALIDATION
======================================================================== */

function validateSession(

    session

){

    if(

        !session

    ){

        return false;

    }

    if(

        session.version !==

        SESSION_VERSION

    ){

        publishSessionEvent(

            SESSION_EVENTS.INVALID,

            {

                reason:

                "Version mismatch"

            }

        );

        return false;

    }

    if(

        session.expires <=

        now()

    ){

        publishSessionEvent(

            SESSION_EVENTS.EXPIRED,

            {

                sessionId:

                    session.id

            }

        );

        return false;

    }

    if(

        session.fingerprint !==

        createFingerprint()

    ){

        publishSessionEvent(

            SESSION_EVENTS.INVALID,

            {

                reason:

                "Fingerprint mismatch"

            }

        );

        return false;

    }

    return true;

}

/* ========================================================================
   SESSION RESTORE
======================================================================== */

function restoreSession(){

    const session =

        loadSession();

    if(

        !validateSession(

            session

        )

    ){

        STORAGE.remove(

            STORAGE_KEY

        );

        currentSession =

            null;

        return null;

    }

    publishSessionEvent(

        SESSION_EVENTS.RESTORED,

        {

            sessionId:

                session.id,

            restoredAt:

                nowISO()

        }

    );

    return session;

}
/* ========================================================================
   SESSION ACTIVITY
======================================================================== */

function updateActivity(){

    if(

        !currentSession

    ){

        return;

    }

    currentSession.lastActivity =

        now();

    saveSession(

        currentSession

    );

}

function clearActivityTimer(){

    if(

        activityTimer

    ){

        clearTimeout(

            activityTimer

        );

        activityTimer = null;

    }

}

/* ========================================================================
   IDLE TIMEOUT
======================================================================== */

function scheduleIdleTimeout(){

    clearActivityTimer();

    if(

        !currentSession

    ){

        return;

    }

    activityTimer =

        setTimeout(

            ()=>{

                publishSessionEvent(

                    SESSION_EVENTS.IDLE,

                    {

                        sessionId:

                            currentSession.id,

                        detectedAt:

                            nowISO()

                    }

                );

                logout(

                    "Idle timeout"

                );

            },

            currentSession.idleTimeout

        );

}

/* ========================================================================
   SESSION ROTATION
======================================================================== */

function rotateSession(){

    if(

        !currentSession

    ){

        return null;

    }

    const previousId =

        currentSession.id;

    currentSession.id =

        uuid();

    currentSession.updated =

        now();

    saveSession(

        currentSession

    );

    publishSessionEvent(

        SESSION_EVENTS.ROTATED,

        {

            previousSessionId:

                previousId,

            sessionId:

                currentSession.id,

            rotatedAt:

                nowISO()

        }

    );

    scheduleIdleTimeout();

    return currentSession;

}

/* ========================================================================
   LOGOUT
======================================================================== */

function logout(

    reason = "User logout"

){

    clearActivityTimer();

    STORAGE.remove(

        STORAGE_KEY

    );

    const sessionId =

        currentSession

        ?

        currentSession.id

        :

        null;

    currentSession =

        null;
   if(

    sessionId

){

    unregisterSession(

        sessionId

    );

}

    publishSessionEvent(

        SESSION_EVENTS.LOGOUT,

        {

            sessionId,

            reason,

            loggedOutAt:

                nowISO()

        }

    );

}

/* ========================================================================
   SESSION START
======================================================================== */

function startSession(

    options = {}

){

    const session =

        createSession(

            options

        );

    saveSession(

        session

    );
   const refreshToken =

    createRefreshToken();

saveRefreshToken(

    refreshToken

);

   registerSession(

    session

);

    scheduleIdleTimeout();

    publishSessionEvent(

        SESSION_EVENTS.CREATED,

        {

            sessionId:

                session.id,

            createdAt:

                nowISO()

        }

    );

    return session;

}  
/* ========================================================================
   MULTI-TAB SYNCHRONISATION
======================================================================== */

function handleStorageEvent(

    event

){

    if(

        !event ||

        event.key !==

        `PAY54:${STORAGE_KEY}`

    ){

        return;

    }

    if(

        event.newValue === null

    ){

        clearActivityTimer();

        currentSession = null;

        publishSessionEvent(

            SESSION_EVENTS.LOGOUT,

            {

                reason:

                "Remote logout",

                loggedOutAt:

                nowISO()

            }

        );

        return;

    }

    const session =

        STORAGE.get(

            STORAGE_KEY,

            null

        );

    if(

        !session

    ){

        return;

    }

    currentSession =

        structuredClone(

            session

        );

    scheduleIdleTimeout();

    publishSessionEvent(

        SESSION_EVENTS.RESTORED,

        {

            sessionId:

                session.id,

            source:

                "storage-sync",

            restoredAt:

                nowISO()

        }

    );

}

/* ========================================================================
   SESSION HEALTH
======================================================================== */

function checkSessionHealth(){

    if(

        !currentSession

    ){

        return false;

    }

    if(

        !validateSession(

            currentSession

        )

    ){

        logout(

            "Session validation failed"

        );

        return false;

    }

    return true;

}

/* ========================================================================
   KEEP-ALIVE
======================================================================== */

function keepAlive(){

    if(

        !checkSessionHealth()

    ){

        return false;

    }

    updateActivity();

    scheduleIdleTimeout();

    return true;

}

/* ========================================================================
   EVENT REGISTRATION
======================================================================== */

window.addEventListener(

    "storage",

    handleStorageEvent

);

[
    "mousemove",
    "mousedown",
    "keydown",
    "touchstart",
    "scroll"
].forEach(eventName=>{

    window.addEventListener(

        eventName,

        ()=>{

            if(

                currentSession

            ){

                keepAlive();

            }

        },

        {

            passive:true

        }

    );

});
  /* ========================================================================
   PUBLIC API
======================================================================== */

const session = Object.freeze({

    start: startSession,

    restore: restoreSession,

  trustCurrentDevice,

getTrustedDevices, 

    rotate: rotateSession,

    logout,

    keepAlive,

    validate: checkSessionHealth,

    getCurrent(){

        return currentSession
            ? structuredClone(currentSession)
            : null;

    },

    isAuthenticated(){

        return Boolean(

            currentSession &&

            currentSession.authenticated

        );

    }

});

/* ========================================================================
   PAY54 SECURITY ROOT
======================================================================== */

window.PAY54_SECURITY =
window.PAY54_SECURITY || {};

Object.defineProperty(

    window.PAY54_SECURITY,

    "session",

    {

        value: session,

        writable: false,

        configurable: false,

        enumerable: true

    }

);

/* ========================================================================
   STARTUP
======================================================================== */

try{

    const restored =

        restoreSession();

    if(

        restored

    ){

        scheduleIdleTimeout();

    }

}catch(error){

    console.error(

        "[PAY54_SESSION]",

        "Session restore failed",

        error

    );

}

/* ========================================================================
   MODULE READY
======================================================================== */

Object.freeze(

    SESSION_EVENTS

);

console.info(

    "[PAY54]",

    "Enterprise Session Manager",

    SESSION_VERSION,

    "loaded"

);

})();
