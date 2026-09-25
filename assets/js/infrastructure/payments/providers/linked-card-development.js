"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE DEVELOPMENT LINKED-CARD PAYMENT PROVIDER
   File: assets/js/infrastructure/payments/providers/linked-card-development.js
   Version: v1.0.0

   Work Package
   ------------
   WP-011B.6E.5E.4
   Development Linked-Card Payment Provider

   Purpose
   -------
   Deterministic development payment-provider implementation for PAY54
   linked-card funding.

   Responsibilities
   ----------------
   • Provider-backed funding quotation
   • Card authorization simulation
   • Strong Customer Authentication outcome simulation
   • Provider capture / financial commitment
   • Provider reversal
   • Provider references
   • Capture idempotency
   • Reversal idempotency
   • Deterministic failure simulation
   • Immutable outward results
   • Safe provider diagnostics
   • Fail-closed cross-currency behaviour

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

   Financial Boundary
   ------------------
   This is a DEVELOPMENT provider.

   It does NOT:
   • contact a real card network
   • contact an issuer
   • contact an acquirer
   • move real money
   • mutate PAY54 wallet balances
   • mutate PAY54 card balances
   • access PAY54 card storage
   • access localStorage
   • access sessionStorage
   • access PAY54_LEDGER
   • access PAY54_CARDS
   • store PAN
   • store CVV
   • store PIN
   • store OTP
   • store authentication secrets
   • fabricate cross-currency FX rates

   Cross-currency quotation fails closed until an approved provider-backed
   development FX implementation exists.

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       IDENTITY
    ====================================================================== */

    const GLOBAL = window;

    const VERSION = "1.0.0";

    const PROVIDER_ID =
        "pay54.linked-card.development";

    const PROVIDER_NAME =
        "PAY54 Development Linked-Card Provider";

    const PROVIDER_TYPE =
        "development";

    const MODULE =
        "infrastructure.payments.providers.linked-card-development";

    const QUOTE_TTL_MS =
        90000;

    const MAX_RECORDS =
        500;

    /* ======================================================================
       DEPENDENCIES
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
        constants.get("FUNDING");

    if (
        !FUNDING ||
        typeof FUNDING !== "object"
    ) {

        throw new Error(
            "[PAY54] Funding Constants must load before the Development Linked-Card Provider."
        );

    }

    const SOURCE_TYPE =
        FUNDING.SOURCE_TYPES?.LINKED_CARD;

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
       PRIVATE STATE

       All development provider state is intentionally memory-only.
    ====================================================================== */

    const quotes =
        new Map();

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

    let sequence = 0;

    /* ======================================================================
       GENERIC HELPERS
    ====================================================================== */

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

    function normalizeString(value) {

        return typeof value === "string"
            ? value.trim()
            : "";

    }

    function normalizeCurrency(value) {

        const currency =
            normalizeString(value)
                .toUpperCase();

        return /^[A-Z]{3}$/.test(currency)
            ? currency
            : "";

    }

    function normalizeAmount(value) {

        const amount =
            Number(value);

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

    function createReference(prefix) {

        return (
            `${prefix}-` +
            String(nextSequence())
                .padStart(8, "0")
        );

    }

    function trimMap(map) {

        while (
            map.size > MAX_RECORDS
        ) {

            const oldest =
                map.keys()
                    .next()
                    .value;

            if (
                oldest === undefined
            ) {

                break;

            }

            map.delete(oldest);

        }

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

    function isForbiddenField(field) {

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
            value === undefined ||
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
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

        seen.add(value);

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

            seen.delete(value);

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
                isForbiddenField(key)
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

        seen.delete(value);

        return true;

    }

    /* ======================================================================
       CLONING / IMMUTABILITY
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

            seen.set(value, true);

            const result =
                value.map(
                    item =>
                        clone(item, seen)
                );

            seen.delete(value);

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

        seen.set(value, true);

        const result =
            Object.create(null);

        for (
            const [key, child]
            of Object.entries(value)
        ) {

            if (
                isForbiddenField(key)
            ) {

                throw createProviderError(
                    FAILURE_CODES.SECURITY_REJECTED,
                    `Forbidden provider field rejected: ${key}.`
                );

            }

            result[key] =
                clone(child, seen);

        }

        seen.delete(value);

        return result;

    }

    function deepFreeze(
        value,
        seen = new WeakSet()
    ) {

        if (
            value === null ||
            typeof value !== "object" ||
            seen.has(value)
        ) {

            return value;

        }

        seen.add(value);

        for (
            const child
            of Object.values(value)
        ) {

            deepFreeze(
                child,
                seen
            );

        }

        return Object.freeze(value);

    }

    function immutableResult(value) {

        return deepFreeze(
            clone(value)
        );

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
                message ||
                "PAY54 development funding provider operation failed."
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
       REQUIRED VALUES
    ====================================================================== */

    function requireObject(request) {

        if (
            !isPlainObject(request)
        ) {

            throw createProviderError(
                FAILURE_CODES.INVALID_REQUEST,
                "Provider request must be a plain object."
            );

        }

        validateSafePayload(request);

        return request;

    }

    function requireSourceId(value) {

        const sourceId =
            normalizeString(value);

        const namespace =
            FUNDING.SOURCE_NAMESPACES
                ?.LINKED_CARD ||
            "linked_card:";

        const maximum =
            Number(
                FUNDING.SOURCE_ID
                    ?.MAX_LENGTH ||
                160
            );

        if (
            !sourceId ||
            !sourceId.startsWith(namespace) ||
            sourceId.length <=
                namespace.length ||
            sourceId.length >
                maximum
        ) {

            throw createProviderError(
                FAILURE_CODES.INVALID_SOURCE_ID,
                "Invalid linked-card funding source identifier."
            );

        }

        return sourceId;

    }

    function requireOperationId(value) {

        const operationId =
            normalizeString(value);

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

    function optionalOperationId(value) {

        const operationId =
            normalizeString(value);

        if (
            operationId &&
            operationId.length > 160
        ) {

            throw createProviderError(
                FAILURE_CODES.INVALID_REQUEST,
                "Funding operation identifier is invalid."
            );

        }

        return operationId || null;

    }

    function requireQuoteId(value) {

        const quoteId =
            normalizeString(value);

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

    function requireAuthorizationId(value) {

        const authorizationId =
            normalizeString(value);

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

    function requireCommitId(value) {

        const commitId =
            normalizeString(value);

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

    function requireAmount(value) {

        const amount =
            normalizeAmount(value);

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

    function requireCurrency(value) {

        const currency =
            normalizeCurrency(value);

        if (!currency) {

            throw createProviderError(
                FAILURE_CODES.INVALID_CURRENCY,
                "Provider funding currency must be a valid ISO-style three-letter currency."
            );

        }

        return currency;

    }

    function requireIdempotencyKey(value) {

        const key =
            normalizeString(value);

        const minimum =
            Number(
                IDEMPOTENCY.MIN_KEY_LENGTH ||
                16
            );

        const maximum =
            Number(
                IDEMPOTENCY.MAX_KEY_LENGTH ||
                160
            );

        if (
            !key ||
            key.length < minimum ||
            key.length > maximum
        ) {

            throw createProviderError(
                FAILURE_CODES.IDEMPOTENCY_KEY_REQUIRED,
                "A valid provider idempotency key is required."
            );

        }

        return key;

    }

    /* ======================================================================
       CARD DESCRIPTOR VALIDATION

       The provider receives only a safe card descriptor from the adapter.
    ====================================================================== */

    function validateCardDescriptor(card) {

        if (
            !isPlainObject(card)
        ) {

            throw createProviderError(
                FAILURE_CODES.SOURCE_UNAVAILABLE,
                "A safe linked-card provider descriptor is required."
            );

        }

        validateSafePayload(
            card,
            "card"
        );

        const cardId =
            normalizeString(card.cardId);

        const providerReference =
            normalizeString(
                card.providerReference
            );

        const currency =
            requireCurrency(
                card.currency
            );

        if (
            !cardId ||
            !providerReference
        ) {

            throw createProviderError(
                FAILURE_CODES.SOURCE_UNAVAILABLE,
                "Linked-card provider reference is unavailable."
            );

        }

        return {
            cardId,
            providerReference,
            currency
        };

    }

    /* ======================================================================
       IDEMPOTENCY
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
        ].join("|");

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

        if (!existing) {

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
                    clone(result)
            }
        );

        trimMap(registry);

    }

    /* ======================================================================
       DEVELOPMENT SIMULATION

       Default:
       • authorization succeeds
       • capture succeeds
       • reversal succeeds

       Supported developmentSimulation values:

       authorization:
           approve | decline | pending | cancel | expire | fail

       capture:
           commit | fail | unknown

       reversal:
           reverse | fail | unknown

       The Funding Adapter transports application metadata inside request.metadata,
       so this provider supports the simulation object from either the direct
       provider request or request.metadata.developmentSimulation.
    ====================================================================== */

    function getSimulation(request) {

        const simulation =
            request?.developmentSimulation ??
            request?.metadata
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

    function authorizationDecision(request) {

        const value =
            normalizeString(
                getSimulation(request)
                    .authorization
            ).toLowerCase();

        switch (value) {

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

    function captureDecision(request) {

        const value =
            normalizeString(
                getSimulation(request)
                    .capture
            ).toLowerCase();

        switch (value) {

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

    function reversalDecision(request) {

        const value =
            normalizeString(
                getSimulation(request)
                    .reversal
            ).toLowerCase();

        switch (value) {

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
       QUOTE

       Same-currency linked-card funding is quoted deterministically.

       Cross-currency linked-card funding deliberately FAILS CLOSED because
       this development provider has no approved external FX provider.

       It MUST NOT:
       • access PAY54_LEDGER for rates
       • fabricate a rate
       • silently use 1:1
       • trust a client supplied FX rate
    ====================================================================== */

    async function quote(request) {

        requireObject(request);

        const sourceId =
            requireSourceId(
                request.sourceId
            );

        const operationId =
            optionalOperationId(
                request.operationId
            );

        const paymentAmount =
            requireAmount(
                request.paymentAmount
            );

        const paymentCurrency =
            requireCurrency(
                request.paymentCurrency
            );

        const fundingCurrency =
            requireCurrency(
                request.fundingCurrency
            );

        const card =
            validateCardDescriptor(
                request.card
            );

        if (
            card.currency !==
            fundingCurrency
        ) {

            throw createProviderError(
                FAILURE_CODES.QUOTE_MISMATCH,
                "Linked-card funding currency does not match the provider card descriptor."
            );

        }

        if (
            paymentCurrency !==
            fundingCurrency
        ) {

            throw createProviderError(
                FAILURE_CODES.FX_QUOTE_UNAVAILABLE,
                "Development linked-card provider has no approved cross-currency FX quote for this funding request.",
                {
                    paymentCurrency,
                    fundingCurrency
                }
            );

        }

        const quoteId =
            createReference(
                "QUOTE-DEV"
            );

        const providerQuoteId =
            createReference(
                "PSP-QUOTE"
            );

        const createdAtMs =
            Date.now();

        const createdAt =
            new Date(
                createdAtMs
            ).toISOString();

        const expiresAt =
            new Date(
                createdAtMs +
                QUOTE_TTL_MS
            ).toISOString();

        const result = {
            quoteId,
            providerQuoteId,
            sourceId,
            sourceType:
                SOURCE_TYPE,
            operationId,
            paymentAmount,
            paymentCurrency,
            fundingAmount:
                paymentAmount,
            fundingCurrency,
            fxUsed:
                false,
            fxRate:
                1,
            provider:
                PROVIDER_ID,
            status:
                "valid",
            createdAt,
            expiresAt
        };

        quotes.set(
            quoteId,
            clone(result)
        );

        trimMap(quotes);

        return immutableResult(
            result
        );

    }

    /* ======================================================================
       AUTHORIZE
    ====================================================================== */

    async function authorize(request) {

        requireObject(request);

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

        validateCardDescriptor(
            request.card
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
            AUTHORIZATION_STATUS
                .AUTHORIZED;

        let failureCode =
            null;

        switch (decision) {

            case "approve":

                status =
                    AUTHORIZATION_STATUS
                        .AUTHORIZED;

                break;

            case "decline":

                status =
                    AUTHORIZATION_STATUS
                        .DECLINED;

                failureCode =
                    FAILURE_CODES
                        .AUTHORIZATION_DECLINED;

                break;

            case "pending":

                status =
                    AUTHORIZATION_STATUS
                        .PENDING;

                failureCode =
                    FAILURE_CODES
                        .AUTHORIZATION_PENDING;

                break;

            case "cancel":

                status =
                    AUTHORIZATION_STATUS
                        .CANCELLED;

                failureCode =
                    FAILURE_CODES
                        .AUTHORIZATION_CANCELLED;

                break;

            case "expire":

                status =
                    AUTHORIZATION_STATUS
                        .EXPIRED;

                failureCode =
                    FAILURE_CODES
                        .AUTHORIZATION_EXPIRED;

                break;

            case "fail":

                status =
                    AUTHORIZATION_STATUS
                        .FAILED;

                failureCode =
                    FAILURE_CODES
                        .AUTHORIZATION_FAILED;

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
            providerQuoteId:
                normalizeString(
                    request.providerQuoteId
                ) ||
                null,
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
            clone(result)
        );

        trimMap(authorizations);

        return immutableResult(
            result
        );

    }

    /* ======================================================================
       CAPTURE / COMMIT

       This simulates the external provider's financial commitment boundary.

       It does not mutate PAY54 wallets or card balances.
    ====================================================================== */

    async function capture(request) {

        requireObject(request);

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

        validateCardDescriptor(
            request.card
        );

        const authorization =
            authorizations.get(
                authorizationId
            );

        if (!authorization) {

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

            throw createProviderError(
                authorization.failureCode ||
                    FAILURE_CODES
                        .AUTHORIZATION_REQUIRED,
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

        if (replay) {

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

        switch (decision) {

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
                    FAILURE_CODES
                        .COMMIT_STATE_UNKNOWN;

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
            paymentAmount:
                normalizeAmount(
                    request.paymentAmount
                ),
            paymentCurrency:
                normalizeCurrency(
                    request.paymentCurrency
                ) ||
                null,
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
            clone(result)
        );

        trimMap(captures);

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

    async function commit(request) {

        return capture(request);

    }

    /* ======================================================================
       REVERSAL

       A reversal may intentionally have a different operationId from the
       original Funding operation.

       originalOperationId correlates the reversal to the original commit.
    ====================================================================== */

    async function reverse(request) {

        requireObject(request);

        const sourceId =
            requireSourceId(
                request.sourceId
            );

        const operationId =
            requireOperationId(
                request.operationId
            );

        const originalOperationId =
            normalizeString(
                request.originalOperationId
            );

        const commitId =
            requireCommitId(
                request.commitId
            );

        const idempotencyKey =
            requireIdempotencyKey(
                request.idempotencyKey
            );

        const captureRecord =
            captures.get(
                commitId
            );

        if (!captureRecord) {

            throw createProviderError(
                FAILURE_CODES.REVERSAL_FAILED,
                "Provider capture could not be found for reversal."
            );

        }

        if (
            captureRecord.sourceId !==
            sourceId
        ) {

            throw createProviderError(
                FAILURE_CODES.REVERSAL_FAILED,
                "Provider reversal source does not match the committed financial contract."
            );

        }

        if (
            originalOperationId &&
            captureRecord.operationId !==
                originalOperationId
        ) {

            throw createProviderError(
                FAILURE_CODES.REVERSAL_FAILED,
                "Provider reversal original operation does not match the committed financial contract."
            );

        }

        if (
            captureRecord.status !==
            COMMIT_STATUS.COMMITTED
        ) {

            throw createProviderError(
                FAILURE_CODES.REVERSAL_FAILED,
                "Only a successfully committed provider capture can be reversed."
            );

        }

        const amount =
            captureRecord.fundingAmount;

        const currency =
            captureRecord.fundingCurrency;

        const fingerprint =
            financialFingerprint({
                operationId,
                sourceId,
                quoteId:
                    captureRecord.quoteId,
                authorizationId:
                    captureRecord
                        .authorizationId,
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

        if (replay) {

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

        switch (decision) {

            case "reverse":

                status =
                    REVERSAL_STATUS.REVERSED;

                break;

            case "fail":

                status =
                    REVERSAL_STATUS.FAILED;

                failureCode =
                    FAILURE_CODES
                        .REVERSAL_FAILED;

                break;

            case "unknown":

                status =
                    REVERSAL_STATUS.UNKNOWN;

                failureCode =
                    FAILURE_CODES
                        .REVERSAL_STATE_UNKNOWN;

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
            originalOperationId:
                captureRecord.operationId,
            quoteId:
                captureRecord.quoteId,
            authorizationId:
                captureRecord.authorizationId,
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
            clone(result)
        );

        trimMap(reversals);

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
    ====================================================================== */

    function getQuote(quoteId) {

        const result =
            quotes.get(
                normalizeString(quoteId)
            );

        return result
            ? immutableResult(result)
            : null;

    }

    function getAuthorization(
        authorizationId
    ) {

        const result =
            authorizations.get(
                normalizeString(
                    authorizationId
                )
            );

        return result
            ? immutableResult(result)
            : null;

    }

    function getCapture(commitId) {

        const result =
            captures.get(
                normalizeString(commitId)
            );

        return result
            ? immutableResult(result)
            : null;

    }

    function getReversal(
        reversalId
    ) {

        const result =
            reversals.get(
                normalizeString(
                    reversalId
                )
            );

        return result
            ? immutableResult(result)
            : null;

    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    function getHealth() {

        const providerContractValid =
            typeof quote === "function" &&
            typeof authorize === "function" &&
            typeof commit === "function" &&
            typeof reverse === "function";

        const healthy =
            Boolean(
                FUNDING &&
                SOURCE_TYPE ===
                    "linked_card" &&
                AUTHORIZATION_STATUS
                    .AUTHORIZED ===
                    "authorized" &&
                COMMIT_STATUS
                    .COMMITTED ===
                    "committed" &&
                REVERSAL_STATUS
                    .REVERSED ===
                    "reversed" &&
                SECURITY.FAIL_CLOSED ===
                    true &&
                providerContractValid
            );

        return immutableResult({
            healthy,

            status:
                healthy
                    ? FUNDING.HEALTH
                        .HEALTHY
                    : FUNDING.HEALTH
                        .UNAVAILABLE,

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
                "quote",
                FUNDING.CAPABILITIES
                    ?.AUTHORIZE ||
                    "authorize",
                FUNDING.CAPABILITIES
                    ?.COMMIT ||
                    "commit",
                FUNDING.CAPABILITIES
                    ?.REVERSE ||
                    "reverse",
                FUNDING.CAPABILITIES
                    ?.IDEMPOTENCY ||
                    "idempotency",
                FUNDING.CAPABILITIES
                    ?.STRONG_CUSTOMER_AUTHENTICATION ||
                    "strong_customer_authentication"
            ],

            quotePolicy: {
                sameCurrency:
                    true,
                crossCurrency:
                    false,
                crossCurrencyPolicy:
                    "fail_closed"
            },

            realMoney:
                false,

            persistentProviderState:
                false,

            quoteRecords:
                quotes.size,

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
    ====================================================================== */

    function reset() {

        quotes.clear();
        authorizations.clear();
        captures.clear();
        reversals.clear();
        captureIdempotency.clear();
        reversalIdempotency.clear();

        sequence = 0;

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

            quotePolicy: {
                sameCurrency:
                    true,
                crossCurrency:
                    false,
                crossCurrencyPolicy:
                    "fail_closed"
            },

            capabilities: [
                "quote",
                FUNDING.CAPABILITIES
                    ?.AUTHORIZE ||
                    "authorize",
                FUNDING.CAPABILITIES
                    ?.COMMIT ||
                    "commit",
                FUNDING.CAPABILITIES
                    ?.REVERSE ||
                    "reverse",
                FUNDING.CAPABILITIES
                    ?.IDEMPOTENCY ||
                    "idempotency",
                FUNDING.CAPABILITIES
                    ?.STRONG_CUSTOMER_AUTHENTICATION ||
                    "strong_customer_authentication"
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

            quote,

            authorize,

            capture,

            commit,

            reverse,

            getQuote,

            getAuthorization,

            getCapture,

            getReversal,

            getHealth,

            health,

            reset
        });

    /* ======================================================================
       GLOBAL REGISTRATION

       Both names deliberately resolve to the exact same immutable API.

       PAY54_LINKED_CARD_FUNDING_PROVIDER
       ----------------------------------
       Canonical provider boundary consumed by the Linked-Card Funding Adapter.

       PAY54_LINKED_CARD_DEVELOPMENT_PROVIDER
       --------------------------------------
       Explicit development/testing alias.

       This provider does not mutate PAY54_SERVICES, PAY54_CARDS,
       PAY54_FUNDING_ENGINE, PAY54_LEDGER or browser storage.
    ====================================================================== */

    const registrations = [
        "PAY54_LINKED_CARD_FUNDING_PROVIDER",
        "PAY54_LINKED_CARD_DEVELOPMENT_PROVIDER"
    ];

    for (
        const registrationName
        of registrations
    ) {

        const existing =
            GLOBAL[registrationName];

        if (
            existing &&
            existing !== API
        ) {

            throw new Error(
                `[PAY54] ${registrationName} is already registered.`
            );

        }

    }

    for (
        const registrationName
        of registrations
    ) {

        if (
            GLOBAL[registrationName] ===
            API
        ) {

            continue;

        }

        Object.defineProperty(
            GLOBAL,
            registrationName,
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

    }

    if (
        GLOBAL
            .PAY54_LINKED_CARD_FUNDING_PROVIDER !==
        API ||
        GLOBAL
            .PAY54_LINKED_CARD_DEVELOPMENT_PROVIDER !==
        API
    ) {

        throw new Error(
            "[PAY54] Development Linked-Card Provider registration integrity check failed."
        );

    }

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
