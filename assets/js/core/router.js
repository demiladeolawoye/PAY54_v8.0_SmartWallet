"use strict";

/* ==========================================================
   PAY54 Enterprise Router
   Version 11.0.0
========================================================== */

(function (global) {

    if (!global) {
        throw new Error("PAY54 global context missing.");
    }

    global.PAY54 = global.PAY54 || {};

    if (global.PAY54.Router?.__initialized) {
        console.warn("[PAY54] Router already initialized.");
        return;
    }

    const VERSION = "11.0.0";

    const routes = new Map();

    function register(name, handler) {

        if (typeof handler !== "function") {
            throw new TypeError(
                "Route handler must be a function."
            );
        }

        routes.set(name, handler);
    }

    function unregister(name) {

        routes.delete(name);

    }

    function exists(name) {

        return routes.has(name);

    }

    function dispatch(name, payload = {}) {

        if (!routes.has(name)) {

            console.warn(
                "[PAY54] Unknown route:",
                name
            );

            return false;

        }

        try {

            return routes
                .get(name)
                .call(null, payload);

        }

        catch (err) {

            console.error(

                "[PAY54 Router]",

                err

            );

            return false;

        }

    }

    function clear() {

        routes.clear();

    }

    global.PAY54.Router = {

        __initialized: true,

        init() {

            return true;

        },

        register,

        unregister,

        dispatch,

        exists,

        clear,

        routes() {

            return [...routes.keys()];

        },

        version() {

            return VERSION;

        },

        health() {

            return {

                healthy: true,

                version: VERSION,

                registeredRoutes: routes.size

            };

        }

    };

})(window);
