"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE FUNDING CONSTANTS
   File: assets/js/core/constants/funding.js
   Version: v1.0.0

   Work Package
   ------------
   WP-011B.6E.5C — Funding Constants & Canonical Contracts

   Purpose
   -------
   Canonical Funding domain contract for the PAY54 Enterprise Platform.

   Responsibilities
   ----------------
   • Define canonical Funding module identity
   • Define Funding source types and namespaced source identifiers
   • Define Funding source capabilities
   • Define Funding lifecycle states
   • Define Funding quote modes
   • Define Funding authorisation states
   • Define Funding commit and reversal states
   • Define canonical Funding failure codes
   • Define Funding transaction and audit metadata fields
   • Define Funding idempotency policy
   • Define Funding security policy
   • Define Funding adapter contracts
   • Define Funding Event Bus contracts
   • Provide immutable Funding constants through PAY54_CONSTANTS
   • Preserve zero-regression compatibility with existing PAY54 payment flows

   Architecture
   ------------
   Core
      ↓
   Constants Registry
      ↓
   Funding Constants
      ↓
   Funding Registry / Adapters
      ↓
   Funding Service
      ↓
   Payment Engines
      ↓
   UI

   Dependencies
   ------------
   assets/js/core/constants/index.js
   assets/js/core/constants/modules.js
   assets/js/core/constants/versions.js

   Security
   --------
   This file contains contracts only.

   It MUST NOT:
   • Read or write localStorage
   • Read or write sessionStorage
   • Persist card data
   • Persist wallet balances
   • Mutate the Ledger
   • Mutate the Cards Engine
   • Execute payment transactions
   • Store PAN, CVV, PIN, OTP or authentication secrets
   • Duplicate wallet, card, FX or Ledger business logic

   Compatibility
   -------------
   Funding is an additive PAY54 enterprise domain.

   It does not replace:
   • PAY54_LEDGER
   • PAY54_TX
   • PAY54_CARDS
   • PAY54_CONTACTS_SERVICE
   • PAY54_BENEFICIARIES_SERVICE
   • PAY54_RECIPIENT
   • PAY54_RECIPIENT_COMPAT

   Existing payment flows may progressively adopt the Funding Service while
   their existing compatibility paths remain operational.

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL
    ====================================================================== */

    const GLOBAL =
        window;

    const CATALOGUE_NAME =
        "FUNDING";

    const VERSION =
        "1.0.0";

    const ENGINE =
        "PAY54 Funding Constants";

    /* ======================================================================
       DEPENDENCY VERIFICATION
    ====================================================================== */

    const constants =
        GLOBAL.PAY54_CONSTANTS;

    if (
        !constants ||
        typeof constants.register !== "function" ||
        typeof constants.get !== "function" ||
        typeof constants.has !== "function"
    ) {

        throw new Error(
            "[PAY54] Constants Registry must load before funding.js."
        );

    }

    const MODULES =
        constants.get(
            "MODULES"
        );

    if (
        !MODULES ||
        typeof MODULES !== "object"
    ) {

        throw new Error(
            "[PAY54] Module identifiers must load before funding.js."
        );

    }

    const VERSIONS =
        constants.get(
            "VERSIONS"
        );

    if (
        !VERSIONS ||
        typeof VERSIONS !== "object"
    ) {

        throw new Error(
            "[PAY54] Version Catalogue must load before funding.js."
        );

    }

    if (
        MODULES.FUNDING !==
        "FUNDING"
    ) {

        throw new Error(
            "[PAY54] MODULES.FUNDING must be available before funding.js."
        );

    }

    if (
        VERSIONS.FUNDING !==
        VERSION
    ) {

        throw new Error(
            `[PAY54] VERSIONS.FUNDING must be ${VERSION} before funding.js.`
        );

    }

    /* ======================================================================
       CANONICAL FUNDING CATALOGUE
    ====================================================================== */

    const FUNDING = {

        /* ==================================================================
           VERSION
        ================================================================== */

        VERSION,

        /* ==================================================================
           MODULE IDENTITY
        ================================================================== */

        MODULE: {

            ID:
                MODULES.FUNDING,

            CONSTANTS:
                MODULES.COMPONENTS
                    ?.CORE
                    ?.FUNDING_CONSTANTS ||
                "core.constants.funding",

            ENGINE:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.ENGINE ||
                "funding.engine",

            SERVICE:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.SERVICE ||
                "funding.service",

            REGISTRY:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.REGISTRY ||
                "funding.registry",

            WALLET_ADAPTER:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.WALLET_ADAPTER ||
                "funding.adapter.wallet",

            LINKED_CARD_ADAPTER:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.LINKED_CARD_ADAPTER ||
                "funding.adapter.linked-card",

            EVENTS:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.EVENTS ||
                "funding.events"

        },

        /* ==================================================================
           SOURCE TYPES

           TYPE identifies the broad financial source category.

           It must not contain a specific wallet ID, card ID or account ID.
        ================================================================== */

        SOURCE_TYPES: {

            WALLET:
                "wallet",

            LINKED_CARD:
                "linked_card",

            BANK_ACCOUNT:
                "bank_account",

            OPEN_BANKING:
                "open_banking",

            EXTERNAL_PROVIDER:
                "external_provider"

        },

        /* ==================================================================
           CANONICAL SOURCE IDENTIFIERS

           Runtime funding sources MUST use namespaced identifiers.

           Examples
           --------
           wallet:NGN
           wallet:GBP
           linked_card:card-123

           The constants below define the namespace prefixes only.
        ================================================================== */

        SOURCE_NAMESPACES: {

            WALLET:
                "wallet:",

            LINKED_CARD:
                "linked_card:",

            BANK_ACCOUNT:
                "bank_account:",

            OPEN_BANKING:
                "open_banking:",

            EXTERNAL_PROVIDER:
                "external_provider:"

        },

        /* ==================================================================
           SOURCE ID POLICY
        ================================================================== */

        SOURCE_ID: {

            SEPARATOR:
                ":",

            MAX_LENGTH:
                160,

            CASE_POLICY:
                "namespace_lowercase_identifier_preserved",

            REQUIRE_NAMESPACE:
                true,

            REQUIRE_IDENTIFIER:
                true

        },

        /* ==================================================================
           FUNDING CAPABILITIES

           Adapters declare capabilities.

           Consumers must inspect capabilities rather than infer behaviour
           from source type.
        ================================================================== */

        CAPABILITIES: {

            QUOTE:
                "quote",

            AUTHORIZE:
                "authorize",

            COMMIT:
                "commit",

            REVERSE:
                "reverse",

            BALANCE:
                "balance",

            FX:
                "fx",

            IDEMPOTENCY:
                "idempotency",

            ASYNC_AUTHORIZATION:
                "async_authorization",

            STRONG_CUSTOMER_AUTHENTICATION:
                "strong_customer_authentication"

        },

        /* ==================================================================
           SOURCE STATUS
        ================================================================== */

        SOURCE_STATUS: {

            AVAILABLE:
                "available",

            UNAVAILABLE:
                "unavailable",

            DEGRADED:
                "degraded",

            DISABLED:
                "disabled",

            BLOCKED:
                "blocked"

        },

        /* ==================================================================
           FUNDING LIFECYCLE

           Canonical high-level Funding lifecycle.

           DISCOVERED
               Source is known to the Funding Registry.

           QUOTED
               Funding requirements have been calculated.

           AUTHORIZATION_REQUIRED
               Source requires an authorisation step.

           AUTHORIZED
               Required authorisation completed.

           COMMITTING
               Financial commitment is in progress.

           COMMITTED
               Funding commitment succeeded.

           REVERSAL_REQUIRED
               Compensating action is required.

           REVERSING
               Reversal is in progress.

           REVERSED
               Funding commitment has been compensated.

           FAILED
               Funding operation failed.

           EXPIRED
               Quote or authorisation is no longer valid.

           CANCELLED
               Operation was cancelled before successful commitment.
        ================================================================== */

        LIFECYCLE: {

            DISCOVERED:
                "discovered",

            QUOTED:
                "quoted",

            AUTHORIZATION_REQUIRED:
                "authorization_required",

            AUTHORIZED:
                "authorized",

            COMMITTING:
                "committing",

            COMMITTED:
                "committed",

            REVERSAL_REQUIRED:
                "reversal_required",

            REVERSING:
                "reversing",

            REVERSED:
                "reversed",

            FAILED:
                "failed",

            EXPIRED:
                "expired",

            CANCELLED:
                "cancelled"

        },

        /* ==================================================================
           QUOTE MODES
        ================================================================== */

        QUOTE_MODES: {

            SAME_CURRENCY:
                "same_currency",

            CROSS_CURRENCY:
                "cross_currency",

            PROVIDER_QUOTED:
                "provider_quoted"

        },

        /* ==================================================================
           QUOTE STATUS
        ================================================================== */

        QUOTE_STATUS: {

            CREATED:
                "created",

            VALID:
                "valid",

            EXPIRED:
                "expired",

            REJECTED:
                "rejected"

        },

        /* ==================================================================
           AUTHORIZATION STATUS
        ================================================================== */

        AUTHORIZATION_STATUS: {

            NOT_REQUIRED:
                "not_required",

            REQUIRED:
                "required",

            PENDING:
                "pending",

            AUTHORIZED:
                "authorized",

            DECLINED:
                "declined",

            CANCELLED:
                "cancelled",

            EXPIRED:
                "expired",

            FAILED:
                "failed"

        },

        /* ==================================================================
           COMMIT STATUS
        ================================================================== */

        COMMIT_STATUS: {

            NOT_STARTED:
                "not_started",

            PENDING:
                "pending",

            COMMITTED:
                "committed",

            FAILED:
                "failed",

            UNKNOWN:
                "unknown"

        },

        /* ==================================================================
           REVERSAL STATUS
        ================================================================== */

        REVERSAL_STATUS: {

            NOT_REQUIRED:
                "not_required",

            REQUIRED:
                "required",

            PENDING:
                "pending",

            REVERSED:
                "reversed",

            FAILED:
                "failed",

            UNKNOWN:
                "unknown"

        },

        /* ==================================================================
           FAILURE CODES

           These are machine-readable domain codes.

           UI copy must not depend directly on exception text.
        ================================================================== */

        FAILURE_CODES: {

            INVALID_REQUEST:
                "FUNDING_INVALID_REQUEST",

            INVALID_AMOUNT:
                "FUNDING_INVALID_AMOUNT",

            INVALID_CURRENCY:
                "FUNDING_INVALID_CURRENCY",

            INVALID_SOURCE_ID:
                "FUNDING_INVALID_SOURCE_ID",

            SOURCE_NOT_FOUND:
                "FUNDING_SOURCE_NOT_FOUND",

            SOURCE_UNAVAILABLE:
                "FUNDING_SOURCE_UNAVAILABLE",

            SOURCE_DISABLED:
                "FUNDING_SOURCE_DISABLED",

            SOURCE_BLOCKED:
                "FUNDING_SOURCE_BLOCKED",

            SOURCE_NOT_SUPPORTED:
                "FUNDING_SOURCE_NOT_SUPPORTED",

            CAPABILITY_NOT_SUPPORTED:
                "FUNDING_CAPABILITY_NOT_SUPPORTED",

            INSUFFICIENT_FUNDS:
                "FUNDING_INSUFFICIENT_FUNDS",

            FX_PAIR_UNAVAILABLE:
                "FUNDING_FX_PAIR_UNAVAILABLE",

            FX_QUOTE_UNAVAILABLE:
                "FUNDING_FX_QUOTE_UNAVAILABLE",

            QUOTE_EXPIRED:
                "FUNDING_QUOTE_EXPIRED",

            QUOTE_MISMATCH:
                "FUNDING_QUOTE_MISMATCH",

            AUTHORIZATION_REQUIRED:
                "FUNDING_AUTHORIZATION_REQUIRED",

            AUTHORIZATION_PENDING:
                "FUNDING_AUTHORIZATION_PENDING",

            AUTHORIZATION_DECLINED:
                "FUNDING_AUTHORIZATION_DECLINED",

            AUTHORIZATION_CANCELLED:
                "FUNDING_AUTHORIZATION_CANCELLED",

            AUTHORIZATION_EXPIRED:
                "FUNDING_AUTHORIZATION_EXPIRED",

            AUTHORIZATION_FAILED:
                "FUNDING_AUTHORIZATION_FAILED",

            COMMIT_FAILED:
                "FUNDING_COMMIT_FAILED",

            COMMIT_STATE_UNKNOWN:
                "FUNDING_COMMIT_STATE_UNKNOWN",

            REVERSAL_REQUIRED:
                "FUNDING_REVERSAL_REQUIRED",

            REVERSAL_FAILED:
                "FUNDING_REVERSAL_FAILED",

            REVERSAL_STATE_UNKNOWN:
                "FUNDING_REVERSAL_STATE_UNKNOWN",

            IDEMPOTENCY_KEY_REQUIRED:
                "FUNDING_IDEMPOTENCY_KEY_REQUIRED",

            IDEMPOTENCY_CONFLICT:
                "FUNDING_IDEMPOTENCY_CONFLICT",

            ADAPTER_UNAVAILABLE:
                "FUNDING_ADAPTER_UNAVAILABLE",

            ADAPTER_CONTRACT_VIOLATION:
                "FUNDING_ADAPTER_CONTRACT_VIOLATION",

            INTEGRITY_FAILURE:
                "FUNDING_INTEGRITY_FAILURE",

            SECURITY_REJECTED:
                "FUNDING_SECURITY_REJECTED",

            OPERATION_CANCELLED:
                "FUNDING_OPERATION_CANCELLED",

            INTERNAL_ERROR:
                "FUNDING_INTERNAL_ERROR"

        },

        /* ==================================================================
           TRANSACTION METADATA

           Canonical audit metadata names for transactions funded through the
           Funding domain.

           Existing snake_case PAY54 transaction metadata is preserved.

           Sensitive payment credentials must NEVER be written into metadata.
        ================================================================== */

        TRANSACTION_METADATA: {

            SOURCE:
                "funding_source",

            SOURCE_ID:
                "funding_source_id",

            SOURCE_TYPE:
                "funding_source_type",

            FUNDING_CURRENCY:
                "funding_currency",

            FUNDING_AMOUNT:
                "funding_amount",

            PAYMENT_CURRENCY:
                "payment_currency",

            PAYMENT_AMOUNT:
                "payment_amount",

            MODE:
                "funding_mode",

            CONTRACT:
                "funding_contract",

            QUOTE_ID:
                "funding_quote_id",

            AUTHORIZATION_ID:
                "funding_authorization_id",

            COMMIT_ID:
                "funding_commit_id",

            IDEMPOTENCY_KEY:
                "funding_idempotency_key",

            FX_USED:
                "fx_used",

            FX_RATE:
                "fx_rate",

            FX_QUOTE_ID:
                "fx_quote_id",

            PROVIDER_REFERENCE:
                "funding_provider_reference",

            REVERSAL_ID:
                "funding_reversal_id"

        },

        /* ==================================================================
           AUDIT FIELDS

           These describe Funding lifecycle records and diagnostics.

           They are not a substitute for the canonical transaction ledger.
        ================================================================== */

        AUDIT_FIELDS: {

            OPERATION_ID:
                "operationId",

            SOURCE_ID:
                "sourceId",

            SOURCE_TYPE:
                "sourceType",

            PAYMENT_AMOUNT:
                "paymentAmount",

            PAYMENT_CURRENCY:
                "paymentCurrency",

            FUNDING_AMOUNT:
                "fundingAmount",

            FUNDING_CURRENCY:
                "fundingCurrency",

            QUOTE_ID:
                "quoteId",

            AUTHORIZATION_ID:
                "authorizationId",

            COMMIT_ID:
                "commitId",

            REVERSAL_ID:
                "reversalId",

            IDEMPOTENCY_KEY:
                "idempotencyKey",

            STATUS:
                "status",

            FAILURE_CODE:
                "failureCode",

            PROVIDER_REFERENCE:
                "providerReference",

            CREATED_AT:
                "createdAt",

            UPDATED_AT:
                "updatedAt",

            COMMITTED_AT:
                "committedAt",

            REVERSED_AT:
                "reversedAt"

        },

        /* ==================================================================
           IDEMPOTENCY POLICY

           Financial commitment operations must be idempotent.

           A caller-generated key must represent one logical funding
           commitment attempt.

           Reusing the same key with materially different financial inputs
           must be rejected as an idempotency conflict.
        ================================================================== */

        IDEMPOTENCY: {

            REQUIRED_FOR_COMMIT:
                true,

            REQUIRED_FOR_REVERSAL:
                true,

            MIN_KEY_LENGTH:
                16,

            MAX_KEY_LENGTH:
                160,

            REUSE_POLICY:
                "same_operation_same_financial_contract_only",

            CONFLICT_POLICY:
                "reject",

            TERMINAL_RESULT_REPLAY:
                true

        },

        /* ==================================================================
           SECURITY POLICY
        ================================================================== */

        SECURITY: {

            FAIL_CLOSED:
                true,

            REQUIRE_EXPLICIT_SOURCE:
                true,

            REQUIRE_FINITE_AMOUNT:
                true,

            REQUIRE_POSITIVE_AMOUNT:
                true,

            REQUIRE_ISO_CURRENCY:
                true,

            REQUIRE_CAPABILITY_CHECK:
                true,

            REQUIRE_QUOTE_REVALIDATION:
                true,

            REQUIRE_EXECUTION_REVALIDATION:
                true,

            REQUIRE_IDEMPOTENCY:
                true,

            ALLOW_UNVERIFIED_FX_FALLBACK:
                false,

            ALLOW_NEGATIVE_FUNDING_AMOUNT:
                false,

            ALLOW_ZERO_FUNDING_AMOUNT:
                false,

            ALLOW_DIRECT_UI_LEDGER_MUTATION:
                false,

            ALLOW_DIRECT_UI_CARD_MUTATION:
                false,

            ALLOW_DIRECT_UI_STORAGE_ACCESS:
                false,

            ALLOW_RAW_CARD_CREDENTIALS:
                false,

            ALLOW_SECRET_METADATA:
                false,

            ALLOW_SOURCE_TYPE_INFERENCE_FOR_COMMIT:
                false,

            FORBIDDEN_FIELDS: [

                "__proto__",

                "prototype",

                "constructor",

                "pin",

                "password",

                "passcode",

                "otp",

                "cvv",

                "cvc",

                "securityCode",

                "security_code",

                "pan",

                "fullPan",

                "full_pan",

                "cardNumber",

                "card_number",

                "track1",

                "track2",

                "magstripe",

                "privateKey",

                "private_key",

                "secret",

                "tokenSecret",

                "token_secret"

            ]

        },

        /* ==================================================================
           CURRENCY CONTRACT
        ================================================================== */

        CURRENCY: {

            PATTERN:
                "^[A-Z]{3}$",

            LENGTH:
                3,

            NORMALIZATION:
                "uppercase"

        },

        /* ==================================================================
           AMOUNT CONTRACT

           Funding constants intentionally do not define currency-specific
           decimal rounding. Monetary precision remains owned by the
           appropriate money/ledger/provider layer.
        ================================================================== */

        AMOUNT: {

            REQUIRE_FINITE:
                true,

            REQUIRE_POSITIVE:
                true,

            MIN_EXCLUSIVE:
                0,

            ROUNDING_OWNER:
                "money_or_provider_layer"

        },

        /* ==================================================================
           QUOTE CONTRACT

           A quote is a calculation contract.

           It MUST NOT itself commit financial value.
        ================================================================== */

        QUOTE_CONTRACT: {

            REQUIRED_REQUEST_FIELDS: [

                "sourceId",

                "paymentAmount",

                "paymentCurrency"

            ],

            REQUIRED_RESULT_FIELDS: [

                "quoteId",

                "sourceId",

                "sourceType",

                "paymentAmount",

                "paymentCurrency",

                "fundingAmount",

                "fundingCurrency",

                "mode",

                "status"

            ],

            CROSS_CURRENCY_REQUIRED_FIELDS: [

                "fxRate"

            ],

            MUST_BE_SIDE_EFFECT_FREE:
                true,

            MUST_NOT_COMMIT_FUNDS:
                true,

            MUST_REVALIDATE_BEFORE_COMMIT:
                true

        },

        /* ==================================================================
           AUTHORIZATION CONTRACT
        ================================================================== */

        AUTHORIZATION_CONTRACT: {

            REQUIRED_REQUEST_FIELDS: [

                "sourceId",

                "quoteId",

                "operationId"

            ],

            REQUIRED_RESULT_FIELDS: [

                "authorizationId",

                "sourceId",

                "status"

            ],

            MUST_NOT_IMPLY_COMMIT:
                true

        },

        /* ==================================================================
           COMMIT CONTRACT

           COMMIT is the financial boundary.

           Adapters own source-specific execution.

           Consumers must never assume that all funding sources commit in the
           same way.
        ================================================================== */

        COMMIT_CONTRACT: {

            REQUIRED_REQUEST_FIELDS: [

                "sourceId",

                "quoteId",

                "operationId",

                "idempotencyKey"

            ],

            REQUIRED_RESULT_FIELDS: [

                "commitId",

                "sourceId",

                "status"

            ],

            REQUIRE_IDEMPOTENCY:
                true,

            REQUIRE_EXECUTION_REVALIDATION:
                true,

            TERMINAL_SUCCESS_STATUS:
                "committed"

        },

        /* ==================================================================
           REVERSAL CONTRACT
        ================================================================== */

        REVERSAL_CONTRACT: {

            REQUIRED_REQUEST_FIELDS: [

                "sourceId",

                "commitId",

                "operationId",

                "idempotencyKey"

            ],

            REQUIRED_RESULT_FIELDS: [

                "reversalId",

                "sourceId",

                "status"

            ],

            REQUIRE_IDEMPOTENCY:
                true,

            TERMINAL_SUCCESS_STATUS:
                "reversed"

        },

        /* ==================================================================
           ADAPTER CONTRACT

           Every Funding adapter must satisfy this structural contract.

           Optional operations are controlled by declared capabilities.
        ================================================================== */

        ADAPTER_CONTRACT: {

            REQUIRED_PROPERTIES: [

                "id",

                "type",

                "version",

                "capabilities"

            ],

            REQUIRED_METHODS: [

                "getHealth",

                "listSources",

                "getSource",

                "quote",

                "commit"

            ],

            CONDITIONAL_METHODS: {

                AUTHORIZE:
                    "authorize",

                REVERSE:
                    "reverse",

                BALANCE:
                    "getBalance"

            },

            RULES: {

                IMMUTABLE_PUBLIC_DESCRIPTOR:
                    true,

                RETURN_DEFENSIVE_VALUES:
                    true,

                DECLARE_CAPABILITIES:
                    true,

                NO_UI_DEPENDENCY:
                    true,

                NO_DIRECT_DOM_MUTATION:
                    true,

                NO_DUPLICATED_LEDGER_LOGIC:
                    true,

                NO_DUPLICATED_FX_LOGIC:
                    true,

                NO_UNDECLARED_SIDE_EFFECTS:
                    true,

                FAIL_CLOSED:
                    true

            }

        },

        /* ==================================================================
           WALLET ADAPTER CONTRACT

           The Wallet adapter is responsible for converting the generic
           Funding contract into the existing PAY54 Ledger execution model.

           Cross-currency Funding must explicitly verify the FX pair before
           conversion. It must never rely on an unverified fallback rate.
        ================================================================== */

        WALLET_ADAPTER: {

            TYPE:
                "wallet",

            CAPABILITIES: [

                "quote",

                "commit",

                "balance",

                "fx",

                "idempotency"

            ],

            SOURCE_ID_FORMAT:
                "wallet:{ISO4217}",

            REQUIRE_LEDGER:
                true,

            REQUIRE_EXPLICIT_FX_PAIR:
                true,

            ALLOW_RATE_ONE_FALLBACK:
                false,

            CROSS_CURRENCY_DEBIT_POLICY:
                "single_source_wallet_debit",

            DESTINATION_WALLET_CREDIT:
                false

        },

        /* ==================================================================
           LINKED CARD ADAPTER CONTRACT

           The Linked Card adapter must use the canonical Cards Engine /
           approved provider boundary.

           It MUST NOT mutate card balance fields directly.
        ================================================================== */

        LINKED_CARD_ADAPTER: {

            TYPE:
                "linked_card",

            CAPABILITIES: [

                "quote",

                "authorize",

                "commit",

                "reverse",

                "idempotency",

                "strong_customer_authentication"

            ],

            SOURCE_ID_FORMAT:
                "linked_card:{cardId}",

            REQUIRE_CARDS_ENGINE:
                true,

            REQUIRE_PROVIDER_AUTHORIZATION:
                true,

            REQUIRE_COMMIT_CONFIRMATION:
                true,

            ALLOW_DIRECT_CARD_BALANCE_MUTATION:
                false,

            ALLOW_DIRECT_CARD_STORAGE_ACCESS:
                false,

            ALLOW_RAW_PAN:
                false,

            ALLOW_RAW_CVV:
                false

        },

        /* ==================================================================
           REGISTRY CONTRACT

           Funding Registry provides runtime source discovery.

           Source registration and resolution must be deterministic.
        ================================================================== */

        REGISTRY_CONTRACT: {

            UNIQUE_SOURCE_IDS:
                true,

            UNIQUE_ADAPTER_IDS:
                true,

            REJECT_DUPLICATE_SOURCE_IDS:
                true,

            REJECT_DUPLICATE_ADAPTER_IDS:
                true,

            REQUIRE_HEALTH_CHECK:
                true,

            REQUIRE_CAPABILITY_DISCOVERY:
                true,

            RETURN_IMMUTABLE_DESCRIPTORS:
                true,

            ALLOW_SOURCE_OVERRIDE:
                false

        },

        /* ==================================================================
           EVENT BUS CONTRACT

           Events are best-effort observability signals.

           Event publication failure MUST NOT corrupt the financial state
           machine or convert a successfully committed transaction into a
           failed transaction.
        ================================================================== */

        EVENTS: {

            SOURCE_REGISTERED:
                "funding.source.registered",

            SOURCE_UNREGISTERED:
                "funding.source.unregistered",

            SOURCE_AVAILABLE:
                "funding.source.available",

            SOURCE_UNAVAILABLE:
                "funding.source.unavailable",

            QUOTE_CREATED:
                "funding.quote.created",

            QUOTE_EXPIRED:
                "funding.quote.expired",

            AUTHORIZATION_REQUIRED:
                "funding.authorization.required",

            AUTHORIZATION_PENDING:
                "funding.authorization.pending",

            AUTHORIZED:
                "funding.authorized",

            AUTHORIZATION_DECLINED:
                "funding.authorization.declined",

            COMMIT_STARTED:
                "funding.commit.started",

            COMMITTED:
                "funding.committed",

            COMMIT_FAILED:
                "funding.commit.failed",

            REVERSAL_REQUIRED:
                "funding.reversal.required",

            REVERSAL_STARTED:
                "funding.reversal.started",

            REVERSED:
                "funding.reversed",

            REVERSAL_FAILED:
                "funding.reversal.failed",

            FAILED:
                "funding.failed"

        },

        /* ==================================================================
           EVENT SOURCE
        ================================================================== */

        EVENT_SOURCE: {

            CONSTANTS:
                "funding.constants",

            REGISTRY:
                "funding.registry",

            ENGINE:
                "funding.engine",

            SERVICE:
                "funding.service",

            WALLET_ADAPTER:
                "funding.adapter.wallet",

            LINKED_CARD_ADAPTER:
                "funding.adapter.linked-card"

        },

        /* ==================================================================
           HEALTH CONTRACT
        ================================================================== */

        HEALTH: {

            HEALTHY:
                "healthy",

            DEGRADED:
                "degraded",

            UNAVAILABLE:
                "unavailable",

            REQUIRED_FIELDS: [

                "healthy",

                "status",

                "module",

                "version"

            ]

        }

    };

    /* ======================================================================
       VALIDATION HELPERS
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

    function assertString(
        value,
        path
    ) {

        if (
            typeof value !== "string" ||
            !value.trim()
        ) {

            throw new Error(
                `[PAY54] Invalid Funding string constant at ${path}.`
            );

        }

        return true;

    }

    function assertBoolean(
        value,
        path
    ) {

        if (
            typeof value !== "boolean"
        ) {

            throw new Error(
                `[PAY54] Invalid Funding boolean constant at ${path}.`
            );

        }

        return true;

    }

    function assertPositiveInteger(
        value,
        path
    ) {

        if (
            !Number.isInteger(value) ||
            value <= 0
        ) {

            throw new Error(
                `[PAY54] Invalid Funding positive integer at ${path}.`
            );

        }

        return true;

    }

    function assertStringArray(
        value,
        path
    ) {

        if (
            !Array.isArray(value)
        ) {

            throw new Error(
                `[PAY54] Funding string array unavailable at ${path}.`
            );

        }

        const seen =
            new Set();

        for (
            const item
            of value
        ) {

            assertString(
                item,
                path
            );

            if (
                seen.has(item)
            ) {

                throw new Error(
                    `[PAY54] Duplicate Funding value "${item}" detected at ${path}.`
                );

            }

            seen.add(
                item
            );

        }

        return true;

    }

    function validateSafeNode(
        value,
        path = CATALOGUE_NAME
    ) {

        if (
            value === null ||
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
        ) {

            return true;

        }

        if (
            Array.isArray(value)
        ) {

            for (
                let index = 0;
                index < value.length;
                index += 1
            ) {

                validateSafeNode(
                    value[index],
                    `${path}[${index}]`
                );

            }

            return true;

        }

        if (
            !isPlainObject(value)
        ) {

            throw new TypeError(
                `[PAY54] Invalid Funding catalogue node at ${path}.`
            );

        }

        for (
            const [key, child]
            of Object.entries(value)
        ) {

            if (
                key === "__proto__" ||
                key === "prototype" ||
                key === "constructor"
            ) {

                throw new Error(
                    `[PAY54] Unsafe Funding catalogue property rejected at ${path}.${key}.`
                );

            }

            validateSafeNode(
                child,
                `${path}.${key}`
            );

        }

        return true;

    }

    /* ======================================================================
       UNIQUE VALUE VALIDATION
    ====================================================================== */

    function validateUniqueStringValues(
        catalogue,
        path
    ) {

        if (
            !isPlainObject(catalogue)
        ) {

            throw new Error(
                `[PAY54] Funding catalogue unavailable at ${path}.`
            );

        }

        const seen =
            new Set();

        for (
            const [key, value]
            of Object.entries(catalogue)
        ) {

            assertString(
                value,
                `${path}.${key}`
            );

            if (
                seen.has(value)
            ) {

                throw new Error(
                    `[PAY54] Duplicate Funding constant "${value}" detected at ${path}.${key}.`
                );

            }

            seen.add(
                value
            );

        }

        return true;

    }

    /* ======================================================================
       MODULE / VERSION CONTRACT
    ====================================================================== */

    function validatePlatformContract() {

        if (
            FUNDING.MODULE.ID !==
            MODULES.FUNDING
        ) {

            throw new Error(
                "[PAY54] Funding module identifier mismatch."
            );

        }

        const expectedModules = {

            CONSTANTS:
                MODULES.COMPONENTS
                    ?.CORE
                    ?.FUNDING_CONSTANTS,

            ENGINE:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.ENGINE,

            SERVICE:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.SERVICE,

            REGISTRY:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.REGISTRY,

            WALLET_ADAPTER:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.WALLET_ADAPTER,

            LINKED_CARD_ADAPTER:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.LINKED_CARD_ADAPTER,

            EVENTS:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.EVENTS

        };

        for (
            const [key, value]
            of Object.entries(
                expectedModules
            )
        ) {

            assertString(
                value,
                `MODULES.FUNDING.${key}`
            );

            if (
                FUNDING.MODULE[key] !==
                value
            ) {

                throw new Error(
                    `[PAY54] Funding module contract mismatch for ${key}.`
                );

            }

        }

        const expectedVersions = [

            VERSIONS.FUNDING,

            VERSIONS.PLATFORM
                ?.FUNDING,

            VERSIONS.COMPONENTS
                ?.CORE
                ?.FUNDING_CONSTANTS,

            VERSIONS.COMPONENTS
                ?.FUNDING
                ?.CONSTANTS,

            VERSIONS.COMPONENTS
                ?.FUNDING
                ?.ENGINE,

            VERSIONS.COMPONENTS
                ?.FUNDING
                ?.SERVICE,

            VERSIONS.COMPONENTS
                ?.FUNDING
                ?.REGISTRY,

            VERSIONS.COMPONENTS
                ?.FUNDING
                ?.WALLET_ADAPTER,

            VERSIONS.COMPONENTS
                ?.FUNDING
                ?.LINKED_CARD_ADAPTER,

            VERSIONS.DOMAIN
                ?.FUNDING
                ?.ROOT,

            VERSIONS.DOMAIN
                ?.FUNDING
                ?.ENGINE,

            VERSIONS.DOMAIN
                ?.FUNDING
                ?.SERVICE,

            VERSIONS.DOMAIN
                ?.FUNDING
                ?.REGISTRY,

            VERSIONS.DOMAIN
                ?.FUNDING
                ?.WALLET_ADAPTER,

            VERSIONS.DOMAIN
                ?.FUNDING
                ?.LINKED_CARD_ADAPTER,

            VERSIONS.DOMAIN
                ?.FUNDING
                ?.EVENTS

        ];

        for (
            const version
            of expectedVersions
        ) {

            if (
                version !==
                VERSION
            ) {

                throw new Error(
                    "[PAY54] Funding Version Catalogue is incomplete or inconsistent."
                );

            }

        }

        return true;

    }

    /* ======================================================================
       SOURCE CONTRACT VALIDATION
    ====================================================================== */

    function validateSourceContract() {

        validateUniqueStringValues(
            FUNDING.SOURCE_TYPES,
            "FUNDING.SOURCE_TYPES"
        );

        validateUniqueStringValues(
            FUNDING.SOURCE_NAMESPACES,
            "FUNDING.SOURCE_NAMESPACES"
        );

        const sourceTypeKeys =
            Object.keys(
                FUNDING.SOURCE_TYPES
            );

        const namespaceKeys =
            Object.keys(
                FUNDING.SOURCE_NAMESPACES
            );

        if (
            sourceTypeKeys.length !==
            namespaceKeys.length
        ) {

            throw new Error(
                "[PAY54] Funding source type and namespace catalogues are inconsistent."
            );

        }

        for (
            const key
            of sourceTypeKeys
        ) {

            if (
                !Object.prototype.hasOwnProperty.call(
                    FUNDING.SOURCE_NAMESPACES,
                    key
                )
            ) {

                throw new Error(
                    `[PAY54] Funding source namespace missing for ${key}.`
                );

            }

        }

        assertString(
            FUNDING.SOURCE_ID.SEPARATOR,
            "FUNDING.SOURCE_ID.SEPARATOR"
        );

        assertPositiveInteger(
            FUNDING.SOURCE_ID.MAX_LENGTH,
            "FUNDING.SOURCE_ID.MAX_LENGTH"
        );

        assertBoolean(
            FUNDING.SOURCE_ID.REQUIRE_NAMESPACE,
            "FUNDING.SOURCE_ID.REQUIRE_NAMESPACE"
        );

        assertBoolean(
            FUNDING.SOURCE_ID.REQUIRE_IDENTIFIER,
            "FUNDING.SOURCE_ID.REQUIRE_IDENTIFIER"
        );

        return true;

    }

    /* ======================================================================
       CAPABILITY VALIDATION
    ====================================================================== */

    function validateCapabilities() {

        validateUniqueStringValues(
            FUNDING.CAPABILITIES,
            "FUNDING.CAPABILITIES"
        );

        const knownCapabilities =
            new Set(
                Object.values(
                    FUNDING.CAPABILITIES
                )
            );

        const adapterCapabilityLists = [

            FUNDING.WALLET_ADAPTER
                .CAPABILITIES,

            FUNDING.LINKED_CARD_ADAPTER
                .CAPABILITIES

        ];

        for (
            const list
            of adapterCapabilityLists
        ) {

            assertStringArray(
                list,
                "FUNDING adapter capabilities"
            );

            for (
                const capability
                of list
            ) {

                if (
                    !knownCapabilities.has(
                        capability
                    )
                ) {

                    throw new Error(
                        `[PAY54] Unknown Funding capability "${capability}".`
                    );

                }

            }

        }

        return true;

    }

    /* ======================================================================
       STATE VALIDATION
    ====================================================================== */

    function validateStates() {

        const catalogues = [

            [
                FUNDING.SOURCE_STATUS,
                "FUNDING.SOURCE_STATUS"
            ],

            [
                FUNDING.LIFECYCLE,
                "FUNDING.LIFECYCLE"
            ],

            [
                FUNDING.QUOTE_MODES,
                "FUNDING.QUOTE_MODES"
            ],

            [
                FUNDING.QUOTE_STATUS,
                "FUNDING.QUOTE_STATUS"
            ],

            [
                FUNDING.AUTHORIZATION_STATUS,
                "FUNDING.AUTHORIZATION_STATUS"
            ],

            [
                FUNDING.COMMIT_STATUS,
                "FUNDING.COMMIT_STATUS"
            ],

            [
                FUNDING.REVERSAL_STATUS,
                "FUNDING.REVERSAL_STATUS"
            ],

            [
                FUNDING.FAILURE_CODES,
                "FUNDING.FAILURE_CODES"
            ],

            [
                FUNDING.EVENTS,
                "FUNDING.EVENTS"
            ]

        ];

        for (
            const [catalogue, path]
            of catalogues
        ) {

            validateUniqueStringValues(
                catalogue,
                path
            );

        }

        return true;

    }

    /* ======================================================================
       TRANSACTION METADATA VALIDATION
    ====================================================================== */

    function validateTransactionMetadata() {

        validateUniqueStringValues(
            FUNDING.TRANSACTION_METADATA,
            "FUNDING.TRANSACTION_METADATA"
        );

        const required = [

            "SOURCE",

            "SOURCE_ID",

            "SOURCE_TYPE",

            "FUNDING_CURRENCY",

            "FUNDING_AMOUNT",

            "PAYMENT_CURRENCY",

            "PAYMENT_AMOUNT",

            "MODE",

            "CONTRACT",

            "IDEMPOTENCY_KEY"

        ];

        for (
            const key
            of required
        ) {

            assertString(
                FUNDING.TRANSACTION_METADATA[key],
                `FUNDING.TRANSACTION_METADATA.${key}`
            );

        }

        return true;

    }

    /* ======================================================================
       SECURITY VALIDATION
    ====================================================================== */

    function validateSecurityPolicy() {

        const booleanFields = [

            "FAIL_CLOSED",

            "REQUIRE_EXPLICIT_SOURCE",

            "REQUIRE_FINITE_AMOUNT",

            "REQUIRE_POSITIVE_AMOUNT",

            "REQUIRE_ISO_CURRENCY",

            "REQUIRE_CAPABILITY_CHECK",

            "REQUIRE_QUOTE_REVALIDATION",

            "REQUIRE_EXECUTION_REVALIDATION",

            "REQUIRE_IDEMPOTENCY",

            "ALLOW_UNVERIFIED_FX_FALLBACK",

            "ALLOW_NEGATIVE_FUNDING_AMOUNT",

            "ALLOW_ZERO_FUNDING_AMOUNT",

            "ALLOW_DIRECT_UI_LEDGER_MUTATION",

            "ALLOW_DIRECT_UI_CARD_MUTATION",

            "ALLOW_DIRECT_UI_STORAGE_ACCESS",

            "ALLOW_RAW_CARD_CREDENTIALS",

            "ALLOW_SECRET_METADATA",

            "ALLOW_SOURCE_TYPE_INFERENCE_FOR_COMMIT"

        ];

        for (
            const field
            of booleanFields
        ) {

            assertBoolean(
                FUNDING.SECURITY[field],
                `FUNDING.SECURITY.${field}`
            );

        }

        if (
            FUNDING.SECURITY.FAIL_CLOSED !==
                true ||
            FUNDING.SECURITY
                .ALLOW_UNVERIFIED_FX_FALLBACK !==
                false ||
            FUNDING.SECURITY
                .ALLOW_DIRECT_UI_LEDGER_MUTATION !==
                false ||
            FUNDING.SECURITY
                .ALLOW_DIRECT_UI_CARD_MUTATION !==
                false ||
            FUNDING.SECURITY
                .ALLOW_DIRECT_UI_STORAGE_ACCESS !==
                false ||
            FUNDING.SECURITY
                .ALLOW_RAW_CARD_CREDENTIALS !==
                false ||
            FUNDING.SECURITY
                .ALLOW_SECRET_METADATA !==
                false
        ) {

            throw new Error(
                "[PAY54] Funding security policy violates the enterprise fail-closed contract."
            );

        }

        assertStringArray(
            FUNDING.SECURITY
                .FORBIDDEN_FIELDS,
            "FUNDING.SECURITY.FORBIDDEN_FIELDS"
        );

        const forbiddenLowercase =
            FUNDING.SECURITY
                .FORBIDDEN_FIELDS
                .map(
                    field =>
                        field.toLowerCase()
                );

        if (
            new Set(
                forbiddenLowercase
            ).size !==
            forbiddenLowercase.length
        ) {

            throw new Error(
                "[PAY54] Funding forbidden-field policy contains case-insensitive duplicates."
            );

        }

        return true;

    }

    /* ======================================================================
       IDEMPOTENCY VALIDATION
    ====================================================================== */

    function validateIdempotencyPolicy() {

        assertBoolean(
            FUNDING.IDEMPOTENCY
                .REQUIRED_FOR_COMMIT,
            "FUNDING.IDEMPOTENCY.REQUIRED_FOR_COMMIT"
        );

        assertBoolean(
            FUNDING.IDEMPOTENCY
                .REQUIRED_FOR_REVERSAL,
            "FUNDING.IDEMPOTENCY.REQUIRED_FOR_REVERSAL"
        );

        assertPositiveInteger(
            FUNDING.IDEMPOTENCY
                .MIN_KEY_LENGTH,
            "FUNDING.IDEMPOTENCY.MIN_KEY_LENGTH"
        );

        assertPositiveInteger(
            FUNDING.IDEMPOTENCY
                .MAX_KEY_LENGTH,
            "FUNDING.IDEMPOTENCY.MAX_KEY_LENGTH"
        );

        if (
            FUNDING.IDEMPOTENCY
                .MIN_KEY_LENGTH >
            FUNDING.IDEMPOTENCY
                .MAX_KEY_LENGTH
        ) {

            throw new Error(
                "[PAY54] Funding idempotency key limits are invalid."
            );

        }

        assertString(
            FUNDING.IDEMPOTENCY
                .REUSE_POLICY,
            "FUNDING.IDEMPOTENCY.REUSE_POLICY"
        );

        assertString(
            FUNDING.IDEMPOTENCY
                .CONFLICT_POLICY,
            "FUNDING.IDEMPOTENCY.CONFLICT_POLICY"
        );

        return true;

    }

    /* ======================================================================
       ADAPTER CONTRACT VALIDATION
    ====================================================================== */

    function validateAdapterContract() {

        assertStringArray(
            FUNDING.ADAPTER_CONTRACT
                .REQUIRED_PROPERTIES,
            "FUNDING.ADAPTER_CONTRACT.REQUIRED_PROPERTIES"
        );

        assertStringArray(
            FUNDING.ADAPTER_CONTRACT
                .REQUIRED_METHODS,
            "FUNDING.ADAPTER_CONTRACT.REQUIRED_METHODS"
        );

        validateUniqueStringValues(
            FUNDING.ADAPTER_CONTRACT
                .CONDITIONAL_METHODS,
            "FUNDING.ADAPTER_CONTRACT.CONDITIONAL_METHODS"
        );

        if (
            FUNDING.WALLET_ADAPTER
                .ALLOW_RATE_ONE_FALLBACK !==
                false ||
            FUNDING.WALLET_ADAPTER
                .DESTINATION_WALLET_CREDIT !==
                false
        ) {

            throw new Error(
                "[PAY54] Wallet Funding Adapter violates the approved FX funding contract."
            );

        }

        if (
            FUNDING.LINKED_CARD_ADAPTER
                .ALLOW_DIRECT_CARD_BALANCE_MUTATION !==
                false ||
            FUNDING.LINKED_CARD_ADAPTER
                .ALLOW_DIRECT_CARD_STORAGE_ACCESS !==
                false ||
            FUNDING.LINKED_CARD_ADAPTER
                .ALLOW_RAW_PAN !==
                false ||
            FUNDING.LINKED_CARD_ADAPTER
                .ALLOW_RAW_CVV !==
                false
        ) {

            throw new Error(
                "[PAY54] Linked Card Funding Adapter violates the approved security boundary."
            );

        }

        return true;

    }

    /* ======================================================================
       FINANCIAL CONTRACT VALIDATION
    ====================================================================== */

    function validateFinancialContracts() {

        const contractLists = [

            [
                FUNDING.QUOTE_CONTRACT
                    .REQUIRED_REQUEST_FIELDS,
                "FUNDING.QUOTE_CONTRACT.REQUIRED_REQUEST_FIELDS"
            ],

            [
                FUNDING.QUOTE_CONTRACT
                    .REQUIRED_RESULT_FIELDS,
                "FUNDING.QUOTE_CONTRACT.REQUIRED_RESULT_FIELDS"
            ],

            [
                FUNDING.QUOTE_CONTRACT
                    .CROSS_CURRENCY_REQUIRED_FIELDS,
                "FUNDING.QUOTE_CONTRACT.CROSS_CURRENCY_REQUIRED_FIELDS"
            ],

            [
                FUNDING.AUTHORIZATION_CONTRACT
                    .REQUIRED_REQUEST_FIELDS,
                "FUNDING.AUTHORIZATION_CONTRACT.REQUIRED_REQUEST_FIELDS"
            ],

            [
                FUNDING.AUTHORIZATION_CONTRACT
                    .REQUIRED_RESULT_FIELDS,
                "FUNDING.AUTHORIZATION_CONTRACT.REQUIRED_RESULT_FIELDS"
            ],

            [
                FUNDING.COMMIT_CONTRACT
                    .REQUIRED_REQUEST_FIELDS,
                "FUNDING.COMMIT_CONTRACT.REQUIRED_REQUEST_FIELDS"
            ],

            [
                FUNDING.COMMIT_CONTRACT
                    .REQUIRED_RESULT_FIELDS,
                "FUNDING.COMMIT_CONTRACT.REQUIRED_RESULT_FIELDS"
            ],

            [
                FUNDING.REVERSAL_CONTRACT
                    .REQUIRED_REQUEST_FIELDS,
                "FUNDING.REVERSAL_CONTRACT.REQUIRED_REQUEST_FIELDS"
            ],

            [
                FUNDING.REVERSAL_CONTRACT
                    .REQUIRED_RESULT_FIELDS,
                "FUNDING.REVERSAL_CONTRACT.REQUIRED_RESULT_FIELDS"
            ]

        ];

        for (
            const [list, path]
            of contractLists
        ) {

            assertStringArray(
                list,
                path
            );

        }

        if (
            FUNDING.QUOTE_CONTRACT
                .MUST_BE_SIDE_EFFECT_FREE !==
                true ||
            FUNDING.QUOTE_CONTRACT
                .MUST_NOT_COMMIT_FUNDS !==
                true ||
            FUNDING.COMMIT_CONTRACT
                .REQUIRE_IDEMPOTENCY !==
                true ||
            FUNDING.REVERSAL_CONTRACT
                .REQUIRE_IDEMPOTENCY !==
                true
        ) {

            throw new Error(
                "[PAY54] Funding financial lifecycle contract is invalid."
            );

        }

        return true;

    }

    /* ======================================================================
       EVENT CONTRACT VALIDATION
    ====================================================================== */

    function validateEventContract() {

        validateUniqueStringValues(
            FUNDING.EVENTS,
            "FUNDING.EVENTS"
        );

        validateUniqueStringValues(
            FUNDING.EVENT_SOURCE,
            "FUNDING.EVENT_SOURCE"
        );

        for (
            const eventName
            of Object.values(
                FUNDING.EVENTS
            )
        ) {

            if (
                !eventName.startsWith(
                    "funding."
                )
            ) {

                throw new Error(
                    `[PAY54] Invalid Funding Event Bus namespace: ${eventName}.`
                );

            }

        }

        return true;

    }

    /* ======================================================================
       COMPLETE CATALOGUE VALIDATION
    ====================================================================== */

    function validateCatalogue() {

        if (
            FUNDING.VERSION !==
            VERSION
        ) {

            throw new Error(
                "[PAY54] Funding catalogue version mismatch."
            );

        }

        validateSafeNode(
            FUNDING
        );

        validatePlatformContract();

        validateSourceContract();

        validateCapabilities();

        validateStates();

        validateTransactionMetadata();

        validateSecurityPolicy();

        validateIdempotencyPolicy();

        validateAdapterContract();

        validateFinancialContracts();

        validateEventContract();

        return true;

    }

    /* ======================================================================
       REGISTRATION
    ====================================================================== */

    try {

        validateCatalogue();

        /*
         * PAY54_CONSTANTS owns defensive cloning and recursive immutability.
         *
         * The source catalogue is intentionally not independently frozen.
         * This preserves the same enterprise registration model used by the
         * Contacts and Beneficiary constant catalogues.
         */

        constants.register(
            MODULES.FUNDING,
            FUNDING
        );

        const registered =
            constants.get(
                MODULES.FUNDING
            );

        if (
            !registered
        ) {

            throw new Error(
                "[PAY54] Failed to register Funding Constants."
            );

        }

        if (
            registered.VERSION !==
                VERSION ||
            registered.MODULE
                ?.ID !==
                "FUNDING" ||
            registered.SOURCE_TYPES
                ?.WALLET !==
                "wallet" ||
            registered.SOURCE_TYPES
                ?.LINKED_CARD !==
                "linked_card" ||
            registered.QUOTE_MODES
                ?.CROSS_CURRENCY !==
                "cross_currency" ||
            registered.SECURITY
                ?.FAIL_CLOSED !==
                true ||
            registered.SECURITY
                ?.ALLOW_UNVERIFIED_FX_FALLBACK !==
                false ||
            registered.WALLET_ADAPTER
                ?.DESTINATION_WALLET_CREDIT !==
                false ||
            registered.LINKED_CARD_ADAPTER
                ?.ALLOW_DIRECT_CARD_BALANCE_MUTATION !==
                false
        ) {

            throw new Error(
                "[PAY54] Funding Constants post-registration verification failed."
            );

        }

    } catch (error) {

        console.error(
            "[PAY54] Funding Constants bootstrap failed:",
            error
        );

        throw error;

    }

    /* ======================================================================
       STARTUP
    ====================================================================== */

    console.info(
        "✅ PAY54 Funding Constants",
        VERSION,
        "loaded."
    );

})();
