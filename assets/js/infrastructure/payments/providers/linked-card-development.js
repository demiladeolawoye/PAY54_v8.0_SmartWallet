"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE DEVELOPMENT LINKED-CARD PAYMENT PROVIDER
   File:
   assets/js/infrastructure/payments/providers/linked-card-development.js

   Version:
   v1.0.0

   Work Package
   ------------
   WP-011B.6E.5E.4
   Development Linked-Card Payment Provider

   Purpose
   -------
   Deterministic development payment-provider implementation for PAY54
   linked-card funding.

   This provider gives the Linked-Card Funding Adapter a controlled provider
   boundary during development and automated financial-contract testing.

   It models:

   • Card authorization
   • Strong Customer Authentication outcome
   • Provider capture / financial commitment
   • Provider reversal
   • Provider references
   • Idempotent capture
   • Idempotent reversal
   • Deterministic decline/failure simulation
   • Immutable outward results
   • Safe provider diagnostics

   Architecture
   ------------
   Core Funding Constants
          ↓
   Funding Engine
          ↓
   Linked-Card Funding Adapter
          ↓
   THIS DEVELOPMENT PROVIDER
          ↓
   Future Production PSP / Acquirer / Processor

   IMPORTANT
   ---------
   This provider is a DEVELOPMENT infrastructure implementation.

   It does NOT:

   • Contact a real card network
   • Contact an issuer
   • Contact an acquirer
   • Move real money
   • Mutate PAY54 wallet balances
   • Mutate PAY54 card balances
   • Access PAY54 card storage
   • Access localStorage
   • Access sessionStorage
   • Access PAY54_LEDGER
   • Access PAY54_CARDS
   • Store PAN
   • Store CVV
   • Store PIN
   • Store OTP
   • Store authentication secrets

   A production PSP implementation can replace this provider without changing
   the Funding Engine's financial-domain contract.

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL
    ====================================================================== */

    const GLOBAL =
        window;

    const VERSION =
        "1.0.0";

    const PROVIDER_ID =
        "pay54.linked-card.development";

    const PROVIDER_NAME =
        "PAY54 Development Linked-Card Provider";

    const PROVIDER_TYPE =
        "development";

    const MODULE =
        "infrastructure.payments.providers.linked-card-development";

    /* ======================================================================
       DEPENDENCY VERIFICATION
    ====================================================================== */

    const constants =
        GLOBAL.PAY54_CONSTANTS;

    if (
        !constants ||
        typeof constants.get !== "function"
    ) {

        throw new Error(
            "[PAY54] Constants Registry must load before the Development Linked-Card Provider."
        );

    }

    const FUNDING =
        constants.get(
            "FUNDING"
        );

    if (
        !FUNDING ||
        typeof FUNDING !== "object"
    ) {

        throw new Error(
            "[PAY54] Funding Constants must load before the Development Linked-Card Provider."
        );

    }

    /* ======================================================================
       CANONICAL CONTRACTS
    ====================================================================== */

    const SOURCE_TYPE =
        FUNDING.SOURCE_TYPES
            ?.LINKED_CARD;

    const AUTHORIZATION_STATUS =
        FUNDING.AUTHORIZATION_STATUS;

    const COMMIT_STATUS =
        FUNDING.COMMIT_STATUS;

    const REVERSAL_STATUS =
        FUNDING.REVERSAL_STATUS;

    const FAILURE_CODES =
        FUNDING.FAILURE_CODES;

    const IDEMPOTENCY =
        FUNDING.IDEMPOTENCY;

    const SECURITY =
        FUNDING.SECURITY;

    if (
        SOURCE_TYPE !== "linked_card" ||
        !AUTHORIZATION_STATUS ||
        !COMMIT_STATUS ||
        !REVERSAL_STATUS ||
        !FAILURE_CODES ||
        !IDEMPOTENCY ||
        !SECURITY
    ) {

        throw new Error(
            "[PAY54] Development Linked-Card Provider Funding contract is incomplete."
        );

    }

    if (
        SECURITY.FAIL_CLOSED !== true ||
        SECURITY.ALLOW_RAW_CARD_CREDENTIALS !== false ||
        FUNDING.LINKED_CARD_ADAPTER
            ?.ALLOW_DIRECT_CARD_BALANCE_MUTATION !== false ||
        FUNDING.LINKED_CARD_ADAPTER
            ?.ALLOW_DIRECT_CARD_STORAGE_ACCESS !== false
    ) {

        throw new Error(
            "[PAY54] Development Linked-Card Provider refused to start because the Funding security contract is unsafe."
        );

    }

    /* ======================================================================
       PRIVATE RUNTIME STATE

       IMPORTANT
       ---------
       Provider state is deliberately memory-only.

       No financial-provider development state is persisted to browser storage.

       Reloading the application creates a fresh deterministic development
       provider session.
    ====================================================================== */

    const authorizations =
        new Map();

    const captures =
        new Map();

    const reversals =
        new Map();

    const captureIdempotency =
        new Map();

    const reversalIdempotency =
        new Map();

    let sequence =
        0;

    /* ======================================================================
       SAFE OBJECT HELPERS
    ====================================================================== */

    function isPlainObject(
        value
    ) {

        if (
            value === null ||
            typeof value !== "object"
        ) {

            return false;

        }

        const prototype =
            Object.getPrototypeOf(
                value
            );

        return (
            prototype === Object.prototype ||
            prototype === null
        );

    }

    function normalizeString(
        value
    ) {

        return typeof value === "string"
            ? value.trim()
            : "";

    }

    function normalizeCurrency(
        value
    ) {

        const currency =
            normalizeString(
                value
            ).toUpperCase();

        return /^[A-Z]{3}$/.test(
            currency
        )
            ? currency
            : "";

    }

    function normalizeAmount(
        value
    ) {

        const amount =
            Number(
                value
            );

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            return null;

        }

        return amount;

    }

    function now() {

        return new Date()
            .toISOString();

    }

    function nextSequence() {

        sequence += 1;

        return sequence;

    }

    function createReference(
        prefix
    ) {

        const numeric =
            String(
                nextSequence()
            ).padStart(
                8,
                "0"
            );

        return `${prefix}-${numeric}`;

    }

    /* ======================================================================
       DEFENSIVE CLONING
    ====================================================================== */

    function clone(
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

            throw createProviderError(
                FAILURE_CODES.SECURITY_REJECTED,
                "Circular provider payload rejected."
            );

        }

        if (
            Array.isArray(value)
        ) {

            seen.set(
                value,
                true
            );

            const result =
                value.map(
                    item =>
                        clone(
                            item,
                            seen
                        )
                );

            seen.delete(
                value
            );

            return result;

        }

        if (
            !isPlainObject(value)
        ) {

            throw createProviderError(
                FAILURE_CODES.SECURITY_REJECTED,
                "Unsupported provider payload object rejected."
            );

        }

        seen.set(
            value,
            true
        );

        const result =
            Object.create(
                null
            );

        for (
            const [key, child]
            of Object.entries(value)
        ) {

            if (
                isForbiddenField(
                    key
                )
            ) {

                throw createProviderError(
                    FAILURE_CODES.SECURITY_REJECTED,
                    `Forbidden provider field rejected: ${key}.`
                );

            }

            result[key] =
                clone(
                    child,
                    seen
                );

        }

        seen.delete(
            value
        );

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

        seen.add(
            value
        );

        for (
            const child
            of Object.values(value)
        ) {

            deepFreeze(
                child,
                seen
            );

        }

        return Object.freeze(
            value
        );

    }

    function immutableResult(
        value
    ) {

        return deepFreeze(
            clone(
                value
            )
        );

    }

    /* ======================================================================
       SECURITY
    ====================================================================== */

    const forbiddenFields =
        new Set(
            (
                SECURITY.FORBIDDEN_FIELDS ||
                []
            ).map(
                field =>
                    String(field)
                        .toLowerCase()
            )
        );

    function isForbiddenField(
        field
    ) {

        return forbiddenFields.has(
            String(field)
                .toLowerCase()
        );

    }

    function validateSafePayload(
        value,
        path = "request",
        seen = new WeakSet()
    ) {

        if (
            value === null ||
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            typeof value === "undefined"
        ) {

            return true;

        }

        if (
            typeof value !== "object"
        ) {

            throw createProviderError(
                FAILURE_CODES.SECURITY_REJECTED,
                `Unsupported provider payload value at ${path}.`
            );

        }

        if (
            seen.has(value)
        ) {

            throw createProviderError(
                FAILURE_CODES.SECURITY_REJECTED,
                `Circular provider payload rejected at ${path}.`
            );

        }

        seen.add(
            value
        );

        if (
            Array.isArray(value)
        ) {

            for (
                let index = 0;
                index < value.length;
                index += 1
            ) {

                validateSafePayload(
                    value[index],
                    `${path}[${index}]`,
                    seen
                );

            }

            seen.delete(
                value
            );

            return true;

        }

        if (
            !isPlainObject(value)
        ) {

            throw createProviderError(
                FAILURE_CODES.SECURITY_REJECTED,
                `Unsupported provider payload object at ${path}.`
            );

        }

        for (
            const [key, child]
            of Object.entries(value)
        ) {

            if (
                isForbiddenField(
                    key
                )
            ) {

                throw createProviderError(
                    FAILURE_CODES.SECURITY_REJECTED,
                    `Forbidden provider field rejected at ${path}.${key}.`
                );

            }

            validateSafePayload(
                child,
                `${path}.${key}`,
                seen
            );

        }

        seen.delete(
            value
        );

        return true;

    }

    /* ======================================================================
       ERROR FACTORY
    ====================================================================== */

    function createProviderError(
        code,
        message,
        details = {}
    ) {

        const error =
            new Error(
                message
            );

        error.name =
            "PAY54FundingProviderError";

        error.code =
            code ||
            FAILURE_CODES.INTERNAL_ERROR;

        error.details =
            isPlainObject(details)
                ? immutableResult(details)
                : Object.freeze({});

        return error;

    }

    /* ======================================================================
       REQUIRED VALUE VALIDATION
    ====================================================================== */

    function requireObject(
        request
    ) {

        if (
            !isPlainObject(request)
        ) {

            throw createProviderError(
                FAILURE_CODES.INVALID_REQUEST,
                "Provider request must be a plain object."
            );

        }

        validateSafePayload(
            request
        );

        return request;

    }

    function requireSourceId(
        value
    ) {

        const sourceId =
            normalizeString(
                value
            );

        const namespace =
            FUNDING.SOURCE_NAMESPACES
                ?.LINKED_CARD ||
            "linked_card:";

        if (
            !sourceId ||
            !sourceId.startsWith(namespace) ||
            sourceId.length <= namespace.length ||
            sourceId.length >
                (
                    FUNDING.SOURCE_ID
                        ?.MAX_LENGTH ||
                    160
                )
        ) {

            throw createProviderError(
                FAILURE_CODES.INVALID_SOURCE_ID,
                "Invalid linked-card funding source identifier."
            );

        }

        return sourceId;

    }

    function requireOperationId(
        value
    ) {

        const operationId =
            normalizeString(
                value
            );

        if (
            !operationId ||
            operationId.length > 160
        ) {

            throw createProviderError(
                FAILURE_CODES.INVALID_REQUEST,
                "A valid funding operation identifier is required."
            );

        }

        return operationId;

    }

    function requireQuoteId(
        value
    ) {

        const quoteId =
            normalizeString(
                value
            );

        if (
            !quoteId ||
            quoteId.length > 160
        ) {

            throw createProviderError(
                FAILURE_CODES.INVALID_REQUEST,
                "A valid funding quote identifier is required."
            );

        }

        return quoteId;

    }

    function requireAuthorizationId(
        value
    ) {

        const authorizationId =
            normalizeString(
                value
            );

        if (
            !authorizationId ||
            authorizationId.length > 160
        ) {

            throw createProviderError(
                FAILURE_CODES.AUTHORIZATION_REQUIRED,
                "A valid provider authorization identifier is required."
            );

        }

        return authorizationId;

    }

    function requireCommitId(
        value
    ) {

        const commitId =
            normalizeString(
                value
            );

        if (
            !commitId ||
            commitId.length > 160
        ) {

            throw createProviderError(
                FAILURE_CODES.INVALID_REQUEST,
                "A valid provider commit identifier is required."
            );

        }

        return commitId;

    }

    function requireAmount(
        value
    ) {

        const amount =
            normalizeAmount(
                value
            );

        if (
            amount === null
        ) {

            throw createProviderError(
                FAILURE_CODES.INVALID_AMOUNT,
                "Provider funding amount must be finite and greater than zero."
            );

        }

        return amount;

    }

    function requireCurrency(
        value
    ) {

        const currency =
            normalizeCurrency(
                value
            );

        if (
            !currency
        ) {

            throw createProviderError(
                FAILURE_CODES.INVALID_CURRENCY,
                "Provider funding currency must be a valid three-letter ISO currency code."
            );

        }

        return currency;

    }

    function requireIdempotencyKey(
        value
    ) {

        const key =
            normalizeString(
                value
            );

        const minimum =
            Number(
                IDEMPOTENCY.MIN_KEY_LENGTH
            ) || 16;

        const maximum =
            Number(
                IDEMPOTENCY.MAX_KEY_LENGTH
            ) || 160;

        if (
            !key ||
            key.length < minimum ||
            key.length > maximum
        ) {

            throw createProviderError(
                FAILURE_CODES.IDEMPOTENCY_KEY_REQUIRED,
                `Provider idempotency key must contain between ${minimum} and ${maximum} characters.`
            );

        }

        return key;

    }

    /* ======================================================================
       FINANCIAL FINGERPRINT

       Same idempotency key:
       • Same financial contract -> replay terminal result.
       • Different financial contract -> reject.
    ====================================================================== */

    function financialFingerprint({
        operationId,
        sourceId,
        quoteId,
        authorizationId = "",
        commitId = "",
        amount,
        currency
    }) {

        return [
            normalizeString(operationId),
            normalizeString(sourceId),
            normalizeString(quoteId),
            normalizeString(authorizationId),
            normalizeString(commitId),
            String(amount),
            normalizeCurrency(currency)
        ].join(
            "|"
        );

    }

    function resolveIdempotentRecord(
        registry,
        idempotencyKey,
        fingerprint
    ) {

        const existing =
            registry.get(
                idempotencyKey
            );

        if (
            !existing
        ) {

            return null;

        }

        if (
            existing.fingerprint !==
            fingerprint
        ) {

            throw createProviderError(
                FAILURE_CODES.IDEMPOTENCY_CONFLICT,
                "Provider idempotency key was reused with a different financial contract."
            );

        }

        return immutableResult(
            existing.result
        );

    }

    function storeIdempotentRecord(
        registry,
        idempotencyKey,
        fingerprint,
        result
    ) {

        registry.set(
            idempotencyKey,
            {
                fingerprint,
                result:
                    clone(
                        result
                    )
            }
        );

    }

    /* ======================================================================
       DEVELOPMENT DECISION ENGINE

       This provider is deterministic.

       Default behaviour:
       • Authorization succeeds
       • Capture succeeds
       • Reversal succeeds

       Controlled test outcomes may be supplied only through the explicit
       developmentSimulation object.

       This is NOT payment-card data and is never sent to a production PSP.

       Example:

       developmentSimulation: {
           authorization: "decline"
       }

       Supported:
       authorization:
           approve | decline | pending | cancel | expire | fail

       capture:
           commit | fail | unknown

       reversal:
           reverse | fail | unknown
    ====================================================================== */

    function getSimulation(
        request
    ) {

        const simulation =
            request
                ?.developmentSimulation;

        if (
            simulation === undefined ||
            simulation === null
        ) {

            return Object.freeze({});

        }

        if (
            !isPlainObject(simulation)
        ) {

            throw createProviderError(
                FAILURE_CODES.INVALID_REQUEST,
                "developmentSimulation must be a plain object."
            );

        }

        validateSafePayload(
            simulation,
            "developmentSimulation"
        );

        return immutableResult(
            simulation
        );

    }

    function authorizationDecision(
        request
    ) {

        const simulation =
            getSimulation(
                request
            );

        const value =
            normalizeString(
                simulation.authorization
            ).toLowerCase();

        switch (
            value
        ) {

            case "":
            case "approve":
                return "approve";

            case "decline":
                return "decline";

            case "pending":
                return "pending";

            case "cancel":
                return "cancel";

            case "expire":
                return "expire";

            case "fail":
                return "fail";

            default:
                throw createProviderError(
                    FAILURE_CODES.INVALID_REQUEST,
                    "Unsupported development authorization simulation."
                );

        }

    }

    function captureDecision(
        request
    ) {

        const simulation =
            getSimulation(
                request
            );

        const value =
            normalizeString(
                simulation.capture
            ).toLowerCase();

        switch (
            value
        ) {

            case "":
            case "commit":
                return "commit";

            case "fail":
                return "fail";

            case "unknown":
                return "unknown";

            default:
                throw createProviderError(
                    FAILURE_CODES.INVALID_REQUEST,
                    "Unsupported development capture simulation."
                );

        }

    }

    function reversalDecision(
        request
    ) {

        const simulation =
            getSimulation(
                request
            );

        const value =
            normalizeString(
                simulation.reversal
            ).toLowerCase();

        switch (
            value
        ) {

            case "":
            case "reverse":
                return "reverse";

            case "fail":
                return "fail";

            case "unknown":
                return "unknown";

            default:
                throw createProviderError(
                    FAILURE_CODES.INVALID_REQUEST,
                    "Unsupported development reversal simulation."
                );

        }

    }

    /* ======================================================================
       AUTHORIZE

       Authorization reserves/approves the external funding attempt.

       It does NOT:
       • debit a PAY54 wallet
       • mutate a linked-card balance
       • create a Ledger debit
       • imply provider capture
    ====================================================================== */

    async function authorize(
        request
    ) {

        requireObject(
            request
        );

        const sourceId =
            requireSourceId(
                request.sourceId
            );

        const operationId =
            requireOperationId(
                request.operationId
            );

        const quoteId =
            requireQuoteId(
                request.quoteId
            );

        const amount =
            requireAmount(
                request.fundingAmount ??
                request.amount
            );

        const currency =
            requireCurrency(
                request.fundingCurrency ??
                request.currency
            );

        const decision =
            authorizationDecision(
                request
            );

        const authorizationId =
            createReference(
                "AUTH-DEV"
            );

        const providerReference =
            createReference(
                "PSP-AUTH"
            );

        const createdAt =
            now();

        let status =
            AUTHORIZATION_STATUS.AUTHORIZED;

        let failureCode =
            null;

        switch (
            decision
        ) {

            case "approve":

                status =
                    AUTHORIZATION_STATUS.AUTHORIZED;

                break;

            case "decline":

                status =
                    AUTHORIZATION_STATUS.DECLINED;

                failureCode =
                    FAILURE_CODES.AUTHORIZATION_DECLINED;

                break;

            case "pending":

                status =
                    AUTHORIZATION_STATUS.PENDING;

                failureCode =
                    FAILURE_CODES.AUTHORIZATION_PENDING;

                break;

            case "cancel":

                status =
                    AUTHORIZATION_STATUS.CANCELLED;

                failureCode =
                    FAILURE_CODES.AUTHORIZATION_CANCELLED;

                break;

            case "expire":

                status =
                    AUTHORIZATION_STATUS.EXPIRED;

                failureCode =
                    FAILURE_CODES.AUTHORIZATION_EXPIRED;

                break;

            case "fail":

                status =
                    AUTHORIZATION_STATUS.FAILED;

                failureCode =
                    FAILURE_CODES.AUTHORIZATION_FAILED;

                break;

            default:

                throw createProviderError(
                    FAILURE_CODES.INTERNAL_ERROR,
                    "Development authorization decision could not be resolved."
                );

        }

        const result = {
            authorizationId,
            sourceId,
            sourceType:
                SOURCE_TYPE,
            operationId,
            quoteId,
            fundingAmount:
                amount,
            fundingCurrency:
                currency,
            status,
            providerReference,
            provider:
                PROVIDER_ID,
            strongCustomerAuthentication:
                true,
            failureCode,
            createdAt,
            updatedAt:
                createdAt
        };

        authorizations.set(
            authorizationId,
            clone(
                result
            )
        );

        return immutableResult(
            result
        );

    }

    /* ======================================================================
       CAPTURE / COMMIT

       This is the development provider's simulated external financial
       commitment boundary.

       It MUST NOT mutate PAY54 card or wallet balances.

       Idempotency is enforced independently at the provider boundary.
    ====================================================================== */

    async function capture(
        request
    ) {

        requireObject(
            request
        );

        const sourceId =
            requireSourceId(
                request.sourceId
            );

        const operationId =
            requireOperationId(
                request.operationId
            );

        const quoteId =
            requireQuoteId(
                request.quoteId
            );

        const authorizationId =
            requireAuthorizationId(
                request.authorizationId
            );

        const idempotencyKey =
            requireIdempotencyKey(
                request.idempotencyKey
            );

        const amount =
            requireAmount(
                request.fundingAmount ??
                request.amount
            );

        const currency =
            requireCurrency(
                request.fundingCurrency ??
                request.currency
            );

        const authorization =
            authorizations.get(
                authorizationId
            );

        if (
            !authorization
        ) {

            throw createProviderError(
                FAILURE_CODES.AUTHORIZATION_REQUIRED,
                "Provider authorization could not be found."
            );

        }

        if (
            authorization.sourceId !==
                sourceId ||
            authorization.operationId !==
                operationId ||
            authorization.quoteId !==
                quoteId ||
            authorization.fundingAmount !==
                amount ||
            authorization.fundingCurrency !==
                currency
        ) {

            throw createProviderError(
                FAILURE_CODES.QUOTE_MISMATCH,
                "Provider capture does not match the authorized financial contract."
            );

        }

        if (
            authorization.status !==
            AUTHORIZATION_STATUS.AUTHORIZED
        ) {

            const code =
                authorization.failureCode ||
                FAILURE_CODES.AUTHORIZATION_REQUIRED;

            throw createProviderError(
                code,
                "Provider capture requires a successful authorization."
            );

        }

        const fingerprint =
            financialFingerprint({
                operationId,
                sourceId,
                quoteId,
                authorizationId,
                amount,
                currency
            });

        const replay =
            resolveIdempotentRecord(
                captureIdempotency,
                idempotencyKey,
                fingerprint
            );

        if (
            replay
        ) {

            return replay;

        }

        const decision =
            captureDecision(
                request
            );

        const commitId =
            createReference(
                "COMMIT-DEV"
            );

        const providerReference =
            createReference(
                "PSP-CAPTURE"
            );

        const createdAt =
            now();

        let status =
            COMMIT_STATUS.COMMITTED;

        let failureCode =
            null;

        switch (
            decision
        ) {

            case "commit":

                status =
                    COMMIT_STATUS.COMMITTED;

                break;

            case "fail":

                status =
                    COMMIT_STATUS.FAILED;

                failureCode =
                    FAILURE_CODES.COMMIT_FAILED;

                break;

            case "unknown":

                status =
                    COMMIT_STATUS.UNKNOWN;

                failureCode =
                    FAILURE_CODES.COMMIT_STATE_UNKNOWN;

                break;

            default:

                throw createProviderError(
                    FAILURE_CODES.INTERNAL_ERROR,
                    "Development capture decision could not be resolved."
                );

        }

        const result = {
            commitId,
            sourceId,
            sourceType:
                SOURCE_TYPE,
            operationId,
            quoteId,
            authorizationId,
            fundingAmount:
                amount,
            fundingCurrency:
                currency,
            status,
            providerReference,
            provider:
                PROVIDER_ID,
            idempotencyKey,
            failureCode,
            createdAt,
            committedAt:
                status ===
                COMMIT_STATUS.COMMITTED
                    ? createdAt
                    : null,
            updatedAt:
                createdAt
        };

        captures.set(
            commitId,
            clone(
                result
            )
        );

        storeIdempotentRecord(
            captureIdempotency,
            idempotencyKey,
            fingerprint,
            result
        );

        return immutableResult(
            result
        );

    }

    /* ======================================================================
       COMMIT ALIAS

       The infrastructure provider uses "capture", which is the normal PSP
       terminology.

       "commit" is provided as a safe semantic alias for infrastructure
       integrations that use PAY54 Funding terminology.
    ====================================================================== */

    async function commit(
        request
    ) {

        return capture(
            request
        );

    }

    /* ======================================================================
       REVERSE

       Reversal compensates a successfully committed provider capture.

       Reversal is append-only from the provider's perspective:
       the original capture record is retained.
    ====================================================================== */

    async function reverse(
        request
    ) {

        requireObject(
            request
        );

        const sourceId =
            requireSourceId(
                request.sourceId
            );

        const operationId =
            requireOperationId(
                request.operationId
            );

        const commitId =
            requireCommitId(
                request.commitId
            );

        const idempotencyKey =
            requireIdempotencyKey(
                request.idempotencyKey
            );

        const capture =
            captures.get(
                commitId
            );

        if (
            !capture
        ) {

            throw createProviderError(
                FAILURE_CODES.REVERSAL_FAILED,
                "Provider capture could not be found for reversal."
            );

        }

        if (
            capture.sourceId !==
                sourceId ||
            capture.operationId !==
                operationId
        ) {

            throw createProviderError(
                FAILURE_CODES.REVERSAL_FAILED,
                "Provider reversal does not match the committed financial contract."
            );

        }

        if (
            capture.status !==
            COMMIT_STATUS.COMMITTED
        ) {

            throw createProviderError(
                FAILURE_CODES.REVERSAL_FAILED,
                "Only a successfully committed provider capture can be reversed."
            );

        }

        const amount =
            capture.fundingAmount;

        const currency =
            capture.fundingCurrency;

        const fingerprint =
            financialFingerprint({
                operationId,
                sourceId,
                quoteId:
                    capture.quoteId,
                authorizationId:
                    capture.authorizationId,
                commitId,
                amount,
                currency
            });

        const replay =
            resolveIdempotentRecord(
                reversalIdempotency,
                idempotencyKey,
                fingerprint
            );

        if (
            replay
        ) {

            return replay;

        }

        const decision =
            reversalDecision(
                request
            );

        const reversalId =
            createReference(
                "REVERSAL-DEV"
            );

        const providerReference =
            createReference(
                "PSP-REVERSAL"
            );

        const createdAt =
            now();

        let status =
            REVERSAL_STATUS.REVERSED;

        let failureCode =
            null;

        switch (
            decision
        ) {

            case "reverse":

                status =
                    REVERSAL_STATUS.REVERSED;

                break;

            case "fail":

                status =
                    REVERSAL_STATUS.FAILED;

                failureCode =
                    FAILURE_CODES.REVERSAL_FAILED;

                break;

            case "unknown":

                status =
                    REVERSAL_STATUS.UNKNOWN;

                failureCode =
                    FAILURE_CODES.REVERSAL_STATE_UNKNOWN;

                break;

            default:

                throw createProviderError(
                    FAILURE_CODES.INTERNAL_ERROR,
                    "Development reversal decision could not be resolved."
                );

        }

        const result = {
            reversalId,
            sourceId,
            sourceType:
                SOURCE_TYPE,
            operationId,
            quoteId:
                capture.quoteId,
            authorizationId:
                capture.authorizationId,
            commitId,
            fundingAmount:
                amount,
            fundingCurrency:
                currency,
            status,
            providerReference,
            provider:
                PROVIDER_ID,
            idempotencyKey,
            failureCode,
            createdAt,
            reversedAt:
                status ===
                REVERSAL_STATUS.REVERSED
                    ? createdAt
                    : null,
            updatedAt:
                createdAt
        };

        reversals.set(
            reversalId,
            clone(
                result
            )
        );

        storeIdempotentRecord(
            reversalIdempotency,
            idempotencyKey,
            fingerprint,
            result
        );

        return immutableResult(
            result
        );

    }

    /* ======================================================================
       LOOKUPS

       These expose only development provider lifecycle records.

       They do not expose card credentials because the provider never receives
       or stores card credentials.
    ====================================================================== */

    function getAuthorization(
        authorizationId
    ) {

        const id =
            normalizeString(
                authorizationId
            );

        const result =
            authorizations.get(
                id
            );

        return result
            ? immutableResult(result)
            : null;

    }

    function getCapture(
        commitId
    ) {

        const id =
            normalizeString(
                commitId
            );

        const result =
            captures.get(
                id
            );

        return result
            ? immutableResult(result)
            : null;

    }

    function getReversal(
        reversalId
    ) {

        const id =
            normalizeString(
                reversalId
            );

        const result =
            reversals.get(
                id
            );

        return result
            ? immutableResult(result)
            : null;

    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    function getHealth() {

        const healthy =
            Boolean(
                FUNDING &&
                SOURCE_TYPE === "linked_card" &&
                AUTHORIZATION_STATUS.AUTHORIZED ===
                    "authorized" &&
                COMMIT_STATUS.COMMITTED ===
                    "committed" &&
                REVERSAL_STATUS.REVERSED ===
                    "reversed" &&
                SECURITY.FAIL_CLOSED ===
                    true
            );

        return immutableResult({
            healthy,
            status:
                healthy
                    ? FUNDING.HEALTH.HEALTHY
                    : FUNDING.HEALTH.UNAVAILABLE,
            module:
                MODULE,
            provider:
                PROVIDER_ID,
            providerType:
                PROVIDER_TYPE,
            version:
                VERSION,
            sourceType:
                SOURCE_TYPE,
            capabilities: [
                FUNDING.CAPABILITIES.AUTHORIZE,
                FUNDING.CAPABILITIES.COMMIT,
                FUNDING.CAPABILITIES.REVERSE,
                FUNDING.CAPABILITIES.IDEMPOTENCY,
                FUNDING.CAPABILITIES
                    .STRONG_CUSTOMER_AUTHENTICATION
            ],
            realMoney:
                false,
            persistentProviderState:
                false,
            authorizationRecords:
                authorizations.size,
            captureRecords:
                captures.size,
            reversalRecords:
                reversals.size,
            checkedAt:
                now()
        });

    }

    function health() {

        return getHealth();

    }

    /* ======================================================================
       DEVELOPMENT RESET

       Explicitly available for deterministic automated test isolation.

       This operation exists only because this is the development provider.

       It never touches PAY54 application storage, Cards Engine or Ledger.
    ====================================================================== */

    function reset() {

        authorizations.clear();

        captures.clear();

        reversals.clear();

        captureIdempotency.clear();

        reversalIdempotency.clear();

        sequence =
            0;

        return immutableResult({
            reset:
                true,
            provider:
                PROVIDER_ID,
            resetAt:
                now()
        });

    }

    /* ======================================================================
       PROVIDER DESCRIPTOR
    ====================================================================== */

    const descriptor =
        deepFreeze({
            id:
                PROVIDER_ID,
            name:
                PROVIDER_NAME,
            type:
                PROVIDER_TYPE,
            sourceType:
                SOURCE_TYPE,
            version:
                VERSION,
            environment:
                "development",
            realMoney:
                false,
            persistentProviderState:
                false,
            capabilities: [
                FUNDING.CAPABILITIES.AUTHORIZE,
                FUNDING.CAPABILITIES.COMMIT,
                FUNDING.CAPABILITIES.REVERSE,
                FUNDING.CAPABILITIES.IDEMPOTENCY,
                FUNDING.CAPABILITIES
                    .STRONG_CUSTOMER_AUTHENTICATION
            ]
        });

    /* ======================================================================
       PUBLIC API
    ====================================================================== */

    const API =
        Object.freeze({

            id:
                PROVIDER_ID,

            name:
                PROVIDER_NAME,

            type:
                PROVIDER_TYPE,

            sourceType:
                SOURCE_TYPE,

            version:
                VERSION,

            descriptor,

            authorize,

            capture,

            commit,

            reverse,

            getAuthorization,

            getCapture,

            getReversal,

            getHealth,

            health,

            reset

        });

    /* ======================================================================
       GLOBAL REGISTRATION

       This is intentionally a standalone infrastructure provider.

       It does not mutate PAY54_SERVICES.
       It does not mutate PAY54_CARDS.
       It does not mutate PAY54_FUNDING_ENGINE.

       The Linked-Card Funding Adapter resolves this provider at point-of-use.
    ====================================================================== */

    if (
        GLOBAL.PAY54_LINKED_CARD_DEVELOPMENT_PROVIDER &&
        GLOBAL.PAY54_LINKED_CARD_DEVELOPMENT_PROVIDER !== API
    ) {

        throw new Error(
            "[PAY54] Development Linked-Card Provider is already registered."
        );

    }

    Object.defineProperty(
        GLOBAL,
        "PAY54_LINKED_CARD_DEVELOPMENT_PROVIDER",
        {
            value:
                API,
            enumerable:
                true,
            configurable:
                false,
            writable:
                false
        }
    );

    /* ======================================================================
       STARTUP SELF-CHECK
    ====================================================================== */

    const startupHealth =
        getHealth();

    if (
        startupHealth.healthy !==
        true
    ) {

        throw new Error(
            "[PAY54] Development Linked-Card Provider failed its startup health check."
        );

    }

    console.info(
        "✅ PAY54 Development Linked-Card Provider",
        VERSION,
        "loaded."
    );

})();
