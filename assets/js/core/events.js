/*!
 * ============================================================
 * PAY54 Enterprise Runtime
 * ============================================================
 *
 * File:
 *     assets/js/core/events.js
 *
 * Name:
 *     PAY54 Enterprise Event Bus
 *
 * Version:
 *     11.0.0
 *
 * Build:
 *     Enterprise Core
 *
 * Status:
 *     Development
 *
 * Description:
 *     Enterprise event infrastructure responsible for
 *     communication between runtime services and modules.
 *
 * Responsibilities:
 *     • Event publishing
 *     • Event subscriptions
 *     • One-time listeners
 *     • Listener lifecycle
 *     • Diagnostics
 *     • Runtime health
 *
 * This file MUST NOT contain:
 *
 *     ✗ Business Logic
 *     ✗ DOM Manipulation
 *     ✗ HTML Rendering
 *     ✗ Wallet Logic
 *     ✗ Transaction Logic
 *
 * ============================================================
 */

"use strict";

(function (global) {

    if (!global) {
        throw new Error(
            "PAY54 Runtime requires a global context."
        );
    }

    /*
    ============================================================
    PAY54 Root Namespace
    ============================================================
    */

    if (!global.PAY54) {
        global.PAY54 = {};
    }

    /*
    ============================================================
    Prevent Duplicate Runtime
    ============================================================
    */

    if (
        global.PAY54.Events &&
        global.PAY54.Events.__initialized === true
    ) {
        console.warn(
            "[PAY54] Enterprise Events already initialized."
        );
        return;
    }

    /*
    ============================================================
    Runtime Metadata
    ============================================================
    */

    const META = Object.freeze({

        name: "PAY54 Enterprise Event Bus",

        shortName: "Events",

        version: "11.0.0",

        build: "Enterprise",

        author: "PAY54 Enterprise",

        status: "development"

    });

    /*
    ============================================================
    Runtime State
    ============================================================
    */

    let initialized = false;

    let destroyed = false;

    /*
    ============================================================
    Internal Event Store
    ============================================================
    */

    const listeners = new Map();

    /*
    ============================================================
    Runtime Statistics
    ============================================================
    */

    const statistics = {

        subscriptions: 0,

        publications: 0,

        removals: 0,

        errors: 0

    };

    /*
    ============================================================
    Health
    ============================================================
    */

    const health = {

        status: "healthy",

        lastError: null,

        started: null

    };

    /*
    ============================================================
    Enterprise Runtime Object
    ============================================================
    */

    const Events = {

        __initialized: false,

        meta: META,

        statistics,

        health

    };

    /*
    ============================================================
    Runtime Lifecycle
    ============================================================
    */

    Events.init = function () {

        if (initialized) {
            return true;
        }

        initialized = true;

        destroyed = false;

        Events.__initialized = true;

        health.started = new Date().toISOString();

        health.status = "healthy";

        return true;

    };

    Events.destroy = function () {

        listeners.clear();

        initialized = false;

        destroyed = true;

        Events.__initialized = false;

        health.status = "destroyed";

    };

    Events.isInitialized = function () {

        return initialized;

    };

    Events.isDestroyed = function () {

        return destroyed;

    };

    Events.getVersion = function () {

        return META.version;

    };

    Events.getStatus = function () {

        return health.status;

    };

    global.PAY54.Events = Events;

})(window);
