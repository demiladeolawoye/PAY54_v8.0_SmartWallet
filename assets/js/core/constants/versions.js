"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE VERSION CATALOGUE
   File: assets/js/core/constants/versions.js
   Version: v12.0.0

   Purpose
   -------
   Canonical version catalogue for the PAY54 Enterprise Platform.

   Responsibilities
   ----------------
   • Centralise PAY54 module versions
   • Preserve all existing public version identifiers
   • Eliminate duplicated version constants progressively
   • Provide component-level version information
   • Support diagnostics and release management
   • Support Contacts Engine component versioning
   • Support Beneficiary Engine component versioning
   • Provide immutable version information
   • Maintain zero-regression compatibility

   Dependencies
   ------------
   assets/js/core/constants/index.js
   assets/js/core/constants/modules.js

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL
    ====================================================================== */

    const GLOBAL =
        window;

    const CATALOGUE_NAME =
        "VERSIONS";

    const VERSION =
        "12.0.0";

    const ENGINE =
        "PAY54 Version Catalogue";

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
            "[PAY54] Constants Registry must load before versions.js."
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
            "[PAY54] Module identifiers must load before versions.js."
        );

    }

    if (
        MODULES.VERSIONS !==
        "VERSIONS"
    ) {

        throw new Error(
            "[PAY54] MODULES.VERSIONS compatibility verification failed."
        );

    }

    if (
        MODULES.BENEFICIARIES !==
        "BENEFICIARIES"
    ) {

        throw new Error(
            "[PAY54] MODULES.BENEFICIARIES must be available before versions.js."
        );

    }

       if (
        MODULES.FUNDING !==
        "FUNDING"
    ) {

        throw new Error(
            "[PAY54] MODULES.FUNDING must be available before versions.js."
        );

    }

    /* ======================================================================
       CANONICAL VERSION CATALOGUE

       IMPORTANT
       ---------
       Existing top-level version properties remain strings.

       BENEFICIARIES is additive and does not alter RECIPIENTS or CONTACTS.
    ====================================================================== */

    const VERSIONS = {

        /* ==================================================================
           EXISTING PUBLIC VERSION IDENTIFIERS
        ================================================================== */

        CORE:
            "12.0.0",

        CONSTANTS:
            "12.0.0",

        /* ------------------------------------------------------------------
           PLATFORM / FOUNDATION
        ------------------------------------------------------------------ */

        LEDGER:
            "8.0.5",

        TRANSACTIONS:
            "11.0.0",

        SERVICES:
            "11.0.0",

        RECIPIENTS:
            "11.0.0",

        /* ------------------------------------------------------------------
           DOMAIN / ENGINES
        ------------------------------------------------------------------ */

        CONTACTS:
            "1.0.0",

                BENEFICIARIES:
            "1.0.0",

        FUNDING:
            "1.0.0",

        CARDS:
            "11.0.0",

        WALLET:
            "11.0.0",

        MERCHANT:
            "11.0.0",

        SECURITY:
            "11.0.0",

        SAVINGS:
            "11.0.0",

        TRADING:
            "11.0.0",

        INVEST:
            "11.0.0",

        CHECKOUT:
            "11.0.0",

        AGENT:
            "11.0.0",

        RISK:
            "11.0.0",

        /* ==================================================================
           PLATFORM RELEASE INFORMATION
        ================================================================== */

        PLATFORM: {

            RELEASE:
                "12.0.0",

            CORE:
                "12.0.0",

            CONSTANTS:
                "12.0.0",

            CONTACTS:
                "1.0.0",

                       BENEFICIARIES:
                "1.0.0",

            FUNDING:
                "1.0.0"

        },

        /* ==================================================================
           COMPONENT VERSION CATALOGUE
        ================================================================== */

        COMPONENTS: {

            /* --------------------------------------------------------------
               CORE
            -------------------------------------------------------------- */

            CORE: {

                CONSTANTS_REGISTRY:
                    "12.0.0",

                MODULE_CONSTANTS:
                    "12.0.0",

                VERSION_CONSTANTS:
                    "12.0.0",

                CONTACT_CONSTANTS:
                    "1.0.0",

                        BENEFICIARY_CONSTANTS:
                    "1.0.0",

                FUNDING_CONSTANTS:
                    "1.0.0",

                CONFIG:
                    "12.0.0",

                EVENTS:
                    "12.0.0",

                STATE:
                    "12.0.0",

                ROUTER:
                    "12.0.0",

                REGISTRY:
                    "12.0.0",

                BOOTSTRAP:
                    "12.0.0",

                APP:
                    "12.0.0",

                DIAGNOSTICS:
                    "12.0.0",

                LOGGER:
                    "12.0.0",

                ERRORS:
                    "12.0.0",

                HEALTH:
                    "12.0.0"

            },

            /* --------------------------------------------------------------
               FOUNDATION
            -------------------------------------------------------------- */

            FOUNDATION: {

                LEDGER:
                    "8.0.5",

                TRANSACTIONS:
                    "11.0.0",

                RECEIPTS:
                    "11.0.0",

                SERVICES:
                    "11.0.0",

                RECIPIENTS:
                    "11.0.0"

            },

            /* --------------------------------------------------------------
               BENEFICIARIES
            -------------------------------------------------------------- */

                       BENEFICIARIES: {

                CONSTANTS:
                    "1.0.0",

                STORAGE:
                    "1.0.0",

                ENGINE:
                    "1.0.0",

                SERVICE:
                    "1.0.0",

                MIGRATION:
                    "1.0.0",

                LEGACY_FACADE:
                    "1.0.0"

            },

            /* --------------------------------------------------------------
               FUNDING
            -------------------------------------------------------------- */

            FUNDING: {

                CONSTANTS:
                    "1.0.0",

                ENGINE:
                    "1.0.0",

                SERVICE:
                    "1.0.0",

                REGISTRY:
                    "1.0.0",

                WALLET_ADAPTER:
                    "1.0.0",

                LINKED_CARD_ADAPTER:
                    "1.0.0"

            },

            /* --------------------------------------------------------------
               SECURITY
            -------------------------------------------------------------- */

            SECURITY: {

                ROOT:
                    "11.0.0",

                INDEX:
                    "11.0.0",

                SECURE_STORAGE:
                    "11.0.0",

                SESSION_MANAGER:
                    "11.0.0",

                TRANSACTION_GUARD:
                    "11.0.0",

                VALIDATOR:
                    "11.0.0",

                SANITIZER:
                    "11.0.0",

                XSS:
                    "11.0.0"

            },

            /* --------------------------------------------------------------
               CARDS
            -------------------------------------------------------------- */

            CARDS: {

                ENGINE:
                    "11.0.0",

                UI:
                    "11.0.0",

                VIRTUAL:
                    "11.0.0",

                LINKED:
                    "11.0.0"

            },

            /* --------------------------------------------------------------
               WALLET
            -------------------------------------------------------------- */

            WALLET: {

                ENGINE:
                    "11.0.0",

                BALANCES:
                    "11.0.0",

                TRANSFERS:
                    "11.0.0",

                FUNDING:
                    "11.0.0"

            }

        },

        /* ==================================================================
           DOMAIN VERSION CATALOGUE
        ================================================================== */

        DOMAIN: {

            /* --------------------------------------------------------------
               CONTACTS

               Existing WP-010 version governance is preserved.
            -------------------------------------------------------------- */

            CONTACTS: {

                ROOT:
                    "1.0.0",

                ENGINE:
                    "1.0.0",

                CORE:
                    "1.0.0",

                STORAGE:
                    "1.0.0",

                REPOSITORY:
                    "1.0.0",

                SERVICE:
                    "1.0.0",

                VALIDATOR:
                    "1.0.0",

                NORMALIZER:
                    "1.0.0",

                SEARCH:
                    "1.0.0",

                EVENTS:
                    "1.0.0",

                UI:
                    "1.0.0",

                PICKER:
                    "1.0.0",

                IMPORT:
                    "1.0.0",

                EXPORT:
                    "1.0.0",

                SYNC:
                    "1.0.0",

                GROUPS:
                    "1.0.0",

                BENEFICIARIES:
                    "1.0.0",

                RECENTS:
                    "1.0.0",

                SETTINGS:
                    "1.0.0"

            },

            /* --------------------------------------------------------------
               BENEFICIARIES

               Independent payment-relationship domain.

               Contacts owns person identity.
               Beneficiaries owns payment destinations, trust, usage and
               beneficiary lifecycle.
            -------------------------------------------------------------- */

            BENEFICIARIES: {

                ROOT:
                    "1.0.0",

                CONSTANTS:
                    "1.0.0",

                ENGINE:
                    "1.0.0",

                CORE:
                    "1.0.0",

                STORAGE:
                    "1.0.0",

                REPOSITORY:
                    "1.0.0",

                SERVICE:
                    "1.0.0",

                VALIDATOR:
                    "1.0.0",

                NORMALIZER:
                    "1.0.0",

                EVENTS:
                    "1.0.0",

                MIGRATION:
                    "1.0.0",

                LEGACY_FACADE:
                    "1.0.0"

            },

                       /* --------------------------------------------------------------
               FUNDING

               Enterprise funding-source orchestration domain.

               Wallet owns wallet state.
               Cards owns card lifecycle.
               Funding owns source discovery, quoting, authorisation,
               commitment and reversal orchestration.
            -------------------------------------------------------------- */

            FUNDING: {

                ROOT:
                    "1.0.0",

                CONSTANTS:
                    "1.0.0",

                ENGINE:
                    "1.0.0",

                SERVICE:
                    "1.0.0",

                REGISTRY:
                    "1.0.0",

                WALLET_ADAPTER:
                    "1.0.0",

                LINKED_CARD_ADAPTER:
                    "1.0.0",

                EVENTS:
                    "1.0.0"

            },

            /* --------------------------------------------------------------
               PAYMENTS
            -------------------------------------------------------------- */

            PAYMENTS: {

                ROOT:
                    "11.0.0",

                SEND:
                    "11.0.0",

                RECEIVE:
                    "11.0.0",

                REQUEST:
                    "11.0.0",

                SCAN_PAY:
                    "11.0.0",

                BANK_TRANSFER:
                    "11.0.0",

                MERCHANT_QR:
                    "11.0.0"

            },

            /* --------------------------------------------------------------
               MONEY MANAGEMENT
            -------------------------------------------------------------- */

            MONEY: {

                ROOT:
                    "11.0.0",

                FX:
                    "11.0.0",

                BILLS:
                    "11.0.0",

                SAVINGS:
                    "11.0.0",

                VAULTS:
                    "11.0.0",

                INVEST:
                    "11.0.0"

            },

            /* --------------------------------------------------------------
               COMMERCE
            -------------------------------------------------------------- */

            COMMERCE: {

                ROOT:
                    "11.0.0",

                CHECKOUT:
                    "11.0.0",

                MARKETPLACE:
                    "11.0.0",

                MERCHANT:
                    "11.0.0"

            },

            /* --------------------------------------------------------------
               RISK / COMPLIANCE
            -------------------------------------------------------------- */

            RISK: {

                ROOT:
                    "11.0.0",

                SHIELD:
                    "11.0.0",

                FRAUD:
                    "11.0.0",

                AML:
                    "11.0.0",

                KYC:
                    "11.0.0",

                TRANSACTION_MONITORING:
                    "11.0.0"

            }

        }

    };

    /* ======================================================================
       VERSION VALIDATION
    ====================================================================== */

    const VERSION_PATTERN =
        /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

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

    function validateVersion(
        value,
        path
    ) {

        if (
            typeof value !== "string" ||
            !VERSION_PATTERN.test(value)
        ) {

            throw new Error(
                `[PAY54] Invalid semantic version "${String(value)}" at ${path}.`
            );

        }

    }

    function validateNode(
        value,
        path = CATALOGUE_NAME
    ) {

        if (
            typeof value === "string"
        ) {

            validateVersion(
                value,
                path
            );

            return;

        }

        if (
            !isPlainObject(value)
        ) {

            throw new TypeError(
                `[PAY54] Invalid version catalogue node at ${path}.`
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
                    `[PAY54] Unsafe version catalogue property rejected at ${path}.${key}.`
                );

            }

            validateNode(
                child,
                `${path}.${key}`
            );

        }

    }

    /* ======================================================================
       LEGACY COMPATIBILITY VERIFICATION

       This remains the original PAY54 compatibility contract.
       BENEFICIARIES is intentionally verified separately as an additive
       WP-011 domain.
    ====================================================================== */

    function verifyLegacyCompatibility() {

        const expected =
            Object.freeze({

                CORE:
                    "12.0.0",

                CONSTANTS:
                    "12.0.0",

                LEDGER:
                    "8.0.5",

                TRANSACTIONS:
                    "11.0.0",

                SERVICES:
                    "11.0.0",

                RECIPIENTS:
                    "11.0.0",

                CONTACTS:
                    "1.0.0",

                CARDS:
                    "11.0.0",

                WALLET:
                    "11.0.0",

                MERCHANT:
                    "11.0.0",

                SECURITY:
                    "11.0.0",

                SAVINGS:
                    "11.0.0",

                TRADING:
                    "11.0.0",

                INVEST:
                    "11.0.0",

                CHECKOUT:
                    "11.0.0",

                AGENT:
                    "11.0.0",

                RISK:
                    "11.0.0"

            });

        for (
            const [key, version]
            of Object.entries(expected)
        ) {

            if (
                VERSIONS[key] !==
                version
            ) {

                throw new Error(
                    `[PAY54] Version compatibility regression detected for VERSIONS.${key}. Expected "${version}".`
                );

            }

        }

        return true;

    }

    /* ======================================================================
       BENEFICIARY VERSION VERIFICATION
    ====================================================================== */

    function verifyBeneficiaryVersions() {

        if (
            VERSIONS.BENEFICIARIES !==
            "1.0.0"
        ) {

            throw new Error(
                "[PAY54] VERSIONS.BENEFICIARIES must be 1.0.0."
            );

        }

        const required =
            Object.freeze([

                VERSIONS.PLATFORM
                    ?.BENEFICIARIES,

                VERSIONS.COMPONENTS
                    ?.CORE
                    ?.BENEFICIARY_CONSTANTS,

                VERSIONS.COMPONENTS
                    ?.BENEFICIARIES
                    ?.CONSTANTS,

                VERSIONS.COMPONENTS
                    ?.BENEFICIARIES
                    ?.STORAGE,

                VERSIONS.COMPONENTS
                    ?.BENEFICIARIES
                    ?.ENGINE,

                VERSIONS.COMPONENTS
                    ?.BENEFICIARIES
                    ?.SERVICE,

                VERSIONS.COMPONENTS
                    ?.BENEFICIARIES
                    ?.MIGRATION,

                VERSIONS.COMPONENTS
                    ?.BENEFICIARIES
                    ?.LEGACY_FACADE,

                VERSIONS.DOMAIN
                    ?.BENEFICIARIES
                    ?.ROOT,

                VERSIONS.DOMAIN
                    ?.BENEFICIARIES
                    ?.STORAGE,

                VERSIONS.DOMAIN
                    ?.BENEFICIARIES
                    ?.ENGINE,

                VERSIONS.DOMAIN
                    ?.BENEFICIARIES
                    ?.SERVICE

            ]);

        for (
            const version
            of required
        ) {

            if (
                version !==
                "1.0.0"
            ) {

                throw new Error(
                    "[PAY54] Beneficiary component version catalogue is incomplete or inconsistent."
                );

            }

        }

        return true;

    }
    /* ======================================================================
       FUNDING VERSION VERIFICATION
    ====================================================================== */

    function verifyFundingVersions() {

        if (
            VERSIONS.FUNDING !==
            "1.0.0"
        ) {

            throw new Error(
                "[PAY54] VERSIONS.FUNDING must be 1.0.0."
            );

        }

        const required =
            Object.freeze([

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
                    ?.CONSTANTS,

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

            ]);

        for (
            const version
            of required
        ) {

            if (
                version !==
                "1.0.0"
            ) {

                throw new Error(
                    "[PAY54] Funding component version catalogue is incomplete or inconsistent."
                );

            }

        }

        return true;

    }
    /* ======================================================================
       CROSS-CATALOGUE VERIFICATION
    ====================================================================== */

    function verifyModuleCatalogue() {

        /*
         * Only identifiers with canonical top-level version entries belong
         * in this verification set.
         */

        const required =
            Object.freeze([

                "CONSTANTS",
                "LEDGER",
                "TRANSACTIONS",
                "SERVICES",
                "RECIPIENTS",
                "CONTACTS",
                "BENEFICIARIES",
                "FUNDING",
                "CARDS",
                "WALLET",
                "MERCHANT",
                "SECURITY",
                "SAVINGS",
                "TRADING",
                "INVEST",
                "CHECKOUT",
                "AGENT",
                "RISK"

            ]);

        for (
            const key
            of required
        ) {

            if (
                typeof MODULES[key] !== "string" ||
                !MODULES[key]
            ) {

                throw new Error(
                    `[PAY54] Required MODULES.${key} identifier is unavailable.`
                );

            }

            if (
                typeof VERSIONS[key] !== "string" ||
                !VERSIONS[key]
            ) {

                throw new Error(
                    `[PAY54] Required VERSIONS.${key} entry is unavailable.`
                );

            }

        }

        if (
            MODULES.VERSIONS !==
            "VERSIONS"
        ) {

            throw new Error(
                "[PAY54] MODULES.VERSIONS compatibility verification failed."
            );

        }

               if (
            MODULES.BENEFICIARIES !==
            "BENEFICIARIES"
        ) {

            throw new Error(
                "[PAY54] MODULES.BENEFICIARIES compatibility verification failed."
            );

        }

        if (
            MODULES.FUNDING !==
            "FUNDING"
        ) {

            throw new Error(
                "[PAY54] MODULES.FUNDING compatibility verification failed."
            );

        }

        return true;

    }

    /* ======================================================================
       REGISTRATION
    ====================================================================== */

    try {

        validateNode(
            VERSIONS
        );

        verifyLegacyCompatibility();

        verifyBeneficiaryVersions();

        verifyFundingVersions();

        verifyModuleCatalogue();

        constants.register(
            MODULES.VERSIONS,
            VERSIONS
        );

        const registered =
            constants.get(
                MODULES.VERSIONS
            );

        if (
            !registered
        ) {

            throw new Error(
                "[PAY54] Failed to register Version Catalogue."
            );

        }

        if (
                       registered.CORE !== "12.0.0" ||
            registered.CONTACTS !== "1.0.0" ||
            registered.BENEFICIARIES !== "1.0.0" ||
            registered.FUNDING !== "1.0.0" ||
            registered.DOMAIN
                ?.CONTACTS
                ?.STORAGE !== "1.0.0" ||
                        registered.DOMAIN
                ?.BENEFICIARIES
                ?.STORAGE !== "1.0.0" ||
            registered.DOMAIN
                ?.FUNDING
                ?.ROOT !== "1.0.0" ||
            registered.DOMAIN
                ?.FUNDING
                ?.ENGINE !== "1.0.0" ||
            registered.DOMAIN
                ?.FUNDING
                ?.SERVICE !== "1.0.0" ||
            registered.DOMAIN
                ?.FUNDING
                ?.REGISTRY !== "1.0.0" ||
            registered.DOMAIN
                ?.FUNDING
                ?.WALLET_ADAPTER !== "1.0.0" ||
            registered.DOMAIN
                ?.FUNDING
                ?.LINKED_CARD_ADAPTER !== "1.0.0"
        ) {

            throw new Error(
                "[PAY54] Version Catalogue post-registration verification failed."
            );

        }

    } catch (error) {

        console.error(
            "[PAY54] Version Catalogue bootstrap failed:",
            error
        );

        throw error;

    }

    /* ======================================================================
       STARTUP
    ====================================================================== */

    console.info(
        "✅ PAY54 Version Catalogue",
        VERSION,
        "loaded."
    );

})();
