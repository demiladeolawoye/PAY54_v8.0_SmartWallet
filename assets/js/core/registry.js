"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE PLATFORM REGISTRY
   File: assets/js/core/registry.js
   Version: v12.0.0

   Purpose
   -------
   Canonical in-memory runtime registry for PAY54 platform modules.

   Responsibilities
   ----------------
   • Provide one authoritative runtime module catalogue
   • Support existing Project Titan registration contracts
   • Prevent silent module replacement and duplicate collisions
   • Allow zero-dependency early boot
   • Expose immutable diagnostics and integrity checks
   • Integrate with PAY54 Event Bus when it becomes available
   • Support production registry locking after bootstrap

   Architecture
   ------------
   Core
      ↓
   Platform Registry
      ↓
   Events / Security / Infrastructure / Services / Engines / Modules / UI

   Financial safety
   ----------------
   This registry stores runtime module references only.
   It does not persist financial state, mutate balances, call providers,
   authorize payments, commit payments or record transactions.
========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL / MODULE IDENTITY
    ====================================================================== */

    const GLOBAL =
        window;

    const MODULE_ID =
        "REGISTRY";

    const MODULE_NAME =
        "PAY54 Enterprise Platform Registry";

    const FILE_PATH =
        "assets/js/core/registry.js";

    const VERSION =
        "12.0.0";

    const STARTED_AT =
        new Date().toISOString();

    /* ======================================================================
       SAFE RELOAD GUARD

       Do not silently replace an already-running registry. A second script
       evaluation is treated as idempotent only when the existing object is
       recognisably the PAY54 registry contract.
    ====================================================================== */

    const existingRegistry =
        GLOBAL.PAY54_REGISTRY;

    if (existingRegistry) {

        if (
            existingRegistry.id ===
                MODULE_ID &&
            typeof existingRegistry.register ===
                "function" &&
            typeof existingRegistry.get ===
                "function" &&
            typeof existingRegistry.has ===
                "function"
        ) {

            if (
                !GLOBAL.PAY54_MODULE_REGISTRY
            ) {

                GLOBAL.PAY54_MODULE_REGISTRY =
                    existingRegistry;
            }

            console.info(
                "[PAY54_REGISTRY] Existing platform registry preserved."
            );

            return;
        }

        throw new Error(
            "[PAY54_REGISTRY] PAY54_REGISTRY already exists with an incompatible contract."
        );
    }

    /* ======================================================================
       PRIVATE STATE
    ====================================================================== */

    const records =
        new Map();

    const state = {

        locked:
            false,

        mutationCount:
            0,

        registrationCount:
            0,

        unregistrationCount:
            0,

        duplicateNoOpCount:
            0,

        conflictCount:
            0,

        lastMutationAt:
            null,

        lastIntegrityCheckAt:
            null,

        lastIntegrityResult:
            null
    };

    /* ======================================================================
       HELPERS
    ====================================================================== */

    function cleanString(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";
        }

        return String(
            value
        ).trim();
    }


    function normaliseId(
        value
    ) {

        const id =
            cleanString(
                value
            );

        if (!id) {

            throw new TypeError(
                "[PAY54_REGISTRY] Module identifier is required."
            );
        }

        if (
            id.length > 160 ||
            !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(
                id
            )
        ) {

            throw new TypeError(
                `[PAY54_REGISTRY] Invalid module identifier: ${id}`
            );
        }

        return id;
    }


    function assertMutable(
        operation
    ) {

        if (
            !state.locked
        ) {

            return;
        }

        throw new Error(
            `[PAY54_REGISTRY] Registry is locked; ${operation} is not permitted.`
        );
    }


    function isDescriptor(
        value
    ) {

        if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(
                value
            )
        ) {

            return false;
        }

        return Boolean(

            Object.prototype
                .hasOwnProperty.call(
                    value,
                    "api"
                )

            ||

            Object.prototype
                .hasOwnProperty.call(
                    value,
                    "type"
                )

            ||

            Object.prototype
                .hasOwnProperty.call(
                    value,
                    "layer"
                )

            ||

            Object.prototype
                .hasOwnProperty.call(
                    value,
                    "domain"
                )

            ||

            Object.prototype
                .hasOwnProperty.call(
                    value,
                    "path"
                )

            ||

            Object.prototype
                .hasOwnProperty.call(
                    value,
                    "schemaVersion"
                )

            ||

            Object.prototype
                .hasOwnProperty.call(
                    value,
                    "health"
                )
        );
    }


    function createDescriptor(
        id,
        descriptor
    ) {

        if (
            !descriptor ||
            typeof descriptor !==
                "object" ||
            Array.isArray(
                descriptor
            )
        ) {

            throw new TypeError(
                `[PAY54_REGISTRY] Module descriptor for ${id} must be an object.`
            );
        }

        const descriptorId =

            descriptor.id ===
                undefined

            ||

            descriptor.id ===
                null

            ||

            cleanString(
                descriptor.id
            ) === ""

                ? id

                : normaliseId(
                    descriptor.id
                );

        if (
            descriptorId !==
                id
        ) {

            throw new Error(
                `[PAY54_REGISTRY] Descriptor id mismatch: expected ${id}, received ${descriptorId}.`
            );
        }

        return Object.freeze({

            ...descriptor,

            id
        });
    }


    function createCandidate(
        requestedId,
        suppliedValue,
        forceDescriptor = false
    ) {

        const id =
            normaliseId(
                requestedId
            );

        if (
            suppliedValue ===
                null

            ||

            suppliedValue ===
                undefined
        ) {

            throw new TypeError(
                `[PAY54_REGISTRY] Module value is required for ${id}.`
            );
        }

        const descriptorMode =

            forceDescriptor

            ||

            isDescriptor(
                suppliedValue
            );

        if (
            descriptorMode
        ) {

            const descriptor =
                createDescriptor(
                    id,
                    suppliedValue
                );

            return Object.freeze({

                id,

                kind:
                    "descriptor",

                value:
                    descriptor,

                api:
                    descriptor.api ??
                    null,

                sourceReference:
                    suppliedValue
            });
        }

        return Object.freeze({

            id,

            kind:
                "api",

            value:
                suppliedValue,

            api:
                suppliedValue,

            sourceReference:
                suppliedValue
        });
    }


    function descriptorEquivalent(
        current,
        incoming
    ) {

        if (
            current.kind !==
                "descriptor"

            ||

            incoming.kind !==
                "descriptor"
        ) {

            return false;
        }

        const a =
            current.value;

        const b =
            incoming.value;

        return Boolean(

            a.id ===
                b.id

            &&

            (
                a.api ??
                null
            ) ===
            (
                b.api ??
                null
            )

            &&

            cleanString(
                a.version
            ) ===
            cleanString(
                b.version
            )

            &&

            cleanString(
                a.type
            ) ===
            cleanString(
                b.type
            )

            &&

            cleanString(
                a.layer
            ) ===
            cleanString(
                b.layer
            )

            &&

            cleanString(
                a.domain
            ) ===
            cleanString(
                b.domain
            )

            &&

            cleanString(
                a.path
            ) ===
            cleanString(
                b.path
            )

            &&

            cleanString(
                a.schemaVersion
            ) ===
            cleanString(
                b.schemaVersion
            )
        );
    }


    function candidatesEquivalent(
        current,
        incoming
    ) {

        if (
            current.sourceReference ===
                incoming.sourceReference
        ) {

            return true;
        }

        if (
            current.kind ===
                "api"

            &&

            incoming.kind ===
                "api"
        ) {

            return (
                current.value ===
                incoming.value
            );
        }

        return descriptorEquivalent(
            current,
            incoming
        );
    }


    function publish(
        eventName,
        payload = {}
    ) {

        try {

            const events =
                GLOBAL.PAY54_EVENTS;

            if (
                !events ||
                typeof events.publish !==
                    "function"
            ) {

                return false;
            }

            events.publish(

                eventName,

                Object.freeze({

                    registryId:
                        MODULE_ID,

                    occurredAt:
                        new Date()
                            .toISOString(),

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

            console.warn(
                "[PAY54_REGISTRY] Event publication failed.",
                error
            );

            return false;
        }
    }


    function markMutation() {

        state.mutationCount +=
            1;

        state.lastMutationAt =
            new Date()
                .toISOString();
    }


    function createRecord(
        candidate
    ) {

        return Object.freeze({

            id:
                candidate.id,

            kind:
                candidate.kind,

            value:
                candidate.value,

            api:
                candidate.api,

            sourceReference:
                candidate.sourceReference,

            registeredAt:
                new Date()
                    .toISOString()
        });
    }


    function registerCandidate(
        candidate
    ) {

        assertMutable(
            "registration"
        );

        const current =
            records.get(
                candidate.id
            ) ||
            null;

        if (
            current
        ) {

            if (
                candidatesEquivalent(
                    current,
                    candidate
                )
            ) {

                state
                    .duplicateNoOpCount +=
                    1;

                return current.value;
            }

            state.conflictCount +=
                1;

            publish(
                "registry.module.conflict",
                {

                    moduleId:
                        candidate.id,

                    currentKind:
                        current.kind,

                    incomingKind:
                        candidate.kind
                }
            );

            throw new Error(
                `[PAY54_REGISTRY] Module ${candidate.id} is already registered with a different contract.`
            );
        }

        const record =
            createRecord(
                candidate
            );

        records.set(
            candidate.id,
            record
        );

        state.registrationCount +=
            1;

        markMutation();

        publish(
            "registry.module.registered",
            {

                moduleId:
                    record.id,

                kind:
                    record.kind
            }
        );

        return record.value;
    }

    /* ======================================================================
       REGISTRATION API
    ====================================================================== */

    function register(
        idOrDescriptor,
        value
    ) {

        if (
            arguments.length === 1

            &&

            idOrDescriptor

            &&

            typeof idOrDescriptor ===
                "object"

            &&

            !Array.isArray(
                idOrDescriptor
            )
        ) {

            const id =
                normaliseId(
                    idOrDescriptor.id
                );

            return registerCandidate(

                createCandidate(
                    id,
                    idOrDescriptor,
                    true
                )
            );
        }

        return registerCandidate(

            createCandidate(
                idOrDescriptor,
                value,
                false
            )
        );
    }


    function registerModule(
        idOrDescriptor,
        descriptor
    ) {

        if (
            arguments.length === 1

            &&

            idOrDescriptor

            &&

            typeof idOrDescriptor ===
                "object"

            &&

            !Array.isArray(
                idOrDescriptor
            )
        ) {

            const id =
                normaliseId(
                    idOrDescriptor.id
                );

            return registerCandidate(

                createCandidate(
                    id,
                    idOrDescriptor,
                    true
                )
            );
        }

        return registerCandidate(

            createCandidate(
                idOrDescriptor,
                descriptor,
                true
            )
        );
    }


    function set(
        id,
        value
    ) {

        return register(
            id,
            value
        );
    }


    function unregister(
        id
    ) {

        assertMutable(
            "unregistration"
        );

        const moduleId =
            normaliseId(
                id
            );

        if (
            moduleId ===
                MODULE_ID
        ) {

            throw new Error(
                "[PAY54_REGISTRY] The platform registry cannot unregister itself."
            );
        }

        const current =
            records.get(
                moduleId
            ) ||
            null;

        if (
            !current
        ) {

            return false;
        }

        records.delete(
            moduleId
        );

        state.unregistrationCount +=
            1;

        markMutation();

        publish(
            "registry.module.unregistered",
            {

                moduleId,

                kind:
                    current.kind
            }
        );

        return true;
    }

    /* ======================================================================
       LOOKUP API
    ====================================================================== */

    function has(
        id
    ) {

        try {

            return records.has(
                normaliseId(
                    id
                )
            );

        } catch {

            return false;
        }
    }


    function get(
        id
    ) {

        const moduleId =
            normaliseId(
                id
            );

        return (
            records.get(
                moduleId
            )?.value ??
            null
        );
    }


    function requireModule(
        id
    ) {

        const moduleId =
            normaliseId(
                id
            );

        const record =
            records.get(
                moduleId
            ) ||
            null;

        if (
            !record
        ) {

            throw new Error(
                `[PAY54_REGISTRY] Required module ${moduleId} is not registered.`
            );
        }

        return record.value;
    }


    function getApi(
        id
    ) {

        const moduleId =
            normaliseId(
                id
            );

        return (
            records.get(
                moduleId
            )?.api ??
            null
        );
    }


    function getDescriptor(
        id
    ) {

        const moduleId =
            normaliseId(
                id
            );

        const record =
            records.get(
                moduleId
            ) ||
            null;

        if (
            !record ||
            record.kind !==
                "descriptor"
        ) {

            return null;
        }

        return record.value;
    }

    /* ======================================================================
       READ-ONLY DIAGNOSTICS
    ====================================================================== */

    function list() {

        return Object.freeze(

            Array.from(
                records.keys()
            )
            .sort()
        );
    }


    function entries() {

        return Object.freeze(

            Array.from(
                records.values()
            )
            .map(
                record =>

                    Object.freeze([
                        record.id,
                        record.value
                    ])
            )
        );
    }


    function snapshot() {

        const modules =

            Array.from(
                records.values()
            )

            .map(
                record => {

                    const descriptor =

                        record.kind ===
                            "descriptor"

                            ? record.value

                            : null;

                    return Object.freeze({

                        id:
                            record.id,

                        kind:
                            record.kind,

                        name:
                            cleanString(
                                descriptor?.name
                            ) ||
                            null,

                        version:
                            cleanString(
                                descriptor?.version
                            ) ||
                            null,

                        type:
                            cleanString(
                                descriptor?.type
                            ) ||
                            null,

                        layer:
                            cleanString(
                                descriptor?.layer
                            ) ||
                            null,

                        domain:
                            cleanString(
                                descriptor?.domain
                            ) ||
                            null,

                        path:
                            cleanString(
                                descriptor?.path
                            ) ||
                            null,

                        schemaVersion:
                            cleanString(
                                descriptor?.schemaVersion
                            ) ||
                            null,

                        apiAvailable:
                            Boolean(
                                record.api
                            ),

                        healthAvailable:

                            typeof descriptor?.health ===
                                "function",

                        registeredAt:
                            record.registeredAt
                    });
                }
            )

            .sort(
                (
                    a,
                    b
                ) =>

                    a.id.localeCompare(
                        b.id
                    )
            );

        return Object.freeze({

            id:
                MODULE_ID,

            version:
                VERSION,

            locked:
                state.locked,

            moduleCount:
                records.size,

            mutationCount:
                state.mutationCount,

            generatedAt:
                new Date()
                    .toISOString(),

            modules:
                Object.freeze(
                    modules
                )
        });
    }


    function count() {

        return records.size;
    }

    /* ======================================================================
       INTEGRITY
    ====================================================================== */

    function verifyIntegrity() {

        const errors = [];

        for (
            const [
                key,
                record
            ]
            of records.entries()
        ) {

            if (
                !record ||
                typeof record !==
                    "object"
            ) {

                errors.push(
                    `${key}: invalid internal record.`
                );

                continue;
            }

            if (
                record.id !==
                    key
            ) {

                errors.push(
                    `${key}: record id mismatch.`
                );
            }

            if (
                record.kind !==
                    "api"

                &&

                record.kind !==
                    "descriptor"
            ) {

                errors.push(
                    `${key}: unsupported registration kind.`
                );
            }

            if (
                !Object.isFrozen(
                    record
                )
            ) {

                errors.push(
                    `${key}: internal record is mutable.`
                );
            }

            if (
                record.kind ===
                    "descriptor"
            ) {

                if (
                    !record.value

                    ||

                    typeof record.value !==
                        "object"

                    ||

                    record.value.id !==
                        key
                ) {

                    errors.push(
                        `${key}: invalid descriptor contract.`
                    );
                }

                if (
                    record.value

                    &&

                    !Object.isFrozen(
                        record.value
                    )
                ) {

                    errors.push(
                        `${key}: descriptor is mutable.`
                    );
                }
            }
        }

        const result =
            Object.freeze({

                ok:
                    errors.length ===
                    0,

                status:

                    errors.length ===
                        0

                        ? "HEALTHY"

                        : "DEGRADED",

                moduleCount:
                    records.size,

                errors:
                    Object.freeze(
                        errors
                    ),

                checkedAt:
                    new Date()
                        .toISOString()
            });

        state.lastIntegrityCheckAt =
            result.checkedAt;

        state.lastIntegrityResult =
            result;

        return result;
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

            locked:
                state.locked,

            moduleCount:
                records.size,

            registrationCount:
                state.registrationCount,

            unregistrationCount:
                state.unregistrationCount,

            duplicateNoOpCount:
                state.duplicateNoOpCount,

            conflictCount:
                state.conflictCount,

            mutationCount:
                state.mutationCount,

            lastMutationAt:
                state.lastMutationAt,

            integrity
        });
    }

    /* ======================================================================
       PRODUCTION LOCK
    ====================================================================== */

    function lock() {

        if (
            state.locked
        ) {

            return false;
        }

        state.locked =
            true;

        publish(
            "registry.locked",
            {

                moduleCount:
                    records.size
            }
        );

        return true;
    }


    function isLocked() {

        return state.locked;
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

            register,

            registerModule,

            set,

            unregister,

            get,

            require:
                requireModule,

            has,

            getApi,

            getDescriptor,

            list,

            entries,

            snapshot,

            count,

            health,

            verifyIntegrity,

            lock,

            isLocked
        });

    /* ======================================================================
       SELF-REGISTRATION

       The registry must exist before any other platform registration can
       occur. Its own record is therefore installed internally rather than by
       recursively calling the public register() method.
    ====================================================================== */

    const selfDescriptor =
        Object.freeze({

            id:
                MODULE_ID,

            name:
                MODULE_NAME,

            version:
                VERSION,

            type:
                "core",

            layer:
                "layer.core",

            path:
                FILE_PATH,

            api:
                API,

            health
        });

    records.set(

        MODULE_ID,

        Object.freeze({

            id:
                MODULE_ID,

            kind:
                "descriptor",

            value:
                selfDescriptor,

            api:
                API,

            sourceReference:
                selfDescriptor,

            registeredAt:
                STARTED_AT
        })
    );

    state.registrationCount =
        1;

    state.mutationCount =
        1;

    state.lastMutationAt =
        STARTED_AT;

    /* ======================================================================
       GLOBAL EXPOSURE
    ====================================================================== */

    Object.defineProperty(

        GLOBAL,

        "PAY54_REGISTRY",

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

    /*
     * Compatibility alias used by newer domain storage modules during the
     * staged enterprise migration.
     */

    if (
        !GLOBAL.PAY54_MODULE_REGISTRY
    ) {

        Object.defineProperty(

            GLOBAL,

            "PAY54_MODULE_REGISTRY",

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
    }

    console.info(
        `[PAY54_REGISTRY] ${MODULE_NAME} v${VERSION} ready.`
    );

})();
