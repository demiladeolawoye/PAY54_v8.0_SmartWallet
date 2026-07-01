"use strict";

/* ==========================================================
   PAY54 Enterprise Registry
   Version : 11.0.0
   ========================================================== */

(function (global) {

    if (!global) {
        throw new Error("Global context unavailable.");
    }

    global.PAY54 = global.PAY54 || {};

    if (global.PAY54.Registry?.initialized) {

        console.warn(
            "PAY54 Registry already initialized."
        );

        return;

    }

    const registry = new Map();

    const Registry = {

        initialized: true,

        version: "11.0.0",

        register,

        unregister,

        resolve,

        exists,

        keys,

        entries,

        count,

        clear,

        health

    };

    function register(name, instance) {

        if (!name) {

            throw new Error(
                "Registry name required."
            );

        }

        registry.set(name, instance);

        if (global.PAY54.App) {

            global.PAY54.App.registerService(

                name,

                instance

            );

        }

        return instance;

    }

    function unregister(name) {

        registry.delete(name);

    }

    function resolve(name) {

        return registry.get(name);

    }

    function exists(name) {

        return registry.has(name);

    }

    function keys() {

        return Array.from(

            registry.keys()

        );

    }

    function entries() {

        return Array.from(

            registry.entries()

        );

    }

    function count() {

        return registry.size;

    }

    function clear() {

        registry.clear();

    }

    function health() {

        return {

            healthy: true,

            version: Registry.version,

            services: registry.size,

            names: keys()

        };

    }

    global.PAY54.Registry = Registry;

    console.log(

        "✅ PAY54 Registry Ready"

    );

})(window);
