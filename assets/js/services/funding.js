"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE FUNDING SERVICE
   File: assets/js/services/funding.js
   Version: v1.0.0

   Work Package
   ------------
   WP-011B.6E.5F.2 — Enterprise Funding Service

   Purpose
   -------
   Canonical application-facing service boundary for PAY54 funding.

   Responsibilities
   ----------------
   • Expose normalized Funding source discovery to application modules
   • Resolve Funding sources through the Funding Engine
   • Validate Funding source availability without bypassing adapters
   • Route quote requests through the Funding Engine
   • Route authorization requests through the Funding Engine
   • Route commit requests through the Funding Engine
   • Route reversal requests through the Funding Engine
   • Provide controlled Funding execution orchestration
   • Preserve canonical Funding-domain failures
   • Preserve Funding idempotency contracts
   • Provide immutable outward-facing service results
   • Provide runtime health diagnostics

   Architecture
   ------------
   Funding Constants
        ↓
   Funding Engine
        ↓
   Funding Adapters
        ↓
   Funding Service
        ↓
   Payment Modules / Send Money / Checkout

   Financial Boundary
   ------------------
   This service DOES NOT:
   • read/write localStorage or sessionStorage
   • mutate wallet balances directly
   • mutate card balances directly
   • write Ledger entries directly
   • access PAY54_CARDS directly
   • access Funding adapters directly
   • access card providers directly
   • perform FX calculations
   • manufacture provider authorization
   • store PAN/CVV/PIN/OTP/provider secrets
   • update beneficiaries
   • update legacy recipients
   • generate payment receipts

   Source-specific financial execution remains exclusively behind
   PAY54_FUNDING_ENGINE.

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL / IDENTITY
    ====================================================================== */

    const GLOBAL =
        window;

    const SERVICE_VERSION =
        "1.0.0";

    const SERVICE_NAME =
        "PAY54 Enterprise Funding Service";

    const DEFAULT_MODULE_ID =
        "services.funding";

    /* ======================================================================
       DEPENDENCIES
    ====================================================================== */

    const constants =
        GLOBAL.PAY54_CONSTANTS;

    if (
        !constants ||
        typeof constants.get !==
            "function"
    ) {

        throw new Error(
            "[PAY54] Constants Registry must load before Funding Service."
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
            "[PAY54] Funding Service dependencies are unavailable."
        );

    }

    if (
        MODULES.FUNDING !==
        "FUNDING"
    ) {

        throw new Error(
            "[PAY54] Funding module contract unavailable."
        );

    }

    const ENGINE =
        GLOBAL.PAY54_FUNDING_ENGINE;

    if (
        !ENGINE ||
        typeof ENGINE !==
            "object"
    ) {

        throw new Error(
            "[PAY54] Funding Engine must load before Funding Service."
        );

    }

    /* ======================================================================
       CANONICAL CONTRACTS
    ====================================================================== */

    const FAILURE_CODES =
        FUNDING.FAILURE_CODES ||
        Object.freeze({});

    const SOURCE_TYPES =
        FUNDING.SOURCE_TYPES ||
        Object.freeze({});

    const AUTHORIZATION_STATUS =
        FUNDING.AUTHORIZATION_STATUS ||
        Object.freeze({});

    const COMMIT_STATUS =
        FUNDING.COMMIT_STATUS ||
        Object.freeze({});

    const REVERSAL_STATUS =
        FUNDING.REVERSAL_STATUS ||
        Object.freeze({});

    const SECURITY =
        FUNDING.SECURITY ||
        Object.freeze({});

    /* ======================================================================
       PRIVATE STATE
    ====================================================================== */

    let ready =
        false;

    /* ======================================================================
       GENERIC HELPERS
    ====================================================================== */

    function now() {

        return new Date()
            .toISOString();

    }

    function normalizeString(
        value
    ) {

        return typeof value ===
            "string"
            ? value.trim()
            : "";

    }

    function isPlainObject(
        value
    ) {

        if (
            value === null ||
            typeof value !==
                "object" ||
            Array.isArray(value)
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
            JSON.stringify(
                value
            )
        );

    }

    function deepFreeze(
        value,
        visited = new WeakSet()
    ) {

        if (
            value === null ||
            typeof value !==
                "object"
        ) {

            return value;

        }

        if (
            visited.has(value)
        ) {

            return value;

        }

        visited.add(value);

        for (
            const key
            of Object.keys(value)
        ) {

            deepFreeze(
                value[key],
                visited
            );

        }

        return Object.freeze(
            value
        );

    }

    function immutableClone(
        value
    ) {

        return deepFreeze(
            clone(value)
        );

    }

    function createFailure(
        code,
        message,
        details = {}
    ) {

        return deepFreeze({

            ok:
                false,

            code:
                normalizeString(code) ||
                FAILURE_CODES.INTERNAL_ERROR ||
                "FUNDING_INTERNAL_ERROR",

            message:
                normalizeString(message) ||
                "Funding service operation failed.",

            details:
                isPlainObject(details)
                    ? clone(details)
                    : {},

            timestamp:
                now()

        });

    }

    function createSuccess(
        data = {}
    ) {

        return deepFreeze({

            ok:
                true,

            data:
                isPlainObject(data)
                    ? clone(data)
                    : {},

            timestamp:
                now()

        });

    }

    /* ======================================================================
       SECURITY
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
            visited.has(value)
        ) {

            return false;

        }

        visited.add(value);

        const forbidden =
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

        for (
            const key
            of Object.keys(value)
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

    function validateSafeObject(
        value,
        {
            optional = false,
            label = "Funding request"
        } = {}
    ) {

        if (
            optional &&
            (
                value === undefined ||
                value === null
            )
        ) {

            return createSuccess();

        }

        if (
            !isPlainObject(value)
        ) {

            return createFailure(
                FAILURE_CODES.INVALID_REQUEST,
                `${label} must be an object.`
            );

        }

        if (
            containsForbiddenField(
                value
            )
        ) {

            return createFailure(
                FAILURE_CODES.SECURITY_REJECTED,
                `${label} contains prohibited sensitive fields.`
            );

        }

        return createSuccess();

    }

    /* ======================================================================
       ENGINE CONTRACT
    ====================================================================== */

    const REQUIRED_ENGINE_METHODS =
        Object.freeze([
            "listSources",
            "getSource",
            "quote",
            "authorize",
            "commit",
            "reverse",
            "getHealth"
        ]);

    function validateEngineContract() {

        for (
            const method
            of REQUIRED_ENGINE_METHODS
        ) {

            if (
                typeof ENGINE[method] !==
                "function"
            ) {

                throw new Error(
                    `[PAY54] Funding Engine method "${method}" is required by Funding Service.`
                );

            }

        }

        return true;

    }

    function normalizeEngineResult(
        result,
        operation
    ) {

        if (
            !result ||
            typeof result !==
                "object" ||
            typeof result.ok !==
                "boolean"
        ) {

            return createFailure(
                FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION ||
                    FAILURE_CODES.INTERNAL_ERROR,
                `Funding Engine returned an invalid ${operation} result.`
            );

        }

        /*
         * Preserve canonical Funding-domain failures exactly.
         *
         * We clone/freeze the envelope so application modules cannot mutate
         * the Engine result retained elsewhere in the runtime.
         */
        return immutableClone(
            result
        );

    }

    async function invokeEngine(
        method,
        argument,
        operation
    ) {

        if (
            !ready
        ) {

            return createFailure(
                FAILURE_CODES.ADAPTER_UNAVAILABLE ||
                    FAILURE_CODES.INTERNAL_ERROR,
                "Funding Service is unavailable."
            );

        }

        if (
            typeof ENGINE[method] !==
            "function"
        ) {

            return createFailure(
                FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION ||
                    FAILURE_CODES.INTERNAL_ERROR,
                `Funding Engine operation "${method}" is unavailable.`
            );

        }

        try {

            const result =
                argument === undefined
                    ? await ENGINE[method]()
                    : await ENGINE[method](
                        clone(argument)
                    );

            return normalizeEngineResult(
                result,
                operation
            );

        } catch (error) {

            /*
             * Engine methods normally return canonical failure envelopes.
             * Reaching this branch indicates an unexpected runtime failure.
             */

            return createFailure(
                FAILURE_CODES.INTERNAL_ERROR ||
                    FAILURE_CODES.ADAPTER_UNAVAILABLE,
                `Funding ${operation} operation failed unexpectedly.`,
                {
                    reason:
                        normalizeString(
                            error?.message
                        ) ||
                        "UNKNOWN"
                }
            );

        }

    }

    /* ======================================================================
       SOURCE DISCOVERY
    ====================================================================== */

    async function listSources(
        options = {}
    ) {

        const request =
            isPlainObject(options)
                ? options
                : {};

        const safe =
            validateSafeObject(
                request,
                {
                    label:
                        "Funding source discovery request"
                }
            );

        if (!safe.ok) {

            return safe;

        }

        const result =
            await invokeEngine(
                "listSources",
                request,
                "source discovery"
            );

        if (!result.ok) {

            return result;

        }

        const sources =
            result.data?.sources;

        if (
            !Array.isArray(
                sources
            )
        ) {

            return createFailure(
                FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION ||
                    FAILURE_CODES.INTERNAL_ERROR,
                "Funding Engine returned an invalid source collection."
            );

        }

        return createSuccess({
            sources:
                immutableClone(
                    sources
                )
        });

    }

    async function getSource(
        sourceId
    ) {

        const normalizedSourceId =
            normalizeString(
                sourceId
            );

        if (!normalizedSourceId) {

            return createFailure(
                FAILURE_CODES.INVALID_SOURCE_ID ||
                    FAILURE_CODES.INVALID_REQUEST,
                "Funding source identifier is required."
            );

        }

        const result =
            await invokeEngine(
                "getSource",
                normalizedSourceId,
                "source lookup"
            );

        if (!result.ok) {

            return result;

        }

        const source =
            result.data?.source;

        if (
            !source ||
            typeof source !==
                "object"
        ) {

            return createFailure(
                FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION ||
                    FAILURE_CODES.SOURCE_NOT_FOUND,
                "Funding Engine returned an invalid source."
            );

        }

        return createSuccess({
            source:
                immutableClone(
                    source
                )
        });

    }

    async function validateSource(
        sourceId
    ) {

        const lookup =
            await getSource(
                sourceId
            );

        if (!lookup.ok) {

            return lookup;

        }

        const source =
            lookup.data.source;

        /*
         * The adapters own the canonical source model.
         * The service only applies the common application-facing availability
         * gate and deliberately does not invent source-specific rules.
         */

        const explicitlyUnavailable =
            source.available ===
                false;

        const normalizedStatus =
            normalizeString(
                source.status
            ).toLowerCase();

        const unavailableStatus =
            [
                "unavailable",
                "disabled",
                "blocked",
                "inactive"
            ].includes(
                normalizedStatus
            );

        if (
            explicitlyUnavailable ||
            unavailableStatus
        ) {

            return createFailure(
                FAILURE_CODES.SOURCE_UNAVAILABLE ||
                    FAILURE_CODES.SOURCE_NOT_FOUND,
                "Funding source is unavailable.",
                {
                    sourceId:
                        normalizeString(
                            source.id
                        )
                }
            );

        }

        return createSuccess({
            valid:
                true,

            source:
                immutableClone(
                    source
                )
        });

    }

    /* ======================================================================
       QUOTE
    ====================================================================== */

    async function quote(
        request
    ) {

        const safe =
            validateSafeObject(
                request,
                {
                    label:
                        "Funding quote request"
                }
            );

        if (!safe.ok) {

            return safe;

        }

        const result =
            await invokeEngine(
                "quote",
                request,
                "quote"
            );

        if (!result.ok) {

            return result;

        }

        const fundingQuote =
            result.data?.quote;

        if (
            !fundingQuote ||
            typeof fundingQuote !==
                "object"
        ) {

            return createFailure(
                FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION ||
                    FAILURE_CODES.FX_QUOTE_UNAVAILABLE,
                "Funding Engine returned an invalid quote."
            );

        }

        return createSuccess({
            quote:
                immutableClone(
                    fundingQuote
                )
        });

    }

    /* ======================================================================
       AUTHORIZE
    ====================================================================== */

    async function authorize(
        request
    ) {

        const safe =
            validateSafeObject(
                request,
                {
                    label:
                        "Funding authorization request"
                }
            );

        if (!safe.ok) {

            return safe;

        }

        const result =
            await invokeEngine(
                "authorize",
                request,
                "authorization"
            );

        if (!result.ok) {

            return result;

        }

        const authorization =
            result.data
                ?.authorization;

        if (
            !authorization ||
            typeof authorization !==
                "object"
        ) {

            return createFailure(
                FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION ||
                    FAILURE_CODES.AUTHORIZATION_FAILED,
                "Funding Engine returned an invalid authorization result."
            );

        }

        return createSuccess({
            authorization:
                immutableClone(
                    authorization
                )
        });

    }

    /* ======================================================================
       COMMIT
    ====================================================================== */

    async function commit(
        request
    ) {

        const safe =
            validateSafeObject(
                request,
                {
                    label:
                        "Funding commit request"
                }
            );

        if (!safe.ok) {

            return safe;

        }

        /*
         * Idempotency validation remains canonical inside Funding Engine and
         * adapters. The service must never replace or regenerate a supplied
         * key because doing so would defeat safe financial replay.
         */

        const result =
            await invokeEngine(
                "commit",
                request,
                "commit"
            );

        if (!result.ok) {

            return result;

        }

        const fundingCommit =
            result.data?.commit;

        if (
            !fundingCommit ||
            typeof fundingCommit !==
                "object"
        ) {

            return createFailure(
                FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION ||
                    FAILURE_CODES.COMMIT_FAILED,
                "Funding Engine returned an invalid commit result."
            );

        }

        return createSuccess({
            commit:
                immutableClone(
                    fundingCommit
                )
        });

    }

    /* ======================================================================
       REVERSAL
    ====================================================================== */

    async function reverse(
        request
    ) {

        const safe =
            validateSafeObject(
                request,
                {
                    label:
                        "Funding reversal request"
                }
            );

        if (!safe.ok) {

            return safe;

        }

        /*
         * Reversal idempotency is intentionally delegated to the canonical
         * Engine/adapter/provider chain.
         */

        const result =
            await invokeEngine(
                "reverse",
                request,
                "reversal"
            );

        if (!result.ok) {

            return result;

        }

        const reversal =
            result.data?.reversal;

        if (
            !reversal ||
            typeof reversal !==
                "object"
        ) {

            return createFailure(
                FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION ||
                    FAILURE_CODES.REVERSAL_FAILED,
                "Funding Engine returned an invalid reversal result."
            );

        }

        return createSuccess({
            reversal:
                immutableClone(
                    reversal
                )
        });

    }

    /* ======================================================================
       CONTROLLED EXECUTION
    ====================================================================== */

    async function execute(
        request
    ) {

        const safe =
            validateSafeObject(
                request,
                {
                    label:
                        "Funding execution request"
                }
            );

        if (!safe.ok) {

            return safe;

        }

        const sourceId =
            normalizeString(
                request.sourceId
            );

        const operationId =
            normalizeString(
                request.operationId
            );

        const idempotencyKey =
            normalizeString(
                request.idempotencyKey
            );

        if (!sourceId) {

            return createFailure(
                FAILURE_CODES.INVALID_SOURCE_ID ||
                    FAILURE_CODES.INVALID_REQUEST,
                "Funding source identifier is required."
            );

        }

        if (!operationId) {

            return createFailure(
                FAILURE_CODES.INVALID_REQUEST,
                "Funding operation identifier is required."
            );

        }

        if (!idempotencyKey) {

            return createFailure(
                FAILURE_CODES.IDEMPOTENCY_KEY_REQUIRED ||
                    FAILURE_CODES.INVALID_REQUEST,
                "Funding commit idempotency key is required."
            );

        }

        /*
         * Step 1 — source lookup / common availability gate.
         */

        const sourceValidation =
            await validateSource(
                sourceId
            );

        if (!sourceValidation.ok) {

            return sourceValidation;

        }

        /*
         * Step 2 — quote.
         *
         * Only canonical financial fields are forwarded. Metadata remains
         * allowed because the Engine's security boundary validates it.
         */

        const quoteResult =
            await quote({

                sourceId,

                operationId,

                paymentAmount:
                    request.paymentAmount,

                paymentCurrency:
                    request.paymentCurrency,

                metadata:
                    isPlainObject(
                        request.metadata
                    )
                        ? clone(
                            request.metadata
                        )
                        : {}

            });

        if (!quoteResult.ok) {

            return quoteResult;

        }

        const fundingQuote =
            quoteResult.data.quote;

        const quoteId =
            normalizeString(
                fundingQuote.quoteId
            );

        if (!quoteId) {

            return createFailure(
                FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION ||
                    FAILURE_CODES.FX_QUOTE_UNAVAILABLE,
                "Funding quote does not contain a quote identifier."
            );

        }

        /*
         * Step 3 — authorization.
         *
         * Wallet adapters may model authorization differently from linked
         * cards. The canonical Engine determines capability support.
         */

        const authorizationResult =
            await authorize({

                sourceId,

                quoteId,

                operationId,

                metadata:
                    isPlainObject(
                        request.metadata
                    )
                        ? clone(
                            request.metadata
                        )
                        : {}

            });

        if (!authorizationResult.ok) {

            return authorizationResult;

        }

        const authorization =
            authorizationResult
                .data
                .authorization;

        const authorizationStatus =
            normalizeString(
                authorization.status
            );

        const authorizedStatus =
            normalizeString(
                AUTHORIZATION_STATUS
                    .AUTHORIZED
            );

        if (
            authorizedStatus &&
            authorizationStatus !==
                authorizedStatus
        ) {

            return createFailure(
                authorizationStatus ===
                    normalizeString(
                        AUTHORIZATION_STATUS
                            .DECLINED
                    )
                    ? (
                        FAILURE_CODES.AUTHORIZATION_DECLINED ||
                        FAILURE_CODES.AUTHORIZATION_FAILED
                    )
                    : FAILURE_CODES.AUTHORIZATION_FAILED,
                "Funding authorization did not reach an authorized state.",
                {
                    sourceId,
                    quoteId,
                    operationId,
                    authorizationId:
                        normalizeString(
                            authorization
                                .authorizationId
                        ),
                    status:
                        authorizationStatus ||
                        "unknown"
                }
            );

        }

        const authorizationId =
            normalizeString(
                authorization
                    .authorizationId
            );

        /*
         * Some source types may not require a provider-style authorization
         * identifier. The service therefore forwards it when present and lets
         * the source adapter enforce its own canonical contract.
         */

        const commitRequest = {

            sourceId,

            quoteId,

            operationId,

            idempotencyKey

        };

        if (authorizationId) {

            commitRequest
                .authorizationId =
                authorizationId;

        }

        if (
            isPlainObject(
                request.metadata
            )
        ) {

            commitRequest.metadata =
                clone(
                    request.metadata
                );

        }

        /*
         * Step 4 — commit.
         */

        const commitResult =
            await commit(
                commitRequest
            );

        if (!commitResult.ok) {

            return commitResult;

        }

        const fundingCommit =
            commitResult.data.commit;

        const commitStatus =
            normalizeString(
                fundingCommit.status
            );

        const committedStatus =
            normalizeString(
                COMMIT_STATUS
                    .COMMITTED
            );

        if (
            committedStatus &&
            commitStatus !==
                committedStatus
        ) {

            return createFailure(
                FAILURE_CODES.COMMIT_FAILED,
                "Funding commitment did not reach a committed state.",
                {
                    sourceId,
                    quoteId,
                    operationId,
                    authorizationId:
                        authorizationId ||
                        null,
                    commitId:
                        normalizeString(
                            fundingCommit
                                .commitId
                        ),
                    status:
                        commitStatus ||
                        "unknown"
                }
            );

        }

        /*
         * IMPORTANT:
         * This is the end of the Funding Service financial responsibility.
         *
         * Beneficiary mutation, legacy recipient synchronization, destination
         * settlement and receipt generation occur above this boundary.
         *
         * If a higher workflow fails after this point it must explicitly call
         * reverse() using the committed funding reference.
         */

        return createSuccess({

            source:
                immutableClone(
                    sourceValidation
                        .data
                        .source
                ),

            quote:
                immutableClone(
                    fundingQuote
                ),

            authorization:
                immutableClone(
                    authorization
                ),

            commit:
                immutableClone(
                    fundingCommit
                ),

            operationId

        });

    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    async function getHealth() {

        let engineHealth =
            null;

        try {

            engineHealth =
                await ENGINE
                    .getHealth();

        } catch {

            engineHealth =
                null;

        }

        const engineHealthy =
            engineHealth?.healthy ===
            true;

        return deepFreeze({

            healthy:
                ready &&
                engineHealthy,

            status:
                !ready
                    ? "unavailable"
                    : engineHealthy
                        ? "healthy"
                        : "degraded",

            module:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.SERVICE ||
                DEFAULT_MODULE_ID,

            version:
                SERVICE_VERSION,

            engineAvailable:
                Boolean(
                    ENGINE
                ),

            engineHealthy,

            engineStatus:
                normalizeString(
                    engineHealth?.status
                ) ||
                "unavailable",

            sourceTypes:
                clone(
                    SOURCE_TYPES
                ),

            timestamp:
                now()

        });

    }

    /* ======================================================================
       INITIALISATION
    ====================================================================== */

    function initialize() {

        if (ready) {

            return true;

        }

        if (
            SECURITY.FAIL_CLOSED !==
            true
        ) {

            throw new Error(
                "[PAY54] Funding Service requires fail-closed security."
            );

        }

        validateEngineContract();

        ready =
            true;

        return true;

    }

    /* ======================================================================
       PUBLIC API
    ====================================================================== */

    const API =
        Object.freeze({

            listSources,

            getSource,

            validateSource,

            quote,

            authorize,

            commit,

            reverse,

            execute,

            getHealth,

            health:
                getHealth,

            initialize,

            initialise:
                initialize,

            module:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.SERVICE ||
                DEFAULT_MODULE_ID,

            moduleId:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.SERVICE ||
                DEFAULT_MODULE_ID,

            version:
                SERVICE_VERSION,

            service:
                SERVICE_NAME

        });

    /* ======================================================================
       EXPORT
    ====================================================================== */

    if (
        GLOBAL.PAY54_FUNDING_SERVICE
    ) {

        throw new Error(
            "[PAY54] PAY54_FUNDING_SERVICE is already registered."
        );

    }

    /*
     * Deliberately standalone.
     *
     * PAY54_SERVICES may be frozen/non-extensible. Funding Service therefore
     * follows the proven Contacts Service integration pattern and does not
     * mutate the legacy services namespace.
     */

    GLOBAL.PAY54_FUNDING_SERVICE =
        API;

    initialize();

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
                "services.funding"
            );

        }

    } catch (error) {

        console.error(
            "[PAY54_FUNDING_SERVICE]",
            "Security bootstrap verification failed:",
            error
        );

        throw error;

    }

    /* ======================================================================
       STARTUP
    ====================================================================== */

    console.info(
        "✅ PAY54 Enterprise Funding Service",
        SERVICE_VERSION,
        "loaded."
    );

})();
