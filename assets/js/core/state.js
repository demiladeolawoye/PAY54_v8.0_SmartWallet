"use strict";

/* ==========================================================
   PAY54 Enterprise Runtime State Engine
   Version 11.0.0
========================================================== */

(function (global) {

    if (!global) {
        throw new Error("PAY54 global context missing.");
    }

    global.PAY54 = global.PAY54 || {};

    if (global.PAY54.State?.__initialized) {
        console.warn("[PAY54] State Engine already initialized.");
        return;
    }

    const VERSION = "11.0.0";

    const subscribers = new Set();

    const initialState = Object.freeze({

        app: {

            initialized: false,

            booting: false,

            healthy: true,

            version: VERSION

        },

        currency: {

            active: "NGN"

        },

        session: {

            authenticated: false,

            locked: false,

            timeout: null

        },

        user: {

            id: null,

            name: "",

            email: ""

        },

        ui: {

            theme: "light",

            busy: false,

            loading: false

        },

        wallets: {},

        features: {}

    });

    let state = structuredClone(initialState);

    function clone(obj) {

        return structuredClone(obj);

    }

    function notify(path, value) {

        subscribers.forEach(fn => {

            try {

                fn(path, value, clone(state));

            }

            catch (err) {

                console.error(err);

            }

        });

    }

    function get(path) {

        if (!path) {

            return clone(state);

        }

        return path

            .split(".")

            .reduce(

                (obj, key) => obj?.[key],

                state

            );

    }

    function set(path, value) {

        const keys = path.split(".");

        let ref = state;

        while (keys.length > 1) {

            const key = keys.shift();

            if (!ref[key]) {

                ref[key] = {};

            }

            ref = ref[key];

        }

        ref[keys[0]] = value;

        notify(path, value);

    }

    function patch(section, values) {

        if (!state[section]) {

            state[section] = {};

        }

        Object.assign(

            state[section],

            values

        );

        notify(section, values);

    }

    function reset() {

        state = clone(initialState);

        notify("*", state);

    }

    function snapshot() {

        return clone(state);

    }

    function restore(snapshot) {

        state = clone(snapshot);

        notify("*", state);

    }

    function subscribe(fn) {

        subscribers.add(fn);

        return fn;

    }

    function unsubscribe(fn) {

        subscribers.delete(fn);

    }

    global.PAY54.State = {

        __initialized: true,

        version() {

            return VERSION;

        },

        init() {

            state.app.initialized = true;

        },

        get,

        set,

        patch,

        reset,

        snapshot,

        restore,

        subscribe,

        unsubscribe,

        health() {

            return {

                healthy: true,

                subscribers: subscribers.size,

                version: VERSION

            };

        }

    };

})(window);
