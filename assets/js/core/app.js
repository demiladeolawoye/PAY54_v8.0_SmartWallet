"use strict";

/* ==========================================================
   PAY54 Enterprise Application Core
   Version : 11.0.0
   ========================================================== */

(function (global) {

    if (!global) {
        throw new Error("PAY54 requires window.");
    }

    global.PAY54 = global.PAY54 || {};

    if (global.PAY54.App?.initialized) {
        console.warn("PAY54 App already initialized.");
        return;
    }

    const started = performance.now();

    const modules = new Map();

    const services = new Map();

    const App = {

        version: "11.0.0",

        initialized: false,

        startedAt: null,

        initialize,

        registerModule,

        getModule,

        hasModule,

        modules,

        registerService,

        getService,

        services,

        health,

        versionInfo,

        shutdown

    };

    function initialize() {

        if (App.initialized) {
            return;
        }

        console.group("🚀 PAY54 Enterprise App");

        App.startedAt = new Date().toISOString();

        App.initialized = true;

        console.log("Enterprise Application Ready");

        console.groupEnd();

    }

    function registerModule(name, instance) {

        if (!name) {

            throw new Error("Module name required.");

        }

        modules.set(name, instance);

        return instance;

    }

    function getModule(name) {

        return modules.get(name);

    }

    function hasModule(name) {

        return modules.has(name);

    }

    function registerService(name, service) {

        services.set(name, service);

        return service;

    }

    function getService(name) {

        return services.get(name);

    }

    function health() {

        return {

            healthy: true,

            version: App.version,

            initialized: App.initialized,

            modules: modules.size,

            services: services.size,

            uptime: Math.round(

                performance.now() - started

            )

        };

    }

    function versionInfo() {

        return {

            name: "PAY54 Enterprise",

            version: App.version,

            build: "Enterprise",

            release: "11.0.0"

        };

    }

    function shutdown() {

        modules.clear();

        services.clear();

        App.initialized = false;

        console.warn("PAY54 Enterprise stopped.");

    }

    global.PAY54.App = App;

    document.addEventListener(

        "DOMContentLoaded",

        () => {

            App.initialize();

        }

    );

})(window);
