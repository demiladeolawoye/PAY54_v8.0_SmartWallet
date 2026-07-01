"use strict";

/*
==========================================================
PAY54 Enterprise Bootstrap Engine
Version : 11.0.0
==========================================================
*/

(function (global) {

    if (!global) {
        throw new Error("Global context unavailable.");
    }

    if (!global.PAY54) {
        global.PAY54 = {};
    }

    if (global.PAY54.Bootstrap?.initialized) {
        console.warn("PAY54 Bootstrap already initialized.");
        return;
    }

    const startedAt = performance.now();

    const Bootstrap = {

        initialized: false,

        version: "11.0.0",

        modules: {},

        diagnostics: {},

        initialize,

        health,

        ready

    };

    function initialize() {

        console.group("🚀 PAY54 Enterprise Bootstrap");

        try {

            loadConfig();

            loadEvents();

            loadState();

            loadRouter();

            loadApplication();

            Bootstrap.initialized = true;

            console.log("✅ Bootstrap completed.");

        }

        catch (error) {

            console.error(

                "Bootstrap failed",

                error

            );

        }

        finally {

            console.groupEnd();

        }

    }

    function loadConfig() {

        Bootstrap.modules.config =

            !!global.PAY54_CONFIG;

        if (!Bootstrap.modules.config)

            throw new Error("Configuration missing.");

    }

    function loadEvents() {

        Bootstrap.modules.events =

            !!global.PAY54.Events;

        if (

            Bootstrap.modules.events &&

            global.PAY54.Events.init

        ) {

            global.PAY54.Events.init();

        }

    }

    function loadState() {

        Bootstrap.modules.state =

            !!global.PAY54.State;

    }

    function loadRouter() {

        Bootstrap.modules.router =

            !!global.PAY54.Router;

    }

    function loadApplication() {

        Bootstrap.modules.app =

            !!global.PAY54.App;

    }

    function ready() {

        return Bootstrap.initialized;

    }

    function health() {

        Bootstrap.diagnostics = {

            version: Bootstrap.version,

            initialized: Bootstrap.initialized,

            uptime:

                Math.round(

                    performance.now() -

                    startedAt

                ),

            modules: Bootstrap.modules

        };

        return Bootstrap.diagnostics;

    }

    global.PAY54.Bootstrap = Bootstrap;

    document.addEventListener(

        "DOMContentLoaded",

        () => {

            Bootstrap.initialize();

        }

    );

})(window);
