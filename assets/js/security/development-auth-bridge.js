
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE PLATFORM
   --------------------------------------------------------------------------
   File: assets/js/security/development-auth-bridge.js
   Version: v1.0.1
   Module: Development Authentication Bridge

   Purpose
   -------
   Controlled development-only bridge between the existing PAY54 login flow
   and Titan Session Manager v12.

   Security model
   --------------
   • Development / test / staging only
   • Never authenticates in production
   • Requires a short-lived one-time sessionStorage handoff
   • Never reads or persists the user's PIN
   • Never creates access tokens or refresh tokens
   • Consumes and removes the handoff before creating the session
   • Existing valid authenticated Titan sessions are preserved
========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       IDENTITY
    ====================================================================== */

    const GLOBAL =
        window;

    const MODULE_ID =
        "security.development-auth-bridge";

    const MODULE_NAME =
        "PAY54 Development Authentication Bridge";

    const FILE_PATH =
        "assets/js/security/development-auth-bridge.js";

    const VERSION =
        "1.0.1";

    const STARTED_AT =
        new Date()
            .toISOString();

    /* ======================================================================
       HANDOFF CONTRACT
    ====================================================================== */

    const HANDOFF_KEY =
        "pay54_dev_auth_handoff";

    const HANDOFF_SCHEMA =
        "PAY54-DEV-AUTH-HANDOFF-V1";

    const MAX_HANDOFF_AGE_MS =
        60 * 1000;

    /* ======================================================================
       DEPENDENCIES
    ====================================================================== */

    const CONFIG =
        GLOBAL.PAY54_CONFIG ||
        null;

    const REGISTRY =
        GLOBAL.PAY54_REGISTRY ||
        null;

    const EVENTS =
        GLOBAL.PAY54_EVENTS ||
        null;

    const SESSION =
        GLOBAL.PAY54_SECURITY?.session ||
        null;

    if (
        !CONFIG ||
        typeof CONFIG.isProduction !==
            "function"
    ) {

        throw new Error(
            "[PAY54_DEV_AUTH_BRIDGE] Runtime Config must load before the authentication bridge."
        );
    }

    if (
        !REGISTRY ||
        typeof REGISTRY.registerModule !==
            "function"
    ) {

        throw new Error(
            "[PAY54_DEV_AUTH_BRIDGE] Platform Registry must load before the authentication bridge."
        );
    }

    if (
        !SESSION ||
        typeof SESSION.start !==
            "function" ||
        typeof SESSION.getCurrent !==
            "function" ||
        typeof SESSION.isAuthenticated !==
            "function"
    ) {

        throw new Error(
            "[PAY54_DEV_AUTH_BRIDGE] Titan Session Manager v12 must load before the authentication bridge."
        );
    }

    /* ======================================================================
       PRIVATE STATE
    ====================================================================== */

    const state = {

        ready:
            false,

        enabled:
            false,

        attempted:
            false,

        authenticated:
            false,

        handoffConsumed:
            false,

        existingSessionPreserved:
            false,

        rejectionReason:
            null,

        readyAt:
            null,

        lastError:
            null
    };

    /* ======================================================================
       UTILITIES
    ====================================================================== */

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

            return false;
        }
    }


    function isAllowedEnvironment() {

        return (
            CONFIG.isDevelopment?.() === true ||
            CONFIG.isTest?.() === true ||
            CONFIG.isStaging?.() === true
        );
    }


    function consumeHandoffRaw() {

        let raw =
            null;

        try {

            raw =
                sessionStorage.getItem(
                    HANDOFF_KEY
                );

        } finally {

            /*
             * One-time use is enforced regardless of validity.
             */
            sessionStorage.removeItem(
                HANDOFF_KEY
            );

            if (
                raw !== null
            ) {

                state.handoffConsumed =
                    true;
            }
        }

        return raw;
    }


    function parseHandoff(
        raw
    ) {

        if (
            typeof raw !==
                "string" ||
            !raw
        ) {

            return null;
        }

        try {

            const parsed =
                JSON.parse(
                    raw
                );

            return isPlainObject(
                parsed
            )
                ? parsed
                : null;

        } catch {

            return null;
        }
    }


    function validateHandoff(
        handoff
    ) {

        if (
            !isPlainObject(
                handoff
            )
        ) {

            return {
                ok:
                    false,

                reason:
                    "HANDOFF_INVALID"
            };
        }

        if (
            handoff.schema !==
                HANDOFF_SCHEMA
        ) {

            return {
                ok:
                    false,

                reason:
                    "HANDOFF_SCHEMA_INVALID"
            };
        }

        const email =
            String(
                handoff.email ||
                ""
            )
            .trim()
            .toLowerCase();

        if (
            !email ||
            !email.includes("@")
        ) {

            return {
                ok:
                    false,

                reason:
                    "HANDOFF_EMAIL_INVALID"
            };
        }

        if (
            !Number.isFinite(
                handoff.issuedAt
            ) ||
            !Number.isFinite(
                handoff.expiresAt
            )
        ) {

            return {
                ok:
                    false,

                reason:
                    "HANDOFF_TIME_INVALID"
            };
        }

        const timestamp =
            now();

        if (
            handoff.expiresAt <=
                timestamp
        ) {

            return {
                ok:
                    false,

                reason:
                    "HANDOFF_EXPIRED"
            };
        }

        if (
            handoff.issuedAt >
                timestamp
        ) {

            return {
                ok:
                    false,

                reason:
                    "HANDOFF_TIME_INVALID"
            };
        }

        if (
            timestamp -
                handoff.issuedAt >
                MAX_HANDOFF_AGE_MS
        ) {

            return {
                ok:
                    false,

                reason:
                    "HANDOFF_TOO_OLD"
            };
        }

        const nonce =
            String(
                handoff.nonce ||
                ""
            );

        if (
            !/^[a-f0-9]{32}$/i.test(
                nonce
            )
        ) {

            return {
                ok:
                    false,

                reason:
                    "HANDOFF_NONCE_INVALID"
            };
        }

        return {

            ok:
                true,

            email
        };
    }

    /* ======================================================================
       AUTHENTICATION HANDOFF
    ====================================================================== */

    function establishDevelopmentSession() {

        state.attempted =
            true;

        if (
            CONFIG.isProduction() ===
                true
        ) {

            state.enabled =
                false;

            state.rejectionReason =
                "PRODUCTION_DISABLED";

            publish(
                "security.development-auth.disabled",
                {
                    reason:
                        state.rejectionReason
                }
            );

            return false;
        }

        if (
            !isAllowedEnvironment()
        ) {

            state.enabled =
                false;

            state.rejectionReason =
                "ENVIRONMENT_NOT_ALLOWED";

            return false;
        }

        state.enabled =
            true;

        /*
         * Preserve an already authenticated Titan session.
         * This is the normal path on an authenticated page refresh.
         */
        if (
            SESSION.isAuthenticated() ===
                true
        ) {

            state.authenticated =
                true;

            state.existingSessionPreserved =
                true;

            publish(
                "security.development-auth.session-preserved",
                {
                    sessionId:
                        SESSION
                            .getCurrent()
                            ?.id ||
                        null
                }
            );

            return true;
        }

        const raw =
            consumeHandoffRaw();

        if (
            raw ===
                null
        ) {

            state.rejectionReason =
                "HANDOFF_MISSING";

            return false;
        }

        const handoff =
            parseHandoff(
                raw
            );

        const validation =
            validateHandoff(
                handoff
            );

        if (
            validation.ok !==
                true
        ) {

            state.rejectionReason =
                validation.reason;

            publish(
                "security.development-auth.rejected",
                {
                    reason:
                        validation.reason
                }
            );

            return false;
        }

        /*
         * The bridge establishes authenticated session state only because
         * the existing development login flow has already validated the
         * development credentials and issued the one-time handoff.
         *
         * No PIN, password or token is copied into session state.
         */
        const created =
            SESSION.start({

                authenticated:
                    true,

                userId:
                    validation.email,

                roles: [
                    "customer"
                ],

                metadata: {

                    authenticationSource:
                        "development-login",

                    developmentBridge:
                        true,

                    handoffSchema:
                        HANDOFF_SCHEMA
                }
            });

        if (
            !created ||
            SESSION.isAuthenticated() !==
                true
        ) {

            state.rejectionReason =
                "SESSION_ESTABLISHMENT_FAILED";

            return false;
        }

        state.authenticated =
            true;

        state.rejectionReason =
            null;

        publish(
            "security.development-auth.authenticated",
            {
                sessionId:
                    created.id,

                userId:
                    validation.email
            }
        );

        return true;
    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    function verifyIntegrity() {

        const errors =
            [];

        if (
            CONFIG.isProduction() ===
                true &&
            state.authenticated ===
                true
        ) {

            errors.push(
                "Development authentication must never authenticate in production."
            );
        }

        /*
         * A successfully established session can expire or be logged out
         * independently of this development-only handoff module. That is
         * expected Session Manager behaviour, not a bridge integrity fault.
         * Live authentication is reported by health() below.
         */
        if (
            state.authenticated === true &&
            state.attempted !== true
        ) {

            errors.push(
                "Bridge session success was recorded without an authentication attempt."
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

        /*
         * state.authenticated records that this bridge once succeeded.
         * Only Titan Session Manager can attest to current authentication.
         * Never present historical bridge success as a live session.
         */
        let currentlyAuthenticated =
            false;

        try {
            currentlyAuthenticated =
                state.authenticated === true &&
                SESSION.isAuthenticated() === true &&
                SESSION.getCurrent()?.authenticated === true;
        } catch (error) {
            rememberError(error);
        }

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

            environment:
                CONFIG.get(
                    "environment.name",
                    null
                ),

            enabled:
                state.enabled,

            attempted:
                state.attempted,

            authenticated:
                currentlyAuthenticated,

            handoffConsumed:
                state.handoffConsumed,

            existingSessionPreserved:
                state.existingSessionPreserved,

            rejectionReason:
                state.rejectionReason,

            ready:
                state.ready,

            readyAt:
                state.readyAt,

            lastError:
                state.lastError,

            integrity
        });
    }

    /* ======================================================================
       PUBLIC API
    ====================================================================== */

    const API =
        Object.freeze({

            id:
                MODULE_ID,

            name:
                MODULE_NAME,

            version:
                VERSION,

            file:
                FILE_PATH,

            establish:
                establishDevelopmentSession,

            verifyIntegrity,

            health
        });

    /* ======================================================================
       GLOBAL EXPOSURE
    ====================================================================== */

    Object.defineProperty(

        GLOBAL,

        "PAY54_DEVELOPMENT_AUTH_BRIDGE",

        {

            value:
                API,

            writable:
                false,

            configurable:
                false,

            enumerable:
                true
        }
    );

    /* ======================================================================
       REGISTRY
    ====================================================================== */

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
                "security-development",

            layer:
                "layer.security",

            path:
                FILE_PATH,

            api:
                API,

            health
        })
    );

    /* ======================================================================
       STARTUP
    ====================================================================== */

    try {

        establishDevelopmentSession();

    } catch (
        error
    ) {

        rememberError(
            error
        );

        state.rejectionReason =
            "UNEXPECTED_ERROR";

        console.error(
            "[PAY54_DEV_AUTH_BRIDGE] Development authentication handoff failed.",
            error
        );
    }

    state.ready =
        true;

    state.readyAt =
        nowISO();

    publish(
        "security.development-auth.ready",
        {
            authenticated:
                state.authenticated,

            enabled:
                state.enabled,

            readyAt:
                state.readyAt
        }
    );

    console.info(
        `[PAY54_DEV_AUTH_BRIDGE] ${MODULE_NAME} v${VERSION} ready — authenticated=${state.authenticated}.`
    );

})();
