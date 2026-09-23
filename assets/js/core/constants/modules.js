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
   • Provide canonical Beneficiary component identifiers
   • Support progressive PAY54 modularisation
   • Maintain zero-regression compatibility

   Dependency
   ----------
   assets/js/core/constants/index.js

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

    const CATALOGUE_NAME =
        "MODULES";

    const VERSION =
        "12.0.0";

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

       Existing top-level identifiers are compatibility contracts.
       Enterprise additions are additive.
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
           FOUNDATION IDENTIFIERS
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
        BENEFICIARIES:
            "BENEFICIARIES",

        FUNDING:
            "FUNDING",

        /* ==================================================================
           ENGINE IDENTIFIERS
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
           UI IDENTIFIERS
        ================================================================== */

        DASHBOARD:
            "DASHBOARD",

        MODALS:
            "MODALS",

        UI_ENGINE:
            "UI_ENGINE",

        /* ==================================================================
           ARCHITECTURE LAYERS
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
        ================================================================== */

        COMPONENTS: {

            CORE: {

                CONSTANTS_REGISTRY:
                    "core.constants.registry",

                MODULE_CONSTANTS:
                    "core.constants.modules",

                VERSION_CONSTANTS:
                    "core.constants.versions",

                CONTACT_CONSTANTS:
                    "core.constants.contacts",
                BENEFICIARY_CONSTANTS:
                    "core.constants.beneficiaries",

                FUNDING_CONSTANTS:
                    "core.constants.funding",

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

            SERVICES: {

                CATALOGUE:
                    "services.catalogue",

                PAYMENTS:
                    "services.payments",

                TRANSFERS:
                    "services.transfers",

                CONTACTS:
                    "services.contacts",

                BENEFICIARIES:
                    "services.beneficiaries",

                CARDS:
                    "services.cards",

                FX:
                    "services.fx"

            },

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
                    "engine.contacts",

                BENEFICIARIES:
                    "engine.beneficiaries"

            },

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
        ================================================================== */

        DOMAIN: {

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
               ENTERPRISE BENEFICIARY DOMAIN
            -------------------------------------------------------------- */

            BENEFICIARIES: {

                ROOT:
                    "beneficiaries",

                ENGINE:
                    "beneficiaries.engine",

                CORE:
                    "beneficiaries.core",

                STORAGE:
                    "beneficiaries-storage",

                REPOSITORY:
                    "beneficiaries.repository",

                SERVICE:
                    "beneficiaries.service",

                VALIDATOR:
                    "beneficiaries.validator",

                NORMALIZER:
                    "beneficiaries.normalizer",

                EVENTS:
                    "beneficiaries.events",

                MIGRATION:
                    "beneficiaries.migration",

                LEGACY_FACADE:
                    "beneficiaries.legacy-facade"

            },

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

    /* ======================================================================
       LEGACY COMPATIBILITY VERIFICATION

       BENEFICIARIES is deliberately NOT placed in this legacy set because
       it is a new additive WP-011 identifier.
    ====================================================================== */

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

    function validateEnterpriseExtensions() {

        if (
            MODULES.BENEFICIARIES !==
            "BENEFICIARIES"
        ) {

            throw new Error(
                "[PAY54] Beneficiary module identifier verification failed."
            );

        }

        const requiredBeneficiaryIdentifiers = [

            MODULES.COMPONENTS?.CORE
                ?.BENEFICIARY_CONSTANTS,

            MODULES.COMPONENTS?.SERVICES
                ?.BENEFICIARIES,

            MODULES.COMPONENTS?.ENGINES
                ?.BENEFICIARIES,

            MODULES.DOMAIN?.BENEFICIARIES
                ?.ROOT,

            MODULES.DOMAIN?.BENEFICIARIES
                ?.ENGINE,

            MODULES.DOMAIN?.BENEFICIARIES
                ?.CORE,

            MODULES.DOMAIN?.BENEFICIARIES
                ?.STORAGE,

            MODULES.DOMAIN?.BENEFICIARIES
                ?.REPOSITORY,

            MODULES.DOMAIN?.BENEFICIARIES
                ?.SERVICE,

            MODULES.DOMAIN?.BENEFICIARIES
                ?.VALIDATOR,

            MODULES.DOMAIN?.BENEFICIARIES
                ?.NORMALIZER,

            MODULES.DOMAIN?.BENEFICIARIES
                ?.EVENTS,

            MODULES.DOMAIN?.BENEFICIARIES
                ?.MIGRATION,

            MODULES.DOMAIN?.BENEFICIARIES
                ?.LEGACY_FACADE

        ];

        for (
            const identifier
            of requiredBeneficiaryIdentifiers
        ) {

            if (
                typeof identifier !== "string" ||
                !identifier.trim()
            ) {

                throw new Error(
                    "[PAY54] Beneficiary enterprise module identifiers are incomplete."
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

        validateEnterpriseExtensions();

        return true;

    }

    /* ======================================================================
       REGISTRATION
    ====================================================================== */

    try {

        validateCatalogue();

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

        if (
            registered.VERSIONS !== "VERSIONS" ||
            registered.CONTACTS !== "CONTACTS" ||
            registered.BENEFICIARIES !==
                "BENEFICIARIES"
        ) {

            throw new Error(
                "[PAY54] MODULES catalogue compatibility verification failed."
            );

        }

        if (
            registered.DOMAIN
                ?.BENEFICIARIES
                ?.STORAGE !==
                    "beneficiaries-storage" ||
            registered.COMPONENTS
                ?.SERVICES
                ?.BENEFICIARIES !==
                    "services.beneficiaries"
        ) {

            throw new Error(
                "[PAY54] Beneficiary module registration verification failed."
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
