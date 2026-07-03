"use strict";

/* ============================================================
   PAY54 Enterprise Error Manager
   ------------------------------------------------------------
   Version : 11.0.0
   Build   : Enterprise
   Stage   : 7.8
============================================================ */

(function (global) {

    if (!global) {
        throw new Error("PAY54 requires Window context.");
    }

    global.PAY54 = global.PAY54 || {};

    if (
        global.PAY54.Errors &&
        global.PAY54.Errors.__initialized === true
    ) {
        console.warn("[PAY54] Error Manager already initialized.");
        return;
    }

    const VERSION = "11.0.0";
    const BUILD = "Enterprise";

    const SESSION =
        global.PAY54.Logger?.session?.() ||
        ("P54ERR-" + Date.now());

    const errors = [];

    const stats = {

        total:0,

        fatal:0,

        warning:0,

        info:0,

        runtime:0,

        promise:0,

        validation:0,

        api:0

    };

    let listening = false;

    function now(){

        return new Date().toISOString();

    }

    function browser(){

        return navigator.userAgent;

    }

    function platform(){

        return navigator.platform;

    }

    function record(
        severity,
        category,
        message,
        data
    ){

        const entry = {

            id:errors.length+1,

            timestamp:now(),

            severity,

            category,

            module:data?.module || null,

            message,

            stack:data?.stack || null,

            session:SESSION,

            browser:browser(),

            platform:platform(),

            data:data || null

        };

        errors.push(entry);

        stats.total++;

        if(stats[severity]!==undefined){

            stats[severity]++;

        }

        if(stats[category]!==undefined){

            stats[category]++;

        }

        if(global.PAY54.Logger?.error){

            global.PAY54.Logger.error(
                message,
                entry
            );

        }

        return entry;

    }

    function runtimeHandler(
        message,
        source,
        line,
        column,
        error
    ){

        record(

            "fatal",

            "runtime",

            message,

            {

                source,

                line,

                column,

                stack:error?.stack || null

            }

        );

        return false;

    }

    function promiseHandler(event){

        record(

            "fatal",

            "promise",

            event.reason?.message ||
            "Unhandled Promise Rejection",

            {

                stack:
                event.reason?.stack || null,

                reason:event.reason

            }

        );

    }

    const Errors={

        __initialized:true,

        version(){

            return VERSION;

        },

        build(){

            return BUILD;

        },

        raise(
            message,
            data={}
        ){

            return record(

                "fatal",

                "runtime",

                message,

                data

            );

        },

        capture(
            message,
            data={}
        ){

            return record(

                "fatal",

                "runtime",

                message,

                data

            );

        },

        warning(
            message,
            data={}
        ){

            return record(

                "warning",

                "warning",

                message,

                data

            );

        },

        info(
            message,
            data={}
        ){

            return record(

                "info",

                "info",

                message,

                data

            );

        },

        history(){

            return [...errors];

        },

        last(){

            if(errors.length===0){

                return null;

            }

            return errors[
                errors.length-1
            ];

        },

        statistics(){

            return{

                ...stats,

                entries:errors.length

            };

        },

        clear(){

            errors.length=0;

            Object.keys(stats).forEach(

                k=>stats[k]=0

            );

            return true;

        },

        export(){

            return JSON.stringify(

                errors,

                null,

                2

            );

        },

        health(){

            return{

                healthy:true,

                initialized:true,

                listening,

                version:VERSION,

                build:BUILD,

                totalErrors:
                errors.length

            };

        },

        listen(){

            if(listening){

                return true;

            }

            window.onerror =
                runtimeHandler;

            window.onunhandledrejection =
                promiseHandler;

            listening=true;

            return true;

        },

        stop(){

            window.onerror=null;

            window.onunhandledrejection=null;

            listening=false;

            return true;

        }

    };

    Errors.listen();

    Object.freeze(Errors);

    global.PAY54.Errors = Errors;

    console.log(

        "%cPAY54 Error Manager Ready",

        "color:#b91c1c;font-weight:bold"

    );

})(window);
