"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE WALLET FUNDING ADAPTER
   File: assets/js/engine/funding/adapters/wallet.js
   Version: v1.0.0

   Work Package
   ------------
   WP-011B.6E.5E — Wallet Funding Adapter

   Purpose
   -------
   Canonical adapter between the PAY54 Funding Engine and PAY54 Ledger.

   Responsibilities
   ----------------
   • Discover wallet funding sources
   • Resolve wallet sources by namespaced source ID
   • Expose wallet balances through the Funding contract
   • Produce same-currency funding quotes
   • Produce explicitly verified cross-currency funding quotes
   • Revalidate quotes immediately before financial commitment
   • Enforce sufficient wallet balance
   • Commit exactly one source-wallet debit through PAY54_LEDGER
   • Enforce commit idempotency
   • Preserve PAY54 transaction metadata
   • Provide runtime health diagnostics
   • Register itself with PAY54_FUNDING_ENGINE

   Financial Boundary
   ------------------
   This adapter MAY mutate wallet financial state ONLY through:

       PAY54_LEDGER.createEntry()
       PAY54_LEDGER.applyEntry()

   This adapter MUST NOT:

   • Read or write localStorage directly
   • Call PAY54_LEDGER.setBalances()
   • Call PAY54_LEDGER.setTx()
   • Credit a synthetic destination wallet
   • Use PAY54_LEDGER.rate() without first verifying the FX pair
   • Accept the Ledger's unsupported-pair rate-1 fallback
   • Mutate card state
   • Access PAY54_CARDS
   • Store PIN, OTP, PAN, CVV or authentication secrets
   • Duplicate recipient or beneficiary business logic

   FX Convention
   -------------
   PAY54 Ledger rates use:

       1 UNIT FROM = X units TO

   Therefore:

       payment amount NGN
               ↓
       funding wallet GBP

   is calculated as:

       PAY54_LEDGER.convert(
           "NGN",
           "GBP",
           paymentAmount
       )

   but ONLY after the NGN → GBP pair, or its valid inverse, has been
   explicitly verified in PAY54_LEDGER.getRates().

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
        "funding.adapter.wallet";

    const ADAPTER_TYPE =
        "wallet";

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
            "[PAY54] Constants Registry must load before Wallet Funding Adapter."
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
            "[PAY54] Wallet Funding Adapter constants are unavailable."
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
            "[PAY54] Funding Engine must load before Wallet Funding Adapter."
        );

    }

    const ledger =
        GLOBAL.PAY54_LEDGER;

    if (
        !ledger ||
        typeof ledger.getBalances !== "function" ||
        typeof ledger.getRates !== "function" ||
        typeof ledger.convert !== "function" ||
        typeof ledger.createEntry !== "function" ||
        typeof ledger.applyEntry !== "function"
    ) {

        throw new Error(
            "[PAY54] PAY54 Ledger contract is unavailable for Wallet Funding Adapter."
        );

    }

    /* ======================================================================
       VERSION / MODULE CONTRACT
    ====================================================================== */

    const expectedVersion =
        VERSIONS.COMPONENTS
            ?.FUNDING
            ?.WALLET_ADAPTER ||
        VERSIONS.DOMAIN
            ?.FUNDING
            ?.WALLET_ADAPTER;

    if (
        expectedVersion !==
        VERSION
    ) {

        throw new Error(
            `[PAY54] Wallet Funding Adapter version mismatch. Expected ${VERSION}.`
        );

    }

    if (
        FUNDING.MODULE
            ?.WALLET_ADAPTER !==
        ADAPTER_ID
    ) {

        throw new Error(
            "[PAY54] Wallet Funding Adapter module identifier mismatch."
        );

    }

    if (
        FUNDING.WALLET_ADAPTER
            ?.TYPE !==
        ADAPTER_TYPE
    ) {

        throw new Error(
            "[PAY54] Wallet Funding Adapter source-type contract mismatch."
        );

    }

    if (
        FUNDING.WALLET_ADAPTER
            ?.ALLOW_RATE_ONE_FALLBACK !==
            false ||
        FUNDING.WALLET_ADAPTER
            ?.DESTINATION_WALLET_CREDIT !==
            false ||
        FUNDING.WALLET_ADAPTER
            ?.REQUIRE_EXPLICIT_FX_PAIR !==
            true
    ) {

        throw new Error(
            "[PAY54] Wallet Funding Adapter security contract is invalid."
        );

    }

    /* ======================================================================
       CANONICAL CONSTANTS
    ====================================================================== */

    const SOURCE_TYPES =
        FUNDING.SOURCE_TYPES;

    const SOURCE_NAMESPACES =
        FUNDING.SOURCE_NAMESPACES;

    const CAPABILITIES =
        FUNDING.CAPABILITIES;

    const SOURCE_STATUS =
        FUNDING.SOURCE_STATUS;

    const QUOTE_MODES =
        FUNDING.QUOTE_MODES;

    const QUOTE_STATUS =
        FUNDING.QUOTE_STATUS;

    const COMMIT_STATUS =
        FUNDING.COMMIT_STATUS;

    const FAILURE_CODES =
        FUNDING.FAILURE_CODES;

    const METADATA =
        FUNDING.TRANSACTION_METADATA;

    const WALLET_CONTRACT =
        FUNDING.WALLET_ADAPTER;

    /* ======================================================================
       PRIVATE STATE

       These caches are runtime-only orchestration state.

       They are intentionally NOT persisted because:
       • Ledger owns financial persistence
       • Funding Service will later own broader orchestration
       • this adapter must not create a competing financial repository
    ====================================================================== */

    const quotes =
        new Map();

    const commits =
        new Map();

    let ready =
        false;

    /* ======================================================================
       HELPERS
    ====================================================================== */

    function now() {

        return new Date()
            .toISOString();

    }

    function timestamp() {

        return Date.now();

    }

    function uuid(
        prefix
    ) {

        if (
            GLOBAL.crypto &&
            typeof GLOBAL.crypto.randomUUID ===
                "function"
        ) {

            return `${prefix}-${GLOBAL.crypto.randomUUID()}`;

        }

        return (
            `${prefix}-` +
            `${Date.now().toString(36)}-` +
            `${Math.random().toString(36).slice(2, 12)}`
        );

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

    function normalizeCurrency(
        value
    ) {

        const currency =
            typeof value === "string"
                ? value.trim().toUpperCase()
                : "";

        if (
            !/^[A-Z]{3}$/.test(
                currency
            )
        ) {

            throw createError(
                FAILURE_CODES.INVALID_CURRENCY,
                "Invalid wallet currency."
            );

        }

        return currency;

    }

    function normalizeAmount(
        value
    ) {

        const amount =
            Number(value);

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            throw createError(
                FAILURE_CODES.INVALID_AMOUNT,
                "Funding amount must be a finite number greater than zero."
            );

        }

        return amount;

    }

    function normalizeString(
        value
    ) {

        return typeof value === "string"
            ? value.trim()
            : "";

    }

    function createError(
        code,
        message
    ) {

        const error =
            new Error(
                message ||
                "Wallet Funding Adapter operation failed."
            );

        error.code =
            code ||
            FAILURE_CODES.INTERNAL_ERROR;

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

    /* ======================================================================
       SOURCE IDENTIFIERS
    ====================================================================== */

    function buildSourceId(
        currency
    ) {

        return (
            SOURCE_NAMESPACES.WALLET +
            normalizeCurrency(currency)
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
            SOURCE_NAMESPACES.WALLET;

        if (
            !normalized ||
            !normalized.startsWith(
                namespace
            )
        ) {

            throw createError(
                FAILURE_CODES.INVALID_SOURCE_ID,
                "Invalid wallet Funding source identifier."
            );

        }

        const identifier =
            normalized.slice(
                namespace.length
            );

        const currency =
            normalizeCurrency(
                identifier
            );

        if (
            normalized !==
            `${namespace}${currency}`
        ) {

            throw createError(
                FAILURE_CODES.INVALID_SOURCE_ID,
                "Wallet Funding source identifier is not canonical."
            );

        }

        return {

            sourceId:
                normalized,

            currency

        };

    }

    /* ======================================================================
       LEDGER READ BOUNDARY
    ====================================================================== */

    function readBalances() {

        const balances =
            ledger.getBalances();

        if (
            !balances ||
            typeof balances !== "object" ||
            Array.isArray(balances)
        ) {

            throw createError(
                FAILURE_CODES.INTEGRITY_FAILURE,
                "Ledger balances are unavailable."
            );

        }

        return balances;

    }

    function readBalance(
        currency
    ) {

        const normalizedCurrency =
            normalizeCurrency(
                currency
            );

        const balances =
            readBalances();

        if (
            !Object.prototype.hasOwnProperty.call(
                balances,
                normalizedCurrency
            )
        ) {

            throw createError(
                FAILURE_CODES.SOURCE_NOT_FOUND,
                `Wallet ${normalizedCurrency} does not exist.`
            );

        }

        const balance =
            Number(
                balances[
                    normalizedCurrency
                ]
            );

        if (
            !Number.isFinite(
                balance
            )
        ) {

            throw createError(
                FAILURE_CODES.INTEGRITY_FAILURE,
                `Wallet ${normalizedCurrency} has an invalid balance.`
            );

        }

        return balance;

    }

    function walletExists(
        currency
    ) {

        try {

            readBalance(
                currency
            );

            return true;

        } catch {

            return false;

        }

    }

    /* ======================================================================
       EXPLICIT FX VERIFICATION

       IMPORTANT:
       PAY54_LEDGER.rate() has a legacy unsupported-pair fallback of 1.

       This adapter therefore NEVER asks rate() whether a pair exists.

       It first proves the pair exists in getRates().table and only then uses
       ledger.convert() for the canonical Ledger conversion calculation.
    ====================================================================== */

    function resolveExplicitFxPair(
        fromCurrency,
        toCurrency
    ) {

        const from =
            normalizeCurrency(
                fromCurrency
            );

        const to =
            normalizeCurrency(
                toCurrency
            );

        if (
            from ===
            to
        ) {

            return {

                from,

                to,

                rate:
                    1,

                route:
                    `${from}/${to}`,

                direction:
                    "same_currency"

            };

        }

        const rates =
            ledger.getRates();

        const table =
            rates?.table;

        if (
            !table ||
            typeof table !== "object" ||
            Array.isArray(table)
        ) {

            throw createError(
                FAILURE_CODES.FX_QUOTE_UNAVAILABLE,
                "Ledger FX rate table is unavailable."
            );

        }

        const direct =
            Number(
                table?.[from]?.[to]
            );

        if (
            Number.isFinite(direct) &&
            direct > 0
        ) {

            return {

                from,

                to,

                rate:
                    direct,

                route:
                    `${from}/${to}`,

                direction:
                    "direct"

            };

        }

        const inverse =
            Number(
                table?.[to]?.[from]
            );

        if (
            Number.isFinite(inverse) &&
            inverse > 0
        ) {

            return {

                from,

                to,

                rate:
                    1 / inverse,

                route:
                    `${to}/${from}:inverse`,

                direction:
                    "inverse"

            };

        }

        throw createError(
            FAILURE_CODES.FX_PAIR_UNAVAILABLE,
            `No verified FX pair exists for ${from}/${to}.`
        );

    }

    function calculateFundingAmount(
        paymentCurrency,
        fundingCurrency,
        paymentAmount
    ) {

        const payment =
            normalizeCurrency(
                paymentCurrency
            );

        const funding =
            normalizeCurrency(
                fundingCurrency
            );

        const amount =
            normalizeAmount(
                paymentAmount
            );

        const fx =
            resolveExplicitFxPair(
                payment,
                funding
            );

        if (
            payment ===
            funding
        ) {

            return {

                fundingAmount:
                    amount,

                fxRate:
                    1,

                fxUsed:
                    false,

                fxRoute:
                    fx.route,

                mode:
                    QUOTE_MODES.SAME_CURRENCY

            };

        }

        /*
         * The pair has already been explicitly verified.
         *
         * It is now safe to use the Ledger's canonical conversion function.
         */
        const converted =
            Number(
                ledger.convert(
                    payment,
                    funding,
                    amount
                )
            );

        if (
            !Number.isFinite(converted) ||
            converted <= 0
        ) {

            throw createError(
                FAILURE_CODES.FX_QUOTE_UNAVAILABLE,
                "Ledger returned an invalid Funding FX conversion."
            );

        }

        const effectiveRate =
            converted /
            amount;

        if (
            !Number.isFinite(effectiveRate) ||
            effectiveRate <= 0
        ) {

            throw createError(
                FAILURE_CODES.FX_QUOTE_UNAVAILABLE,
                "Funding FX rate is invalid."
            );

        }

        return {

            fundingAmount:
                converted,

            fxRate:
                effectiveRate,

            fxUsed:
                true,

            fxRoute:
                fx.route,

            mode:
                QUOTE_MODES.CROSS_CURRENCY

        };

    }

    /* ======================================================================
       SOURCE MODEL
    ====================================================================== */

    function createSource(
        currency
    ) {

        const normalizedCurrency =
            normalizeCurrency(
                currency
            );

        const balance =
            readBalance(
                normalizedCurrency
            );

        return {

            id:
                buildSourceId(
                    normalizedCurrency
                ),

            type:
                SOURCE_TYPES.WALLET,

            currency:
                normalizedCurrency,

            balance,

            status:
                SOURCE_STATUS.AVAILABLE,

            available:
                true,

            capabilities:
                [
                    ...WALLET_CONTRACT
                        .CAPABILITIES
                ],

            adapterId:
                ADAPTER_ID

        };

    }

    /* ======================================================================
       SOURCE DISCOVERY
    ====================================================================== */

    async function listSources() {

        const balances =
            readBalances();

        const sources =
            [];

        for (
            const currency
            of Object.keys(
                balances
            )
        ) {

            try {

                sources.push(
                    createSource(
                        currency
                    )
                );

            } catch {

                /*
                 * A malformed wallet must not poison discovery of otherwise
                 * valid wallet sources.
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

        if (
            !walletExists(
                parsed.currency
            )
        ) {

            return null;

        }

        return createSource(
            parsed.currency
        );

    }

    async function getBalance(
        sourceId
    ) {

        const parsed =
            parseSourceId(
                sourceId
            );

        const balance =
            readBalance(
                parsed.currency
            );

        return {

            sourceId:
                parsed.sourceId,

            currency:
                parsed.currency,

            balance,

            available:
                balance >= 0,

            checkedAt:
                now()

        };

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
                "Wallet Funding quote request is invalid."
            );

        }

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

        const fundingCurrency =
            parsed.currency;

        const currentBalance =
            readBalance(
                fundingCurrency
            );

        const calculation =
            calculateFundingAmount(
                paymentCurrency,
                fundingCurrency,
                paymentAmount
            );

        if (
            currentBalance <
            calculation.fundingAmount
        ) {

            throw createError(
                FAILURE_CODES.INSUFFICIENT_FUNDS,
                `Insufficient ${fundingCurrency} wallet balance.`
            );

        }

        const quoteId =
            uuid(
                "FQ-WALLET"
            );

        const createdAtMs =
            timestamp();

        const expiresAtMs =
            createdAtMs +
            QUOTE_TTL_MS;

        const result = {

            quoteId,

            sourceId:
                parsed.sourceId,

            sourceType:
                SOURCE_TYPES.WALLET,

            paymentAmount,

            paymentCurrency,

            fundingAmount:
                calculation.fundingAmount,

            fundingCurrency,

            mode:
                calculation.mode,

            status:
                QUOTE_STATUS.VALID,

            fxUsed:
                calculation.fxUsed,

            fxRate:
                calculation.fxRate,

            fxRoute:
                calculation.fxRoute,

            balance:
                currentBalance,

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

                ...clone(result),

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
       QUOTE REVALIDATION
    ====================================================================== */

    function getStoredQuote(
        quoteId
    ) {

        const normalizedQuoteId =
            normalizeString(
                quoteId
            );

        if (
            !normalizedQuoteId
        ) {

            throw createError(
                FAILURE_CODES.INVALID_REQUEST,
                "Funding quote identifier is required."
            );

        }

        const stored =
            quotes.get(
                normalizedQuoteId
            );

        if (!stored) {

            throw createError(
                FAILURE_CODES.QUOTE_MISMATCH,
                "Wallet Funding quote is unavailable."
            );

        }

        if (
            timestamp() >
            stored.expiresAtMs
        ) {

            quotes.delete(
                normalizedQuoteId
            );

            throw createError(
                FAILURE_CODES.QUOTE_EXPIRED,
                "Wallet Funding quote has expired."
            );

        }

        return stored;

    }

    function revalidateQuote(
        storedQuote
    ) {

        const balance =
            readBalance(
                storedQuote
                    .fundingCurrency
            );

        const recalculated =
            calculateFundingAmount(
                storedQuote
                    .paymentCurrency,
                storedQuote
                    .fundingCurrency,
                storedQuote
                    .paymentAmount
            );

        const epsilon =
            Math.max(
                1e-12,
                Math.abs(
                    storedQuote
                        .fundingAmount
                ) * 1e-10
            );

        if (
            Math.abs(
                recalculated.fundingAmount -
                storedQuote.fundingAmount
            ) >
            epsilon
        ) {

            throw createError(
                FAILURE_CODES.QUOTE_MISMATCH,
                "Wallet Funding quote changed before commitment."
            );

        }

        if (
            Math.abs(
                recalculated.fxRate -
                storedQuote.fxRate
            ) >
            epsilon
        ) {

            throw createError(
                FAILURE_CODES.QUOTE_MISMATCH,
                "Wallet Funding FX rate changed before commitment."
            );

        }

        if (
            balance <
            recalculated.fundingAmount
        ) {

            throw createError(
                FAILURE_CODES.INSUFFICIENT_FUNDS,
                `Insufficient ${storedQuote.fundingCurrency} wallet balance.`
            );

        }

        return {

            balance,

            fundingAmount:
                recalculated.fundingAmount,

            fxRate:
                recalculated.fxRate,

            fxUsed:
                recalculated.fxUsed,

            fxRoute:
                recalculated.fxRoute,

            mode:
                recalculated.mode

        };

    }

    /* ======================================================================
       IDEMPOTENCY
    ====================================================================== */

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
            key.length < minimum ||
            key.length > maximum
        ) {

            throw createError(
                FAILURE_CODES.IDEMPOTENCY_KEY_REQUIRED,
                "A valid Funding idempotency key is required."
            );

        }

        return key;

    }

    function createCommitFingerprint(
        request,
        storedQuote
    ) {

        return JSON.stringify({

            sourceId:
                storedQuote.sourceId,

            quoteId:
                storedQuote.quoteId,

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

       This is the ONLY wallet financial mutation boundary in this adapter.
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
            "Wallet Funding commit request is invalid."
        );

    }

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

    const requestedQuoteId =
        normalizeString(
            request.quoteId
        );

    if (!requestedQuoteId) {

        throw createError(
            FAILURE_CODES.INVALID_REQUEST,
            "Funding quote identifier is required."
        );

    }

    /* ==================================================================
       IDEMPOTENT REPLAY

       This check MUST occur before getStoredQuote().

       A successfully committed quote is intentionally removed from the
       quote cache. Therefore an exact replay must be resolved from the
       completed-commit cache without requiring that consumed quote to
       still exist.

       The replay is accepted only when its immutable request identity
       matches the original successful commitment.
    ================================================================== */

    const existing =
        commits.get(
            idempotencyKey
        );

    if (existing) {

        const replayMatches =
            existing.sourceId ===
                parsed.sourceId &&
            existing.quoteId ===
                requestedQuoteId &&
            existing.operationId ===
                operationId;

        if (!replayMatches) {

            throw createError(
                FAILURE_CODES.IDEMPOTENCY_CONFLICT,
                "Funding idempotency key was reused with a different financial contract."
            );

        }

        return clone(
            existing.result
        );

    }

    /* ==================================================================
       NEW COMMIT — QUOTE MUST STILL BE LIVE
    ================================================================== */

    const storedQuote =
        getStoredQuote(
            requestedQuoteId
        );

    if (
        storedQuote.sourceId !==
        parsed.sourceId
    ) {

        throw createError(
            FAILURE_CODES.QUOTE_MISMATCH,
            "Funding quote does not belong to the selected wallet."
        );

    }

    const fingerprint =
        createCommitFingerprint(
            request,
            storedQuote
        );

    /*
     * Execution-time revalidation.
     *
     * Balance and FX are rechecked immediately before the Ledger mutation.
     */
    const execution =
        revalidateQuote(
            storedQuote
        );

    /*
     * Construct canonical Funding metadata.
     *
     * No PIN, OTP, card credential or provider secret is accepted here.
     */
    const meta = {

        [METADATA.SOURCE]:
            "wallet",

        [METADATA.SOURCE_ID]:
            storedQuote.sourceId,

        [METADATA.SOURCE_TYPE]:
            SOURCE_TYPES.WALLET,

        [METADATA.FUNDING_CURRENCY]:
            storedQuote.fundingCurrency,

        [METADATA.FUNDING_AMOUNT]:
            execution.fundingAmount,

        [METADATA.PAYMENT_CURRENCY]:
            storedQuote.paymentCurrency,

        [METADATA.PAYMENT_AMOUNT]:
            storedQuote.paymentAmount,

        [METADATA.MODE]:
            execution.mode,

        [METADATA.CONTRACT]:
            "WP-011B.6E.5E",

        [METADATA.QUOTE_ID]:
            storedQuote.quoteId,

        [METADATA.IDEMPOTENCY_KEY]:
            idempotencyKey,

        [METADATA.FX_USED]:
            execution.fxUsed,

        [METADATA.FX_RATE]:
            execution.fxRate,

        operation_id:
            operationId,

        fx_route:
            execution.fxRoute

    };

    /*
     * Preserve caller-supplied non-sensitive business metadata only under
     * a dedicated nested field.
     *
     * The Funding Engine has already applied its sensitive-field guard.
     */
    if (
        request.metadata &&
        typeof request.metadata ===
            "object" &&
        !Array.isArray(
            request.metadata
        )
    ) {

        meta.context =
            clone(
                request.metadata
            );

    }

    const entry =
        ledger.createEntry({

            type:
                "send",

            title:
                normalizeString(
                    request.title
                ) ||
                "PAY54 Transfer",

            currency:
                storedQuote
                    .fundingCurrency,

            amount:
                -Math.abs(
                    execution
                        .fundingAmount
                ),

            icon:
                normalizeString(
                    request.icon
                ) ||
                "💸",

            meta

        });

    if (
        !entry ||
        typeof entry !==
            "object"
    ) {

        throw createError(
            FAILURE_CODES.COMMIT_FAILED,
            "Ledger failed to create the wallet Funding entry."
        );

    }

    /*
     * Final guard immediately before mutation.
     *
     * Never allow this adapter to submit a non-negative debit.
     */
    if (
        !Number.isFinite(
            Number(
                entry.amount
            )
        ) ||
        Number(
            entry.amount
        ) >= 0
    ) {

        throw createError(
            FAILURE_CODES.INTEGRITY_FAILURE,
            "Wallet Funding Ledger entry is not a valid debit."
        );

    }

    const committedEntry =
        ledger.applyEntry(
            entry
        );

    if (
        !committedEntry
    ) {

        throw createError(
            FAILURE_CODES.COMMIT_FAILED,
            "Ledger rejected the wallet Funding commitment."
        );

    }

    const postCommitBalance =
        readBalance(
            storedQuote
                .fundingCurrency
        );

    const commitId =
        uuid(
            "FC-WALLET"
        );

    const result = {

        commitId,

        sourceId:
            storedQuote.sourceId,

        sourceType:
            SOURCE_TYPES.WALLET,

        quoteId:
            storedQuote.quoteId,

        operationId,

        status:
            COMMIT_STATUS.COMMITTED,

        paymentAmount:
            storedQuote.paymentAmount,

        paymentCurrency:
            storedQuote.paymentCurrency,

        fundingAmount:
            execution.fundingAmount,

        fundingCurrency:
            storedQuote.fundingCurrency,

        mode:
            execution.mode,

        fxUsed:
            execution.fxUsed,

        fxRate:
            execution.fxRate,

        fxRoute:
            execution.fxRoute,

        ledgerEntryId:
            committedEntry.id ||
            null,

        balanceBefore:
            execution.balance,

        balanceAfter:
            postCommitBalance,

        committedAt:
            now()

    };

    /*
     * Store the immutable identity required to validate future retries.
     *
     * The quote itself may now be removed safely because exact retries can
     * be resolved from this completed-commit record.
     */
    commits.set(
        idempotencyKey,
        {

            fingerprint,

            sourceId:
                storedQuote.sourceId,

            quoteId:
                storedQuote.quoteId,

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

    /*
     * Successful quotes are single-use for NEW financial commitments.
     *
     * Exact idempotent retries are resolved above from the completed
     * commit cache and therefore never reach the Ledger again.
     */
    quotes.delete(
        storedQuote.quoteId
    );

    return clone(
        result
    );

}
    

    /* ======================================================================
       HEALTH
    ====================================================================== */

    async function getHealth() {

        let ledgerAvailable =
            false;

        let ratesAvailable =
            false;

        let walletCount =
            0;

        try {

            const balances =
                readBalances();

            walletCount =
                Object.keys(
                    balances
                ).length;

            ledgerAvailable =
                true;

        } catch {

            ledgerAvailable =
                false;

        }

        try {

            const rates =
                ledger.getRates();

            ratesAvailable =
                !!(
                    rates &&
                    rates.table &&
                    typeof rates.table ===
                        "object"
                );

        } catch {

            ratesAvailable =
                false;

        }

        const healthy =
            ready &&
            ledgerAvailable &&
            ratesAvailable;

        return {

            healthy,

            status:
                healthy
                    ? FUNDING.HEALTH.HEALTHY
                    : FUNDING.HEALTH.UNAVAILABLE,

            module:
                ADAPTER_ID,

            version:
                VERSION,

            type:
                SOURCE_TYPES.WALLET,

            ledgerAvailable,

            ratesAvailable,

            walletCount,

            quoteCacheSize:
                quotes.size,

            idempotencyCacheSize:
                commits.size

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
                "[PAY54] Wallet Funding Adapter requires fail-closed Funding security."
            );

        }

        if (
            WALLET_CONTRACT
                .ALLOW_RATE_ONE_FALLBACK !==
            false
        ) {

            throw new Error(
                "[PAY54] Wallet Funding Adapter refuses unverified FX fallback."
            );

        }

        if (
            WALLET_CONTRACT
                .DESTINATION_WALLET_CREDIT !==
            false
        ) {

            throw new Error(
                "[PAY54] Wallet Funding Adapter refuses synthetic destination-wallet credit."
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
                SOURCE_TYPES.WALLET,

            version:
                VERSION,

            capabilities:
                Object.freeze([
                    ...WALLET_CONTRACT
                        .CAPABILITIES
                ]),

            getHealth,

            health:
                getHealth,

            listSources,

            getSource,

            getBalance,

            quote,

            commit,

            initialize,

            initialise:
                initialize

        });

    /* ======================================================================
       EXPORT GUARD
    ====================================================================== */

    if (
        GLOBAL.PAY54_WALLET_FUNDING_ADAPTER
    ) {

        throw new Error(
            "[PAY54] PAY54_WALLET_FUNDING_ADAPTER is already registered."
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
        fundingEngine.registerAdapter(
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
            `[PAY54] Wallet Funding Adapter registration failed: ${
                registration?.message ||
                "unknown error"
            }`
        );

    }

    /* ======================================================================
       EXPORT
    ====================================================================== */

    GLOBAL.PAY54_WALLET_FUNDING_ADAPTER =
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
                "funding.adapter.wallet"
            );

        }

    } catch (error) {

        console.error(
            "[PAY54_WALLET_FUNDING_ADAPTER]",
            "Security bootstrap verification failed:",
            error
        );

        throw error;

    }

    /* ======================================================================
       STARTUP
    ====================================================================== */

    console.info(
        "✅ PAY54 Wallet Funding Adapter",
        VERSION,
        "loaded."
    );

})();
