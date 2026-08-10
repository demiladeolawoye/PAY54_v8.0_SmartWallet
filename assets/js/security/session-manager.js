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

const SESSION_AUDIT_KEY =
"session_audit";

const SESSION_VERSION =
"11.0.0";

const DEFAULT_IDLE_TIMEOUT =
15 * 60 * 1000;

const DEFAULT_MAX_SESSION =
8 * 60 * 60 * 1000;
const SESSION_RISK = Object.freeze({

    LOW:
        "LOW",

    MEDIUM:
        "MEDIUM",

    HIGH:
        "HIGH"

});
   const LOGOUT_POLICY = Object.freeze({

    NONE:
        "NONE",

    IDLE:
        "IDLE",

    EXPIRED:
        "EXPIRED",

    INVALID:
        "INVALID",

    HIGH_RISK:
        "HIGH_RISK"

});
   const MFA_CONFIG = Object.freeze({

    ENABLED:
        false,

    REQUIRED_RISK:
        SESSION_RISK.HIGH

});
   const SESSION_DIAGNOSTICS = Object.freeze({

    VERSION:
        SESSION_VERSION,

    MODULE:
        "Enterprise Session Manager"

});
   const BIOMETRIC_CONFIG = Object.freeze({

    ENABLED:
        false,

    PROVIDER:
        "NONE"

});
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
   SESSION AUDIT
======================================================================== */

function getSessionAudit(){

    return STORAGE.get(

        SESSION_AUDIT_KEY,

        []

    );

}

function saveSessionAudit(

    audit

){

    STORAGE.set(

        SESSION_AUDIT_KEY,

        audit

    );

}

function recordSessionAudit(

    action,

    details = {}

){

    const audit =

        getSessionAudit();

    audit.push({

        id:

            uuid(),

        action,

        timestamp:

            nowISO(),

        sessionId:

            currentSession

                ? currentSession.id

                : null,

        userId:

            currentSession

                ? currentSession.userId

                : null,

        details

    });

    saveSessionAudit(

        audit

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
recordSessionAudit(

    "SESSION_RESTORED"

);
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
recordSessionAudit(

    "SESSION_ROTATED"

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
   revokeRefreshToken();

    const sessionId =

        currentSession

        ?

        currentSession.id

        :

        null;
   const userId =

    currentSession

    ?

    currentSession.userId

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
  recordSessionAudit(

    "SESSION_LOGOUT",

    {

        sessionId,

        userId,

        reason

    }

);
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

    recordSessionAudit(

    "SESSION_CREATED"

);
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
   SESSION RISK
======================================================================== */

function calculateSessionRisk(){

    if(

        !currentSession

    ){

        return SESSION_RISK.HIGH;

    }

    if(

        !currentSession.authenticated

    ){

        return SESSION_RISK.HIGH;

    }

    const trusted =

        getTrustedDevices()

        .some(

            device =>

                device.fingerprint ===

                currentSession.fingerprint

        );

    if(

        !trusted

    ){

        return SESSION_RISK.MEDIUM;

    }

    return SESSION_RISK.LOW;

}

function getSessionRisk(){

    return calculateSessionRisk();

}
   /* ========================================================================
   LOGOUT POLICIES
======================================================================== */

function evaluateLogoutPolicy(){

    if(

        !currentSession

    ){

        return LOGOUT_POLICY.INVALID;

    }

    if(

        currentSession.expires <=

        now()

    ){

        return LOGOUT_POLICY.EXPIRED;

    }

    if(

        calculateSessionRisk() ===

        SESSION_RISK.HIGH

    ){

        return LOGOUT_POLICY.HIGH_RISK;

    }

    return LOGOUT_POLICY.NONE;

}
   /* ========================================================================
   MFA
======================================================================== */

function requiresMFA(){

    if(

        !MFA_CONFIG.ENABLED

    ){

        return false;

    }

    return (

        calculateSessionRisk() ===

        MFA_CONFIG.REQUIRED_RISK

    );

}

function requestMFA(){

    publishSessionEvent(

        "session.mfa.required",

        {

            sessionId:

                currentSession

                    ? currentSession.id

                    : null,

            requestedAt:

                nowISO()

        }

    );

    return true;

}
   /* ========================================================================
   BIOMETRIC AUTHENTICATION
======================================================================== */

function isBiometricEnabled(){

    return BIOMETRIC_CONFIG.ENABLED;

}

function getBiometricProvider(){

    return BIOMETRIC_CONFIG.PROVIDER;

}

function requestBiometricAuthentication(){

    if(

        !isBiometricEnabled()

    ){

        return false;

    }

    publishSessionEvent(

        "session.biometric.required",

        {

            sessionId:

                currentSession

                    ? currentSession.id

                    : null,

            provider:

                getBiometricProvider(),

            requestedAt:

                nowISO()

        }

    );

    return true;

}
  /* ========================================================================
   DIAGNOSTICS
======================================================================== */

function getDiagnostics(){

    return {

        version:

            SESSION_DIAGNOSTICS.VERSION,

        module:

            SESSION_DIAGNOSTICS.MODULE,

        authenticated:

            Boolean(

                currentSession &&

                currentSession.authenticated

            ),

        activeSession:

            currentSession

                ? currentSession.id

                : null,

        risk:

            currentSession

                ? calculateSessionRisk()

                : SESSION_RISK.HIGH,

        trustedDevices:

            getTrustedDevices()

            .length,

        registeredSessions:

            getSessionRegistry()

            .length,

        auditEntries:

            getSessionAudit()

            .length,

        refreshToken:

            Boolean(

                getRefreshToken()

            ),

        mfaEnabled:

            MFA_CONFIG.ENABLED,

        biometricEnabled:

            BIOMETRIC_CONFIG.ENABLED,

        timestamp:

            nowISO()

    };

} 
   function checkDiagnostics(){

    return {

        healthy:

            true,

        diagnostics:

            getDiagnostics()

    };

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
   const logoutPolicy =

    evaluateLogoutPolicy();

if(

    logoutPolicy !==

    LOGOUT_POLICY.NONE

){

    logout(

        logoutPolicy

    );

    return false;

}
    currentSession.risk =

    calculateSessionRisk();
   if(

    requiresMFA()

){

    requestMFA();

}
   if(

    isBiometricEnabled()

){

    requestBiometricAuthentication();

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

   getRefreshToken,

    revokeRefreshToken,

    rotate: rotateSession,

    logout,

    keepAlive,

    validate: checkSessionHealth,

    getSessionRisk,

   getSessionAudit,

   evaluateLogoutPolicy,

   requiresMFA,

   requestMFA,
   isBiometricEnabled,

getBiometricProvider,

requestBiometricAuthentication,

   getDiagnostics,

checkDiagnostics,
   
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
