"use strict";

/* ========================================================================
   PAY54 ENTERPRISE PLATFORM
   ------------------------------------------------------------------------
   File: assets/js/security/transaction-guard.js
   Version: v12.0.0
   Module: Titan Enterprise Transaction Guard
   Status: Production Candidate

   Purpose
   -------
   Canonical client-side transaction authorization boundary for Project Titan.

   Security model
   --------------
   • Fail closed when required security dependencies are unavailable.
   • Never performs, retries, reverses or mutates a financial transaction.
   • Never claims server-side fraud/AML clearance from browser heuristics.
   • Real-money mode is blocked unless authoritative risk controls are present.
   • Duplicate protection is keyed by stable operation identifiers, not amount.
   • Legacy boolean validate(...) remains supported for existing UI consumers.
======================================================================== */

(() => {

    "use strict";

    const GLOBAL =
        window;

    const MODULE_ID =
        "security.transaction-guard";

    const MODULE_NAME =
        "PAY54 Titan Enterprise Transaction Guard";

    const FILE_PATH =
        "assets/js/security/transaction-guard.js";

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

    const SECURITY =
        GLOBAL.PAY54_SECURITY ||
        null;

    const SESSION =
        SECURITY?.session ||
        null;

    const STORAGE =
        SECURITY?.storage ||
        null;

    const VALIDATOR =
        SECURITY?.validator ||
        null;

    const SANITIZER =
        SECURITY?.sanitizer ||
        null;

    if (
        !REGISTRY ||
        typeof REGISTRY.registerModule !==
            "function"
    ) {

        throw new Error(
            "[PAY54_GUARD] Platform Registry must load before Transaction Guard."
        );
    }

    if (
        !CONFIG ||
        typeof CONFIG.get !==
            "function"
    ) {

        throw new Error(
            "[PAY54_GUARD] Runtime Config must load before Transaction Guard."
        );
    }

    if (
        !SESSION ||
        typeof SESSION.isAuthenticated !==
            "function"
    ) {

        throw new Error(
            "[PAY54_GUARD] Session Manager v12 must load before Transaction Guard."
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
            "[PAY54_GUARD] Secure Storage v12 must load before Transaction Guard."
        );
    }

    if (
        !VALIDATOR ||
        VALIDATOR.version !==
            "12.0.0"
    ) {

        throw new Error(
            "[PAY54_GUARD] Validator v12 must load before Transaction Guard."
        );
    }

    if (
        !SANITIZER ||
        SANITIZER.version !==
            "12.0.0"
    ) {

        throw new Error(
            "[PAY54_GUARD] Sanitizer v12 must load before Transaction Guard."
        );
    }

    /* ====================================================================
       SAFE RELOAD GUARD
    ==================================================================== */

    const existing =
        SECURITY?.transactionGuard ||
        null;

    if (
        existing
    ) {

        if (
            existing.id ===
                MODULE_ID &&
            existing.version ===
                VERSION &&
            typeof existing.validate ===
                "function" &&
            typeof existing.evaluateTransaction ===
                "function"
        ) {

            console.info(
                "[PAY54_GUARD] Existing Titan Transaction Guard preserved."
            );

            return;
        }

        throw new Error(
            "[PAY54_GUARD] PAY54_SECURITY.transactionGuard already exists with an incompatible contract."
        );
    }

    /* ====================================================================
       CONSTANTS
    ==================================================================== */

    const AUDIT_KEY =
        "transaction_guard_audit";

    const MAX_AUDIT_ENTRIES =
        500;

    const DUPLICATE_WINDOW_MS =
        60_000;

    const VELOCITY_WINDOW_MS =
        60_000;

    const MAX_TRANSACTIONS_PER_WINDOW =
        10;

    const EVENTS_MAP =
        Object.freeze({

            APPROVED:
                "guard.approved",

            REJECTED:
                "guard.rejected",

            WARNING:
                "guard.warning",

            DUPLICATE:
                "guard.duplicate",

            LIMIT:
                "guard.limit",

            FRAUD:
                "guard.fraud",

            AML:
                "guard.aml",

            READY:
                "security.transaction-guard.ready"
        });

    const DEFAULT_POLICY =
        Object.freeze({

            enabled:
                true,

            requireSession:
                true,

            validateAmounts:
                true,

            validateWalletsWhenPresent:
                true,

            validateCurrency:
                true,

            validatePayloads:
                true,

            duplicateProtection:
                true,

            velocityProtection:
                true,

            advisoryRiskChecks:
                true,

            auditEvents:
                true,

            duplicateWindowMs:
                DUPLICATE_WINDOW_MS,

            velocityWindowMs:
                VELOCITY_WINDOW_MS,

            maxTransactionsPerWindow:
                MAX_TRANSACTIONS_PER_WINDOW
        });

    const PROTECTED_POLICY_KEYS =
        new Set([

            "enabled",

            "requireSession",

            "validateAmounts",

            "validateCurrency",

            "validatePayloads"
        ]);

    /* ====================================================================
       PRIVATE STATE
    ==================================================================== */

    let activePolicy = {

        ...DEFAULT_POLICY
    };

    const duplicateCache =
        new Map();

    const velocityCache =
        new Map();

    const state = {

        ready:
            false,

        readyAt:
            null,

        evaluations:
            0,

        approvals:
            0,

        rejections:
            0,

        duplicates:
            0,

        velocityBlocks:
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


    function secureId() {

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

            return (
                `${hex.slice(0, 8)}-` +
                `${hex.slice(8, 12)}-` +
                `${hex.slice(12, 16)}-` +
                `${hex.slice(16, 20)}-` +
                `${hex.slice(20)}`
            );
        }

        throw new Error(
            "[PAY54_GUARD] Cryptographically secure identifiers are unavailable."
        );
    }


    function clone(
        value
    ) {

        if (
            typeof structuredClone ===
                "function"
        ) {

            return structuredClone(
                value
            );
        }

        return JSON.parse(
            JSON.stringify(
                value
            )
        );
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

    /* ====================================================================
       RESULTS
    ==================================================================== */

    function createResult(
        approved,
        reason = null,
        warnings = [],
        details = {}
    ) {

        state.evaluations +=
            1;

        if (
            approved ===
                true
        ) {

            state.approvals +=
                1;

        } else {

            state.rejections +=
                1;
        }

        return Object.freeze({

            approved:
                approved ===
                true,

            reason:
                reason ===
                    null

                    ? null

                    : String(
                        reason
                    ),

            warnings:
                Object.freeze(

                    Array.from(

                        new Set(

                            Array.isArray(
                                warnings
                            )

                                ? warnings.map(
                                    String
                                )

                                : []
                        )
                    )
                ),

            details:
                Object.freeze({

                    ...(
                        details &&
                        typeof details ===
                            "object"

                            ? details

                            : {}
                    )
                }),

            reference:
                secureId(),

            timestamp:
                nowISO()
        });
    }

    /* ====================================================================
       AUDIT
    ==================================================================== */

    function getTransactionAudit() {

        const value =
            STORAGE.get(
                AUDIT_KEY,
                []
            );

        return Array.isArray(
            value
        )

            ? value

            : [];
    }


    function saveTransactionAudit(
        entries
    ) {

        const normalized =
            Array.isArray(
                entries
            )

                ? entries.slice(
                    -MAX_AUDIT_ENTRIES
                )

                : [];

        STORAGE.set(
            AUDIT_KEY,
            normalized
        );
    }


    function recordTransactionAudit(
        action,
        details = {}
    ) {

        if (
            activePolicy.auditEvents !==
                true
        ) {

            return false;
        }

        const entries =
            getTransactionAudit();

        entries.push({

            id:
                secureId(),

            action:
                String(
                    action ||
                    "GUARD_EVENT"
                ),

            timestamp:
                nowISO(),

            details: {

                transactionId:
                    details.transactionId ??
                    null,

                reference:
                    details.reference ??
                    null,

                type:
                    details.type ??
                    null,

                currency:
                    details.currency ??
                    null,

                reason:
                    details.reason ??
                    null,

                riskLevel:
                    details.riskLevel ??
                    null
            }
        });

        saveTransactionAudit(
            entries
        );

        return true;
    }

    /* ====================================================================
       POLICY
    ==================================================================== */

    function getPolicy() {

        return Object.freeze({

            ...activePolicy
        });
    }


    function updatePolicy(
        updates = {}
    ) {

        if (
            !updates ||
            typeof updates !==
                "object" ||
            Array.isArray(
                updates
            )
        ) {

            throw new TypeError(
                "[PAY54_GUARD] Policy updates must be a plain object."
            );
        }

        const isProduction =
            CONFIG.isProduction?.() ===
            true;

        const realMoneyMode =
            CONFIG.get(
                "environment.realMoneyMode"
            ) ===
            true;

        const next = {

            ...activePolicy
        };

        for (
            const [
                key,
                value
            ]
            of Object.entries(
                updates
            )
        ) {

            if (
                !Object.prototype
                    .hasOwnProperty
                    .call(
                        DEFAULT_POLICY,
                        key
                    )
            ) {

                throw new Error(
                    `[PAY54_GUARD] Unknown policy key: ${key}.`
                );
            }

            if (
                (
                    isProduction ||
                    realMoneyMode
                ) &&
                PROTECTED_POLICY_KEYS.has(
                    key
                ) &&
                value !==
                    true
            ) {

                throw new Error(
                    `[PAY54_GUARD] Protected policy ${key} cannot be disabled in production/real-money mode.`
                );
            }

            if (
                [
                    "duplicateWindowMs",
                    "velocityWindowMs",
                    "maxTransactionsPerWindow"
                ]
                .includes(
                    key
                )
            ) {

                if (
                    !Number.isFinite(
                        value
                    ) ||
                    value <=
                        0
                ) {

                    throw new Error(
                        `[PAY54_GUARD] Policy ${key} must be a positive finite number.`
                    );
                }

            } else if (
                typeof value !==
                    "boolean"
            ) {

                throw new Error(
                    `[PAY54_GUARD] Policy ${key} must be boolean.`
                );
            }

            next[key] =
                value;
        }

        activePolicy =
            next;

        publish(

            EVENTS_MAP.WARNING,

            {

                stage:
                    "policy",

                updated:
                    Object.keys(
                        updates
                    )
            }
        );

        return getPolicy();
    }

    /* ====================================================================
       SESSION VALIDATION
    ==================================================================== */

    function validateSession() {

        if (
            activePolicy.requireSession !==
                true
        ) {

            return createResult(
                true
            );
        }

        if (
            !SESSION ||
            typeof SESSION.isAuthenticated !==
                "function"
        ) {

            return createResult(
                false,
                "SESSION_ENGINE_UNAVAILABLE"
            );
        }

        if (
            SESSION.isAuthenticated() !==
                true
        ) {

            publish(

                EVENTS_MAP.REJECTED,

                {

                    stage:
                        "session",

                    reason:
                        "SESSION_REQUIRED"
                }
            );

            return createResult(
                false,
                "SESSION_REQUIRED"
            );
        }

        return createResult(
            true
        );
    }

    /* ====================================================================
       WALLET VALIDATION
    ==================================================================== */

    function validateWallet(
        walletId
    ) {

        if (
            activePolicy.validateWalletsWhenPresent !==
                true
        ) {

            return createResult(
                true
            );
        }

        const value =
            String(
                walletId ??
                ""
            )
            .trim();

        /*
         * Current Project Titan ledger entries do not yet carry a canonical
         * walletId on every entry. Missing wallet IDs therefore remain
         * compatible, while supplied wallet IDs must validate strictly.
         */
        if (
            !value
        ) {

            return createResult(

                true,

                null,

                [
                    "WALLET_ID_NOT_SUPPLIED"
                ]
            );
        }

        const validation =
            VALIDATOR.walletId(
                value
            );

        return validation.valid ===
            true

            ? createResult(
                true
            )

            : createResult(
                false,
                "INVALID_WALLET"
            );
    }

    /* ====================================================================
       AMOUNT / CURRENCY / PAYLOAD
    ==================================================================== */

    function validateAmount(
        amount
    ) {

        if (
            activePolicy.validateAmounts !==
                true
        ) {

            return createResult(
                true
            );
        }

        const numeric =
            Number(
                amount
            );

        if (
            !Number.isFinite(
                numeric
            ) ||
            numeric <=
                0
        ) {

            return createResult(
                false,
                "INVALID_AMOUNT"
            );
        }

        const validation =
            VALIDATOR.amount(

                numeric,

                Number.MIN_VALUE,

                Number.MAX_SAFE_INTEGER
            );

        return validation.valid ===
            true

            ? createResult(
                true
            )

            : createResult(
                false,
                "INVALID_AMOUNT"
            );
    }


    function validateCurrency(
        currency
    ) {

        if (
            activePolicy.validateCurrency !==
                true
        ) {

            return createResult(
                true
            );
        }

        const validation =
            VALIDATOR.currency(

                String(
                    currency ??
                    ""
                )
                .toUpperCase()
            );

        return validation.valid ===
            true

            ? createResult(
                true
            )

            : createResult(
                false,
                "INVALID_CURRENCY"
            );
    }


    function validatePayload(
        payload
    ) {

        if (
            activePolicy.validatePayloads !==
                true
        ) {

            return createResult(
                true
            );
        }

        if (
            payload ===
                undefined ||
            payload ===
                null
        ) {

            return createResult(
                true
            );
        }

        if (
            typeof payload !==
                "object" ||
            Array.isArray(
                payload
            )
        ) {

            return createResult(
                false,
                "INVALID_PAYLOAD"
            );
        }

        const validation =
            VALIDATOR.payload(
                payload
            );

        return validation.valid ===
            true

            ? createResult(
                true
            )

            : createResult(
                false,
                "INVALID_PAYLOAD"
            );
    }

    /* ====================================================================
       SANITIZATION / CONTEXT
    ==================================================================== */

    function sanitizeTransaction(
        transaction
    ) {

        if (
            !transaction ||
            typeof transaction !==
                "object" ||
            Array.isArray(
                transaction
            )
        ) {

            throw new TypeError(
                "[PAY54_GUARD] Transaction must be an object."
            );
        }

        const sanitized =
            SANITIZER.securePayload(
                transaction
            );

        return clone(
            sanitized.value
        );
    }


    function createContext(
        transaction = {}
    ) {

        if (
            !transaction ||
            typeof transaction !==
                "object" ||
            Array.isArray(
                transaction
            )
        ) {

            throw new TypeError(
                "[PAY54_GUARD] Transaction context must be an object."
            );
        }

        const context =
            clone(
                transaction
            );

        context.reference =
            String(

                context.reference ||
                context.id ||
                secureId()
            );

        context.createdAt =
            context.createdAt ||
            nowISO();

        context.guardVersion =
            VERSION;

        return context;
    }

    /* ====================================================================
       IDEMPOTENCY / REPLAY
    ==================================================================== */

    function stableOperationKey(
        transaction
    ) {

        const candidates = [

            transaction?.idempotencyKey,

            transaction?.operationId,

            transaction?.id,

            transaction?.reference
        ];

        for (
            const candidate
            of candidates
        ) {

            const value =
                String(
                    candidate ??
                    ""
                )
                .trim();

            if (
                value
            ) {

                return value
                    .toLowerCase();
            }
        }

        return null;
    }


    function cleanupCaches() {

        const timestamp =
            now();

        for (
            const [
                key,
                value
            ]
            of duplicateCache
        ) {

            if (
                (
                    timestamp -
                    value
                ) >
                activePolicy
                    .duplicateWindowMs
            ) {

                duplicateCache.delete(
                    key
                );
            }
        }

        for (
            const [
                key,
                history
            ]
            of velocityCache
        ) {

            const recent =
                history.filter(
                    value =>
                        (
                            timestamp -
                            value
                        ) <
                        activePolicy
                            .velocityWindowMs
                );

            if (
                recent.length
            ) {

                velocityCache.set(
                    key,
                    recent
                );

            } else {

                velocityCache.delete(
                    key
                );
            }
        }
    }


    function detectDuplicate(
        transaction,
        options = {}
    ) {

        if (
            activePolicy.duplicateProtection !==
                true
        ) {

            return createResult(
                true
            );
        }

        cleanupCaches();

        const key =
            stableOperationKey(
                transaction
            );

        if (
            !key
        ) {

            return createResult(

                true,

                null,

                [
                    "IDEMPOTENCY_KEY_NOT_SUPPLIED"
                ]
            );
        }

        const previous =
            duplicateCache.get(
                key
            );

        if (
            previous &&
            (
                now() -
                previous
            ) <
            activePolicy
                .duplicateWindowMs
        ) {

            state.duplicates +=
                1;

            publish(

                EVENTS_MAP.DUPLICATE,

                {
                    key
                }
            );

            return createResult(
                false,
                "DUPLICATE_TRANSACTION"
            );
        }

        if (
            options.commit !==
                false
        ) {

            duplicateCache.set(
                key,
                now()
            );
        }

        return createResult(
            true
        );
    }


    function resolveVelocityKey(
        transaction
    ) {

        const walletId =
            String(
                transaction?.walletId ??
                ""
            )
            .trim();

        if (
            walletId
        ) {

            return (
                `wallet:${walletId}`
            );
        }

        const sessionUser =
            SESSION
                .getCurrent
                ?.()
                ?.userId;

        if (
            sessionUser
        ) {

            return (
                "user:" +
                String(
                    sessionUser
                )
                .toLowerCase()
            );
        }

        return null;
    }


    function checkVelocity(
        subject
    ) {

        if (
            activePolicy.velocityProtection !==
                true
        ) {

            return createResult(
                true
            );
        }

        const key =
            typeof subject ===
                "object"

                ? resolveVelocityKey(
                    subject
                )

                : (
                    String(
                        subject ??
                        ""
                    )
                    .trim() ||
                    null
                );

        if (
            !key
        ) {

            return createResult(

                true,

                null,

                [
                    "VELOCITY_SUBJECT_NOT_AVAILABLE"
                ]
            );
        }

        cleanupCaches();

        const timestamp =
            now();

        const recent =
            (
                velocityCache.get(
                    key
                ) ||
                []
            )
            .filter(
                value =>
                    (
                        timestamp -
                        value
                    ) <
                    activePolicy
                        .velocityWindowMs
            );

        if (
            recent.length >=
            activePolicy
                .maxTransactionsPerWindow
        ) {

            state.velocityBlocks +=
                1;

            publish(

                EVENTS_MAP.LIMIT,

                {
                    key
                }
            );

            return createResult(
                false,
                "VELOCITY_LIMIT"
            );
        }

        recent.push(
            timestamp
        );

        velocityCache.set(
            key,
            recent
        );

        return createResult(
            true
        );
    }


    function preventReplay(
        context
    ) {

        const duplicate =
            detectDuplicate(
                context
            );

        if (
            !duplicate.approved
        ) {

            return duplicate;
        }

        const velocity =
            checkVelocity(
                context
            );

        if (
            !velocity.approved
        ) {

            return velocity;
        }

        return createResult(

            true,

            null,

            [
                ...duplicate.warnings,
                ...velocity.warnings
            ]
        );
    }

    /* ====================================================================
       AUTHORIZATION
    ==================================================================== */

    function authorize(
        transaction
    ) {

        let context;

        try {

            const payload =
                validatePayload(
                    transaction
                );

            if (
                !payload.approved
            ) {

                return payload;
            }

            context =
                createContext(

                    sanitizeTransaction(
                        transaction
                    )
                );

        } catch (
            error
        ) {

            rememberError(
                error
            );

            return createResult(
                false,
                "INVALID_TRANSACTION_STRUCTURE"
            );
        }

        const session =
            validateSession();

        if (
            !session.approved
        ) {

            return session;
        }

        const wallet =
            validateWallet(
                context.walletId
            );

        if (
            !wallet.approved
        ) {

            return wallet;
        }

        const amount =
            validateAmount(
                context.amount
            );

        if (
            !amount.approved
        ) {

            return amount;
        }

        const currency =
            validateCurrency(
                context.currency
            );

        if (
            !currency.approved
        ) {

            return currency;
        }

        const warnings = [

            ...wallet.warnings,

            ...amount.warnings,

            ...currency.warnings
        ];

        publish(

            EVENTS_MAP.APPROVED,

            {

                reference:
                    context.reference,

                stage:
                    "authorization"
            }
        );

        return createResult(

            true,

            null,

            warnings,

            {
                contextReference:
                    context.reference
            }
        );
    }


    function authorizeTransaction(
        transaction
    ) {

        let context;

        try {

            context =
                createContext(

                    sanitizeTransaction(
                        transaction
                    )
                );

        } catch (
            error
        ) {

            rememberError(
                error
            );

            return createResult(
                false,
                "INVALID_TRANSACTION_STRUCTURE"
            );
        }

        const authorization =
            authorize(
                context
            );

        if (
            !authorization.approved
        ) {

            return authorization;
        }

        const replay =
            preventReplay(
                context
            );

        if (
            !replay.approved
        ) {

            return replay;
        }

        recordTransactionAudit(

            "TRANSACTION_AUTHORISED",

            {

                transactionId:
                    context.id ??
                    null,

                reference:
                    context.reference,

                type:
                    context.type ??
                    null,

                currency:
                    context.currency ??
                    null
            }
        );

        publish(

            EVENTS_MAP.APPROVED,

            {

                reference:
                    context.reference,

                pipeline:
                    "transaction"
            }
        );

        return createResult(

            true,

            null,

            [
                ...authorization.warnings,
                ...replay.warnings
            ],

            {
                contextReference:
                    context.reference
            }
        );
    }

    /* ====================================================================
       CLIENT-SIDE RISK ADVISORY
    ==================================================================== */

    function calculateRiskScore(
        context = {}
    ) {

        let score =
            0;

        const reasons =
            [];

        /*
         * Currency-neutral amount thresholds are deliberately NOT used.
         * NGN/GBP/USD values are not directly comparable.
         */

        if (
            !String(
                context.beneficiary ??
                context.recipient ??
                ""
            )
            .trim()
        ) {

            score +=
                10;

            reasons.push(
                "BENEFICIARY_NOT_SUPPLIED"
            );
        }

        if (
            context.meta
                ?.newBeneficiary ===
            true
        ) {

            score +=
                20;

            reasons.push(
                "NEW_BENEFICIARY"
            );
        }

        if (
            context.meta
                ?.crossBorder ===
            true
        ) {

            score +=
                10;

            reasons.push(
                "CROSS_BORDER"
            );
        }

        if (
            context.meta
                ?.deviceChanged ===
            true
        ) {

            score +=
                20;

            reasons.push(
                "DEVICE_CHANGED"
            );
        }

        if (
            context.meta
                ?.riskSignal ===
            "HIGH"
        ) {

            score +=
                50;

            reasons.push(
                "HIGH_RISK_SIGNAL"
            );
        }

        return Object.freeze({

            score,

            level:
                score >=
                    70

                    ? "HIGH"

                    : score >=
                        30

                        ? "MEDIUM"

                        : "LOW",

            reasons:
                Object.freeze(
                    reasons
                ),

            authoritative:
                false
        });
    }


    function classifyRisk(
        score
    ) {

        const numeric =
            Number(
                score
            );

        if (
            !Number.isFinite(
                numeric
            ) ||
            numeric <
                0
        ) {

            return "UNKNOWN";
        }

        if (
            numeric >=
            70
        ) {

            return "HIGH";
        }

        if (
            numeric >=
            30
        ) {

            return "MEDIUM";
        }

        return "LOW";
    }


    function evaluateFraud(
        context
    ) {

        const risk =
            calculateRiskScore(
                context
            );

        publish(

            EVENTS_MAP.FRAUD,

            {

                reference:
                    context.reference,

                score:
                    risk.score,

                level:
                    risk.level,

                authoritative:
                    false
            }
        );

        return createResult(

            true,

            null,

            [
                "CLIENT_FRAUD_ASSESSMENT_ADVISORY_ONLY",
                ...risk.reasons
            ],

            {

                riskScore:
                    risk.score,

                riskLevel:
                    risk.level,

                authoritative:
                    false
            }
        );
    }


    function evaluateAML(
        context
    ) {

        publish(

            EVENTS_MAP.AML,

            {

                reference:
                    context.reference,

                authoritative:
                    false
            }
        );

        return createResult(

            true,

            null,

            [
                "AML_PROVIDER_NOT_INTEGRATED"
            ],

            {
                authoritative:
                    false
            }
        );
    }


    function liveRiskControlsAvailable() {

        return Boolean(

            GLOBAL
                .PAY54_RISK_PROVIDER
                ?.authoritative ===
            true &&

            GLOBAL
                .PAY54_AML_PROVIDER
                ?.authoritative ===
            true
        );
    }

    /* ====================================================================
       FINAL FINANCIAL PIPELINE
    ==================================================================== */

    function evaluateTransaction(
        transaction
    ) {

        if (
            activePolicy.enabled !==
                true
        ) {

            return createResult(
                false,
                "GUARD_DISABLED"
            );
        }

        const realMoneyMode =
            CONFIG.get(
                "environment.realMoneyMode"
            ) ===
            true;

        /*
         * Browser-only risk hooks cannot authorize real money.
         */
        if (
            realMoneyMode &&
            !liveRiskControlsAvailable()
        ) {

            recordTransactionAudit(

                "TRANSACTION_BLOCKED",

                {

                    transactionId:
                        transaction?.id ??
                        null,

                    reference:
                        transaction
                            ?.reference ??
                        null,

                    type:
                        transaction?.type ??
                        null,

                    currency:
                        transaction
                            ?.currency ??
                        null,

                    reason:
                        "AUTHORITATIVE_RISK_CONTROLS_UNAVAILABLE"
                }
            );

            return createResult(
                false,
                "AUTHORITATIVE_RISK_CONTROLS_UNAVAILABLE"
            );
        }

        let context;

        try {

            context =
                createContext(

                    sanitizeTransaction(
                        transaction
                    )
                );

        } catch (
            error
        ) {

            rememberError(
                error
            );

            return createResult(
                false,
                "INVALID_TRANSACTION_STRUCTURE"
            );
        }

        const authorization =
            authorizeTransaction(
                context
            );

        if (
            !authorization.approved
        ) {

            recordTransactionAudit(

                "TRANSACTION_REJECTED",

                {

                    transactionId:
                        context.id ??
                        null,

                    reference:
                        context.reference,

                    type:
                        context.type ??
                        null,

                    currency:
                        context.currency ??
                        null,

                    reason:
                        authorization.reason
                }
            );

            return authorization;
        }

        const warnings = [

            ...authorization.warnings
        ];

        if (
            activePolicy.advisoryRiskChecks ===
                true
        ) {

            const fraud =
                evaluateFraud(
                    context
                );

            const aml =
                evaluateAML(
                    context
                );

            warnings.push(
                ...fraud.warnings,
                ...aml.warnings
            );
        }

        recordTransactionAudit(

            "TRANSACTION_APPROVED",

            {

                transactionId:
                    context.id ??
                    null,

                reference:
                    context.reference,

                type:
                    context.type ??
                    null,

                currency:
                    context.currency ??
                    null,

                riskLevel:
                    calculateRiskScore(
                        context
                    ).level
            }
        );

        publish(

            EVENTS_MAP.APPROVED,

            {

                reference:
                    context.reference,

                pipeline:
                    "final"
            }
        );

        return createResult(

            true,

            null,

            warnings,

            {

                contextReference:
                    context.reference,

                realMoneyMode,

                authoritativeRiskControls:
                    liveRiskControlsAvailable()
            }
        );
    }

    /* ====================================================================
       LEGACY BOOLEAN COMPATIBILITY
       Used by dashboard-core.js, cards.js and wallet.js.
    ==================================================================== */

    function validate(
        request = {}
    ) {

        if (
            activePolicy.enabled !==
                true
        ) {

            return false;
        }

        const session =
            validateSession();

        if (
            !session.approved
        ) {

            return false;
        }

        if (
            !request ||
            typeof request !==
                "object" ||
            Array.isArray(
                request
            )
        ) {

            return false;
        }

        const type =
            String(
                request.type ??
                ""
            )
            .trim();

        if (
            !type
        ) {

            return false;
        }

        const payload =
            validatePayload(
                request.payload ??
                {}
            );

        if (
            !payload.approved
        ) {

            return false;
        }

        publish(

            EVENTS_MAP.APPROVED,

            {

                stage:
                    "legacy-validate",

                type
            }
        );

        return true;
    }

    /* ====================================================================
       STATUS / SELF TEST
    ==================================================================== */

    function status() {

        return Object.freeze({

            id:
                MODULE_ID,

            version:
                VERSION,

            policy:
                getPolicy(),

            duplicateCache:
                duplicateCache.size,

            velocityCache:
                velocityCache.size,

            auditEntries:
                getTransactionAudit()
                    .length,

            sessionAuthenticated:
                SESSION
                    .isAuthenticated() ===
                true,

            realMoneyMode:
                CONFIG.get(
                    "environment.realMoneyMode"
                ) ===
                true,

            authoritativeRiskControls:
                liveRiskControlsAvailable(),

            clientRiskMode:
                "ADVISORY_ONLY"
        });
    }


    function selfTest() {

        return Object.freeze({

            session:
                Boolean(
                    SESSION
                ),

            secureStorage:
                STORAGE
                    .health
                    ?.()
                    ?.healthy ===
                true,

            validator:
                VALIDATOR
                    .health
                    ?.()
                    ?.healthy ===
                true,

            sanitizer:
                SANITIZER
                    .health
                    ?.()
                    ?.healthy ===
                true,

            registry:
                Boolean(
                    REGISTRY
                ),

            events:
                Boolean(
                    EVENTS
                ),

            validateCompatibility:
                typeof validate ===
                "function",

            evaluateTransactionAvailable:
                typeof evaluateTransaction ===
                "function",

            realMoneyMode:
                CONFIG.get(
                    "environment.realMoneyMode"
                ) ===
                true,

            authoritativeRiskControls:
                liveRiskControlsAvailable()
        });
    }

    /* ====================================================================
       OPERATION REGISTRY
    ==================================================================== */

    const OPERATIONS =
        Object.freeze({

            validate,

            validateSession,

            validateWallet,

            validateAmount,

            validateCurrency,

            validatePayload,

            sanitizeTransaction,

            authorize,

            authorizeTransaction,

            evaluateTransaction,

            detectDuplicate,

            checkVelocity,

            preventReplay,

            calculateRiskScore,

            classifyRisk,

            evaluateFraud,

            evaluateAML,

            getPolicy,

            updatePolicy,

            status,

            selfTest
        });


    function run(
        operation,
        ...args
    ) {

        const fn =
            OPERATIONS[
                operation
            ];

        if (
            typeof fn !==
                "function"
        ) {

            return createResult(
                false,
                "UNKNOWN_OPERATION"
            );
        }

        return fn(
            ...args
        );
    }


    function has(
        operation
    ) {

        return Object.prototype
            .hasOwnProperty
            .call(
                OPERATIONS,
                operation
            );
    }


    function list() {

        return Object.keys(
            OPERATIONS
        )
        .sort();
    }

    /* ====================================================================
       HEALTH / INTEGRITY
    ==================================================================== */

    function verifyIntegrity() {

        const errors =
            [];

        if (
            SESSION
                .health
                ?.()
                ?.healthy !==
            true
        ) {

            errors.push(
                "Session Manager is unhealthy."
            );
        }

        if (
            STORAGE
                .health
                ?.()
                ?.healthy !==
            true
        ) {

            errors.push(
                "Secure Storage is unhealthy."
            );
        }

        if (
            VALIDATOR
                .health
                ?.()
                ?.healthy !==
            true
        ) {

            errors.push(
                "Validator is unhealthy."
            );
        }

        if (
            SANITIZER
                .health
                ?.()
                ?.healthy !==
            true
        ) {

            errors.push(
                "Sanitizer is unhealthy."
            );
        }

        if (
            typeof validate !==
                "function"
        ) {

            errors.push(
                "Legacy validate compatibility API is missing."
            );
        }

        if (
            typeof evaluateTransaction !==
                "function"
        ) {

            errors.push(
                "Financial evaluation API is missing."
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

            evaluations:
                state.evaluations,

            approvals:
                state.approvals,

            rejections:
                state.rejections,

            duplicates:
                state.duplicates,

            velocityBlocks:
                state.velocityBlocks,

            realMoneyMode:
                CONFIG.get(
                    "environment.realMoneyMode"
                ) ===
                true,

            authoritativeRiskControls:
                liveRiskControlsAvailable(),

            clientRiskMode:
                "ADVISORY_ONLY",

            auditEntries:
                getTransactionAudit()
                    .length,

            lastError:
                state.lastError,

            integrity
        });
    }

    /* ====================================================================
       PUBLIC API
    ==================================================================== */

    const api =
        Object.freeze({

            id:
                MODULE_ID,

            name:
                MODULE_NAME,

            version:
                VERSION,

            file:
                FILE_PATH,

            run,

            has,

            list,

            operations:
                OPERATIONS,

            validate,

            validateSession,

            validateWallet,

            validateAmount,

            validateCurrency,

            validatePayload,

            sanitizeTransaction,

            authorize,

            authorizeTransaction,

            evaluateTransaction,

            detectDuplicate,

            checkVelocity,

            preventReplay,

            calculateRiskScore,

            classifyRisk,

            evaluateFraud,

            evaluateAML,

            getTransactionAudit,

            getPolicy,

            updatePolicy,

            status,

            selfTest,

            verifyIntegrity,

            health
        });

    /* ====================================================================
       GLOBAL EXPOSURE
    ==================================================================== */

    Object.defineProperty(

        GLOBAL.PAY54_SECURITY,

        "transactionGuard",

        {

            value:
                api,

            writable:
                false,

            configurable:
                false,

            enumerable:
                true
        }
    );

    /* ====================================================================
       REGISTRY
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

            api,

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

        EVENTS_MAP.READY,

        {

            version:
                VERSION,

            readyAt:
                state.readyAt,

            realMoneyMode:
                CONFIG.get(
                    "environment.realMoneyMode"
                ) ===
                true
        }
    );

    console.info(
        `[PAY54_GUARD] ${MODULE_NAME} v${VERSION} ready.`
    );

})();
