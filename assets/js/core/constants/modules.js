"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE MODULE IDENTIFIERS
   File: assets/js/core/constants/modules.js
   Version: v12.0.0

   Purpose
   -------
   Canonical module identifier catalogue for the PAY54 Enterprise Platform.

   Responsibilities
   ----------------
   • Preserve all existing PAY54 public module identifiers
   • Eliminate duplicated module-name strings
   • Provide stable identifiers for registry integration
   • Support diagnostics, telemetry and Event Bus source identification
   • Introduce non-breaking enterprise submodule identifiers
   • Provide canonical Contacts component identifiers
   • Support progressive PAY54 modularisation
   • Maintain zero-regression compatibility

   Dependency
   ----------
   assets/js/core/constants/index.js

   Compatibility
   -------------
   Existing identifiers are intentionally preserved, including:

   MODULES.CONFIG
   MODULES.EVENTS
   MODULES.STATE
   MODULES.ROUTER
   MODULES.REGISTRY
   MODULES.BOOTSTRAP
   MODULES.CONSTANTS
   MODULES.VERSIONS
   MODULES.LEDGER
   MODULES.TRANSACTIONS
   MODULES.RECEIPTS
   MODULES.SERVICES
   MODULES.RECIPIENTS
   MODULES.CONTACTS
   MODULES.CARDS
   MODULES.WALLET
   MODULES.MERCHANT
   MODULES.SECURITY
   MODULES.SAVINGS
   MODULES.TRADING
   MODULES.CHECKOUT
   MODULES.INVEST
   MODULES.AGENT
   MODULES.RISK
   MODULES.DASHBOARD
   MODULES.MODALS
   MODULES.UI_ENGINE

   Enterprise extensions are exposed under:

   MODULES.DOMAIN
   MODULES.COMPONENTS
   MODULES.LAYERS

   Architecture
   ------------
   Core
      ↓
   Constants Registry
      ↓
   Module Identifiers
      ↓
   Infrastructure / Services / Engines / Modules / UI

========================================================================== */

