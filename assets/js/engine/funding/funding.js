"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE FUNDING ENGINE
   File: assets/js/engine/funding/funding.js
   Version: v1.0.0

   Work Package
   ------------
   WP-011B.6E.5D — Enterprise Funding Engine Foundation

   Purpose
   -------
   Canonical orchestration engine for PAY54 funding sources.

   Responsibilities
   ----------------
   • Register Funding adapters
   • Discover normalized funding sources
   • Resolve funding sources by namespaced identifier
   • Validate adapter contracts
   • Route quote requests
   • Route authorization requests
   • Route commit requests
   • Route reversal requests
   • Enforce capability boundaries
   • Enforce source-type boundaries
   • Enforce idempotency requirements
   • Enforce safe financial request structures
   • Provide runtime health diagnostics
   • Publish best-effort Funding events

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
   Payment Modules

   Financial Boundary
   ------------------
   This engine DOES NOT:
   • mutate wallet balances
   • mutate card balances
   • write Ledger entries directly
   • read/write localStorage
   • perform FX calculations
   • authorize external cards itself
   • store PAN/CVV/PIN/OTP/provider secrets

   Source-specific financial execution belongs exclusively to registered
   Funding adapters.

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL / DEPENDENCIES
    ====================================================================== */

    const GLOBAL =
        window;

    const ENGINE_VERSION =
        "1.0.0";

    const ENGINE_NAME =
        "PAY54 Enterprise Funding Engine";

    const constants =
        GLOBAL.PAY54_CONSTANTS;

    if (
        !constants ||
        typeof constants.get !== "function"
    ) {

        throw new Error(
            "[PAY54] Constants Registry must load before Funding Engine."
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
            "[PAY54] Funding Engine dependencies are unavailable."
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

    if (
        VERSIONS.COMPONENTS
            ?.FUNDING
            ?.ENGINE !==
        ENGINE_VERSION
    ) {

        throw new Error(
            "[PAY54] Funding Engine version contract mismatch."
        );

    }

    /* ======================================================================
       CANONICAL CONTRACTS
    ====================================================================== */

    const SOURCE_TYPES =
        FUNDING.SOURCE_TYPES;

    const SOURCE_NAMESPACES =
        FUNDING.SOURCE_NAMESPACES;

    const CAPABILITIES =
        FUNDING.CAPABILITIES;

    const FAILURE_CODES =
        FUNDING.FAILURE_CODES;

    const EVENTS =
        FUNDING.EVENTS;

    const SECURITY =
        FUNDING.SECURITY;

    const IDEMPOTENCY =
        FUNDING.IDEMPOTENCY;

    const ADAPTER_CONTRACT =
        FUNDING.ADAPTER_CONTRACT;

    /* ======================================================================
       PRIVATE STATE
    ====================================================================== */

    const adapters =
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

    function clone(value) {

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

                // Continue to safe JSON clone.

            }

        }

        return JSON.parse(
            JSON.stringify(value)
        );

    }

    function isPlainObject(value) {

        if (
            value === null ||
            typeof value !== "object" ||
            Array.isArray(value)
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

    function createFailure(
        code,
        message,
        details = {}
    ) {

        return Object.freeze({

            ok:
                false,

            code:
                code ||
                FAILURE_CODES.INTERNAL_ERROR,

            message:
                normalizeString(message) ||
                "Funding operation failed.",

            details:
                clone(
                    isPlainObject(details)
                        ? details
                        : {}
                ),

            timestamp:
                now()

        });

    }

    function createSuccess(
        data = {}
    ) {

        return Object.freeze({

            ok:
                true,

            data:
                clone(data),

            timestamp:
                now()

        });

    }

    /* ======================================================================
       EVENT BRIDGE
    ====================================================================== */

    function publish(
        eventName,
        payload = {}
    ) {

        try {

            const eventBus =
                GLOBAL.PAY54_EVENTS;

            if (
                eventBus &&
                typeof eventBus.publish ===
                "function"
            ) {

                eventBus.publish(
                    eventName,
                    clone(payload),
                    {
                        source:
                            "funding.engine"
                    }
                );

            }

        } catch (error) {

            console.error(
                "[PAY54_FUNDING]",
                "Event publication failed:",
                error
            );

        }

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
            typeof value !== "object"
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

    function validateSafePayload(
        payload
    ) {

        if (
            !isPlainObject(payload)
        ) {

            return createFailure(
                FAILURE_CODES.INVALID_REQUEST,
                "Funding request must be an object."
            );

        }

        if (
            containsForbiddenField(
                payload
            )
        ) {

            return createFailure(
                FAILURE_CODES.SECURITY_REJECTED,
                "Funding request contains prohibited sensitive fields."
            );

        }

        return createSuccess();

    }

    /* ======================================================================
       SOURCE IDENTIFIER CONTRACT
    ====================================================================== */

    function getNamespaceForType(
        type
    ) {

        const normalizedType =
            normalizeString(type);

        for (
            const [key, value]
            of Object.entries(
                SOURCE_TYPES
            )
        ) {

            if (
                value ===
                normalizedType
            ) {

                return (
                    SOURCE_NAMESPACES[key] ||
                    null
                );

            }

        }

        return null;

    }

    function getSourceTypeFromId(
        sourceId
    ) {

        const normalized =
            normalizeString(sourceId);

        if (!normalized) {

            return null;

        }

        for (
            const [key, namespace]
            of Object.entries(
                SOURCE_NAMESPACES
            )
        ) {

            if (
                normalized.startsWith(
                    namespace
                )
            ) {

                return (
                    SOURCE_TYPES[key] ||
                    null
                );

            }

        }

        return null;

    }

    function validateSourceId(
        sourceId,
        expectedType = null
    ) {

        const normalized =
            normalizeString(sourceId);

        if (
            !normalized ||
            normalized.length >
                Number(
                    FUNDING.SOURCE_ID
                        ?.MAX_LENGTH ||
                    160
                )
        ) {

            return createFailure(
                FAILURE_CODES.INVALID_SOURCE_ID,
                "Invalid Funding source identifier."
            );

        }

        const sourceType =
            getSourceTypeFromId(
                normalized
            );

        if (!sourceType) {

            return createFailure(
                FAILURE_CODES.INVALID_SOURCE_ID,
                "Funding source identifier does not use a registered namespace."
            );

        }

        const namespace =
            getNamespaceForType(
                sourceType
            );

        if (
            !namespace ||
            normalized.length <=
                namespace.length
        ) {

            return createFailure(
                FAILURE_CODES.INVALID_SOURCE_ID,
                "Funding source identifier is incomplete."
            );

        }

        if (
            expectedType &&
            sourceType !==
                expectedType
        ) {

            return createFailure(
                FAILURE_CODES.INVALID_SOURCE_ID,
                "Funding source identifier does not match the expected source type."
            );

        }

        return createSuccess({

            sourceId:
                normalized,

            sourceType

        });

    }

    /* ======================================================================
       IDEMPOTENCY CONTRACT
    ====================================================================== */

    function validateIdempotencyKey(
        value
    ) {

        const key =
            normalizeString(value);

        const minimum =
            Number(
                IDEMPOTENCY.MIN_KEY_LENGTH ||
                1
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

            return createFailure(
                FAILURE_CODES.IDEMPOTENCY_KEY_REQUIRED,
                "A valid Funding idempotency key is required."
            );

        }

        return createSuccess({
            idempotencyKey:
                key
        });

    }

    /* ======================================================================
       ADAPTER CONTRACT VALIDATION
    ====================================================================== */

    function validateAdapter(
        adapter
    ) {

        if (
            !adapter ||
            typeof adapter !==
                "object"
        ) {

            return createFailure(
                FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                "Funding adapter must be an object."
            );

        }

        const requiredProperties =
            ADAPTER_CONTRACT
                ?.REQUIRED_PROPERTIES ||
            [];

        for (
            const property
            of requiredProperties
        ) {

            if (
                adapter[property] ===
                undefined ||
            adapter[property] ===
                null
            ) {

                return createFailure(
                    FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                    `Funding adapter property "${property}" is required.`
                );

            }

        }

        const id =
            normalizeString(
                adapter.id
            );

        const type =
            normalizeString(
                adapter.type
            );

        const version =
            normalizeString(
                adapter.version
            );

        if (
            !id ||
            !type ||
            !version
        ) {

            return createFailure(
                FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                "Funding adapter identity is invalid."
            );

        }

        if (
            !Object.values(
                SOURCE_TYPES
            ).includes(type)
        ) {

            return createFailure(
                FAILURE_CODES.SOURCE_NOT_SUPPORTED,
                `Unsupported Funding source type "${type}".`
            );

        }

        if (
            !Array.isArray(
                adapter.capabilities
            )
        ) {

            return createFailure(
                FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                "Funding adapter capabilities must be an array."
            );

        }

        const knownCapabilities =
            new Set(
                Object.values(
                    CAPABILITIES
                )
            );

        const seenCapabilities =
            new Set();

        for (
            const capability
            of adapter.capabilities
        ) {

            if (
                typeof capability !==
                    "string" ||
                !knownCapabilities.has(
                    capability
                ) ||
                seenCapabilities.has(
                    capability
                )
            ) {

                return createFailure(
                    FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                    "Funding adapter contains an invalid or duplicate capability."
                );

            }

            seenCapabilities.add(
                capability
            );

        }

        const requiredMethods =
            ADAPTER_CONTRACT
                ?.REQUIRED_METHODS ||
            [];

        for (
            const method
            of requiredMethods
        ) {

            if (
                typeof adapter[method] !==
                "function"
            ) {

                return createFailure(
                    FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                    `Funding adapter method "${method}" is required.`
                );

            }

        }

        const conditionalMethods =
            ADAPTER_CONTRACT
                ?.CONDITIONAL_METHODS ||
            {};

        const conditionalMap =
            Object.freeze({

                [CAPABILITIES.AUTHORIZE]:
                    conditionalMethods.AUTHORIZE,

                [CAPABILITIES.REVERSE]:
                    conditionalMethods.REVERSE,

                [CAPABILITIES.BALANCE]:
                    conditionalMethods.BALANCE

            });

        for (
            const [capability, method]
            of Object.entries(
                conditionalMap
            )
        ) {

            if (
                adapter.capabilities.includes(
                    capability
                ) &&
                (
                    !method ||
                    typeof adapter[method] !==
                        "function"
                )
            ) {

                return createFailure(
                    FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                    `Funding adapter capability "${capability}" requires method "${method || "unknown"}".`
                );

            }

        }

        return createSuccess({

            id,
            type,
            version

        });

    }

    /* ======================================================================
       ADAPTER REGISTRY
    ====================================================================== */

    function registerAdapter(
        adapter
    ) {

        const validation =
            validateAdapter(
                adapter
            );

        if (!validation.ok) {

            return validation;

        }

        const {
            id,
            type
        } = validation.data;

        if (
            adapters.has(type)
        ) {

            return createFailure(
                FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                `Funding adapter for "${type}" is already registered.`
            );

        }

        const descriptor =
            Object.freeze({

                id,

                type,

                version:
                    normalizeString(
                        adapter.version
                    ),

                capabilities:
                    Object.freeze([
                        ...adapter.capabilities
                    ]),

                adapter

            });

        adapters.set(
            type,
            descriptor
        );

        publish(
            EVENTS.SOURCE_REGISTERED,
            {
                adapterId:
                    id,

                sourceType:
                    type,

                registeredAt:
                    now()
            }
        );

        return createSuccess({

            id:
                descriptor.id,

            type:
                descriptor.type,

            version:
                descriptor.version,

            capabilities:
                descriptor.capabilities

        });

    }

    function unregisterAdapter(
        type
    ) {

        const normalized =
            normalizeString(type);

        const descriptor =
            adapters.get(
                normalized
            );

        if (!descriptor) {

            return createFailure(
                FAILURE_CODES.ADAPTER_UNAVAILABLE,
                "Funding adapter is not registered."
            );

        }

        adapters.delete(
            normalized
        );

        publish(
            EVENTS.SOURCE_UNREGISTERED,
            {
                adapterId:
                    descriptor.id,

                sourceType:
                    descriptor.type,

                unregisteredAt:
                    now()
            }
        );

        return createSuccess({

            id:
                descriptor.id,

            type:
                descriptor.type

        });

    }

    function getAdapterDescriptor(
        type
    ) {

        const normalized =
            normalizeString(type);

        const descriptor =
            adapters.get(
                normalized
            );

        if (!descriptor) {

            return null;

        }

        return {

            id:
                descriptor.id,

            type:
                descriptor.type,

            version:
                descriptor.version,

            capabilities: [
                ...descriptor.capabilities
            ]

        };

    }

    function listAdapters() {

        return Array.from(
            adapters.values()
        ).map(
            descriptor => ({

                id:
                    descriptor.id,

                type:
                    descriptor.type,

                version:
                    descriptor.version,

                capabilities: [
                    ...descriptor.capabilities
                ]

            })
        );

    }

function resolveAdapter(
    sourceId
) {

    const sourceValidation =
        validateSourceId(
            sourceId
        );

    if (!sourceValidation.ok) {

        return sourceValidation;

    }

    const sourceType =
        sourceValidation
            .data
            .sourceType;

    const descriptor =
        adapters.get(
            sourceType
        );

    if (!descriptor) {

        return createFailure(
            FAILURE_CODES.ADAPTER_UNAVAILABLE,
            `No Funding adapter is registered for "${sourceType}".`
        );

    }

    /*
     * INTERNAL RUNTIME RESOLUTION
     * ---------------------------
     * Do not pass the live adapter descriptor through createSuccess().
     *
     * createSuccess() intentionally clones outward-facing data.
     * Adapter descriptors contain executable methods and therefore
     * must retain their live object identity inside the orchestration
     * boundary.
     *
     * The descriptor itself is already immutable because it is frozen
     * when registered.
     */

    return Object.freeze({

        ok:
            true,

        data:
            Object.freeze({

                sourceId:
                    sourceValidation
                        .data
                        .sourceId,

                sourceType,

                descriptor

            }),

        timestamp:
            now()

    });

}

    /* ======================================================================
       CAPABILITY
    ====================================================================== */

    function requireCapability(
        descriptor,
        capability
    ) {

        if (
            !descriptor ||
            !descriptor.capabilities.includes(
                capability
            )
        ) {

            return createFailure(
                FAILURE_CODES.CAPABILITY_NOT_SUPPORTED,
                `Funding capability "${capability}" is unavailable for this source.`
            );

        }

        return createSuccess();

    }

    /* ======================================================================
       SOURCE DISCOVERY
    ====================================================================== */

    async function listSources(
        options = {}
    ) {

        const safe =
            validateSafePayload(
                isPlainObject(options)
                    ? options
                    : {}
            );

        if (!safe.ok) {

            return safe;

        }

        const requestedType =
            normalizeString(
                options.type
            );

        const descriptors =
            requestedType
                ? [
                    adapters.get(
                        requestedType
                    )
                ].filter(Boolean)
                : Array.from(
                    adapters.values()
                );

        const sources =
            [];

        for (
            const descriptor
            of descriptors
        ) {

            try {

                const result =
                    await descriptor
                        .adapter
                        .listSources(
                            clone(options)
                        );

                if (
                    Array.isArray(result)
                ) {

                    for (
                        const source
                        of result
                    ) {

                        if (
                            !source ||
                            typeof source !==
                                "object"
                        ) {

                            continue;

                        }

                        const validation =
                            validateSourceId(
                                source.id,
                                descriptor.type
                            );

                        if (
                            !validation.ok
                        ) {

                            continue;

                        }

                        sources.push(
                            clone(source)
                        );

                    }

                }

            } catch (error) {

                console.error(
                    "[PAY54_FUNDING]",
                    "Source discovery failed:",
                    descriptor.type,
                    error
                );

            }

        }

        return createSuccess({
            sources
        });

    }

    async function getSource(
        sourceId
    ) {

        const resolution =
            resolveAdapter(
                sourceId
            );

        if (!resolution.ok) {

            return resolution;

        }

        const {
            descriptor
        } = resolution.data;

        try {

            const source =
                await descriptor
                    .adapter
                    .getSource(
                        resolution
                            .data
                            .sourceId
                    );

            if (!source) {

                return createFailure(
                    FAILURE_CODES.SOURCE_NOT_FOUND,
                    "Funding source was not found."
                );

            }

            const validation =
                validateSourceId(
                    source.id,
                    descriptor.type
                );

            if (!validation.ok) {

                return createFailure(
                    FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                    "Funding adapter returned an invalid source identifier."
                );

            }

            return createSuccess({
                source:
                    clone(source)
            });

        } catch (error) {

            return createFailure(
                FAILURE_CODES.ADAPTER_UNAVAILABLE,
                "Funding source lookup failed.",
                {
                    reason:
                        error?.message ||
                        "UNKNOWN"
                }
            );

        }

    }

    /* ======================================================================
       QUOTE
    ====================================================================== */

    async function quote(
        request
    ) {

        const safe =
            validateSafePayload(
                request
            );

        if (!safe.ok) {

            return safe;

        }

        const sourceValidation =
            validateSourceId(
                request.sourceId
            );

        if (!sourceValidation.ok) {

            return sourceValidation;

        }

        const paymentAmount =
            Number(
                request.paymentAmount
            );

        const paymentCurrency =
            normalizeString(
                request.paymentCurrency
            ).toUpperCase();

        if (
            !Number.isFinite(
                paymentAmount
            ) ||
            paymentAmount <= 0
        ) {

            return createFailure(
                FAILURE_CODES.INVALID_AMOUNT,
                "Funding payment amount must be greater than zero."
            );

        }

        if (
            !/^[A-Z]{3}$/.test(
                paymentCurrency
            )
        ) {

            return createFailure(
                FAILURE_CODES.INVALID_CURRENCY,
                "Funding payment currency is invalid."
            );

        }

        const resolution =
            resolveAdapter(
                sourceValidation
                    .data
                    .sourceId
            );

        if (!resolution.ok) {

            return resolution;

        }

        const capability =
            requireCapability(
                resolution
                    .data
                    .descriptor,
                CAPABILITIES.QUOTE
            );

        if (!capability.ok) {

            return capability;

        }

        try {

            const result =
                await resolution
                    .data
                    .descriptor
                    .adapter
                    .quote({
                        ...clone(request),
                        sourceId:
                            sourceValidation
                                .data
                                .sourceId,
                        paymentAmount,
                        paymentCurrency
                    });

            if (
                !result ||
                typeof result !==
                    "object"
            ) {

                return createFailure(
                    FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                    "Funding adapter returned an invalid quote."
                );

            }

            publish(
                EVENTS.QUOTE_CREATED,
                {
                    sourceId:
                        sourceValidation
                            .data
                            .sourceId,

                    quoteId:
                        result.quoteId ||
                        null,

                    createdAt:
                        now()
                }
            );

            return createSuccess({
                quote:
                    clone(result)
            });

        } catch (error) {

            return createFailure(
                FAILURE_CODES.FX_QUOTE_UNAVAILABLE,
                "Funding quote could not be created.",
                {
                    reason:
                        error?.message ||
                        "UNKNOWN"
                }
            );

        }

    }

    /* ======================================================================
       AUTHORIZE
    ====================================================================== */

    async function authorize(
        request
    ) {

        const safe =
            validateSafePayload(
                request
            );

        if (!safe.ok) {

            return safe;

        }

        const resolution =
            resolveAdapter(
                request.sourceId
            );

        if (!resolution.ok) {

            return resolution;

        }

        const capability =
            requireCapability(
                resolution
                    .data
                    .descriptor,
                CAPABILITIES.AUTHORIZE
            );

        if (!capability.ok) {

            return capability;

        }

        const method =
            ADAPTER_CONTRACT
                ?.CONDITIONAL_METHODS
                ?.AUTHORIZE;

        if (
            !method ||
            typeof resolution
                .data
                .descriptor
                .adapter[method] !==
                "function"
        ) {

            return createFailure(
                FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                "Funding authorization method is unavailable."
            );

        }

        try {

            const result =
                await resolution
                    .data
                    .descriptor
                    .adapter[method](
                        clone(request)
                    );

            if (
                !result ||
                typeof result !==
                    "object"
            ) {

                return createFailure(
                    FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                    "Funding adapter returned an invalid authorization result."
                );

            }

            if (
                result.status ===
                FUNDING.AUTHORIZATION_STATUS
                    ?.AUTHORIZED
            ) {

                publish(
                    EVENTS.AUTHORIZED,
                    {
                        sourceId:
                            request.sourceId,

                        authorizationId:
                            result.authorizationId ||
                            null,

                        authorizedAt:
                            now()
                    }
                );

            } else if (
                result.status ===
                FUNDING.AUTHORIZATION_STATUS
                    ?.DECLINED
            ) {

                publish(
                    EVENTS.AUTHORIZATION_DECLINED,
                    {
                        sourceId:
                            request.sourceId,

                        authorizationId:
                            result.authorizationId ||
                            null,

                        declinedAt:
                            now()
                    }
                );

            }

            return createSuccess({
                authorization:
                    clone(result)
            });

        } catch (error) {

            return createFailure(
                FAILURE_CODES.AUTHORIZATION_FAILED,
                "Funding authorization failed.",
                {
                    reason:
                        error?.message ||
                        "UNKNOWN"
                }
            );

        }

    }

    /* ======================================================================
       COMMIT
    ====================================================================== */

    async function commit(
        request
    ) {

        const safe =
            validateSafePayload(
                request
            );

        if (!safe.ok) {

            return safe;

        }

        const idempotency =
            validateIdempotencyKey(
                request.idempotencyKey
            );

        if (!idempotency.ok) {

            return idempotency;

        }

        const resolution =
            resolveAdapter(
                request.sourceId
            );

        if (!resolution.ok) {

            return resolution;

        }

        const capability =
            requireCapability(
                resolution
                    .data
                    .descriptor,
                CAPABILITIES.COMMIT
            );

        if (!capability.ok) {

            return capability;

        }

        try {

            publish(
                EVENTS.COMMIT_STARTED,
                {
                    sourceId:
                        request.sourceId,

                    operationId:
                        request.operationId ||
                        null,

                    startedAt:
                        now()
                }
            );

            const result =
                await resolution
                    .data
                    .descriptor
                    .adapter
                    .commit({
                        ...clone(request),
                        idempotencyKey:
                            idempotency
                                .data
                                .idempotencyKey
                    });

            if (
                !result ||
                typeof result !==
                    "object"
            ) {

                return createFailure(
                    FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                    "Funding adapter returned an invalid commit result."
                );

            }

            if (
                result.status ===
                FUNDING.COMMIT_STATUS
                    ?.COMMITTED
            ) {

                publish(
                    EVENTS.COMMITTED,
                    {
                        sourceId:
                            request.sourceId,

                        commitId:
                            result.commitId ||
                            null,

                        operationId:
                            request.operationId ||
                            null,

                        committedAt:
                            now()
                    }
                );

            } else {

                publish(
                    EVENTS.COMMIT_FAILED,
                    {
                        sourceId:
                            request.sourceId,

                        commitId:
                            result.commitId ||
                            null,

                        operationId:
                            request.operationId ||
                            null,

                        status:
                            result.status ||
                            null,

                        failedAt:
                            now()
                    }
                );

            }

            return createSuccess({
                commit:
                    clone(result)
            });

        } catch (error) {

            publish(
                EVENTS.COMMIT_FAILED,
                {
                    sourceId:
                        request.sourceId ||
                        null,

                    operationId:
                        request.operationId ||
                        null,

                    failedAt:
                        now()
                }
            );

            return createFailure(
                FAILURE_CODES.COMMIT_FAILED,
                "Funding commitment failed.",
                {
                    reason:
                        error?.message ||
                        "UNKNOWN"
                }
            );

        }

    }

    /* ======================================================================
       REVERSAL
    ====================================================================== */

    async function reverse(
        request
    ) {

        const safe =
            validateSafePayload(
                request
            );

        if (!safe.ok) {

            return safe;

        }

        const idempotency =
            validateIdempotencyKey(
                request.idempotencyKey
            );

        if (!idempotency.ok) {

            return idempotency;

        }

        const resolution =
            resolveAdapter(
                request.sourceId
            );

        if (!resolution.ok) {

            return resolution;

        }

        const capability =
            requireCapability(
                resolution
                    .data
                    .descriptor,
                CAPABILITIES.REVERSE
            );

        if (!capability.ok) {

            return capability;

        }

        const method =
            ADAPTER_CONTRACT
                ?.CONDITIONAL_METHODS
                ?.REVERSE;

        if (
            !method ||
            typeof resolution
                .data
                .descriptor
                .adapter[method] !==
                "function"
        ) {

            return createFailure(
                FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                "Funding reversal method is unavailable."
            );

        }

        try {

            publish(
                EVENTS.REVERSAL_STARTED,
                {
                    sourceId:
                        request.sourceId,

                    commitId:
                        request.commitId ||
                        null,

                    startedAt:
                        now()
                }
            );

            const result =
                await resolution
                    .data
                    .descriptor
                    .adapter[method]({
                        ...clone(request),
                        idempotencyKey:
                            idempotency
                                .data
                                .idempotencyKey
                    });

            if (
                !result ||
                typeof result !==
                    "object"
            ) {

                return createFailure(
                    FAILURE_CODES.ADAPTER_CONTRACT_VIOLATION,
                    "Funding adapter returned an invalid reversal result."
                );

            }

            if (
                result.status ===
                FUNDING.REVERSAL_STATUS
                    ?.REVERSED
            ) {

                publish(
                    EVENTS.REVERSED,
                    {
                        sourceId:
                            request.sourceId,

                        commitId:
                            request.commitId ||
                            null,

                        reversalId:
                            result.reversalId ||
                            null,

                        reversedAt:
                            now()
                    }
                );

            } else {

                publish(
                    EVENTS.REVERSAL_FAILED,
                    {
                        sourceId:
                            request.sourceId,

                        commitId:
                            request.commitId ||
                            null,

                        reversalId:
                            result.reversalId ||
                            null,

                        status:
                            result.status ||
                            null,

                        failedAt:
                            now()
                    }
                );

            }

            return createSuccess({
                reversal:
                    clone(result)
            });

        } catch (error) {

            publish(
                EVENTS.REVERSAL_FAILED,
                {
                    sourceId:
                        request.sourceId ||
                        null,

                    commitId:
                        request.commitId ||
                        null,

                    failedAt:
                        now()
                }
            );

            return createFailure(
                FAILURE_CODES.REVERSAL_FAILED,
                "Funding reversal failed.",
                {
                    reason:
                        error?.message ||
                        "UNKNOWN"
                }
            );

        }

    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    async function getHealth() {

        const adapterHealth =
            [];

        for (
            const descriptor
            of adapters.values()
        ) {

            try {

                const health =
                    await descriptor
                        .adapter
                        .getHealth();

                adapterHealth.push({

                    id:
                        descriptor.id,

                    type:
                        descriptor.type,

                    healthy:
                        health?.healthy ===
                        true,

                    status:
                        health?.status ||
                        "unknown"

                });

            } catch {

                adapterHealth.push({

                    id:
                        descriptor.id,

                    type:
                        descriptor.type,

                    healthy:
                        false,

                    status:
                        "unavailable"

                });

            }

        }

        const unhealthy =
            adapterHealth.filter(
                adapter =>
                    !adapter.healthy
            );

        return {

            healthy:
                ready &&
                unhealthy.length === 0,

            status:
                !ready
                    ? "unavailable"
                    : unhealthy.length
                        ? "degraded"
                        : "healthy",

            module:
                MODULES.DOMAIN
                    ?.FUNDING
                    ?.ENGINE ||
                "funding.engine",

            version:
                ENGINE_VERSION,

            adapters:
                clone(
                    adapterHealth
                ),

            adapterCount:
                adapters.size

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
            SECURITY.FAIL_CLOSED !==
            true
        ) {

            throw new Error(
                "[PAY54] Funding Engine requires fail-closed security."
            );

        }

        ready =
            true;

        return true;

    }

    /* ======================================================================
       PUBLIC API
    ====================================================================== */

    const API = Object.freeze({

        registerAdapter,

        unregisterAdapter,

        getAdapter:
            getAdapterDescriptor,

        listAdapters,

        listSources,

        getSource,

        quote,

        authorize,

        commit,

        reverse,

        getHealth,

        health:
            getHealth,

        initialize,

        initialise:
            initialize,

        module:
            MODULES.DOMAIN
                ?.FUNDING
                ?.ENGINE ||
            "funding.engine",

        moduleId:
            MODULES.DOMAIN
                ?.FUNDING
                ?.ENGINE ||
            "funding.engine",

        version:
            ENGINE_VERSION,

        engine:
            ENGINE_NAME

    });

    /* ======================================================================
       EXPORT
    ====================================================================== */

    if (
        GLOBAL.PAY54_FUNDING_ENGINE
    ) {

        throw new Error(
            "[PAY54] PAY54_FUNDING_ENGINE is already registered."
        );

    }

    GLOBAL.PAY54_FUNDING_ENGINE =
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
                "funding.engine"
            );

        }

    } catch (error) {

        console.error(
            "[PAY54_FUNDING]",
            "Security bootstrap verification failed:",
            error
        );

        throw error;

    }

    /* ======================================================================
       STARTUP
    ====================================================================== */

    console.info(
        "✅ PAY54 Enterprise Funding Engine",
        ENGINE_VERSION,
        "loaded."
    );

})();
