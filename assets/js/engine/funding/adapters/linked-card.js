"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE LINKED-CARD FUNDING ADAPTER
   File: assets/js/engine/funding/adapters/linked-card.js
   Version: v1.0.0

   Work Package
   ------------
   WP-011B.6E.5E.2 — Linked-Card Funding Adapter

   Purpose
   -------
   Canonical adapter between the PAY54 Funding Engine, PAY54 Cards Engine,
   and an approved external card-funding provider.

   Responsibilities
   ----------------
   • Discover eligible linked-card funding sources
   • Resolve linked cards through PAY54_CARDS
   • Produce linked-card funding quotes
   • Require explicit provider authorization
   • Commit only provider-authorized card funding
   • Support provider-backed reversals
   • Enforce authorization / quote / commit correlation
   • Enforce commit idempotency
   • Enforce reversal idempotency
   • Prevent direct card-balance mutation
   • Prevent direct card-storage access
   • Prevent raw PAN / CVV / PIN / OTP handling
   • Record safe post-commit card audit transactions
   • Provide runtime health diagnostics
   • Register itself with PAY54_FUNDING_ENGINE

   Provider Boundary
   -----------------
   The runtime provider must be exposed as:

       window.PAY54_LINKED_CARD_FUNDING_PROVIDER

   Required provider methods:

       getHealth()
       quote(request)
       authorize(request)
       commit(request)
       reverse(request)

   Provider methods receive only safe card references / tokens and Funding
   contract data. Raw PAN, CVV, PIN, OTP and provider secrets MUST NOT cross
   this adapter boundary.

   Financial Boundary
   ------------------
   This adapter MUST NOT:

   • read or write localStorage directly
   • call PAY54_CARDS.saveCards()
   • call PAY54_CARDS.updateCardBalance()
   • treat PAY54 card.balance as issuer funds
   • authorize card funding locally
   • fabricate successful provider authorization
   • fabricate successful provider settlement
   • write wallet Ledger debits
   • store PAN / CVV / PIN / OTP / passwords / provider secrets
   • duplicate beneficiary or recipient business logic

   PAY54_CARDS.addCardTransaction() is permitted only as a non-authoritative
   audit projection AFTER a provider-confirmed financial operation.

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL / IDENTITY
    ====================================================================== */

    const GLOBAL =
        window;

    const VERSION =
        "1.0.0";

    const ADAPTER_ID =
        "funding.adapter.linked-card";

    const ADAPTER_TYPE =
        "linked_card";

    const QUOTE_TTL_MS =
        120000;

    const MAX_CACHE_SIZE =
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
            "[PAY54] Constants Registry must load before Linked-Card Funding Adapter."
        );

    }

    const MODULES =
        constants.get(
            "MODULES"
        );

    const VERSIONS =
        constants.get(
            "VERSIONS"
        );

    const FUNDING =
        constants.get(
            "FUNDING"
        );

    if (
        !MODULES ||
        !VERSIONS ||
        !FUNDING
    ) {

        throw new Error(
            "[PAY54] Linked-Card Funding Adapter constants are unavailable."
        );

    }

    const fundingEngine =
        GLOBAL.PAY54_FUNDING_ENGINE;

    if (
        !fundingEngine ||
        typeof fundingEngine.registerAdapter !==
            "function"
    ) {

        throw new Error(
            "[PAY54] Funding Engine must load before Linked-Card Funding Adapter."
        );

    }

    const cardsEngine =
        GLOBAL.PAY54_CARDS;

    if (
        !cardsEngine ||
        typeof cardsEngine.getCards !==
            "function" ||
        typeof cardsEngine.getCardById !==
            "function" ||
        typeof cardsEngine.addCardTransaction !==
            "function"
    ) {

        throw new Error(
            "[PAY54] PAY54 Cards Engine contract is unavailable for Linked-Card Funding Adapter."
        );

    }

    /* ======================================================================
       VERSION / MODULE CONTRACT
    ====================================================================== */

    const expectedVersion =
        VERSIONS.COMPONENTS
            ?.FUNDING
            ?.LINKED_CARD_ADAPTER ||
        VERSIONS.DOMAIN
            ?.FUNDING
            ?.LINKED_CARD_ADAPTER;

    if (
        expectedVersion !==
        VERSION
    ) {

        throw new Error(
            `[PAY54] Linked-Card Funding Adapter version mismatch. Expected ${VERSION}.`
        );

    }

    if (
        FUNDING.MODULE
            ?.LINKED_CARD_ADAPTER !==
        ADAPTER_ID
    ) {

        throw new Error(
            "[PAY54] Linked-Card Funding Adapter module identifier mismatch."
        );

    }

    if (
        FUNDING.LINKED_CARD_ADAPTER
            ?.TYPE !==
        ADAPTER_TYPE
    ) {

        throw new Error(
            "[PAY54] Linked-Card Funding Adapter source-type contract mismatch."
        );

    }

    if (
        FUNDING.LINKED_CARD_ADAPTER
            ?.REQUIRE_PROVIDER_AUTHORIZATION !==
            true ||
        FUNDING.LINKED_CARD_ADAPTER
            ?.REQUIRE_COMMIT_CONFIRMATION !==
            true ||
        FUNDING.LINKED_CARD_ADAPTER
            ?.ALLOW_DIRECT_CARD_BALANCE_MUTATION !==
            false ||
        FUNDING.LINKED_CARD_ADAPTER
            ?.ALLOW_DIRECT_CARD_STORAGE_ACCESS !==
            false ||
        FUNDING.LINKED_CARD_ADAPTER
            ?.ALLOW_RAW_PAN !==
            false ||
        FUNDING.LINKED_CARD_ADAPTER
            ?.ALLOW_RAW_CVV !==
            false
    ) {

        throw new Error(
            "[PAY54] Linked-Card Funding Adapter security contract is invalid."
        );

    }

    /* ======================================================================
       CANONICAL CONSTANTS
    ====================================================================== */

    const SOURCE_TYPES =
        FUNDING.SOURCE_TYPES;

    const SOURCE_NAMESPACES =
        FUNDING.SOURCE_NAMESPACES;

    const SOURCE_STATUS =
        FUNDING.SOURCE_STATUS;

    const QUOTE_MODES =
        FUNDING.QUOTE_MODES;

    const QUOTE_STATUS =
        FUNDING.QUOTE_STATUS;

    const AUTHORIZATION_STATUS =
        FUNDING.AUTHORIZATION_STATUS;

    const COMMIT_STATUS =
        FUNDING.COMMIT_STATUS;

    const REVERSAL_STATUS =
        FUNDING.REVERSAL_STATUS;

    const FAILURE_CODES =
        FUNDING.FAILURE_CODES;

    const CARD_CONTRACT =
        FUNDING.LINKED_CARD_ADAPTER;

    /* ======================================================================
       RUNTIME STATE

       These caches contain orchestration state only.

       They do not contain raw card credentials and are intentionally not
       persisted by this adapter.
    ====================================================================== */

    const quotes =
        new Map();

    const authorizations =
        new Map();

    const commits =
        new Map();

    const reversals =
        new Map();

    let ready =
        false;

    /* ======================================================================
       GENERIC HELPERS
    ====================================================================== */

    function now() {

        return new Date()
            .toISOString();

    }

    function timestamp() {

        return Date.now();

    }

    function normalizeString(
        value
    ) {

        return typeof value ===
            "string"
            ? value.trim()
            : "";

    }

    function clone(
        value
    ) {

        if (
            value === undefined ||
            value === null
        ) {

            return value;

        }

        if (
            typeof structuredClone ===
            "function"
        ) {

            try {

                return structuredClone(
                    value
                );

            } catch {

                // Continue to JSON-safe clone.

            }

        }

        return JSON.parse(
            JSON.stringify(value)
        );

    }

    function uuid(
        prefix
    ) {

        if (
            GLOBAL.crypto &&
            typeof GLOBAL.crypto.randomUUID ===
                "function"
        ) {

            return (
                `${prefix}-` +
                GLOBAL.crypto.randomUUID()
            );

        }

        return (
            `${prefix}-` +
            `${Date.now().toString(36)}-` +
            `${Math.random().toString(36).slice(2, 12)}`
        );

    }

    function createError(
        code,
        message,
        details = {}
    ) {

        const error =
            new Error(
                message ||
                "Linked-Card Funding Adapter operation failed."
            );

        error.code =
            code ||
            FAILURE_CODES.INTERNAL_ERROR;

        error.details =
            clone(
                details &&
                typeof details ===
                    "object" &&
                !Array.isArray(details)
                    ? details
                    : {}
            );

        return error;

    }

    function trimMap(
        map
    ) {

        while (
            map.size >
            MAX_CACHE_SIZE
        ) {

            const oldest =
                map.keys()
                    .next()
                    .value;

            if (
                oldest ===
                undefined
            ) {

                break;

            }

            map.delete(
                oldest
            );

        }

    }

    function normalizeAmount(
        value
    ) {

        const amount =
            Number(
                value
            );

        if (
            !Number.isFinite(
                amount
            ) ||
            amount <= 0
        ) {

            throw createError(
                FAILURE_CODES.INVALID_AMOUNT,
                "Funding amount must be a finite number greater than zero."
            );

        }

        return amount;

    }

    function normalizeCurrency(
        value
    ) {

        const currency =
            normalizeString(
                value
            ).toUpperCase();

        if (
            !/^[A-Z]{3}$/.test(
                currency
            )
        ) {

            throw createError(
                FAILURE_CODES.INVALID_CURRENCY,
                "Linked-card Funding currency is invalid."
            );

        }

        return currency;

    }

    function normalizeIdempotencyKey(
        value
    ) {

        const key =
            normalizeString(
                value
            );

        const minimum =
            Number(
                FUNDING.IDEMPOTENCY
                    ?.MIN_KEY_LENGTH ||
                16
            );

        const maximum =
            Number(
                FUNDING.IDEMPOTENCY
                    ?.MAX_KEY_LENGTH ||
                160
            );

        if (
            !key ||
            key.length <
                minimum ||
            key.length >
                maximum
        ) {

            throw createError(
                FAILURE_CODES.IDEMPOTENCY_KEY_REQUIRED,
                "A valid Funding idempotency key is required."
            );

        }

        return key;

    }

    /* ======================================================================
       SENSITIVE DATA GUARD
    ====================================================================== */

    function containsForbiddenField(
        value,
        visited = new WeakSet()
    ) {

        if (
            value === null ||
            typeof value !==
                "object"
        ) {

            return false;

        }

        if (
            visited.has(
                value
            )
        ) {

            return false;

        }

        visited.add(
            value
        );

        const forbidden =
            new Set(
                (
                    FUNDING.SECURITY
                        ?.FORBIDDEN_FIELDS ||
                    []
                ).map(
                    field =>
                        String(
                            field
                        ).toLowerCase()
                )
            );

        for (
            const key
            of Object.keys(
                value
            )
        ) {

            if (
                forbidden.has(
                    key.toLowerCase()
                )
            ) {

                return true;

            }

            if (
                containsForbiddenField(
                    value[key],
                    visited
                )
            ) {

                return true;

            }

        }

        return false;

    }

    function assertSafePayload(
        value
    ) {

        if (
            value &&
            typeof value ===
                "object" &&
            containsForbiddenField(
                value
            )
        ) {

            throw createError(
                FAILURE_CODES.SECURITY_REJECTED,
                "Linked-card Funding request contains prohibited sensitive fields."
            );

        }

        return true;

    }

    /* ======================================================================
       SOURCE IDENTIFIER
    ====================================================================== */

    function buildSourceId(
        cardId
    ) {

        const id =
            normalizeString(
                cardId
            );

        if (!id) {

            throw createError(
                FAILURE_CODES.INVALID_SOURCE_ID,
                "Linked card identifier is unavailable."
            );

        }

        return (
            SOURCE_NAMESPACES
                .LINKED_CARD +
            id
        );

    }

    function parseSourceId(
        sourceId
    ) {

        const normalized =
            normalizeString(
                sourceId
            );

        const namespace =
            SOURCE_NAMESPACES
                .LINKED_CARD;

        if (
            !normalized ||
            !normalized.startsWith(
                namespace
            )
        ) {

            throw createError(
                FAILURE_CODES.INVALID_SOURCE_ID,
                "Invalid linked-card Funding source identifier."
            );

        }

        const cardId =
            normalized.slice(
                namespace.length
            );

        if (
            !cardId ||
            cardId.length >
                128 ||
            normalized !==
                `${namespace}${cardId}`
        ) {

            throw createError(
                FAILURE_CODES.INVALID_SOURCE_ID,
                "Linked-card Funding source identifier is not canonical."
            );

        }

        return {

            sourceId:
                normalized,

            cardId

        };

    }

    /* ======================================================================
       CARD READ BOUNDARY
    ====================================================================== */

    function getCard(
        cardId
    ) {

        const normalizedId =
            normalizeString(
                cardId
            );

        if (!normalizedId) {

            return null;

        }

        const card =
            cardsEngine.getCardById(
                normalizedId
            );

        if (
            !card ||
            typeof card !==
                "object"
        ) {

            return null;

        }

        return clone(
            card
        );

    }

    function getCardCurrency(
        card
    ) {

        const candidate =
            card?.currency ||
            card?.billingCurrency ||
            card?.billing_currency ||
            card?.settlementCurrency ||
            card?.settlement_currency ||
            "";

        return normalizeCurrency(
            candidate
        );

    }

    function getCardReference(
        card
    ) {

        const reference =
            normalizeString(
                card?.providerCardId
            ) ||
            normalizeString(
                card?.provider_card_id
            ) ||
            normalizeString(
                card?.paymentMethodId
            ) ||
            normalizeString(
                card?.payment_method_id
            ) ||
            normalizeString(
                card?.token
            ) ||
            normalizeString(
                card?.tokenId
            ) ||
            normalizeString(
                card?.token_id
            );

        if (!reference) {

            throw createError(
                FAILURE_CODES.SOURCE_UNAVAILABLE,
                "Linked card does not have an approved provider reference."
            );

        }

        return reference;

    }

    function isLinkedCard(
        card
    ) {

        if (
            !card ||
            typeof card !==
                "object"
        ) {

            return false;

        }

        const type =
            normalizeString(
                card.type ||
                card.cardType ||
                card.card_type ||
                card.kind ||
                card.sourceType ||
                card.source_type
            ).toLowerCase();

        if (
            type ===
                "virtual" ||
            type ===
                "pay54_virtual" ||
            type ===
                "pay54"
        ) {

            return false;

        }

        const explicitLinked =
            card.linked ===
                true ||
            card.external ===
                true ||
            [
                "linked",
                "linked_card",
                "external",
                "external_card",
                "bank_card",
                "debit",
                "credit"
            ].includes(
                type
            );

        if (
            !explicitLinked
        ) {

            return false;

        }

        return true;

    }

    function validateCardForFunding(
        card
    ) {

        if (!card) {

            throw createError(
                FAILURE_CODES.SOURCE_NOT_FOUND,
                "Linked card was not found."
            );

        }

        if (
            !isLinkedCard(
                card
            )
        ) {

            throw createError(
                FAILURE_CODES.SOURCE_NOT_SUPPORTED,
                "Card is not registered as an external linked funding card."
            );

        }

        if (
            card.frozen ===
            true
        ) {

            throw createError(
                FAILURE_CODES.SOURCE_BLOCKED,
                "Linked card is frozen."
            );

        }

        if (
            card.disabled ===
                true ||
            card.active ===
                false ||
            normalizeString(
                card.status
            ).toLowerCase() ===
                "disabled"
        ) {

            throw createError(
                FAILURE_CODES.SOURCE_DISABLED,
                "Linked card is disabled."
            );

        }

        const currency =
            getCardCurrency(
                card
            );

        const providerReference =
            getCardReference(
                card
            );

        return {

            currency,

            providerReference

        };

    }

    /* ======================================================================
       PROVIDER BOUNDARY
    ====================================================================== */

    function getProvider() {

        const provider =
            GLOBAL
                .PAY54_LINKED_CARD_FUNDING_PROVIDER;

        if (
            !provider ||
            typeof provider !==
                "object"
        ) {

            throw createError(
                FAILURE_CODES.ADAPTER_UNAVAILABLE,
                "Linked-card funding provider is unavailable."
            );

        }

        const requiredMethods =
            [
                "getHealth",
                "quote",
                "authorize",
                "commit",
                "reverse"
            ];

        for (
            const method
            of requiredMethods
        ) {

            if (
                typeof provider[method] !==
                    "function"
            ) {

                throw createError(
                    FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                    `Linked-card funding provider method "${method}" is unavailable.`
                );

            }

        }

        return provider;

    }

    async function providerHealthy() {

        try {

            const provider =
                getProvider();

            const health =
                await provider
                    .getHealth();

            return (
                health?.healthy ===
                true
            );

        } catch {

            return false;

        }

    }

    /* ======================================================================
       SAFE PROVIDER CARD DESCRIPTOR
    ====================================================================== */

    function createProviderCardDescriptor(
        card
    ) {

        const validation =
            validateCardForFunding(
                card
            );

        return {

            cardId:
                normalizeString(
                    card.id
                ),

            providerReference:
                validation
                    .providerReference,

            currency:
                validation
                    .currency,

            scheme:
                normalizeString(
                    card.scheme ||
                    card.brand
                ),

            last4:
                normalizeString(
                    card.last4
                ),

            expiryMonth:
                normalizeString(
                    card.expiryMonth ||
                    card.exp_month
                ),

            expiryYear:
                normalizeString(
                    card.expiryYear ||
                    card.exp_year
                )

        };

    }

    /* ======================================================================
       SOURCE MODEL
    ====================================================================== */

    function createSource(
        card
    ) {

        const validation =
            validateCardForFunding(
                card
            );

        return {

            id:
                buildSourceId(
                    card.id
                ),

            type:
                SOURCE_TYPES
                    .LINKED_CARD,

            currency:
                validation
                    .currency,

            status:
                SOURCE_STATUS
                    .AVAILABLE,

            available:
                true,

            capabilities:
                [
                    ...CARD_CONTRACT
                        .CAPABILITIES
                ],

            adapterId:
                ADAPTER_ID,

            card: {

                id:
                    normalizeString(
                        card.id
                    ),

                scheme:
                    normalizeString(
                        card.scheme ||
                        card.brand
                    ),

                last4:
                    normalizeString(
                        card.last4
                    ),

                default:
                    card.default ===
                    true

            }

        };

    }

    /* ======================================================================
       SOURCE DISCOVERY
    ====================================================================== */

    async function listSources() {

        if (
            !await providerHealthy()
        ) {

            return [];

        }

        const cards =
            cardsEngine.getCards();

        if (
            !Array.isArray(
                cards
            )
        ) {

            throw createError(
                FAILURE_CODES.INTEGRITY_FAILURE,
                "Cards Engine returned an invalid card collection."
            );

        }

        const sources =
            [];

        for (
            const card
            of cards
        ) {

            try {

                if (
                    !isLinkedCard(
                        card
                    )
                ) {

                    continue;

                }

                sources.push(
                    createSource(
                        card
                    )
                );

            } catch {

                /*
                 * A malformed or provider-ineligible card must not poison
                 * discovery of otherwise valid linked cards.
                 */

            }

        }

        return sources;

    }

    async function getSource(
        sourceId
    ) {

        const parsed =
            parseSourceId(
                sourceId
            );

        const card =
            getCard(
                parsed.cardId
            );

        if (!card) {

            return null;

        }

        if (
            !await providerHealthy()
        ) {

            throw createError(
                FAILURE_CODES.ADAPTER_UNAVAILABLE,
                "Linked-card funding provider is unavailable."
            );

        }

        return createSource(
            card
        );

    }

    /* ======================================================================
       QUOTE
    ====================================================================== */

    async function quote(
        request
    ) {

        if (
            !request ||
            typeof request !==
                "object"
        ) {

            throw createError(
                FAILURE_CODES.INVALID_REQUEST,
                "Linked-card Funding quote request is invalid."
            );

        }

        assertSafePayload(
            request
        );

        const parsed =
            parseSourceId(
                request.sourceId
            );

        const paymentAmount =
            normalizeAmount(
                request.paymentAmount
            );

        const paymentCurrency =
            normalizeCurrency(
                request.paymentCurrency
            );

        const card =
            getCard(
                parsed.cardId
            );

        const validation =
            validateCardForFunding(
                card
            );

        const provider =
            getProvider();

        const providerResult =
            await provider.quote({

                sourceId:
                    parsed.sourceId,

                operationId:
                    normalizeString(
                        request.operationId
                    ) ||
                    null,

                paymentAmount,

                paymentCurrency,

                fundingCurrency:
                    validation
                        .currency,

                card:
                    createProviderCardDescriptor(
                        card
                    ),

                metadata:
                    request.metadata &&
                    typeof request.metadata ===
                        "object" &&
                    !Array.isArray(
                        request.metadata
                    )
                        ? clone(
                            request.metadata
                        )
                        : {}

            });

        assertSafePayload(
            providerResult
        );

        if (
            !providerResult ||
            typeof providerResult !==
                "object"
        ) {

            throw createError(
                FAILURE_CODES.FX_QUOTE_UNAVAILABLE,
                "Linked-card funding provider returned an invalid quote."
            );

        }

        const fundingAmount =
            normalizeAmount(
                providerResult
                    .fundingAmount
            );

        const fundingCurrency =
            normalizeCurrency(
                providerResult
                    .fundingCurrency ||
                validation.currency
            );

        if (
            fundingCurrency !==
            validation.currency
        ) {

            throw createError(
                FAILURE_CODES.QUOTE_MISMATCH,
                "Provider quote funding currency does not match the linked card."
            );

        }

        const fxUsed =
            paymentCurrency !==
            fundingCurrency;

        const fxRate =
            fxUsed
                ? Number(
                    providerResult
                        .fxRate
                )
                : 1;

        if (
            fxUsed &&
            (
                !Number.isFinite(
                    fxRate
                ) ||
                fxRate <= 0
            )
        ) {

            throw createError(
                FAILURE_CODES.FX_QUOTE_UNAVAILABLE,
                "Linked-card provider returned an invalid FX rate."
            );

        }

        const quoteId =
            normalizeString(
                providerResult
                    .quoteId
            ) ||
            uuid(
                "FQ-CARD"
            );

        const createdAtMs =
            timestamp();

        const providerExpiry =
            Date.parse(
                providerResult
                    .expiresAt ||
                ""
            );

        const expiresAtMs =
            Number.isFinite(
                providerExpiry
            )
                ? Math.min(
                    providerExpiry,
                    createdAtMs +
                        QUOTE_TTL_MS
                )
                : createdAtMs +
                    QUOTE_TTL_MS;

        if (
            expiresAtMs <=
            createdAtMs
        ) {

            throw createError(
                FAILURE_CODES.QUOTE_EXPIRED,
                "Linked-card provider quote has already expired."
            );

        }

        const result = {

            quoteId,

            sourceId:
                parsed.sourceId,

            sourceType:
                SOURCE_TYPES
                    .LINKED_CARD,

            paymentAmount,

            paymentCurrency,

            fundingAmount,

            fundingCurrency,

            mode:
                fxUsed
                    ? QUOTE_MODES
                        .PROVIDER_QUOTED
                    : QUOTE_MODES
                        .SAME_CURRENCY,

            status:
                QUOTE_STATUS
                    .VALID,

            fxUsed,

            fxRate,

            providerQuoteId:
                normalizeString(
                    providerResult
                        .providerQuoteId
                ) ||
                quoteId,

            createdAt:
                new Date(
                    createdAtMs
                ).toISOString(),

            expiresAt:
                new Date(
                    expiresAtMs
                ).toISOString()

        };

        quotes.set(
            quoteId,
            {

                ...clone(
                    result
                ),

                cardId:
                    parsed.cardId,

                providerReference:
                    validation
                        .providerReference,

                createdAtMs,

                expiresAtMs

            }
        );

        trimMap(
            quotes
        );

        return clone(
            result
        );

    }

    /* ======================================================================
       QUOTE RESOLUTION / EXECUTION REVALIDATION
    ====================================================================== */

    function getStoredQuote(
        quoteId
    ) {

        const id =
            normalizeString(
                quoteId
            );

        if (!id) {

            throw createError(
                FAILURE_CODES.INVALID_REQUEST,
                "Linked-card Funding quote identifier is required."
            );

        }

        const stored =
            quotes.get(
                id
            );

        if (!stored) {

            throw createError(
                FAILURE_CODES.QUOTE_MISMATCH,
                "Linked-card Funding quote is unavailable."
            );

        }

        if (
            timestamp() >
            stored.expiresAtMs
        ) {

            quotes.delete(
                id
            );

            throw createError(
                FAILURE_CODES.QUOTE_EXPIRED,
                "Linked-card Funding quote has expired."
            );

        }

        return stored;

    }

    function revalidateCard(
        storedQuote
    ) {

        const card =
            getCard(
                storedQuote
                    .cardId
            );

        const validation =
            validateCardForFunding(
                card
            );

        if (
            validation.providerReference !==
            storedQuote.providerReference
        ) {

            throw createError(
                FAILURE_CODES.SOURCE_UNAVAILABLE,
                "Linked-card provider reference changed during Funding execution."
            );

        }

        if (
            validation.currency !==
            storedQuote.fundingCurrency
        ) {

            throw createError(
                FAILURE_CODES.QUOTE_MISMATCH,
                "Linked-card currency changed during Funding execution."
            );

        }

        return {

            card,

            validation

        };

    }

    /* ======================================================================
       AUTHORIZATION
    ====================================================================== */

    async function authorize(
        request
    ) {

        if (
            !request ||
            typeof request !==
                "object"
        ) {

            throw createError(
                FAILURE_CODES.INVALID_REQUEST,
                "Linked-card Funding authorization request is invalid."
            );

        }

        assertSafePayload(
            request
        );

        const parsed =
            parseSourceId(
                request.sourceId
            );

        const operationId =
            normalizeString(
                request.operationId
            );

        if (!operationId) {

            throw createError(
                FAILURE_CODES.INVALID_REQUEST,
                "Funding operation identifier is required."
            );

        }

        const storedQuote =
            getStoredQuote(
                request.quoteId
            );

        if (
            storedQuote.sourceId !==
            parsed.sourceId
        ) {

            throw createError(
                FAILURE_CODES.QUOTE_MISMATCH,
                "Funding quote does not belong to the selected linked card."
            );

        }

        const execution =
            revalidateCard(
                storedQuote
            );

        const provider =
            getProvider();

        const providerResult =
            await provider.authorize({

                sourceId:
                    parsed.sourceId,

                quoteId:
                    storedQuote.quoteId,

                providerQuoteId:
                    storedQuote.providerQuoteId,

                operationId,

                paymentAmount:
                    storedQuote.paymentAmount,

                paymentCurrency:
                    storedQuote.paymentCurrency,

                fundingAmount:
                    storedQuote.fundingAmount,

                fundingCurrency:
                    storedQuote.fundingCurrency,

                card:
                    createProviderCardDescriptor(
                        execution.card
                    ),

                metadata:
                    request.metadata &&
                    typeof request.metadata ===
                        "object" &&
                    !Array.isArray(
                        request.metadata
                    )
                        ? clone(
                            request.metadata
                        )
                        : {}

            });

        assertSafePayload(
            providerResult
        );

        if (
            !providerResult ||
            typeof providerResult !==
                "object"
        ) {

            throw createError(
                FAILURE_CODES.AUTHORIZATION_FAILED,
                "Linked-card funding provider returned an invalid authorization."
            );

        }

        const providerStatus =
            normalizeString(
                providerResult.status
            );

        const allowedStatuses =
            new Set([
                AUTHORIZATION_STATUS.AUTHORIZED,
                AUTHORIZATION_STATUS.PENDING,
                AUTHORIZATION_STATUS.DECLINED,
                AUTHORIZATION_STATUS.CANCELLED,
                AUTHORIZATION_STATUS.EXPIRED,
                AUTHORIZATION_STATUS.FAILED
            ]);

        if (
            !allowedStatuses.has(
                providerStatus
            )
        ) {

            throw createError(
                FAILURE_CODES.AUTHORIZATION_FAILED,
                "Linked-card provider returned an unsupported authorization status."
            );

        }

        const authorizationId =
            normalizeString(
                providerResult
                    .authorizationId
            );

        if (
            providerStatus ===
                AUTHORIZATION_STATUS
                    .AUTHORIZED &&
            !authorizationId
        ) {

            throw createError(
                FAILURE_CODES.AUTHORIZATION_FAILED,
                "Provider authorization identifier is required."
            );

        }

        const result = {

            authorizationId:
                authorizationId ||
                null,

            sourceId:
                parsed.sourceId,

            quoteId:
                storedQuote.quoteId,

            operationId,

            status:
                providerStatus,

            providerReference:
                normalizeString(
                    providerResult
                        .providerReference
                ) ||
                null,

            requiresAction:
                providerResult
                    .requiresAction ===
                true,

            authorizedAt:
                providerStatus ===
                    AUTHORIZATION_STATUS
                        .AUTHORIZED
                    ? now()
                    : null

        };

        if (
            authorizationId
        ) {

            authorizations.set(
                authorizationId,
                clone(
                    result
                )
            );

            trimMap(
                authorizations
            );

        }

        return clone(
            result
        );

    }

    /* ======================================================================
       COMMIT IDEMPOTENCY
    ====================================================================== */

    function createCommitFingerprint(
        request,
        storedQuote,
        authorization
    ) {

        return JSON.stringify({

            sourceId:
                storedQuote.sourceId,

            quoteId:
                storedQuote.quoteId,

            authorizationId:
                authorization
                    .authorizationId,

            operationId:
                normalizeString(
                    request.operationId
                ),

            paymentAmount:
                storedQuote.paymentAmount,

            paymentCurrency:
                storedQuote.paymentCurrency,

            fundingAmount:
                storedQuote.fundingAmount,

            fundingCurrency:
                storedQuote.fundingCurrency

        });

    }

    /* ======================================================================
       COMMIT
    ====================================================================== */

    async function commit(
        request
    ) {

        if (
            !request ||
            typeof request !==
                "object"
        ) {

            throw createError(
                FAILURE_CODES.INVALID_REQUEST,
                "Linked-card Funding commit request is invalid."
            );

        }

        assertSafePayload(
            request
        );

        const parsed =
            parseSourceId(
                request.sourceId
            );

        const operationId =
            normalizeString(
                request.operationId
            );

        if (!operationId) {

            throw createError(
                FAILURE_CODES.INVALID_REQUEST,
                "Funding operation identifier is required."
            );

        }

        const idempotencyKey =
            normalizeIdempotencyKey(
                request.idempotencyKey
            );

        const quoteId =
            normalizeString(
                request.quoteId
            );

        const authorizationId =
            normalizeString(
                request.authorizationId
            );

        if (
            !quoteId ||
            !authorizationId
        ) {

            throw createError(
                FAILURE_CODES.AUTHORIZATION_REQUIRED,
                "Linked-card Funding requires a valid quote and provider authorization."
            );

        }

        /* ==============================================================
           IDEMPOTENT REPLAY

           Must occur before quote lookup because a successfully committed
           quote is consumed after provider confirmation.
        ============================================================== */

        const existing =
            commits.get(
                idempotencyKey
            );

        if (existing) {

            const replayMatches =
                existing.sourceId ===
                    parsed.sourceId &&
                existing.quoteId ===
                    quoteId &&
                existing.authorizationId ===
                    authorizationId &&
                existing.operationId ===
                    operationId;

            if (
                !replayMatches
            ) {

                throw createError(
                    FAILURE_CODES.IDEMPOTENCY_CONFLICT,
                    "Funding idempotency key was reused with a different financial contract."
                );

            }

            return clone(
                existing.result
            );

        }

        const storedQuote =
            getStoredQuote(
                quoteId
            );

        if (
            storedQuote.sourceId !==
            parsed.sourceId
        ) {

            throw createError(
                FAILURE_CODES.QUOTE_MISMATCH,
                "Funding quote does not belong to the selected linked card."
            );

        }

        const authorization =
            authorizations.get(
                authorizationId
            );

        if (!authorization) {

            throw createError(
                FAILURE_CODES.AUTHORIZATION_REQUIRED,
                "Linked-card provider authorization is unavailable."
            );

        }

        if (
            authorization.status !==
            AUTHORIZATION_STATUS
                .AUTHORIZED
        ) {

            throw createError(
                FAILURE_CODES.AUTHORIZATION_REQUIRED,
                "Linked-card funding has not been authorized."
            );

        }

        if (
            authorization.sourceId !==
                parsed.sourceId ||
            authorization.quoteId !==
                storedQuote.quoteId ||
            authorization.operationId !==
                operationId
        ) {

            throw createError(
                FAILURE_CODES.AUTHORIZATION_FAILED,
                "Linked-card authorization does not match the Funding operation."
            );

        }

        const execution =
            revalidateCard(
                storedQuote
            );

        const fingerprint =
            createCommitFingerprint(
                request,
                storedQuote,
                authorization
            );

        const provider =
            getProvider();

        const providerResult =
            await provider.commit({

                sourceId:
                    parsed.sourceId,

                quoteId:
                    storedQuote.quoteId,

                providerQuoteId:
                    storedQuote.providerQuoteId,

                authorizationId,

                operationId,

                idempotencyKey,

                paymentAmount:
                    storedQuote.paymentAmount,

                paymentCurrency:
                    storedQuote.paymentCurrency,

                fundingAmount:
                    storedQuote.fundingAmount,

                fundingCurrency:
                    storedQuote.fundingCurrency,

                card:
                    createProviderCardDescriptor(
                        execution.card
                    ),

                metadata:
                    request.metadata &&
                    typeof request.metadata ===
                        "object" &&
                    !Array.isArray(
                        request.metadata
                    )
                        ? clone(
                            request.metadata
                        )
                        : {}

            });

        assertSafePayload(
            providerResult
        );

        if (
            !providerResult ||
            typeof providerResult !==
                "object"
        ) {

            throw createError(
                FAILURE_CODES.COMMIT_FAILED,
                "Linked-card provider returned an invalid commit result."
            );

        }

        if (
            normalizeString(
                providerResult.status
            ) !==
            COMMIT_STATUS.COMMITTED
        ) {

            const status =
                normalizeString(
                    providerResult.status
                );

            if (
                status ===
                COMMIT_STATUS.UNKNOWN
            ) {

                throw createError(
                    FAILURE_CODES.COMMIT_STATE_UNKNOWN,
                    "Linked-card provider commit state is unknown."
                );

            }

            throw createError(
                FAILURE_CODES.COMMIT_FAILED,
                "Linked-card provider did not confirm the Funding commitment."
            );

        }

        const providerCommitId =
            normalizeString(
                providerResult.commitId
            );

        if (!providerCommitId) {

            throw createError(
                FAILURE_CODES.COMMIT_FAILED,
                "Linked-card provider commit confirmation identifier is unavailable."
            );

        }

        const commitId =
            providerCommitId;

        const result = {

            commitId,

            sourceId:
                parsed.sourceId,

            sourceType:
                SOURCE_TYPES
                    .LINKED_CARD,

            quoteId:
                storedQuote.quoteId,

            authorizationId,

            operationId,

            status:
                COMMIT_STATUS
                    .COMMITTED,

            paymentAmount:
                storedQuote.paymentAmount,

            paymentCurrency:
                storedQuote.paymentCurrency,

            fundingAmount:
                storedQuote.fundingAmount,

            fundingCurrency:
                storedQuote.fundingCurrency,

            mode:
                storedQuote.mode,

            fxUsed:
                storedQuote.fxUsed,

            fxRate:
                storedQuote.fxRate,

            providerReference:
                normalizeString(
                    providerResult
                        .providerReference
                ) ||
                null,

            committedAt:
                now()

        };

        /*
         * Commit record is stored before non-authoritative audit projection.
         *
         * Once the provider confirms commitment, failure of PAY54's card
         * activity projection MUST NOT cause the external financial
         * commitment to be reported as failed.
         */

        commits.set(
            idempotencyKey,
            {

                fingerprint,

                sourceId:
                    parsed.sourceId,

                quoteId:
                    storedQuote.quoteId,

                authorizationId,

                operationId,

                result:
                    clone(
                        result
                    )

            }
        );

        trimMap(
            commits
        );

        quotes.delete(
            storedQuote.quoteId
        );

        try {

            cardsEngine.addCardTransaction(
                parsed.cardId,
                {

                    type:
                        "funding",

                    direction:
                        "debit",

                    status:
                        "committed",

                    amount:
                        storedQuote.fundingAmount,

                    currency:
                        storedQuote.fundingCurrency,

                    paymentAmount:
                        storedQuote.paymentAmount,

                    paymentCurrency:
                        storedQuote.paymentCurrency,

                    fundingSource:
                        SOURCE_TYPES
                            .LINKED_CARD,

                    fundingSourceId:
                        parsed.sourceId,

                    quoteId:
                        storedQuote.quoteId,

                    authorizationId,

                    commitId,

                    operationId,

                    providerReference:
                        result.providerReference

                }
            );

        } catch (error) {

            console.error(
                "[PAY54_LINKED_CARD_FUNDING_ADAPTER]",
                "Card audit projection failed after confirmed provider commit:",
                error
            );

        }

        return clone(
            result
        );

    }

    /* ======================================================================
       REVERSAL IDEMPOTENCY
    ====================================================================== */

    function createReversalFingerprint(
        request,
        commit
    ) {

        return JSON.stringify({

            sourceId:
                commit.sourceId,

            commitId:
                commit.commitId,

            operationId:
                normalizeString(
                    request.operationId
                )

        });

    }

    function findCommitById(
        commitId
    ) {

        const normalized =
            normalizeString(
                commitId
            );

        if (!normalized) {

            return null;

        }

        for (
            const record
            of commits.values()
        ) {

            if (
                record?.result
                    ?.commitId ===
                normalized
            ) {

                return record;

            }

        }

        return null;

    }

    /* ======================================================================
       REVERSE
    ====================================================================== */

    async function reverse(
        request
    ) {

        if (
            !request ||
            typeof request !==
                "object"
        ) {

            throw createError(
                FAILURE_CODES.INVALID_REQUEST,
                "Linked-card Funding reversal request is invalid."
            );

        }

        assertSafePayload(
            request
        );

        const parsed =
            parseSourceId(
                request.sourceId
            );

        const operationId =
            normalizeString(
                request.operationId
            );

        const commitId =
            normalizeString(
                request.commitId
            );

        const idempotencyKey =
            normalizeIdempotencyKey(
                request.idempotencyKey
            );

        if (
            !operationId ||
            !commitId
        ) {

            throw createError(
                FAILURE_CODES.INVALID_REQUEST,
                "Linked-card reversal requires operationId and commitId."
            );

        }

        const existing =
            reversals.get(
                idempotencyKey
            );

        if (existing) {

            const replayMatches =
                existing.sourceId ===
                    parsed.sourceId &&
                existing.commitId ===
                    commitId &&
                existing.operationId ===
                    operationId;

            if (
                !replayMatches
            ) {

                throw createError(
                    FAILURE_CODES.IDEMPOTENCY_CONFLICT,
                    "Funding reversal idempotency key was reused with a different financial contract."
                );

            }

            return clone(
                existing.result
            );

        }

        const commitRecord =
            findCommitById(
                commitId
            );

        if (!commitRecord) {

            throw createError(
                FAILURE_CODES.REVERSAL_REQUIRED,
                "Linked-card Funding commit is unavailable for reversal."
            );

        }

        const committed =
            commitRecord.result;

        if (
            committed.sourceId !==
                parsed.sourceId
        ) {

            throw createError(
                FAILURE_CODES.REVERSAL_FAILED,
                "Funding commit does not belong to the selected linked card."
            );

        }

        /*
         * The reversal operation may intentionally have its own operationId.
         * The original funding operation remains available in committed.
         */

        const card =
            getCard(
                parsed.cardId
            );

        const validation =
            validateCardForFunding(
                card
            );

        const fingerprint =
            createReversalFingerprint(
                request,
                committed
            );

        const provider =
            getProvider();

        const providerResult =
            await provider.reverse({

                sourceId:
                    parsed.sourceId,

                commitId:
                    committed.commitId,

                authorizationId:
                    committed.authorizationId,

                originalOperationId:
                    committed.operationId,

                operationId,

                idempotencyKey,

                paymentAmount:
                    committed.paymentAmount,

                paymentCurrency:
                    committed.paymentCurrency,

                fundingAmount:
                    committed.fundingAmount,

                fundingCurrency:
                    committed.fundingCurrency,

                card:
                    createProviderCardDescriptor(
                        card
                    ),

                providerReference:
                    committed.providerReference

            });

        assertSafePayload(
            providerResult
        );

        if (
            !providerResult ||
            typeof providerResult !==
                "object"
        ) {

            throw createError(
                FAILURE_CODES.REVERSAL_FAILED,
                "Linked-card provider returned an invalid reversal result."
            );

        }

        const providerStatus =
            normalizeString(
                providerResult.status
            );

        if (
            providerStatus !==
            REVERSAL_STATUS.REVERSED
        ) {

            if (
                providerStatus ===
                REVERSAL_STATUS.UNKNOWN
            ) {

                throw createError(
                    FAILURE_CODES.REVERSAL_STATE_UNKNOWN,
                    "Linked-card provider reversal state is unknown."
                );

            }

            throw createError(
                FAILURE_CODES.REVERSAL_FAILED,
                "Linked-card provider did not confirm the Funding reversal."
            );

        }

        const reversalId =
            normalizeString(
                providerResult
                    .reversalId
            );

        if (!reversalId) {

            throw createError(
                FAILURE_CODES.REVERSAL_FAILED,
                "Linked-card provider reversal confirmation identifier is unavailable."
            );

        }

        const result = {

            reversalId,

            sourceId:
                parsed.sourceId,

            sourceType:
                SOURCE_TYPES
                    .LINKED_CARD,

            commitId:
                committed.commitId,

            originalOperationId:
                committed.operationId,

            operationId,

            status:
                REVERSAL_STATUS
                    .REVERSED,

            paymentAmount:
                committed.paymentAmount,

            paymentCurrency:
                committed.paymentCurrency,

            fundingAmount:
                committed.fundingAmount,

            fundingCurrency:
                committed.fundingCurrency,

            providerReference:
                normalizeString(
                    providerResult
                        .providerReference
                ) ||
                committed.providerReference ||
                null,

            reversedAt:
                now()

        };

        reversals.set(
            idempotencyKey,
            {

                fingerprint,

                sourceId:
                    parsed.sourceId,

                commitId:
                    committed.commitId,

                operationId,

                result:
                    clone(
                        result
                    )

            }
        );

        trimMap(
            reversals
        );

        try {

            cardsEngine.addCardTransaction(
                parsed.cardId,
                {

                    type:
                        "funding_reversal",

                    direction:
                        "credit",

                    status:
                        "reversed",

                    amount:
                        committed.fundingAmount,

                    currency:
                        committed.fundingCurrency,

                    paymentAmount:
                        committed.paymentAmount,

                    paymentCurrency:
                        committed.paymentCurrency,

                    fundingSource:
                        SOURCE_TYPES
                            .LINKED_CARD,

                    fundingSourceId:
                        parsed.sourceId,

                    authorizationId:
                        committed.authorizationId,

                    commitId:
                        committed.commitId,

                    reversalId,

                    operationId,

                    originalOperationId:
                        committed.operationId,

                    providerReference:
                        result.providerReference

                }
            );

        } catch (error) {

            console.error(
                "[PAY54_LINKED_CARD_FUNDING_ADAPTER]",
                "Card reversal audit projection failed after confirmed provider reversal:",
                error
            );

        }

        return clone(
            result
        );

    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    async function getHealth() {

        let cardsAvailable =
            false;

        let providerAvailable =
            false;

        let providerStatus =
            "unavailable";

        let linkedCardCount =
            0;

        try {

            const cards =
                cardsEngine.getCards();

            cardsAvailable =
                Array.isArray(
                    cards
                );

            if (
                cardsAvailable
            ) {

                linkedCardCount =
                    cards.filter(
                        card =>
                            isLinkedCard(
                                card
                            )
                    ).length;

            }

        } catch {

            cardsAvailable =
                false;

        }

        try {

            const provider =
                getProvider();

            const health =
                await provider
                    .getHealth();

            providerAvailable =
                health?.healthy ===
                true;

            providerStatus =
                normalizeString(
                    health?.status
                ) ||
                (
                    providerAvailable
                        ? "healthy"
                        : "unavailable"
                );

        } catch {

            providerAvailable =
                false;

            providerStatus =
                "unavailable";

        }

        const healthy =
            ready &&
            cardsAvailable &&
            providerAvailable;

        return {

            healthy,

            status:
                healthy
                    ? FUNDING.HEALTH
                        .HEALTHY
                    : FUNDING.HEALTH
                        .UNAVAILABLE,

            module:
                ADAPTER_ID,

            version:
                VERSION,

            type:
                SOURCE_TYPES
                    .LINKED_CARD,

            cardsAvailable,

            providerAvailable,

            providerStatus,

            linkedCardCount,

            quoteCacheSize:
                quotes.size,

            authorizationCacheSize:
                authorizations.size,

            idempotencyCacheSize:
                commits.size,

            reversalCacheSize:
                reversals.size

        };

    }

    /* ======================================================================
       INITIALISATION
    ====================================================================== */

    function initialize() {

        if (ready) {

            return true;

        }

        if (
            FUNDING.SECURITY
                ?.FAIL_CLOSED !==
            true
        ) {

            throw new Error(
                "[PAY54] Linked-Card Funding Adapter requires fail-closed Funding security."
            );

        }

        if (
            CARD_CONTRACT
                .REQUIRE_PROVIDER_AUTHORIZATION !==
            true
        ) {

            throw new Error(
                "[PAY54] Linked-Card Funding Adapter requires provider authorization."
            );

        }

        if (
            CARD_CONTRACT
                .REQUIRE_COMMIT_CONFIRMATION !==
            true
        ) {

            throw new Error(
                "[PAY54] Linked-Card Funding Adapter requires provider commit confirmation."
            );

        }

        if (
            CARD_CONTRACT
                .ALLOW_DIRECT_CARD_BALANCE_MUTATION !==
            false ||
            CARD_CONTRACT
                .ALLOW_DIRECT_CARD_STORAGE_ACCESS !==
            false
        ) {

            throw new Error(
                "[PAY54] Linked-Card Funding Adapter refuses direct card financial mutation."
            );

        }

        if (
            CARD_CONTRACT
                .ALLOW_RAW_PAN !==
            false ||
            CARD_CONTRACT
                .ALLOW_RAW_CVV !==
            false
        ) {

            throw new Error(
                "[PAY54] Linked-Card Funding Adapter refuses raw card credentials."
            );

        }

        ready =
            true;

        return true;

    }

    /* ======================================================================
       PUBLIC ADAPTER CONTRACT
    ====================================================================== */

    const API =
        Object.freeze({

            id:
                ADAPTER_ID,

            type:
                SOURCE_TYPES
                    .LINKED_CARD,

            version:
                VERSION,

            capabilities:
                Object.freeze([
                    ...CARD_CONTRACT
                        .CAPABILITIES
                ]),

            getHealth,

            health:
                getHealth,

            listSources,

            getSource,

            quote,

            authorize,

            commit,

            reverse,

            initialize,

            initialise:
                initialize

        });

    /* ======================================================================
       EXPORT GUARD
    ====================================================================== */

    if (
        GLOBAL
            .PAY54_LINKED_CARD_FUNDING_ADAPTER
    ) {

        throw new Error(
            "[PAY54] PAY54_LINKED_CARD_FUNDING_ADAPTER is already registered."
        );

    }

    /* ======================================================================
       INITIALIZE
    ====================================================================== */

    initialize();

    /* ======================================================================
       REGISTER WITH FUNDING ENGINE
    ====================================================================== */

    const registration =
        fundingEngine
            .registerAdapter(
                API
            );

    if (
        !registration ||
        registration.ok !==
            true
    ) {

        ready =
            false;

        throw new Error(
            `[PAY54] Linked-Card Funding Adapter registration failed: ${
                registration?.message ||
                "unknown error"
            }`
        );

    }

    /* ======================================================================
       EXPORT
    ====================================================================== */

    GLOBAL
        .PAY54_LINKED_CARD_FUNDING_ADAPTER =
        API;

    /* ======================================================================
       SECURITY BOOTSTRAP
    ====================================================================== */

    try {

        const securityBootstrap =
            GLOBAL.PAY54_SECURITY
                ?.bootstrap;

        if (
            securityBootstrap &&
            typeof securityBootstrap.verify ===
                "function"
        ) {

            securityBootstrap.verify(
                "funding.adapter.linked-card"
            );

        }

    } catch (error) {

        console.error(
            "[PAY54_LINKED_CARD_FUNDING_ADAPTER]",
            "Security bootstrap verification failed:",
            error
        );

        throw error;

    }

    /* ======================================================================
       STARTUP
    ====================================================================== */

    console.info(
        "✅ PAY54 Linked-Card Funding Adapter",
        VERSION,
        "loaded."
    );

})();
