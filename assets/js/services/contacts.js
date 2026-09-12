"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE CONTACTS SERVICE
   File: assets/js/services/contacts.js
   Version: v1.0.0

   Purpose
   -------
   Canonical application service boundary for the PAY54 Contacts domain.

   Responsibilities
   ----------------
   • Provide a stable application-facing Contacts API
   • Orchestrate the Contacts Domain Engine
   • Prevent UI/modules from accessing Contacts Storage directly
   • Resolve contacts by PAY54 ID, phone, email or contact ID
   • Provide recipient-resolution services for payment flows
   • Provide read/search/favourite/group/tag/status operations
   • Preserve domain validation inside PAY54_CONTACTS
   • Provide diagnostics and health reporting
   • Integrate progressively with PAY54 service/platform registries
   • Preserve existing PAY54_SERVICES behaviour

   Architecture
   ------------
   Constants
      ↓
   Contacts Storage
      ↓
   Contacts Domain Engine
      ↓
   Contacts Service
      ↓
   Contacts UI / Picker
      ↓
   Recipient / Send / Request / Transfer Flows

   Important
   ---------
   This module NEVER accesses localStorage or another persistence mechanism.
   All Contacts persistence and domain rules remain delegated to
   window.PAY54_CONTACTS.

   Dependencies
   ------------
   assets/js/core/constants/index.js
   assets/js/core/constants/modules.js
   assets/js/core/constants/versions.js
   assets/js/core/constants/contacts.js
   assets/js/core/events.js
   assets/js/engine/contacts/core/storage.js
   assets/js/engine/contacts/contacts.js

   Public API
   ----------
   window.PAY54_CONTACTS_SERVICE

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL
    ====================================================================== */

    const GLOBAL =
        window;

    const ENGINE_NAME =
        "PAY54 Contacts Service";

    /* ======================================================================
       CONSTANTS REGISTRY
    ====================================================================== */

    const CONSTANTS =
        GLOBAL.PAY54_CONSTANTS;

    if (
        !CONSTANTS ||
        typeof CONSTANTS.get !== "function"
    ) {

        throw new Error(
            "[PAY54_CONTACTS_SERVICE] Constants Registry unavailable."
        );

    }

    const MODULES =
        CONSTANTS.get("MODULES");

    if (
        !MODULES ||
        typeof MODULES !== "object"
    ) {

        throw new Error(
            "[PAY54_CONTACTS_SERVICE] Module catalogue unavailable."
        );

    }

    const VERSIONS =
        CONSTANTS.get(
            MODULES.VERSIONS
        );

    if (
        !VERSIONS ||
        typeof VERSIONS !== "object"
    ) {

        throw new Error(
            "[PAY54_CONTACTS_SERVICE] Version catalogue unavailable."
        );

    }

    const CONTACT_CONSTANTS =
        CONSTANTS.get(
            MODULES.CONTACTS
        );

    if (
        !CONTACT_CONSTANTS ||
        typeof CONTACT_CONSTANTS !== "object"
    ) {

        throw new Error(
            "[PAY54_CONTACTS_SERVICE] Contact constants unavailable."
        );

    }

    /* ======================================================================
       CANONICAL MODULE METADATA
    ====================================================================== */

    const MODULE_ID =
        MODULES.DOMAIN
            ?.CONTACTS
            ?.SERVICE ||
        "contacts.service";

    const SERVICE_ID =
        MODULES.COMPONENTS
            ?.SERVICES
            ?.CONTACTS ||
        "services.contacts";

    const VERSION =
        VERSIONS.DOMAIN
            ?.CONTACTS
            ?.SERVICE ||
        "1.0.0";

    if (
        VERSION !== "1.0.0"
    ) {

        throw new Error(
            `[PAY54_CONTACTS_SERVICE] Unsupported service version: ${VERSION}.`
        );

    }

    /* ======================================================================
       CONTACTS DOMAIN ENGINE
    ====================================================================== */

    const CONTACTS =
        GLOBAL.PAY54_CONTACTS;

    if (
        !CONTACTS ||
        typeof CONTACTS !== "object"
    ) {

        throw new Error(
            "[PAY54_CONTACTS_SERVICE] Contacts Domain Engine must load before contacts service."
        );

    }

    const REQUIRED_DOMAIN_METHODS =
        Object.freeze([
            "createContact",
            "updateContact",
            "deleteContact",
            "getContacts",
            "getContactById",
            "searchContacts",
            "findByEmail",
            "findByPhone",
            "findByPay54Id",
            "setFavourite",
            "getFavourites",
            "setStatus",
            "addToGroup",
            "removeFromGroup",
            "addTag",
            "removeTag",
            "count",
            "verifyIntegrity",
            "getHealth"
        ]);

    for (
        const method
        of REQUIRED_DOMAIN_METHODS
    ) {

        if (
            typeof CONTACTS[method] !==
            "function"
        ) {

            throw new Error(
                `[PAY54_CONTACTS_SERVICE] Contacts Domain API unavailable: ${method}.`
            );

        }

    }

    /* ======================================================================
       SERVICE STATE
    ====================================================================== */

    const STATE = {

        ready:
            false,

        initialisedAt:
            null,

        lastOperationAt:
            null,

        lastOperation:
            null,

        lastError:
            null,

        operations:
            0,

        failures:
            0

    };

    /* ======================================================================
       HELPERS
    ====================================================================== */

    function nowISO() {

        return new Date()
            .toISOString();

    }

    function cleanString(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }

        return String(value)
            .trim();

    }

    function clone(
        value
    ) {

        if (
            value === undefined
        ) {

            return undefined;

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

                /* JSON fallback */

            }

        }

        return JSON.parse(
            JSON.stringify(value)
        );

    }

    function isPlainObject(
        value
    ) {

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
            prototype ===
                Object.prototype ||
            prototype ===
                null
        );

    }

    function createServiceError(
        message,
        code =
            "CONTACTS_SERVICE_ERROR"
    ) {

        const error =
            new Error(message);

        error.name =
            "PAY54ContactsServiceError";

        error.code =
            code;

        return error;

    }

    /* ======================================================================
       EXECUTION BOUNDARY
    ====================================================================== */

    function execute(
        operation,
        executor
    ) {

        STATE.operations++;

        STATE.lastOperation =
            operation;

        STATE.lastOperationAt =
            nowISO();

        try {

            const result =
                executor();

            STATE.lastError =
                null;

            return result;

        } catch (
            error
        ) {

            STATE.failures++;

            STATE.lastError = {

                operation,

                code:
                    error?.code ||
                    "CONTACTS_SERVICE_ERROR",

                message:
                    error instanceof Error
                        ? error.message
                        : String(error),

                occurredAt:
                    nowISO()

            };

            throw error;

        }

    }

    /* ======================================================================
       DOMAIN READINESS
    ====================================================================== */

    function assertDomainReady() {

        const health =
            CONTACTS.getHealth();

        if (
            !health ||
            health.healthy !== true ||
            health.status !== "ready"
        ) {

            throw createServiceError(
                "Contacts Domain Engine is not ready.",
                "CONTACTS_DOMAIN_UNAVAILABLE"
            );

        }

        return health;

    }

    /* ======================================================================
       CREATE
    ====================================================================== */

    function createContact(
        payload
    ) {

        return execute(
            "createContact",
            () => {

                assertDomainReady();

                if (
                    !isPlainObject(payload)
                ) {

                    throw createServiceError(
                        "Contact payload must be an object.",
                        "INVALID_CONTACT_PAYLOAD"
                    );

                }

                return clone(
                    CONTACTS.createContact(
                        payload
                    )
                );

            }
        );

    }

    /* ======================================================================
       UPDATE
    ====================================================================== */

    function updateContact(
        id,
        changes
    ) {

        return execute(
            "updateContact",
            () => {

                assertDomainReady();

                const contactId =
                    cleanString(id);

                if (
                    !contactId
                ) {

                    throw createServiceError(
                        "Contact ID is required.",
                        "CONTACT_ID_REQUIRED"
                    );

                }

                if (
                    !isPlainObject(changes)
                ) {

                    throw createServiceError(
                        "Contact changes must be an object.",
                        "INVALID_CONTACT_CHANGES"
                    );

                }

                return clone(
                    CONTACTS.updateContact(
                        contactId,
                        changes
                    )
                );

            }
        );

    }

    /* ======================================================================
       DELETE
    ====================================================================== */

    function deleteContact(
        id
    ) {

        return execute(
            "deleteContact",
            () => {

                assertDomainReady();

                const contactId =
                    cleanString(id);

                if (
                    !contactId
                ) {

                    throw createServiceError(
                        "Contact ID is required.",
                        "CONTACT_ID_REQUIRED"
                    );

                }

                return CONTACTS.deleteContact(
                    contactId
                );

            }
        );

    }

    /* ======================================================================
       GET BY ID
    ====================================================================== */

    function getContactById(
        id
    ) {

        return execute(
            "getContactById",
            () => {

                assertDomainReady();

                const contactId =
                    cleanString(id);

                if (
                    !contactId
                ) {

                    return null;

                }

                return clone(
                    CONTACTS.getContactById(
                        contactId
                    )
                );

            }
        );

    }

    /* ======================================================================
       LIST
    ====================================================================== */

    function getContacts(
        options = {}
    ) {

        return execute(
            "getContacts",
            () => {

                assertDomainReady();

                const safeOptions =
                    isPlainObject(options)
                        ? options
                        : {};

                return clone(
                    CONTACTS.getContacts(
                        safeOptions
                    )
                );

            }
        );

    }

    /* ======================================================================
       SEARCH
    ====================================================================== */

    function searchContacts(
        query,
        options = {}
    ) {

        return execute(
            "searchContacts",
            () => {

                assertDomainReady();

                const value =
                    cleanString(query);

                if (
                    !value
                ) {

                    return [];

                }

                const safeOptions =
                    isPlainObject(options)
                        ? options
                        : {};

                return clone(
                    CONTACTS.searchContacts(
                        value,
                        safeOptions
                    )
                );

            }
        );

    }

    /* ======================================================================
       IDENTITY LOOKUPS
    ====================================================================== */

    function findByPay54Id(
        pay54Id
    ) {

        return execute(
            "findByPay54Id",
            () => {

                assertDomainReady();

                const value =
                    cleanString(
                        pay54Id
                    );

                if (
                    !value
                ) {

                    return null;

                }

                return clone(
                    CONTACTS.findByPay54Id(
                        value
                    )
                );

            }
        );

    }

    function findByPhone(
        phone
    ) {

        return execute(
            "findByPhone",
            () => {

                assertDomainReady();

                const value =
                    cleanString(
                        phone
                    );

                if (
                    !value
                ) {

                    return null;

                }

                return clone(
                    CONTACTS.findByPhone(
                        value
                    )
                );

            }
        );

    }

    function findByEmail(
        email
    ) {

        return execute(
            "findByEmail",
            () => {

                assertDomainReady();

                const value =
                    cleanString(
                        email
                    );

                if (
                    !value
                ) {

                    return null;

                }

                return clone(
                    CONTACTS.findByEmail(
                        value
                    )
                );

            }
        );

    }

    /* ======================================================================
       GENERIC CONTACT RESOLUTION
    ====================================================================== */

    function resolveContact(
        identifier
    ) {

        return execute(
            "resolveContact",
            () => {

                assertDomainReady();

                if (
                    isPlainObject(identifier)
                ) {

                    if (
                        identifier.id
                    ) {

                        const byId =
                            CONTACTS.getContactById(
                                cleanString(
                                    identifier.id
                                )
                            );

                        if (
                            byId
                        ) {

                            return clone(
                                byId
                            );

                        }

                    }

                    if (
                        identifier.pay54Id
                    ) {

                        const byPay54Id =
                            CONTACTS.findByPay54Id(
                                identifier.pay54Id
                            );

                        if (
                            byPay54Id
                        ) {

                            return clone(
                                byPay54Id
                            );

                        }

                    }

                    if (
                        identifier.phone
                    ) {

                        const byPhone =
                            CONTACTS.findByPhone(
                                identifier.phone
                            );

                        if (
                            byPhone
                        ) {

                            return clone(
                                byPhone
                            );

                        }

                    }

                    if (
                        identifier.email
                    ) {

                        const byEmail =
                            CONTACTS.findByEmail(
                                identifier.email
                            );

                        if (
                            byEmail
                        ) {

                            return clone(
                                byEmail
                            );

                        }

                    }

                    return null;

                }

                const value =
                    cleanString(
                        identifier
                    );

                if (
                    !value
                ) {

                    return null;

                }

                /*
                 * Contact ID is checked first because it is the canonical
                 * internal identifier.
                 */

                const byId =
                    CONTACTS.getContactById(
                        value
                    );

                if (
                    byId
                ) {

                    return clone(
                        byId
                    );

                }

                /*
                 * Email detection is intentionally conservative.
                 */

                if (
                    value.includes("@")
                ) {

                    const byEmail =
                        CONTACTS.findByEmail(
                            value
                        );

                    if (
                        byEmail
                    ) {

                        return clone(
                            byEmail
                        );

                    }

                }

                /*
                 * Phone lookup is attempted for phone-like identifiers.
                 */

                if (
                    /^[+\d\s().-]+$/u.test(
                        value
                    )
                ) {

                    const byPhone =
                        CONTACTS.findByPhone(
                            value
                        );

                    if (
                        byPhone
                    ) {

                        return clone(
                            byPhone
                        );

                    }

                }

                /*
                 * PAY54 identity remains the final canonical external lookup.
                 */

                const byPay54Id =
                    CONTACTS.findByPay54Id(
                        value
                    );

                return clone(
                    byPay54Id ||
                    null
                );

            }
        );

    }

    /* ======================================================================
       RECIPIENT RESOLUTION
    ====================================================================== */

    function resolveRecipient(
        identifier
    ) {

        return execute(
            "resolveRecipient",
            () => {

                assertDomainReady();

                const contact =
                    resolveContact(
                        identifier
                    );

                if (
                    !contact
                ) {

                    return null;

                }

                /*
                 * Recipient resolution intentionally returns the canonical
                 * contact object rather than constructing a second recipient
                 * data model here.
                 *
                 * Payment-specific recipient transformation belongs to the
                 * payment/recipient integration layer.
                 */

                return clone(
                    contact
                );

            }
        );

    }

    /* ======================================================================
       FAVOURITES
    ====================================================================== */

    function setFavourite(
        id,
        favourite = true
    ) {

        return execute(
            "setFavourite",
            () => {

                assertDomainReady();

                const contactId =
                    cleanString(id);

                if (
                    !contactId
                ) {

                    throw createServiceError(
                        "Contact ID is required.",
                        "CONTACT_ID_REQUIRED"
                    );

                }

                return clone(
                    CONTACTS.setFavourite(
                        contactId,
                        Boolean(favourite)
                    )
                );

            }
        );

    }

    function getFavourites() {

        return execute(
            "getFavourites",
            () => {

                assertDomainReady();

                return clone(
                    CONTACTS.getFavourites()
                );

            }
        );

    }

    /* ======================================================================
       STATUS
    ====================================================================== */

    function setStatus(
        id,
        status
    ) {

        return execute(
            "setStatus",
            () => {

                assertDomainReady();

                return clone(
                    CONTACTS.setStatus(
                        cleanString(id),
                        status
                    )
                );

            }
        );

    }

    function blockContact(
        id
    ) {

        return execute(
            "blockContact",
            () => {

                assertDomainReady();

                return clone(
                    CONTACTS.blockContact(
                        cleanString(id)
                    )
                );

            }
        );

    }

    function unblockContact(
        id
    ) {

        return execute(
            "unblockContact",
            () => {

                assertDomainReady();

                return clone(
                    CONTACTS.unblockContact(
                        cleanString(id)
                    )
                );

            }
        );

    }

    function archiveContact(
        id
    ) {

        return execute(
            "archiveContact",
            () => {

                assertDomainReady();

                return clone(
                    CONTACTS.archiveContact(
                        cleanString(id)
                    )
                );

            }
        );

    }

    /* ======================================================================
       GROUPS
    ====================================================================== */

    function addToGroup(
        id,
        group
    ) {

        return execute(
            "addToGroup",
            () => {

                assertDomainReady();

                return clone(
                    CONTACTS.addToGroup(
                        cleanString(id),
                        group
                    )
                );

            }
        );

    }

    function removeFromGroup(
        id,
        group
    ) {

        return execute(
            "removeFromGroup",
            () => {

                assertDomainReady();

                return clone(
                    CONTACTS.removeFromGroup(
                        cleanString(id),
                        group
                    )
                );

            }
        );

    }

    /* ======================================================================
       TAGS
    ====================================================================== */

    function addTag(
        id,
        tag
    ) {

        return execute(
            "addTag",
            () => {

                assertDomainReady();

                return clone(
                    CONTACTS.addTag(
                        cleanString(id),
                        tag
                    )
                );

            }
        );

    }

    function removeTag(
        id,
        tag
    ) {

        return execute(
            "removeTag",
            () => {

                assertDomainReady();

                return clone(
                    CONTACTS.removeTag(
                        cleanString(id),
                        tag
                    )
                );

            }
        );

    }

    /* ======================================================================
       COUNT
    ====================================================================== */

    function count() {

        return execute(
            "count",
            () => {

                assertDomainReady();

                return CONTACTS.count();

            }
        );

    }

    /* ======================================================================
       INTEGRITY
    ====================================================================== */

    function verifyIntegrity() {

        return execute(
            "verifyIntegrity",
            () => {

                assertDomainReady();

                return clone(
                    CONTACTS.verifyIntegrity()
                );

            }
        );

    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    function getHealth() {

        let domainHealth =
            null;

        try {

            domainHealth =
                CONTACTS.getHealth();

        } catch (
            error
        ) {

            domainHealth = {

                healthy:
                    false,

                status:
                    "unavailable",

                error:
                    error instanceof Error
                        ? error.message
                        : String(error)

            };

        }

        const domainHealthy =
            domainHealth?.healthy ===
            true;

        return {

            healthy:
                Boolean(
                    STATE.ready &&
                    domainHealthy
                ),

            status:
                !STATE.ready
                    ? "initialising"
                    : (
                        domainHealthy
                            ? "ready"
                            : "degraded"
                    ),

            module:
                MODULE_ID,

            serviceId:
                SERVICE_ID,

            version:
                VERSION,

            domain:
                clone(
                    domainHealth
                ),

            operations:
                STATE.operations,

            failures:
                STATE.failures,

            initialisedAt:
                STATE.initialisedAt,

            lastOperation:
                STATE.lastOperation,

            lastOperationAt:
                STATE.lastOperationAt,

            lastError:
                clone(
                    STATE.lastError
                )

        };

    }

    /* ======================================================================
       INITIALISATION
    ====================================================================== */

    function initialise() {

        if (
            STATE.ready
        ) {

            return getHealth();

        }

        if (
            typeof CONTACTS.initialise ===
            "function"
        ) {

            CONTACTS.initialise();

        } else if (
            typeof CONTACTS.initialize ===
            "function"
        ) {

            CONTACTS.initialize();

        }

        const domainHealth =
            CONTACTS.getHealth();

        if (
            !domainHealth ||
            domainHealth.healthy !== true
        ) {

            throw createServiceError(
                "Contacts Domain Engine failed service initialisation.",
                "CONTACTS_DOMAIN_INITIALISATION_FAILED"
            );

        }

        STATE.ready =
            true;

        STATE.initialisedAt =
            nowISO();

        STATE.lastError =
            null;

        return getHealth();

    }

    /* ======================================================================
       PUBLIC API
    ====================================================================== */

    const API =
        Object.freeze({

            version:
                VERSION,

            module:
                MODULE_ID,

            moduleId:
                MODULE_ID,

            serviceId:
                SERVICE_ID,

            /* lifecycle */

            initialise,

            initialize:
                initialise,

            health:
                getHealth,

            getHealth,

            verifyIntegrity,

            /* CRUD */

            create:
                createContact,

            createContact,

            add:
                createContact,

            addContact:
                createContact,

            update:
                updateContact,

            updateContact,

            remove:
                deleteContact,

            delete:
                deleteContact,

            deleteContact,

            removeContact:
                deleteContact,

            /* reads */

            getAll:
                getContacts,

            getContacts,

            list:
                getContacts,

            getById:
                getContactById,

            getContactById,

            count,

            /* search */

            search:
                searchContacts,

            searchContacts,

            /* identity */

            findByPay54Id,

            findByPhone,

            findByEmail,

            resolve:
                resolveContact,

            resolveContact,

            resolveRecipient,

            /* favourites */

            setFavourite,

            setFavorite:
                setFavourite,

            getFavourites,

            getFavorites:
                getFavourites,

            /* status */

            setStatus,

            blockContact,

            unblockContact,

            archiveContact,

            /* groups */

            addToGroup,

            removeFromGroup,

            /* tags */

            addTag,

            removeTag

        });

    /* ======================================================================
       GLOBAL EXPORT
    ====================================================================== */

    GLOBAL.PAY54_CONTACTS_SERVICE =
        API;

    /* ======================================================================
       PLATFORM REGISTRY INTEGRATION
    ====================================================================== */

    function registerWithPlatform() {

        const registry =
            GLOBAL.PAY54_REGISTRY;

        if (
            !registry
        ) {

            return false;

        }

        try {

            if (
                typeof registry.register ===
                "function"
            ) {

                registry.register(
                    MODULE_ID,
                    API
                );

                return true;

            }

            if (
                typeof registry.set ===
                "function"
            ) {

                registry.set(
                    MODULE_ID,
                    API
                );

                return true;

            }

        } catch (
            error
        ) {

            console.warn(
                "[PAY54_CONTACTS_SERVICE] Platform registry registration skipped.",
                error
            );

        }

        return false;

    }

    /* ======================================================================
       BOOT
    ====================================================================== */

  initialise();

registerWithPlatform();

console.info(
    `✅ ${ENGINE_NAME} ${VERSION} loaded.`
);

})();
