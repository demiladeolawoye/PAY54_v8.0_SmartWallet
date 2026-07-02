"use strict";

/*!
 * ============================================================
 * PAY54 Enterprise Runtime Diagnostics
 * Version : 11.0.0
 * ============================================================
 */

(function (global) {

    if (!global.PAY54) {
        global.PAY54 = {};
    }

    const startedAt = Date.now();

    const runtimeErrors = [];

    function addError(error) {

        runtimeErrors.push({

            time: new Date().toISOString(),

            message: error?.message || String(error)

        });

        if (runtimeErrors.length > 100) {

            runtimeErrors.shift();

        }

    }

    window.addEventListener("error", e => {

        addError(e.error || e.message);

    });

    window.addEventListener("unhandledrejection", e => {

        addError(e.reason);

    });

    const Diagnostics = {};

    Diagnostics.version = "11.0.0";

    Diagnostics.build = "Enterprise";

    Diagnostics.init = function () {

        console.log("✅ PAY54 Diagnostics Ready");

        return true;

    };

    Diagnostics.health = function () {

        return {

            healthy: true,

            version: Diagnostics.version,

            build: Diagnostics.build,

            initialized: true,

            uptime: Date.now() - startedAt,

            timestamp: new Date().toISOString()

        };

    };

    Diagnostics.runtime = function () {

        return {

            browser: navigator.userAgent,

            language: navigator.language,

            platform: navigator.platform,

            online: navigator.onLine,

            timezone:
                Intl.DateTimeFormat()
                    .resolvedOptions()
                    .timeZone,

            screen: {

                width: screen.width,

                height: screen.height

            },

            cores:
                navigator.hardwareConcurrency ||

                "Unknown",

            memory:
                performance.memory ||

                "Unavailable"

        };

    };

    Diagnostics.modules = function () {

        return {

            Events: !!PAY54.Events,

            State: !!PAY54.State,

            Router: !!PAY54.Router,

            Registry: !!PAY54.Registry,

            Bootstrap: !!PAY54.Bootstrap,

            App: !!PAY54.App

        };

    };

    Diagnostics.services = function () {

        return {

            Ledger:
                !!window.PAY54_LEDGER,

            UI:
                !!window.PAY54_UI,

            Cards:
                !!window.PAY54_CARDS,

            Services:
                !!window.PAY54_SERVICES,

            MerchantQR:
                !!window.PAY54_MERCHANT_QR,

            Transactions:
                !!window.PAY54_TRANSACTIONS

        };

    };

    Diagnostics.performance = function () {

        return {

            uptime:

                Date.now() -

                startedAt,

            navigation:

                performance
                    .getEntriesByType("navigation"),

            resources:

                performance
                    .getEntriesByType("resource")
                    .length

        };

    };

    Diagnostics.errors = function () {

        return runtimeErrors;

    };

    Diagnostics.clearErrors = function () {

        runtimeErrors.length = 0;

    };

    Diagnostics.summary = function () {

        return {

            version:

                Diagnostics.version,

            healthy: true,

            modules:

                Diagnostics.modules(),

            services:

                Diagnostics.services(),

            errors:

                runtimeErrors.length,

            uptime:

                Date.now() -

                startedAt

        };

    };

    Diagnostics.export = function () {

        return {

            health:

                Diagnostics.health(),

            runtime:

                Diagnostics.runtime(),

            modules:

                Diagnostics.modules(),

            services:

                Diagnostics.services(),

            performance:

                Diagnostics.performance(),

            errors:

                Diagnostics.errors()

        };

    };

    global.PAY54.Diagnostics = Diagnostics;

    Diagnostics.init();

})(window);
