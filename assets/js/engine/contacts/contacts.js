"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE CONTACTS DOMAIN ENGINE
   File: assets/js/engine/contacts/contacts.js
   Version: v1.0.0

   Purpose
   -------
   Canonical domain engine for PAY54 Contacts.

   Responsibilities
   ----------------
   • Provide the public PAY54 Contacts domain API
   • Orchestrate the Contacts Storage Engine
   • Enforce contact-domain validation
   • Enforce unique contact identities
   • Normalise contact input
   • Provide contact search and lookup
   • Manage favourites
   • Manage contact status
   • Manage groups and tags
   • Publish Contacts domain events
   • Provide health and diagnostics
   • Preserve legacy-compatible method aliases
   • Prevent direct persistence outside Contacts Storage

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
   Recipient / Send Flows

   Dependencies
   ------------
   assets/js/core/constants/index.js
   assets/js/core/constants/modules.js
   assets/js/core/constants/versions.js
   assets/js/core/constants/contacts.js
   assets/js/core/events.js
   assets/js/engine/contacts/core/storage.js

   Public API
   ----------
   window.PAY54_CONTACTS

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL
    ====================================================================== */

    const GLOBAL = window;

    const VERSION =
        "1.0.0";

    const ENGINE =
        "PAY54 Contacts Domain Engine";

    /* ======================================================================
       DEPENDENCY RESOLUTION
    ====================================================================== */

    const CONSTANTS =
        GLOBAL.PAY54_CONSTANTS;

    if (
        !CONSTANTS ||
        typeof CONSTANTS.get !== "function"
    ) {

        throw new Error(
            "[PAY54_CONTACTS] Constants Registry unavailable."
        );

    }

    const MODULES =
        CONSTANTS.get("MODULES");

    if (
        !MODULES ||
        typeof MODULES !== "object"
    ) {

        throw new Error(
            "[PAY54_CONTACTS] Module catalogue unavailable."
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
            "[PAY54_CONTACTS] Version catalogue unavailable."
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
            "[PAY54_CONTACTS] Contact constants unavailable."
        );

    }

    if (
        VERSIONS.CONTACTS !== VERSION
    ) {

        throw new Error(
            `[PAY54_CONTACTS] Version mismatch. Expected ${VERSION}.`
        );

    }

    /* ======================================================================
       STORAGE DEPENDENCY
    ====================================================================== */

    const STORAGE =
        GLOBAL.PAY54_CONTACTS_STORAGE;

    if (
        !STORAGE ||
        typeof STORAGE !== "object"
    ) {

        throw new Error(
            "[PAY54_CONTACTS] Contacts Storage must load before contacts.js."
        );

    }

    const REQUIRED_STORAGE_METHODS = [
        "create",
        "update",
        "remove",
        "getAll",
        "getById",
        "findByEmail",
        "findByPhone",
        "findByPay54Id",
        "search",
        "setFavourite",
        "getFavourites",
        "count",
        "verifyIntegrity",
        "getHealth"
    ];

    for (
        const method
        of REQUIRED_STORAGE_METHODS
    ) {

        if (
            typeof STORAGE[method] !==
            "function"
        ) {

            throw new Error(
                `[PAY54_CONTACTS] Storage API method unavailable: ${method}.`
            );

        }

    }

    /* ======================================================================
       MODULE METADATA
    ====================================================================== */

    const MODULE_ID =
        MODULES.DOMAIN?.CONTACTS?.ENGINE ??
        CONTACT_CONSTANTS.MODULE?.ENGINE ??
        "contacts.engine";

    const EVENTS =
        GLOBAL.PAY54_EVENTS ||
        null;

    const CONTACT_EVENTS =
        CONTACT_CONSTANTS.EVENTS;

    const TYPES =
        CONTACT_CONSTANTS.TYPES;

    const STATUS =
        CONTACT_CONSTANTS.STATUS;

    const VALIDATION =
        CONTACT_CONSTANTS.VALIDATION;

    const SEARCH_CONFIG =
        CONTACT_CONSTANTS.SEARCH;

    const ALLOWED_METADATA_FIELDS =
        new Set(
            CONTACT_CONSTANTS.SECURITY
                ?.ALLOWED_METADATA_FIELDS ||
            []
        );

    const FORBIDDEN_FIELDS =
        new Set(
            CONTACT_CONSTANTS.SECURITY
                ?.FORBIDDEN_FIELDS ||
            []
        );

    const IDENTIFIER_FIELDS =
        Object.freeze(
            [
                ...CONTACT_CONSTANTS
                    .REPOSITORY
                    .IDENTIFIER_FIELDS
            ]
        );

    /* ======================================================================
       ENGINE STATE
    ====================================================================== */

    const ENGINE_STATE = {

        ready:
            false,

        initialisedAt:
            null,

        lastOperationAt:
            null,

        lastError:
            null,

        operations:
            0,

        failures:
            0

    };

    /* ======================================================================
       BASIC HELPERS
    ====================================================================== */

    function nowISO() {

        return new Date()
            .toISOString();

    }

    function isObject(
        value
    ) {

        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );

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

                /* fall through */

            }

        }

        return JSON.parse(
            JSON.stringify(value)
        );

    }

    function cleanString(
        value,
        maxLength = null
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }

        const output =
            String(value)
                .trim();

        if (
            Number.isInteger(maxLength) &&
            maxLength > 0
        ) {

            return output.slice(
                0,
                maxLength
            );

        }

        return output;

    }

    function normaliseEmail(
        value
    ) {

        return cleanString(
            value,
            VALIDATION.MAX_EMAIL_LENGTH
        ).toLowerCase();

    }

    function normalisePhone(
        value
    ) {

        const input =
            cleanString(
                value,
                VALIDATION.MAX_PHONE_LENGTH
            );

        if (
            !input
        ) {

            return "";

        }

        const hasPlus =
            input.startsWith("+");

        const digits =
            input.replace(
                /\D/g,
                ""
            );

        if (
            !digits
        ) {

            return "";

        }

        return (
            hasPlus
                ? `+${digits}`
                : digits
        );

    }

    function normalisePay54Id(
        value
    ) {

        return cleanString(
            value,
            VALIDATION.MAX_PAY54_ID_LENGTH
        ).toLowerCase();

    }

    function normaliseArray(
        value,
        maximumItems,
        maximumLength
    ) {

        if (
            !Array.isArray(value)
        ) {

            return [];

        }

        const seen =
            new Set();

        const output =
            [];

        for (
            const item
            of value
        ) {

            const clean =
                cleanString(
                    item,
                    maximumLength
                );

            if (
                !clean
            ) {

                continue;

            }

            const key =
                clean.toLowerCase();

            if (
                seen.has(key)
            ) {

                continue;

            }

            seen.add(key);

            output.push(
                clean
            );

            if (
                output.length >=
                maximumItems
            ) {

                break;

            }

        }

        return output;

    }

    /* ======================================================================
       ERROR HANDLING
    ====================================================================== */

    function recordOperation() {

        ENGINE_STATE.operations++;

        ENGINE_STATE.lastOperationAt =
            nowISO();

    }

    function recordError(
        error
    ) {

        ENGINE_STATE.failures++;

        ENGINE_STATE.lastError = {

            message:
                error instanceof Error
                    ? error.message
                    : String(error),

            at:
                nowISO()

        };

    }

    function createDomainError(
        message,
        code =
            "CONTACTS_DOMAIN_ERROR"
    ) {

        const error =
            new Error(message);

        error.name =
            "PAY54ContactsError";

        error.code =
            code;

        return error;

    }

    /* ======================================================================
       EVENT BRIDGE
    ====================================================================== */

    function publish(
        eventName,
        payload = {}
    ) {

        if (
            !eventName
        ) {

            return false;

        }

        try {

            if (
                EVENTS &&
                typeof EVENTS.publish ===
                    "function"
            ) {

                EVENTS.publish(
                    eventName,
                    {
                        ...clone(payload),

                        module:
                            MODULE_ID,

                        version:
                            VERSION,

                        timestamp:
                            nowISO()
                    },
                    {
                        source:
                            MODULE_ID
                    }
                );

                return true;

            }

        } catch (
            error
        ) {

            console.error(
                "[PAY54_CONTACTS] Event publication failed.",
                error
            );

        }

        return false;

    }

    function publishError(
        operation,
        error
    ) {

        publish(
            CONTACT_EVENTS.ERROR,
            {
                operation,

                message:
                    error instanceof Error
                        ? error.message
                        : String(error),

                code:
                    error?.code ||
                    "CONTACTS_DOMAIN_ERROR"
            }
        );

    }

    /* ======================================================================
       SECURITY VALIDATION
    ====================================================================== */

    function containsForbiddenField(
        value,
        visited =
            new WeakSet()
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

        for (
            const key
            of Object.keys(value)
        ) {

            if (
                key === "__proto__" ||
                key === "prototype" ||
                key === "constructor" ||
                FORBIDDEN_FIELDS.has(key)
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
        payload
    ) {

        if (
            !isObject(payload)
        ) {

            throw createDomainError(
                "Contact payload must be an object.",
                "INVALID_CONTACT_PAYLOAD"
            );

        }

        if (
            containsForbiddenField(
                payload
            )
        ) {

            throw createDomainError(
                "Contact payload contains prohibited security fields.",
                "FORBIDDEN_CONTACT_FIELD"
            );

        }

        return true;

    }

    /* ======================================================================
       METADATA NORMALISATION
    ====================================================================== */

    function normaliseMetadata(
        metadata
    ) {

        if (
            !isObject(metadata)
        ) {

            return {};

        }

        const output =
            {};

        let count =
            0;

        for (
            const [
                key,
                value
            ]
            of Object.entries(metadata)
        ) {

            if (
                count >=
                VALIDATION.MAX_METADATA_KEYS
            ) {

                break;

            }

            if (
                !ALLOWED_METADATA_FIELDS.has(
                    key
                )
            ) {

                continue;

            }

            if (
                value === undefined
            ) {

                continue;

            }

            if (
                value !== null &&
                typeof value === "object"
            ) {

                continue;

            }

            output[key] =
                value;

            count++;

        }

        return output;

    }

    /* ======================================================================
       TYPE / STATUS NORMALISATION
    ====================================================================== */

    function normaliseType(
        value
    ) {

        const candidate =
            cleanString(value)
                .toUpperCase();

        const allowed =
            Object.values(
                TYPES
            );

        if (
            candidate &&
            allowed.includes(candidate)
        ) {

            return candidate;

        }

        return TYPES.PERSONAL;

    }

    function normaliseStatus(
        value
    ) {

        const candidate =
            cleanString(value)
                .toUpperCase();

        const allowed =
            Object.values(
                STATUS
            );

        if (
            candidate &&
            allowed.includes(candidate)
        ) {

            return candidate;

        }

        return STATUS.ACTIVE;

    }

    /* ======================================================================
       DISPLAY NAME
    ====================================================================== */

    function buildDisplayName(
        input
    ) {

        const explicit =
            cleanString(
                input.displayName,
                VALIDATION.MAX_NAME_LENGTH
            );

        if (
            explicit
        ) {

            return explicit;

        }

        const firstName =
            cleanString(
                input.firstName,
                VALIDATION.MAX_NAME_LENGTH
            );

        const lastName =
            cleanString(
                input.lastName,
                VALIDATION.MAX_NAME_LENGTH
            );

        const combined =
            `${firstName} ${lastName}`
                .trim();

        if (
            combined
        ) {

            return combined.slice(
                0,
                VALIDATION.MAX_NAME_LENGTH
            );

        }

        const alias =
            cleanString(
                input.alias,
                VALIDATION.MAX_ALIAS_LENGTH
            );

        if (
            alias
        ) {

            return alias;

        }

        return "";

    }

    /* ======================================================================
       CONTACT NORMALISATION
    ====================================================================== */

    function normaliseContact(
        input,
        {
            partial = false
        } = {}
    ) {

        assertSafePayload(
            input
        );

        const output =
            {};

        const assignString = (
            field,
            maxLength
        ) => {

            if (
                partial &&
                !(field in input)
            ) {

                return;

            }

            output[field] =
                cleanString(
                    input[field],
                    maxLength
                );

        };

        assignString(
            "firstName",
            VALIDATION.MAX_NAME_LENGTH
        );

        assignString(
            "lastName",
            VALIDATION.MAX_NAME_LENGTH
        );

        assignString(
            "alias",
            VALIDATION.MAX_ALIAS_LENGTH
        );

        assignString(
            "notes",
            VALIDATION.MAX_NOTE_LENGTH
        );

        if (
            !partial ||
            "displayName" in input ||
            "firstName" in input ||
            "lastName" in input ||
            "alias" in input
        ) {

            const displayName =
                buildDisplayName(
                    input
                );

            if (
                displayName ||
                !partial
            ) {

                output.displayName =
                    displayName;

            }

        }

        if (
            !partial ||
            "phone" in input
        ) {

            output.phone =
                normalisePhone(
                    input.phone
                );

        }

        if (
            !partial ||
            "email" in input
        ) {

            output.email =
                normaliseEmail(
                    input.email
                );

        }

        if (
            !partial ||
            "pay54Id" in input
        ) {

            output.pay54Id =
                normalisePay54Id(
                    input.pay54Id
                );

        }

        if (
            !partial ||
            "type" in input
        ) {

            output.type =
                normaliseType(
                    input.type
                );

        }

        if (
            !partial ||
            "status" in input
        ) {

            output.status =
                normaliseStatus(
                    input.status
                );

        }

        if (
            !partial ||
            "avatar" in input
        ) {

            output.avatar =
                cleanString(
                    input.avatar,
                    2048
                );

        }

        if (
            !partial ||
            "favourite" in input
        ) {

            output.favourite =
                Boolean(
                    input.favourite
                );

        }

        if (
            !partial ||
            "tags" in input
        ) {

            output.tags =
                normaliseArray(
                    input.tags,
                    VALIDATION.MAX_TAGS,
                    VALIDATION.MAX_TAG_LENGTH
                );

        }

        if (
            !partial ||
            "groups" in input
        ) {

            output.groups =
                normaliseArray(
                    input.groups,
                    VALIDATION.MAX_GROUPS,
                    VALIDATION.MAX_TAG_LENGTH
                );

        }

        if (
            !partial ||
            "metadata" in input
        ) {

            output.metadata =
                normaliseMetadata(
                    input.metadata
                );

        }

        return output;

    }

    /* ======================================================================
       CONTACT VALIDATION
    ====================================================================== */

    function hasIdentifier(
        contact
    ) {

        return IDENTIFIER_FIELDS.some(
            field =>
                Boolean(
                    cleanString(
                        contact[field]
                    )
                )
        );

    }

    function validateContact(
        contact,
        {
            partial = false
        } = {}
    ) {

        if (
            !isObject(contact)
        ) {

            throw createDomainError(
                "Invalid contact.",
                "INVALID_CONTACT"
            );

        }

        if (
            !partial &&
            !cleanString(
                contact.displayName
            )
        ) {

            throw createDomainError(
                "Contact display name is required.",
                "CONTACT_NAME_REQUIRED"
            );

        }

        if (
            !partial &&
            !hasIdentifier(contact)
        ) {

            throw createDomainError(
                "A contact requires a PAY54 ID, phone number or email address.",
                "CONTACT_IDENTIFIER_REQUIRED"
            );

        }

        if (
            contact.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u
                .test(contact.email)
        ) {

            throw createDomainError(
                "Invalid contact email address.",
                "INVALID_CONTACT_EMAIL"
            );

        }

        if (
            contact.phone
        ) {

            const digits =
                contact.phone
                    .replace(
                        /\D/g,
                        ""
                    );

            if (
                digits.length < 5
            ) {

                throw createDomainError(
                    "Invalid contact phone number.",
                    "INVALID_CONTACT_PHONE"
                );

            }

        }

        return true;

    }

    /* ======================================================================
       DUPLICATE IDENTITY CHECK
    ====================================================================== */

    function findIdentityConflict(
        contact,
        excludeId = null
    ) {

        const lookups = [
            [
                "pay54Id",
                "findByPay54Id"
            ],
            [
                "phone",
                "findByPhone"
            ],
            [
                "email",
                "findByEmail"
            ]
        ];

        for (
            const [
                field,
                method
            ]
            of lookups
        ) {

            const value =
                contact[field];

            if (
                !value
            ) {

                continue;

            }

            const existing =
                STORAGE[method](
                    value
                );

            if (
                existing &&
                existing.id !==
                    excludeId
            ) {

                return {

                    field,

                    value,

                    contact:
                        clone(existing)

                };

            }

        }

        return null;

    }

    function assertUniqueIdentity(
        contact,
        excludeId = null
    ) {

        const conflict =
            findIdentityConflict(
                contact,
                excludeId
            );

        if (
            conflict
        ) {

            throw createDomainError(
                `A contact already exists with this ${conflict.field}.`,
                "CONTACT_IDENTITY_CONFLICT"
            );

        }

        return true;

    }

    /* ======================================================================
       EXECUTION WRAPPER
    ====================================================================== */

    function execute(
        operation,
        executor
    ) {

        recordOperation();

        try {

            return executor();

        } catch (
            error
        ) {

            recordError(
                error
            );

            publishError(
                operation,
                error
            );

            throw error;

        }

    }

    /* ======================================================================
       CREATE CONTACT
    ====================================================================== */

    function createContact(
        input
    ) {

        return execute(
            "createContact",
            () => {

                const contact =
                    normaliseContact(
                        input
                    );

                validateContact(
                    contact
                );

                assertUniqueIdentity(
                    contact
                );

                const created =
                    STORAGE.create(
                        contact
                    );

                publish(
                    CONTACT_EVENTS.CREATED,
                    {
                        contact:
                            clone(created)
                    }
                );

                return clone(
                    created
                );

            }
        );

    }

    /* ======================================================================
       UPDATE CONTACT
    ====================================================================== */

    function updateContact(
        id,
        changes
    ) {

        return execute(
            "updateContact",
            () => {

                const contactId =
                    cleanString(id);

                if (
                    !contactId
                ) {

                    throw createDomainError(
                        "Contact ID is required.",
                        "CONTACT_ID_REQUIRED"
                    );

                }

                const existing =
                    STORAGE.getById(
                        contactId
                    );

                if (
                    !existing
                ) {

                    throw createDomainError(
                        "Contact not found.",
                        "CONTACT_NOT_FOUND"
                    );

                }

                const normalised =
                    normaliseContact(
                        changes,
                        {
                            partial:
                                true
                        }
                    );

                const merged = {
                    ...existing,
                    ...normalised
                };

                if (
                    "firstName" in changes ||
                    "lastName" in changes ||
                    "alias" in changes
                ) {

                    if (
                        !("displayName" in changes)
                    ) {

                        merged.displayName =
                            buildDisplayName(
                                merged
                            );

                        normalised.displayName =
                            merged.displayName;

                    }

                }

                validateContact(
                    merged
                );

                assertUniqueIdentity(
                    merged,
                    contactId
                );

                const updated =
                    STORAGE.update(
                        contactId,
                        normalised
                    );

                publish(
                    CONTACT_EVENTS.UPDATED,
                    {
                        id:
                            contactId,

                        changes:
                            clone(
                                normalised
                            ),

                        contact:
                            clone(
                                updated
                            )
                    }
                );

                return clone(
                    updated
                );

            }
        );

    }

    /* ======================================================================
       DELETE CONTACT
    ====================================================================== */

    function deleteContact(
        id
    ) {

        return execute(
            "deleteContact",
            () => {

                const contactId =
                    cleanString(id);

                if (
                    !contactId
                ) {

                    throw createDomainError(
                        "Contact ID is required.",
                        "CONTACT_ID_REQUIRED"
                    );

                }

                const existing =
                    STORAGE.getById(
                        contactId
                    );

                if (
                    !existing
                ) {

                    return false;

                }

                const result =
                    STORAGE.remove(
                        contactId
                    );

                publish(
                    CONTACT_EVENTS.DELETED,
                    {
                        id:
                            contactId,

                        contact:
                            clone(
                                existing
                            )
                    }
                );

                return result;

            }
        );

    }

    /* ======================================================================
       GET CONTACT
    ====================================================================== */

    function getContactById(
        id
    ) {

        return execute(
            "getContactById",
            () =>
                clone(
                    STORAGE.getById(
                        cleanString(id)
                    )
                )
        );

    }

    /* ======================================================================
       GET CONTACTS
    ====================================================================== */

    function getContacts(
        options = {}
    ) {

        return execute(
            "getContacts",
            () => {

                let contacts =
                    STORAGE.getAll();

                if (
                    !Array.isArray(
                        contacts
                    )
                ) {

                    contacts =
                        [];

                }

                if (
                    options.status
                ) {

                    const status =
                        normaliseStatus(
                            options.status
                        );

                    contacts =
                        contacts.filter(
                            contact =>
                                contact.status ===
                                status
                        );

                }

                if (
                    options.type
                ) {

                    const type =
                        normaliseType(
                            options.type
                        );

                    contacts =
                        contacts.filter(
                            contact =>
                                contact.type ===
                                type
                        );

                }

                if (
                    options.favourite ===
                    true
                ) {

                    contacts =
                        contacts.filter(
                            contact =>
                                contact.favourite ===
                                true
                        );

                }

                if (
                    options.group
                ) {

                    const group =
                        cleanString(
                            options.group
                        ).toLowerCase();

                    contacts =
                        contacts.filter(
                            contact =>
                                Array.isArray(
                                    contact.groups
                                ) &&
                                contact.groups.some(
                                    item =>
                                        String(item)
                                            .toLowerCase() ===
                                        group
                                )
                        );

                }

                return clone(
                    contacts
                );

            }
        );

    }

    /* ======================================================================
       SEARCH CONTACTS
    ====================================================================== */

    function searchContacts(
        query,
        options = {}
    ) {

        return execute(
            "searchContacts",
            () => {

                const cleanQuery =
                    cleanString(
                        query,
                        VALIDATION
                            .MAX_SEARCH_QUERY_LENGTH
                    );

                if (
                    cleanQuery.length <
                    SEARCH_CONFIG
                        .MIN_QUERY_LENGTH
                ) {

                    return [];

                }

                let results =
                    STORAGE.search(
                        cleanQuery
                    );

                if (
                    !Array.isArray(
                        results
                    )
                ) {

                    results =
                        [];

                }

                if (
                    options.type
                ) {

                    const type =
                        normaliseType(
                            options.type
                        );

                    results =
                        results.filter(
                            contact =>
                                contact.type ===
                                type
                        );

                }

                if (
                    options.status
                ) {

                    const status =
                        normaliseStatus(
                            options.status
                        );

                    results =
                        results.filter(
                            contact =>
                                contact.status ===
                                status
                        );

                }

                const limit =
                    Number.isInteger(
                        options.limit
                    )
                        ? Math.max(
                            1,
                            Math.min(
                                options.limit,
                                SEARCH_CONFIG
                                    .MAX_RESULTS
                            )
                        )
                        : SEARCH_CONFIG
                            .MAX_RESULTS;

                results =
                    results.slice(
                        0,
                        limit
                    );

                publish(
                    CONTACT_EVENTS.SEARCHED,
                    {
                        query:
                            cleanQuery,

                        count:
                            results.length
                    }
                );

                return clone(
                    results
                );

            }
        );

    }

    /* ======================================================================
       IDENTITY LOOKUPS
    ====================================================================== */

    function findByEmail(
        email
    ) {

        return execute(
            "findByEmail",
            () =>
                clone(
                    STORAGE.findByEmail(
                        normaliseEmail(
                            email
                        )
                    )
                )
        );

    }

    function findByPhone(
        phone
    ) {

        return execute(
            "findByPhone",
            () =>
                clone(
                    STORAGE.findByPhone(
                        normalisePhone(
                            phone
                        )
                    )
                )
        );

    }

    function findByPay54Id(
        pay54Id
    ) {

        return execute(
            "findByPay54Id",
            () =>
                clone(
                    STORAGE.findByPay54Id(
                        normalisePay54Id(
                            pay54Id
                        )
                    )
                )
        );

    }

    /* ======================================================================
       EXISTS
    ====================================================================== */

    function exists(
        value
    ) {

        return execute(
            "exists",
            () => {

                if (
                    isObject(value)
                ) {

                    if (
                        value.id &&
                        STORAGE.getById(
                            cleanString(
                                value.id
                            )
                        )
                    ) {

                        return true;

                    }

                    if (
                        value.pay54Id &&
                        findByPay54Id(
                            value.pay54Id
                        )
                    ) {

                        return true;

                    }

                    if (
                        value.phone &&
                        findByPhone(
                            value.phone
                        )
                    ) {

                        return true;

                    }

                    if (
                        value.email &&
                        findByEmail(
                            value.email
                        )
                    ) {

                        return true;

                    }

                    return false;

                }

                const identifier =
                    cleanString(value);

                if (
                    !identifier
                ) {

                    return false;

                }

                return Boolean(
                    STORAGE.getById(
                        identifier
                    ) ||
                    STORAGE.findByPay54Id(
                        normalisePay54Id(
                            identifier
                        )
                    ) ||
                    STORAGE.findByPhone(
                        normalisePhone(
                            identifier
                        )
                    ) ||
                    STORAGE.findByEmail(
                        normaliseEmail(
                            identifier
                        )
                    )
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

                const contactId =
                    cleanString(id);

                if (
                    !contactId
                ) {

                    throw createDomainError(
                        "Contact ID is required.",
                        "CONTACT_ID_REQUIRED"
                    );

                }

                const existing =
                    STORAGE.getById(
                        contactId
                    );

                if (
                    !existing
                ) {

                    throw createDomainError(
                        "Contact not found.",
                        "CONTACT_NOT_FOUND"
                    );

                }

                const updated =
                    STORAGE.setFavourite(
                        contactId,
                        Boolean(favourite)
                    );

                publish(
                    CONTACT_EVENTS.UPDATED,
                    {
                        id:
                            contactId,

                        changes: {
                            favourite:
                                Boolean(
                                    favourite
                                )
                        },

                        contact:
                            clone(
                                updated
                            )
                    }
                );

                return clone(
                    updated
                );

            }
        );

    }

    function getFavourites() {

        return execute(
            "getFavourites",
            () =>
                clone(
                    STORAGE.getFavourites()
                )
        );

    }

    /* ======================================================================
       STATUS
    ====================================================================== */

    function setStatus(
        id,
        status
    ) {

        const value =
            cleanString(
                status
            ).toUpperCase();

        if (
            !Object.values(
                STATUS
            ).includes(value)
        ) {

            throw createDomainError(
                `Unsupported contact status: ${status}.`,
                "INVALID_CONTACT_STATUS"
            );

        }

        return updateContact(
            id,
            {
                status:
                    value
            }
        );

    }

    function blockContact(
        id
    ) {

        return setStatus(
            id,
            STATUS.BLOCKED
        );

    }

    function unblockContact(
        id
    ) {

        return setStatus(
            id,
            STATUS.ACTIVE
        );

    }

    function archiveContact(
        id
    ) {

        return setStatus(
            id,
            STATUS.ARCHIVED
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

                const contact =
                    STORAGE.getById(
                        cleanString(id)
                    );

                if (
                    !contact
                ) {

                    throw createDomainError(
                        "Contact not found.",
                        "CONTACT_NOT_FOUND"
                    );

                }

                const groupName =
                    cleanString(
                        group,
                        VALIDATION.MAX_TAG_LENGTH
                    );

                if (
                    !groupName
                ) {

                    throw createDomainError(
                        "Contact group is required.",
                        "CONTACT_GROUP_REQUIRED"
                    );

                }

                const groups =
                    normaliseArray(
                        [
                            ...(
                                Array.isArray(
                                    contact.groups
                                )
                                    ? contact.groups
                                    : []
                            ),
                            groupName
                        ],
                        VALIDATION.MAX_GROUPS,
                        VALIDATION.MAX_TAG_LENGTH
                    );

                return updateContact(
                    contact.id,
                    {
                        groups
                    }
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

                const contact =
                    STORAGE.getById(
                        cleanString(id)
                    );

                if (
                    !contact
                ) {

                    throw createDomainError(
                        "Contact not found.",
                        "CONTACT_NOT_FOUND"
                    );

                }

                const target =
                    cleanString(group)
                        .toLowerCase();

                const groups =
                    (
                        Array.isArray(
                            contact.groups
                        )
                            ? contact.groups
                            : []
                    ).filter(
                        item =>
                            String(item)
                                .toLowerCase() !==
                            target
                    );

                return updateContact(
                    contact.id,
                    {
                        groups
                    }
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

                const contact =
                    STORAGE.getById(
                        cleanString(id)
                    );

                if (
                    !contact
                ) {

                    throw createDomainError(
                        "Contact not found.",
                        "CONTACT_NOT_FOUND"
                    );

                }

                const tagName =
                    cleanString(
                        tag,
                        VALIDATION.MAX_TAG_LENGTH
                    );

                if (
                    !tagName
                ) {

                    throw createDomainError(
                        "Contact tag is required.",
                        "CONTACT_TAG_REQUIRED"
                    );

                }

                const tags =
                    normaliseArray(
                        [
                            ...(
                                Array.isArray(
                                    contact.tags
                                )
                                    ? contact.tags
                                    : []
                            ),
                            tagName
                        ],
                        VALIDATION.MAX_TAGS,
                        VALIDATION.MAX_TAG_LENGTH
                    );

                return updateContact(
                    contact.id,
                    {
                        tags
                    }
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

                const contact =
                    STORAGE.getById(
                        cleanString(id)
                    );

                if (
                    !contact
                ) {

                    throw createDomainError(
                        "Contact not found.",
                        "CONTACT_NOT_FOUND"
                    );

                }

                const target =
                    cleanString(tag)
                        .toLowerCase();

                const tags =
                    (
                        Array.isArray(
                            contact.tags
                        )
                            ? contact.tags
                            : []
                    ).filter(
                        item =>
                            String(item)
                                .toLowerCase() !==
                            target
                    );

                return updateContact(
                    contact.id,
                    {
                        tags
                    }
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
            () =>
                STORAGE.count()
        );

    }

    /* ======================================================================
       INTEGRITY
    ====================================================================== */

    function verifyIntegrity() {

        return execute(
            "verifyIntegrity",
            () =>
                clone(
                    STORAGE.verifyIntegrity()
                )
        );

    }

    /* ======================================================================
       HEALTH
    ====================================================================== */

    function getHealth() {

        const storageHealth =
            clone(
                STORAGE.getHealth()
            );

        return {

            healthy:
                Boolean(
                    ENGINE_STATE.ready &&
                    storageHealth?.healthy !==
                        false
                ),

            status:
                ENGINE_STATE.ready
                    ? (
                        storageHealth?.healthy ===
                        false
                            ? "degraded"
                            : "ready"
                    )
                    : "initialising",

            module:
                MODULE_ID,

            version:
                VERSION,

            storage:
                storageHealth,

            contacts:
                STORAGE.count(),

            operations:
                ENGINE_STATE.operations,

            failures:
                ENGINE_STATE.failures,

            initialisedAt:
                ENGINE_STATE.initialisedAt,

            lastOperationAt:
                ENGINE_STATE.lastOperationAt,

            lastError:
                clone(
                    ENGINE_STATE.lastError
                )

        };

    }

    /* ======================================================================
       INITIALISATION
    ====================================================================== */

    function initialise() {

        return execute(
            "initialise",
            () => {

                if (
                    ENGINE_STATE.ready
                ) {

                    return getHealth();

                }

                if (
                    typeof STORAGE.initialise ===
                    "function"
                ) {

                    STORAGE.initialise();

                } else if (
                    typeof STORAGE.initialize ===
                    "function"
                ) {

                    STORAGE.initialize();

                }

                const integrity =
                    STORAGE.verifyIntegrity();

                if (
                    integrity === false ||
                    integrity?.healthy ===
                        false ||
                    integrity?.valid ===
                        false
                ) {

                    throw createDomainError(
                        "Contacts Storage integrity verification failed.",
                        "CONTACTS_STORAGE_INTEGRITY_FAILED"
                    );

                }

                ENGINE_STATE.ready =
                    true;

                ENGINE_STATE.initialisedAt =
                    nowISO();

                ENGINE_STATE.lastError =
                    null;

                publish(
                    CONTACT_EVENTS.REPOSITORY_READY,
                    {
                        contacts:
                            STORAGE.count(),

                        storage:
                            STORAGE.getHealth()
                    }
                );

                return getHealth();

            }
        );

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

            getById:
                getContactById,

            getContactById,

            count,

            exists,

            /* identity */

            findByEmail,

            findByPhone,

            findByPay54Id,

            /* search */

            search:
                searchContacts,

            searchContacts,

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

            /* grouping */

            addToGroup,

            removeFromGroup,

            /* tags */

            addTag,

            removeTag,

            /* validation */

            validateContact,

            normaliseContact,

            normalizeContact:
                normaliseContact

        });

    /* ======================================================================
       GLOBAL REGISTRATION
    ====================================================================== */

    GLOBAL.PAY54_CONTACTS =
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
                "[PAY54_CONTACTS] Platform registry registration skipped.",
                error
            );

        }

        return false;

    }

    registerWithPlatform();

    /* ======================================================================
       BOOT
    ====================================================================== */

    initialise();

    console.info(
        `✅ ${ENGINE} ${VERSION} loaded.`
    );

})();