(() => {

    "use strict";

    /* ======================================================================
       GLOBAL
    ====================================================================== */

    const GLOBAL = window;

    const CATALOGUE_NAME = "MODULES";

    const VERSION = "12.0.0";

    const ENGINE =
        "PAY54 Module Identifiers";

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
            "[PAY54] Constants Registry must load before modules.js."
        );
    }

    /* ======================================================================
       CANONICAL MODULE IDENTIFIERS

       IMPORTANT
       ---------
       The top-level identifiers below are the established PAY54 public API.

       Their names and values MUST remain stable because existing modules may
       already use expressions such as:

           MODULES.CONTACTS
           MODULES.VERSIONS
           MODULES.LEDGER
           MODULES.CARDS

       Enterprise expansion therefore occurs through additional namespaces
       rather than changing existing string identifiers into objects.
    ====================================================================== */

    const MODULES = {

        /* ==================================================================
           EXISTING CORE IDENTIFIERS
        ================================================================== */

        CONFIG:
            "CONFIG",

        EVENTS:
            "EVENTS",

        STATE:
            "STATE",

        ROUTER:
            "ROUTER",

        REGISTRY:
            "REGISTRY",

        BOOTSTRAP:
            "BOOTSTRAP",

        CONSTANTS:
            "CONSTANTS",

        VERSIONS:
            "VERSIONS",

        /* ==================================================================
           EXISTING FOUNDATION IDENTIFIERS
        ================================================================== */

        LEDGER:
            "LEDGER",

        TRANSACTIONS:
            "TRANSACTIONS",

        RECEIPTS:
            "RECEIPTS",

        SERVICES:
            "SERVICES",

        RECIPIENTS:
            "RECIPIENTS",

        CONTACTS:
            "CONTACTS",

        /* ==================================================================
           EXISTING ENGINE IDENTIFIERS
        ================================================================== */

        CARDS:
            "CARDS",

        WALLET:
            "WALLET",

        MERCHANT:
            "MERCHANT",

        SECURITY:
            "SECURITY",

        SAVINGS:
            "SAVINGS",

        TRADING:
            "TRADING",

        CHECKOUT:
            "CHECKOUT",

        INVEST:
            "INVEST",

        AGENT:
            "AGENT",

        RISK:
            "RISK",

        /* ==================================================================
           EXISTING UI IDENTIFIERS
        ================================================================== */

        DASHBOARD:
            "DASHBOARD",

        MODALS:
            "MODALS",

        UI_ENGINE:
            "UI_ENGINE",

        /* ==================================================================
           ENTERPRISE ARCHITECTURE LAYERS

           These identifiers describe architectural ownership. They do not
           replace the existing public identifiers above.
        ================================================================== */

        LAYERS: {

            CORE:
                "layer.core",

            INFRASTRUCTURE:
                "layer.infrastructure",

            SERVICES:
                "layer.services",

            ENGINES:
                "layer.engines",

            MODULES:
                "layer.modules",

            UI:
                "layer.ui",

            DASHBOARD:
                "layer.dashboard",

            MOBILE:
                "layer.mobile",

            PRODUCTION:
                "layer.production"

        },

        /* ==================================================================
           ENTERPRISE COMPONENT IDENTIFIERS

           Used for modules that need independently diagnosable identities
           without modifying legacy top-level identifiers.
        ================================================================== */

        COMPONENTS: {

            /* --------------------------------------------------------------
               CORE
            -------------------------------------------------------------- */

            CORE: {

                CONSTANTS_REGISTRY:
                    "core.constants.registry",

                MODULE_CONSTANTS:
                    "core.constants.modules",

                VERSION_CONSTANTS:
                    "core.constants.versions",

                CONTACT_CONSTANTS:
                    "core.constants.contacts",

                CONFIG:
                    "core.config",

                EVENTS:
                    "core.events",

                STATE:
                    "core.state",

                ROUTER:
                    "core.router",

                REGISTRY:
                    "core.registry",

                BOOTSTRAP:
                    "core.bootstrap",

                APP:
                    "core.app",

                DIAGNOSTICS:
                    "core.diagnostics",

                LOGGER:
                    "core.logger",

                ERRORS:
                    "core.errors",

                HEALTH:
                    "core.health"

            },

            /* --------------------------------------------------------------
               SECURITY
            -------------------------------------------------------------- */

            SECURITY: {

                ROOT:
                    "security",

                INDEX:
                    "security.index",

                SECURE_STORAGE:
                    "security.secure-storage",

                SESSION_MANAGER:
                    "security.session-manager",

                TRANSACTION_GUARD:
                    "security.transaction-guard",

                VALIDATOR:
                    "security.validator",

                SANITIZER:
                    "security.sanitizer",

                XSS:
                    "security.xss"

            },

            /* --------------------------------------------------------------
               INFRASTRUCTURE
            -------------------------------------------------------------- */

            INFRASTRUCTURE: {

                ROOT:
                    "infrastructure",

                STORAGE:
                    "infrastructure.storage",

                NETWORK:
                    "infrastructure.network",

                CACHE:
                    "infrastructure.cache",

                TELEMETRY:
                    "infrastructure.telemetry"

            },

            /* --------------------------------------------------------------
               MONEY FOUNDATION
            -------------------------------------------------------------- */

            MONEY: {

                LEDGER:
                    "money.ledger",

                TRANSACTIONS:
                    "money.transactions",

                RECEIPTS:
                    "money.receipts",

                FX:
                    "money.fx"

            },

            /* --------------------------------------------------------------
               SERVICES
            -------------------------------------------------------------- */

            SERVICES: {

                CATALOGUE:
                    "services.catalogue",

                PAYMENTS:
                    "services.payments",

                TRANSFERS:
                    "services.transfers",

                CONTACTS:
                    "services.contacts",

                CARDS:
                    "services.cards",

                FX:
                    "services.fx"

            },

            /* --------------------------------------------------------------
               ENGINES
            -------------------------------------------------------------- */

            ENGINES: {

                LEDGER:
                    "engine.ledger",

                TRANSACTIONS:
                    "engine.transactions",

                RECEIPTS:
                    "engine.receipts",

                MODALS:
                    "engine.modals",

                UI:
                    "engine.ui",

                WALLET:
                    "engine.wallet",

                CARDS:
                    "engine.cards",

                CONTACTS:
                    "engine.contacts"

            },

            /* --------------------------------------------------------------
               UI
            -------------------------------------------------------------- */

            UI: {

                RECIPIENT:
                    "ui.recipient",

                CONTACTS:
                    "ui.contacts",

                CARDS:
                    "ui.cards",

                MERCHANT_QR:
                    "ui.merchant-qr",

                NAVIGATION:
                    "ui.navigation"
            },

            /* --------------------------------------------------------------
               DASHBOARD
            -------------------------------------------------------------- */

            DASHBOARD: {

                CORE:
                    "dashboard.core",

                SHELL:
                    "dashboard.shell",

                SERVICES:
                    "dashboard.services",

                ACTIVITY:
                    "dashboard.activity"
            },

            /* --------------------------------------------------------------
               MOBILE
            -------------------------------------------------------------- */

            MOBILE: {

                APP:
                    "mobile.app",

                ANDROID:
                    "mobile.android",

                IOS:
                    "mobile.ios"
            }

        },

        /* ==================================================================
           DOMAIN IDENTIFIERS

           DOMAIN contains fine-grained domain ownership.

           This namespace is intentionally additive and does not alter the
           legacy MODULES.CONTACTS / MODULES.CARDS / MODULES.WALLET APIs.
        ================================================================== */

        DOMAIN: {

            /* --------------------------------------------------------------
               CONTACTS
            -------------------------------------------------------------- */

            CONTACTS: {

                ROOT:
                    "contacts",

                ENGINE:
                    "contacts.engine",

                CORE:
                    "contacts.core",

                STORAGE:
                    "contacts-storage",

                REPOSITORY:
                    "contacts.repository",

                SERVICE:
                    "contacts.service",

                VALIDATOR:
                    "contacts.validator",

                NORMALIZER:
                    "contacts.normalizer",

                SEARCH:
                    "contacts.search",

                EVENTS:
                    "contacts.events",

                UI:
                    "contacts.ui",

                PICKER:
                    "contacts.picker",

                IMPORT:
                    "contacts.import",

                EXPORT:
                    "contacts.export",

                SYNC:
                    "contacts.sync",

                GROUPS:
                    "contacts.groups",

                BENEFICIARIES:
                    "contacts.beneficiaries",

                RECENTS:
                    "contacts.recents",

                SETTINGS:
                    "contacts.settings"

            },

            /* --------------------------------------------------------------
               WALLET
            -------------------------------------------------------------- */

            WALLET: {

                ROOT:
                    "wallet",

                ENGINE:
                    "wallet.engine",

                BALANCES:
                    "wallet.balances",

                TRANSFERS:
                    "wallet.transfers",

                FUNDING:
                    "wallet.funding"
            },

            /* --------------------------------------------------------------
               CARDS
            -------------------------------------------------------------- */

            CARDS: {

                ROOT:
                    "cards",

                ENGINE:
                    "cards.engine",

                UI:
                    "cards.ui",

                VIRTUAL:
                    "cards.virtual",

                LINKED:
                    "cards.linked"
            },

            /* --------------------------------------------------------------
               PAYMENTS
            -------------------------------------------------------------- */

            PAYMENTS: {

                ROOT:
                    "payments",

                SEND:
                    "payments.send",

                RECEIVE:
                    "payments.receive",

                REQUEST:
                    "payments.request",

                SCAN_PAY:
                    "payments.scan-pay",

                BANK_TRANSFER:
                    "payments.bank-transfer",

                MERCHANT_QR:
                    "payments.merchant-qr"
            },

            /* --------------------------------------------------------------
               MONEY MANAGEMENT
            -------------------------------------------------------------- */

            MONEY: {

                ROOT:
                    "money",

                FX:
                    "money.fx",

                BILLS:
                    "money.bills",

                SAVINGS:
                    "money.savings",

                VAULTS:
                    "money.vaults",

                INVEST:
                    "money.invest"
            },

            /* --------------------------------------------------------------
               COMMERCE
            -------------------------------------------------------------- */

            COMMERCE: {

                ROOT:
                    "commerce",

                CHECKOUT:
                    "commerce.checkout",

                MARKETPLACE:
                    "commerce.marketplace",

                MERCHANT:
                    "commerce.merchant"
            },

            /* --------------------------------------------------------------
               RISK / COMPLIANCE
            -------------------------------------------------------------- */

            RISK: {

                ROOT:
                    "risk",

                SHIELD:
                    "risk.shield",

                FRAUD:
                    "risk.fraud",

                AML:
                    "risk.aml",

                KYC:
                    "risk.kyc",

                TRANSACTION_MONITORING:
                    "risk.transaction-monitoring"
            }

        }

    };

    /* ======================================================================
       VALIDATION
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

    function validateNode(
        value,
        path = CATALOGUE_NAME
    ) {

        if (
            typeof value === "string"
        ) {

            if (!value.trim()) {
                throw new Error(
                    `[PAY54] Empty module identifier detected at ${path}.`
                );
            }

            return;
        }

        if (!isPlainObject(value)) {
            throw new TypeError(
                `[PAY54] Invalid module catalogue node at ${path}.`
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
                    `[PAY54] Unsafe module catalogue property rejected at ${path}.${key}.`
                );
            }

            validateNode(
                child,
                `${path}.${key}`
            );
        }
    }

    function validateLegacyCompatibility() {

        const requiredLegacyIdentifiers =
            Object.freeze({

                CONFIG:
                    "CONFIG",

                EVENTS:
                    "EVENTS",

                STATE:
                    "STATE",

                ROUTER:
                    "ROUTER",

                REGISTRY:
                    "REGISTRY",

                BOOTSTRAP:
                    "BOOTSTRAP",

                CONSTANTS:
                    "CONSTANTS",

                VERSIONS:
                    "VERSIONS",

                LEDGER:
                    "LEDGER",

                TRANSACTIONS:
                    "TRANSACTIONS",

                RECEIPTS:
                    "RECEIPTS",

                SERVICES:
                    "SERVICES",

                RECIPIENTS:
                    "RECIPIENTS",

                CONTACTS:
                    "CONTACTS",

                CARDS:
                    "CARDS",

                WALLET:
                    "WALLET",

                MERCHANT:
                    "MERCHANT",

                SECURITY:
                    "SECURITY",

                SAVINGS:
                    "SAVINGS",

                TRADING:
                    "TRADING",

                CHECKOUT:
                    "CHECKOUT",

                INVEST:
                    "INVEST",

                AGENT:
                    "AGENT",

                RISK:
                    "RISK",

                DASHBOARD:
                    "DASHBOARD",

                MODALS:
                    "MODALS",

                UI_ENGINE:
                    "UI_ENGINE"

            });

        for (
            const [key, expected]
            of Object.entries(
                requiredLegacyIdentifiers
            )
        ) {

            if (
                MODULES[key] !== expected
            ) {
                throw new Error(
                    `[PAY54] Legacy module identifier regression detected for MODULES.${key}. Expected "${expected}".`
                );
            }
        }

        return true;
    }

    function validateCatalogue() {

        validateNode(
            MODULES
        );

        validateLegacyCompatibility();

        return true;
    }

    /* ======================================================================
       REGISTRATION
    ====================================================================== */

    try {

        validateCatalogue();

        /*
         * The enterprise constants registry performs deep cloning,
         * immutability enforcement and incompatible duplicate detection.
         */

        constants.register(
            CATALOGUE_NAME,
            MODULES
        );

        const registered =
            constants.get(
                CATALOGUE_NAME
            );

        if (!registered) {
            throw new Error(
                "[PAY54] Failed to register MODULES catalogue."
            );
        }

        /*
         * Explicitly verify the identifiers required by the existing PAY54
         * constants dependency chain.
         */

        if (
            registered.VERSIONS !== "VERSIONS" ||
            registered.CONTACTS !== "CONTACTS"
        ) {
            throw new Error(
                "[PAY54] MODULES catalogue compatibility verification failed."
            );
        }

    } catch (error) {

        console.error(
            "[PAY54] Module catalogue bootstrap failed:",
            error
        );

        throw error;
    }

    /* ======================================================================
       STARTUP
    ====================================================================== */

    console.info(
        "✅ PAY54 Module Identifiers",
        VERSION,
        "loaded."
    );

})();
