"use strict";

/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File: assets/js/security/session-manager.js
   Version: v12.0.0
   Module: Titan Enterprise Session Manager
   Status: Production Candidate
   ------------------------------------------------------------------------
   Purpose
   -------
   Canonical browser-side session lifecycle coordinator for Project Titan.

   Security model
   --------------
   • Browser session state contains non-secret metadata only.
   • This module never creates or persists refresh/access tokens.
   • Authenticated state must be explicitly established by an authentication
     layer; the Session Manager never invents authentication.
   • Session identifiers require cryptographically secure randomness.
   • Absolute expiry and idle expiry are enforced independently.
   • Device fingerprinting is a soft context-binding signal, not a credential.
   • Multi-tab session adoption is validated before activation.
======================================================================== */

(() => {

    "use strict";

    /* ====================================================================
       IDENTITY
    ==================================================================== */

    const GLOBAL =
        window;

    const MODULE_ID =
        "security.session-manager";

    const MODULE_NAME =
        "PAY54 Titan Enterprise Session Manager";

    const FILE_PATH =
        "assets/js/security/session-manager.js";

    const VERSION =
        "12.0.0";

    const STARTED_AT =
        new Date()
            .toISOString();

    /* ====================================================================
       DEPENDENCIES
    ==================================================================== */

    const REGISTRY =
        GLOBAL.PAY54_REGISTRY ||
        null;

    const CONFIG =
        GLOBAL.PAY54_CONFIG ||
        null;

    const EVENTS =
        GLOBAL.PAY54_EVENTS ||
        null;

    const STORAGE =
        GLOBAL.PAY54_SECURITY?.storage ||
        null;

    if (
        !REGISTRY ||
        typeof REGISTRY.registerModule !==
            "function"
    ) {

        throw new Error(
            "[PAY54_SESSION] Platform Registry must load before Session Manager."
        );
    }

    if (
        !CONFIG ||
        typeof CONFIG.get !==
            "function"
    ) {

        throw new Error(
            "[PAY54_SESSION] Runtime Config must load before Session Manager."
        );
    }

    if (
        !STORAGE ||
        typeof STORAGE.get !==
            "function" ||
        typeof STORAGE.set !==
            "function"
    ) {

        throw new Error(
            "[PAY54_SESSION] Secure Storage v12 must load before Session Manager."
        );
    }

    /* ====================================================================
       SAFE RELOAD GUARD
    ==================================================================== */

    const existingSession =
        GLOBAL.PAY54_SECURITY?.session ||
        null;

    if (
        existingSession
    ) {

        if (
            existingSession.id ===
                MODULE_ID &&
            existingSession.version ===
                VERSION &&
            typeof existingSession.health ===
                "function" &&
            typeof existingSession.isAuthenticated ===
                "function"
        ) {

            console.info(
                "[PAY54_SESSION] Existing Titan Session Manager preserved."
            );

            return;
        }

        throw new Error(
            "[PAY54_SESSION] PAY54_SECURITY.session already exists with an incompatible contract."
        );
    }

    /* ====================================================================
       CONSTANTS
    ==================================================================== */

    const STORAGE_KEY =
        "session";

    const SESSION_REGISTRY_KEY =
        "session_registry";

    const TRUSTED_DEVICE_KEY =
        "trusted_devices";

    const SESSION_AUDIT_KEY =
        "session_audit";

    const DEFAULT_IDLE_TIMEOUT =
        15 * 60 * 1000;

    const DEFAULT_MAX_SESSION =
        8 * 60 * 60 * 1000;

    const ACTIVITY_PERSIST_INTERVAL =
        30 * 1000;

    const TRUSTED_DEVICE_TTL =
        30 * 24 * 60 * 60 * 1000;

    const MAX_TRUSTED_DEVICES =
        10;

    const MAX_SESSION_REGISTRY_ENTRIES =
        20;

    const MAX_AUDIT_ENTRIES =
        250;

    const SESSION_RISK =
        Object.freeze({

            LOW:
                "LOW",

            MEDIUM:
                "MEDIUM",

            HIGH:
                "HIGH"
        });

    const LOGOUT_POLICY =
        Object.freeze({

            NONE:
                "NONE",

            IDLE:
                "IDLE",

            EXPIRED:
                "EXPIRED",

            INVALID:
                "INVALID",

            HIGH_RISK:
                "HIGH_RISK",

            REMOTE:
                "REMOTE",

            USER:
                "USER"
        });

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
                "session.invalid",

            RISK_CHANGED:
                "session.risk.changed",

            READY:
                "security.session.ready"
        });

    /* ====================================================================
       PRIVATE STATE
    ==================================================================== */

    let currentSession =
        null;

    let idleTimer =
        null;

    let absoluteExpiryTimer =
        null;

    let activityFlushTimer =
        null;

    let lastPersistedActivityAt =
        0;

    let lastKnownRisk =
        SESSION_RISK.HIGH;

    const state = {

        ready:
            false,

        readyAt:
            null,

        restored:
            false,

        starts:
            0,

        rotations:
            0,

        logouts:
            0,

        remoteSyncs:
            0,

        invalidations:
            0,

        activityUpdates:
            0,

        persistedActivityUpdates:
            0,

        lastError:
            null
    };

    /* ====================================================================
       UTILITIES
    ==================================================================== */

    function now() {

        return Date.now();
    }


    function nowISO() {

        return new Date()
            .toISOString();
    }


    function isPlainObject(
        value
    ) {

        if (
            !value ||
            typeof value !==
                "object" ||
            Array.isArray(
                value
            )
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


    function clone(
        value
    ) {

        return (
            value === null ||
            value === undefined
        )

            ? value

            : JSON.parse(
                JSON.stringify(
                    value
                )
            );
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


    function publish(
        eventName,
        payload = {}
    ) {

        try {

            if (
                !EVENTS ||
                typeof EVENTS.publish !==
                    "function"
            ) {

                return false;
            }

            EVENTS.publish(

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

            rememberError(
                error
            );

            console.warn(
                "[PAY54_SESSION] Event publication failed.",
                error
            );

            return false;
        }
    }


    function createSecureId() {

        const cryptoApi =
            GLOBAL.crypto;

        if (
            cryptoApi?.randomUUID
        ) {

            return cryptoApi.randomUUID();
        }

        if (
            cryptoApi?.getRandomValues
        ) {

            const bytes =
                new Uint8Array(
                    16
                );

            cryptoApi.getRandomValues(
                bytes
            );

            bytes[6] =
                (
                    bytes[6] &
                    0x0f
                ) |
                0x40;

            bytes[8] =
                (
                    bytes[8] &
                    0x3f
                ) |
                0x80;

            const hex =
                Array.from(

                    bytes,

                    byte =>
                        byte
                            .toString(
                                16
                            )
                            .padStart(
                                2,
                                "0"
                            )
                )
                .join("");

            return [
                hex.slice(
                    0,
                    8
                ),
                hex.slice(
                    8,
                    12
                ),
                hex.slice(
                    12,
                    16
                ),
                hex.slice(
                    16,
                    20
                ),
                hex.slice(
                    20
                )
            ]
            .join("-");
        }

        throw new Error(
            "[PAY54_SESSION] Cryptographically secure random session identifiers are unavailable."
        );
    }


    function normaliseDuration(
        value,
        fallback,
        name
    ) {

        const resolved =
            value ??
            fallback;

        const numeric =
            Number(
                resolved
            );

        if (
            !Number.isFinite(
                numeric
            ) ||
            numeric <= 0
        ) {

            throw new TypeError(
                `[PAY54_SESSION] ${name} must be a positive finite number of milliseconds.`
            );
        }

        return numeric;
    }


    function normaliseRoles(
        value
    ) {

        if (
            value === undefined ||
            value === null
        ) {

            return [];
        }

        if (
            !Array.isArray(
                value
            )
        ) {

            throw new TypeError(
                "[PAY54_SESSION] roles must be an array."
            );
        }

        return Array.from(

            new Set(

                value
                    .map(
                        role =>
                            String(
                                role ??
                                ""
                            ).trim()
                    )
                    .filter(
                        Boolean
                    )
            )
        );
    }


    function createFingerprint() {

        const timezone =
            (() => {

                try {

                    return (
                        Intl
                            .DateTimeFormat()
                            .resolvedOptions()
                            .timeZone ||
                        "unknown"
                    );

                } catch {

                    return "unknown";
                }

            })();

        return [

            navigator.userAgent ||
                "unknown",

            navigator.language ||
                "unknown",

            String(
                screen?.width ??
                "unknown"
            ),

            String(
                screen?.height ??
                "unknown"
            ),

            timezone

        ].join("|");
    }


    function validateSessionShape(
        session
    ) {

        return Boolean(

            isPlainObject(
                session
            ) &&

            typeof session.id ===
                "string" &&

            session.id.length >=
                16 &&

            session.version ===
                VERSION &&

            Number.isFinite(
                session.created
            ) &&

            Number.isFinite(
                session.updated
            ) &&

            Number.isFinite(
                session.expires
            ) &&

            Number.isFinite(
                session.lastActivity
            ) &&

            Number.isFinite(
                session.idleTimeout
            ) &&

            Number.isFinite(
                session.maxSession
            ) &&

            typeof session.fingerprint ===
                "string" &&

            typeof session.authenticated ===
                "boolean" &&

            Array.isArray(
                session.roles
            ) &&

            isPlainObject(
                session.metadata
            )
        );
    }

    /* ====================================================================
       SESSION FACTORY
    ==================================================================== */

    function createSession(
        options = {}
    ) {

        if (
            !isPlainObject(
                options
            )
        ) {

            throw new TypeError(
                "[PAY54_SESSION] Session options must be a plain object."
            );
        }

        const timestamp =
            now();

        const idleTimeout =
            normaliseDuration(

                options.idleTimeout,

                DEFAULT_IDLE_TIMEOUT,

                "idleTimeout"
            );

        const maxSession =
            normaliseDuration(

                options.maxSession,

                DEFAULT_MAX_SESSION,

                "maxSession"
            );

        if (
            idleTimeout >
            maxSession
        ) {

            throw new Error(
                "[PAY54_SESSION] idleTimeout cannot exceed maxSession."
            );
        }

        return {

            id:
                createSecureId(),

            version:
                VERSION,

            created:
                timestamp,

            updated:
                timestamp,

            expires:
                timestamp +
                maxSession,

            lastActivity:
                timestamp,

            idleTimeout,

            maxSession,

            fingerprint:
                createFingerprint(),

            authenticated:
                options.authenticated ===
                true,

            userId:
                options.userId ??
                null,

            roles:
                normaliseRoles(
                    options.roles
                ),

            metadata:

                isPlainObject(
                    options.metadata
                )

                    ? clone(
                        options.metadata
                    )

                    : {}
        };
    }

    /* ====================================================================
       SESSION REGISTRY
    ==================================================================== */

    function getSessionRegistry() {

        const registry =
            STORAGE.get(

                SESSION_REGISTRY_KEY,

                []
            );

        return (
            Array.isArray(
                registry
            )

                ? registry

                : []
        );
    }


    function pruneSessionRegistry(
        registry =
            getSessionRegistry()
    ) {

        const timestamp =
            now();

        const seen =
            new Set();

        const pruned =
            registry

                .filter(
                    item =>

                        isPlainObject(
                            item
                        ) &&

                        typeof item.id ===
                            "string" &&

                        !seen.has(
                            item.id
                        ) &&

                        Number.isFinite(
                            item.expires
                        ) &&

                        item.expires >
                            timestamp
                )

                .map(
                    item => {

                        seen.add(
                            item.id
                        );

                        return item;
                    }
                )

                .sort(
                    (
                        a,
                        b
                    ) =>

                        (
                            b.updated ||
                            b.created ||
                            0
                        )
                        -
                        (
                            a.updated ||
                            a.created ||
                            0
                        )
                )

                .slice(
                    0,
                    MAX_SESSION_REGISTRY_ENTRIES
                );

        return pruned;
    }


    function saveSessionRegistry(
        registry
    ) {

        STORAGE.set(

            SESSION_REGISTRY_KEY,

            pruneSessionRegistry(

                Array.isArray(
                    registry
                )

                    ? registry

                    : []
            )
        );
    }


    function registerSession(
        session
    ) {

        let registry =
            pruneSessionRegistry();

        registry =
            registry.filter(
                item =>
                    item.id !==
                    session.id
            );

        registry.unshift({

            id:
                session.id,

            userId:
                session.userId,

            created:
                session.created,

            updated:
                session.updated,

            expires:
                session.expires,

            fingerprint:
                session.fingerprint
        });

        saveSessionRegistry(
            registry
        );
    }


    function unregisterSession(
        sessionId
    ) {

        if (
            !sessionId
        ) {

            return false;
        }

        const before =
            getSessionRegistry();

        const after =
            before.filter(
                item =>
                    item?.id !==
                    sessionId
            );

        saveSessionRegistry(
            after
        );

        return (
            after.length !==
            before.length
        );
    }


    function replaceRegisteredSession(
        previousId,
        session
    ) {

        let registry =
            getSessionRegistry()

                .filter(
                    item =>
                        item?.id !==
                            previousId &&
                        item?.id !==
                            session.id
                );

        registry.unshift({

            id:
                session.id,

            userId:
                session.userId,

            created:
                session.created,

            updated:
                session.updated,

            expires:
                session.expires,

            fingerprint:
                session.fingerprint
        });

        saveSessionRegistry(
            registry
        );
    }

    /* ====================================================================
       TRUSTED DEVICES
    ==================================================================== */

    function getTrustedDevices() {

        const timestamp =
            now();

        const devices =
            STORAGE.get(

                TRUSTED_DEVICE_KEY,

                []
            );

        if (
            !Array.isArray(
                devices
            )
        ) {

            return [];
        }

        return devices

            .filter(
                device =>

                    isPlainObject(
                        device
                    ) &&

                    typeof device.id ===
                        "string" &&

                    typeof device.fingerprint ===
                        "string" &&

                    Number.isFinite(
                        device.expiresAt
                    ) &&

                    device.expiresAt >
                        timestamp
            )

            .sort(
                (
                    a,
                    b
                ) =>

                    (
                        b.lastSeenAt ||
                        0
                    )
                    -
                    (
                        a.lastSeenAt ||
                        0
                    )
            )

            .slice(
                0,
                MAX_TRUSTED_DEVICES
            );
    }


    function saveTrustedDevices(
        devices
    ) {

        STORAGE.set(

            TRUSTED_DEVICE_KEY,

            Array.isArray(
                devices
            )

                ? devices.slice(
                    0,
                    MAX_TRUSTED_DEVICES
                )

                : []
        );
    }


    function trustCurrentDevice() {

        if (
            !currentSession
        ) {

            return null;
        }

        const timestamp =
            now();

        const fingerprint =
            currentSession.fingerprint;

        let devices =
            getTrustedDevices();

        let device =
            devices.find(
                item =>
                    item.fingerprint ===
                    fingerprint
            ) ||
            null;

        if (
            device
        ) {

            device = {

                ...device,

                lastSeenAt:
                    timestamp,

                expiresAt:
                    timestamp +
                    TRUSTED_DEVICE_TTL
            };

            devices =
                devices.filter(
                    item =>
                        item.id !==
                        device.id
                );

        } else {

            device = {

                id:
                    createSecureId(),

                fingerprint,

                createdAt:
                    timestamp,

                lastSeenAt:
                    timestamp,

                expiresAt:
                    timestamp +
                    TRUSTED_DEVICE_TTL
            };
        }

        devices.unshift(
            device
        );

        saveTrustedDevices(
            devices
        );

        return clone(
            device
        );
    }


    function revokeTrustedDevice(
        deviceId
    ) {

        const id =
            String(
                deviceId ??
                ""
            ).trim();

        if (
            !id
        ) {

            return false;
        }

        const before =
            getTrustedDevices();

        const after =
            before.filter(
                device =>
                    device.id !==
                    id
            );

        saveTrustedDevices(
            after
        );

        return (
            after.length !==
            before.length
        );
    }

    /* ====================================================================
       SESSION AUDIT
    ==================================================================== */

    function getSessionAudit() {

        const audit =
            STORAGE.get(

                SESSION_AUDIT_KEY,

                []
            );

        return (
            Array.isArray(
                audit
            )

                ? audit

                : []
        );
    }


    function recordSessionAudit(
        action,
        details = {}
    ) {

        const audit =
            getSessionAudit();

        audit.push({

            id:
                createSecureId(),

            action:
                String(
                    action ||
                    "SESSION_EVENT"
                ),

            timestamp:
                nowISO(),

            sessionId:
                currentSession?.id ??
                details.sessionId ??
                null,

            userId:
                currentSession?.userId ??
                details.userId ??
                null,

            details:

                isPlainObject(
                    details
                )

                    ? clone(
                        details
                    )

                    : {}
        });

        STORAGE.set(

            SESSION_AUDIT_KEY,

            audit.slice(
                -MAX_AUDIT_ENTRIES
            )
        );
    }

    /* ====================================================================
       SESSION PERSISTENCE
    ==================================================================== */

    function persistSession(
        session,
        publishUpdate = true
    ) {

        if (
            !validateSessionShape(
                session
            )
        ) {

            throw new Error(
                "[PAY54_SESSION] Refusing to persist an invalid session contract."
            );
        }

        const remainingLifetime =
            session.expires -
            now();

        if (
            remainingLifetime <=
            0
        ) {

            throw new Error(
                "[PAY54_SESSION] Refusing to persist an expired session."
            );
        }

        session.updated =
            now();

        STORAGE.set(

            STORAGE_KEY,

            session,

            {

                ttl:
                    remainingLifetime
            }
        );

        currentSession =
            clone(
                session
            );

        lastPersistedActivityAt =
            currentSession.lastActivity;

        if (
            publishUpdate
        ) {

            publish(

                SESSION_EVENTS.UPDATED,

                {

                    sessionId:
                        session.id,

                    updatedAt:
                        nowISO()
                }
            );
        }

        return clone(
            currentSession
        );
    }


    function loadPersistedSession() {

        const session =
            STORAGE.get(

                STORAGE_KEY,

                null
            );

        return (
            session

                ? clone(
                    session
                )

                : null
        );
    }

    /* ====================================================================
       VALIDATION / RISK
    ==================================================================== */

    function validateSession(
        session,
        options = {}
    ) {

        const emitEvents =
            options.emitEvents !==
            false;

        const timestamp =
            now();

        if (
            !validateSessionShape(
                session
            )
        ) {

            if (
                emitEvents
            ) {

                publish(

                    SESSION_EVENTS.INVALID,

                    {

                        reason:
                            "Invalid session contract"
                    }
                );
            }

            return false;
        }

        if (
            session.expires <=
            timestamp
        ) {

            if (
                emitEvents
            ) {

                publish(

                    SESSION_EVENTS.EXPIRED,

                    {

                        sessionId:
                            session.id
                    }
                );
            }

            return false;
        }

        if (
            session.lastActivity +
            session.idleTimeout <=
            timestamp
        ) {

            if (
                emitEvents
            ) {

                publish(

                    SESSION_EVENTS.IDLE,

                    {

                        sessionId:
                            session.id
                    }
                );
            }

            return false;
        }

        if (
            session.fingerprint !==
            createFingerprint()
        ) {

            if (
                emitEvents
            ) {

                publish(

                    SESSION_EVENTS.INVALID,

                    {

                        sessionId:
                            session.id,

                        reason:
                            "Session context fingerprint mismatch"
                    }
                );
            }

            return false;
        }

        return true;
    }


    function calculateSessionRisk(
        session =
            currentSession
    ) {

        if (
            !session ||
            !session.authenticated
        ) {

            return SESSION_RISK.HIGH;
        }

        const trusted =
            getTrustedDevices()

                .some(
                    device =>
                        device.fingerprint ===
                        session.fingerprint
                );

        return (
            trusted

                ? SESSION_RISK.LOW

                : SESSION_RISK.MEDIUM
        );
    }


    function publishRiskChangeIfNeeded() {

        const risk =
            calculateSessionRisk();

        if (
            risk !==
            lastKnownRisk
        ) {

            publish(

                SESSION_EVENTS.RISK_CHANGED,

                {

                    previousRisk:
                        lastKnownRisk,

                    risk,

                    sessionId:
                        currentSession?.id ??
                        null
                }
            );

            lastKnownRisk =
                risk;
        }

        return risk;
    }


    function getSessionRisk() {

        return calculateSessionRisk();
    }


    function evaluateLogoutPolicy(
        session =
            currentSession
    ) {

        if (
            !session ||
            !validateSessionShape(
                session
            )
        ) {

            return LOGOUT_POLICY.INVALID;
        }

        const timestamp =
            now();

        if (
            session.expires <=
            timestamp
        ) {

            return LOGOUT_POLICY.EXPIRED;
        }

        if (
            session.lastActivity +
            session.idleTimeout <=
            timestamp
        ) {

            return LOGOUT_POLICY.IDLE;
        }

        return LOGOUT_POLICY.NONE;
    }

    /* ====================================================================
       TIMERS
    ==================================================================== */

    function clearTimers() {

        if (
            idleTimer
        ) {

            clearTimeout(
                idleTimer
            );

            idleTimer =
                null;
        }

        if (
            absoluteExpiryTimer
        ) {

            clearTimeout(
                absoluteExpiryTimer
            );

            absoluteExpiryTimer =
                null;
        }

        if (
            activityFlushTimer
        ) {

            clearTimeout(
                activityFlushTimer
            );

            activityFlushTimer =
                null;
        }
    }


    function scheduleSessionTimers() {

        if (
            !currentSession
        ) {

            clearTimers();

            return;
        }

        if (
            idleTimer
        ) {

            clearTimeout(
                idleTimer
            );
        }

        if (
            absoluteExpiryTimer
        ) {

            clearTimeout(
                absoluteExpiryTimer
            );
        }

        const timestamp =
            now();

        const idleRemaining =
            Math.max(

                0,

                currentSession.lastActivity +
                currentSession.idleTimeout -
                timestamp
            );

        const absoluteRemaining =
            Math.max(

                0,

                currentSession.expires -
                timestamp
            );

        idleTimer =
            setTimeout(

                () => {

                    publish(

                        SESSION_EVENTS.IDLE,

                        {

                            sessionId:
                                currentSession?.id ??
                                null,

                            detectedAt:
                                nowISO()
                        }
                    );

                    logout(
                        LOGOUT_POLICY.IDLE
                    );
                },

                idleRemaining
            );

        absoluteExpiryTimer =
            setTimeout(

                () => {

                    publish(

                        SESSION_EVENTS.EXPIRED,

                        {

                            sessionId:
                                currentSession?.id ??
                                null,

                            detectedAt:
                                nowISO()
                        }
                    );

                    logout(
                        LOGOUT_POLICY.EXPIRED
                    );
                },

                absoluteRemaining
            );
    }

    /* ====================================================================
       ACTIVITY
    ==================================================================== */

    function flushActivity() {

        activityFlushTimer =
            null;

        if (
            !currentSession
        ) {

            return false;
        }

        const policy =
            evaluateLogoutPolicy();

        if (
            policy !==
            LOGOUT_POLICY.NONE
        ) {

            logout(
                policy
            );

            return false;
        }

        persistSession(
            currentSession,
            true
        );

        state.persistedActivityUpdates +=
            1;

        return true;
    }


    function scheduleActivityFlush() {

        if (
            !currentSession ||
            activityFlushTimer
        ) {

            return;
        }

        const elapsed =
            now() -
            lastPersistedActivityAt;

        const delay =
            Math.max(

                0,

                ACTIVITY_PERSIST_INTERVAL -
                elapsed
            );

        activityFlushTimer =
            setTimeout(
                flushActivity,
                delay
            );
    }


    function updateActivity() {

        if (
            !currentSession
        ) {

            return false;
        }

        const policy =
            evaluateLogoutPolicy();

        if (
            policy !==
            LOGOUT_POLICY.NONE
        ) {

            logout(
                policy
            );

            return false;
        }

        currentSession.lastActivity =
            now();

        state.activityUpdates +=
            1;

        scheduleSessionTimers();

        scheduleActivityFlush();

        return true;
    }


    function keepAlive() {

        if (
            !currentSession ||
            !validateSession(
                currentSession,
                {
                    emitEvents:
                        false
                }
            )
        ) {

            return false;
        }

        updateActivity();

        publishRiskChangeIfNeeded();

        return true;
    }

    /* ====================================================================
       SESSION START / RESTORE / ROTATE / LOGOUT
    ==================================================================== */

    function startSession(
        options = {}
    ) {

        if (
            currentSession
        ) {

            logout(
                "REPLACED_BY_NEW_SESSION"
            );
        }

        const session =
            createSession(
                options
            );

        currentSession =
            clone(
                session
            );

        persistSession(
            currentSession,
            false
        );

        registerSession(
            currentSession
        );

        scheduleSessionTimers();

        lastKnownRisk =
            calculateSessionRisk(
                currentSession
            );

        state.starts +=
            1;

        recordSessionAudit(

            "SESSION_CREATED",

            {

                authenticated:
                    currentSession.authenticated
            }
        );

        publish(

            SESSION_EVENTS.CREATED,

            {

                sessionId:
                    currentSession.id,

                authenticated:
                    currentSession.authenticated,

                createdAt:
                    nowISO()
            }
        );

        return clone(
            currentSession
        );
    }


    function restoreSession() {

        const session =
            loadPersistedSession();

        if (
            !session
        ) {

            currentSession =
                null;

            state.restored =
                false;

            return null;
        }

        if (
            !validateSession(
                session
            )
        ) {

            STORAGE.remove(
                STORAGE_KEY
            );

            unregisterSession(
                session.id
            );

            currentSession =
                null;

            state.restored =
                false;

            state.invalidations +=
                1;

            return null;
        }

        currentSession =
            clone(
                session
            );

        registerSession(
            currentSession
        );

        scheduleSessionTimers();

        lastKnownRisk =
            calculateSessionRisk(
                currentSession
            );

        state.restored =
            true;

        recordSessionAudit(
            "SESSION_RESTORED"
        );

        publish(

            SESSION_EVENTS.RESTORED,

            {

                sessionId:
                    currentSession.id,

                restoredAt:
                    nowISO()
            }
        );

        return clone(
            currentSession
        );
    }


    function rotateSession() {

        if (
            !currentSession ||
            !validateSession(
                currentSession,
                {
                    emitEvents:
                        false
                }
            )
        ) {

            return null;
        }

        const previousId =
            currentSession.id;

        currentSession.id =
            createSecureId();

        currentSession.updated =
            now();

        persistSession(
            currentSession,
            false
        );

        replaceRegisteredSession(
            previousId,
            currentSession
        );

        scheduleSessionTimers();

        state.rotations +=
            1;

        recordSessionAudit(

            "SESSION_ROTATED",

            {

                previousSessionId:
                    previousId,

                sessionId:
                    currentSession.id
            }
        );

        publish(

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

        return clone(
            currentSession
        );
    }


    function logout(
        reason =
            LOGOUT_POLICY.USER
    ) {

        const sessionId =
            currentSession?.id ??
            null;

        const userId =
            currentSession?.userId ??
            null;

        clearTimers();

        if (
            sessionId
        ) {

            unregisterSession(
                sessionId
            );
        }

        try {

            STORAGE.remove(
                STORAGE_KEY
            );

        } catch (
            error
        ) {

            rememberError(
                error
            );
        }

        currentSession =
            null;

        lastKnownRisk =
            SESSION_RISK.HIGH;

        state.logouts +=
            1;

        recordSessionAudit(

            "SESSION_LOGOUT",

            {

                sessionId,

                userId,

                reason
            }
        );

        publish(

            SESSION_EVENTS.LOGOUT,

            {

                sessionId,

                reason,

                loggedOutAt:
                    nowISO()
            }
        );

        return true;
    }

    /* ====================================================================
       MULTI-TAB SYNCHRONISATION
    ==================================================================== */

    function handleStorageEvent(
        event
    ) {

        if (
            !event ||
            event.key !==
                `PAY54:${STORAGE_KEY}`
        ) {

            return;
        }

        if (
            event.newValue ===
                null
        ) {

            clearTimers();

            currentSession =
                null;

            lastKnownRisk =
                SESSION_RISK.HIGH;

            state.remoteSyncs +=
                1;

            publish(

                SESSION_EVENTS.LOGOUT,

                {

                    reason:
                        LOGOUT_POLICY.REMOTE,

                    loggedOutAt:
                        nowISO()
                }
            );

            return;
        }

        const session =
            loadPersistedSession();

        if (
            !session ||
            !validateSession(
                session
            )
        ) {

            return;
        }

        currentSession =
            clone(
                session
            );

        registerSession(
            currentSession
        );

        scheduleSessionTimers();

        publishRiskChangeIfNeeded();

        state.remoteSyncs +=
            1;

        publish(

            SESSION_EVENTS.RESTORED,

            {

                sessionId:
                    currentSession.id,

                source:
                    "storage-sync",

                restoredAt:
                    nowISO()
            }
        );
    }

    /* ====================================================================
       VALIDATE / AUTH STATE
    ==================================================================== */

    function checkSessionHealth() {

        if (
            !currentSession
        ) {

            return false;
        }

        const policy =
            evaluateLogoutPolicy();

        if (
            policy !==
            LOGOUT_POLICY.NONE
        ) {

            logout(
                policy
            );

            return false;
        }

        if (
            !validateSession(
                currentSession
            )
        ) {

            logout(
                LOGOUT_POLICY.INVALID
            );

            return false;
        }

        publishRiskChangeIfNeeded();

        return true;
    }


    function isAuthenticated() {

        return Boolean(

            currentSession &&

            currentSession.authenticated ===
                true &&

            checkSessionHealth()
        );
    }

    /* ====================================================================
       DIAGNOSTICS / HEALTH
    ==================================================================== */

    function getDiagnostics() {

        return Object.freeze({

            version:
                VERSION,

            module:
                MODULE_NAME,

            authenticated:
                Boolean(
                    currentSession?.authenticated
                ),

            activeSession:
                currentSession?.id ??
                null,

            risk:
                calculateSessionRisk(),

            trustedDevices:
                getTrustedDevices()
                    .length,

            registeredSessions:
                pruneSessionRegistry()
                    .length,

            auditEntries:
                getSessionAudit()
                    .length,

            storageAvailable:
                Boolean(
                    STORAGE
                        ?.health
                        ?.()
                        ?.healthy
                ),

            eventBusAvailable:
                Boolean(
                    EVENTS
                ),

            refreshTokenStored:
                false,

            activityPersistIntervalMs:
                ACTIVITY_PERSIST_INTERVAL,

            timestamp:
                nowISO()
        });
    }


    function verifyIntegrity() {

        const errors =
            [];

        if (
            !STORAGE ||
            STORAGE
                .health
                ?.()
                ?.healthy !==
                true
        ) {

            errors.push(
                "Secure Storage is unavailable or unhealthy."
            );
        }

        if (
            !REGISTRY ||
            typeof REGISTRY.has !==
                "function"
        ) {

            errors.push(
                "Platform Registry is unavailable."
            );
        }

        if (
            !CONFIG ||
            typeof CONFIG.get !==
                "function"
        ) {

            errors.push(
                "Runtime Config is unavailable."
            );
        }

        if (
            currentSession &&
            !validateSession(
                currentSession,
                {
                    emitEvents:
                        false
                }
            )
        ) {

            errors.push(
                "Current session is invalid."
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


    function health() {

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

            file:
                FILE_PATH,

            startedAt:
                STARTED_AT,

            ready:
                state.ready,

            readyAt:
                state.readyAt,

            activeSession:
                currentSession?.id ??
                null,

            authenticated:
                Boolean(
                    currentSession?.authenticated
                ),

            risk:
                calculateSessionRisk(),

            refreshTokenStored:
                false,

            state:
                Object.freeze({
                    ...state
                }),

            integrity
        });
    }


    function checkDiagnostics() {

        return Object.freeze({

            healthy:
                verifyIntegrity()
                    .ok,

            diagnostics:
                getDiagnostics()
        });
    }

    /* ====================================================================
       LEGACY MFA / BIOMETRIC SAFE COMPATIBILITY

       These remain explicit capability checks rather than simulated auth.
    ==================================================================== */

    function requiresMFA() {

        return false;
    }


    function requestMFA() {

        return false;
    }


    function isBiometricEnabled() {

        return false;
    }


    function getBiometricProvider() {

        return "NONE";
    }


    function requestBiometricAuthentication() {

        return false;
    }

    /* ====================================================================
       PUBLIC API
    ==================================================================== */

    const session =
        Object.freeze({

            id:
                MODULE_ID,

            name:
                MODULE_NAME,

            version:
                VERSION,

            file:
                FILE_PATH,

            start:
                startSession,

            restore:
                restoreSession,

            rotate:
                rotateSession,

            logout,

            keepAlive,

            validate:
                checkSessionHealth,

            trustCurrentDevice,

            getTrustedDevices,

            revokeTrustedDevice,

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

            verifyIntegrity,

            health,

            getCurrent() {

                return currentSession

                    ? clone(
                        currentSession
                    )

                    : null;
            },

            isAuthenticated
        });

    /* ====================================================================
       GLOBAL EXPOSURE
    ==================================================================== */

    Object.defineProperty(

        GLOBAL.PAY54_SECURITY,

        "session",

        {

            value:
                session,

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

    REGISTRY.registerModule(

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
                session,

            health
        })
    );

    /* ====================================================================
       EVENT REGISTRATION
    ==================================================================== */

    GLOBAL.addEventListener(

        "storage",

        handleStorageEvent
    );

    const activityHandler =
        () => {

            if (
                currentSession
            ) {

                updateActivity();
            }
        };

    [
        "pointerdown",
        "keydown",
        "touchstart"
    ]
    .forEach(
        eventName => {

            GLOBAL.addEventListener(

                eventName,

                activityHandler,

                {
                    passive:
                        true
                }
            );
        }
    );

    /* ====================================================================
       STARTUP RESTORE
    ==================================================================== */

    try {

        restoreSession();

    } catch (
        error
    ) {

        rememberError(
            error
        );

        console.error(
            "[PAY54_SESSION] Session restore failed.",
            error
        );
    }

    state.ready =
        true;

    state.readyAt =
        nowISO();

    publish(

        SESSION_EVENTS.READY,

        {

            version:
                VERSION,

            authenticated:
                isAuthenticated(),

            readyAt:
                state.readyAt
        }
    );

    console.info(
        `[PAY54_SESSION] ${MODULE_NAME} v${VERSION} ready.`
    );

})();
