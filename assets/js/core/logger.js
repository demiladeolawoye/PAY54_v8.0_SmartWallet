"use strict";

/* ============================================================
   PAY54 Enterprise Logger
   ------------------------------------------------------------
   Version : 11.0.0
   Build   : Enterprise
   Stage   : 7.7
   Part    : 1
============================================================ */

(function (global) {

    if (!global) {
        throw new Error("PAY54 requires Window context.");
    }

    global.PAY54 = global.PAY54 || {};

    if (
        global.PAY54.Logger &&
        global.PAY54.Logger.__initialized === true
    ) {
        console.warn(
            "[PAY54] Logger already initialized."
        );
        return;
    }

    const VERSION = "11.0.0";

    const BUILD = "Enterprise";

    const START_TIME = Date.now();

    const SESSION_ID =
        "P54-" +
        Date.now() +
        "-" +
        Math.random()
        .toString(36)
        .substring(2,10)
        .toUpperCase();

    const logs = [];

    const statistics = {

        info:0,

        warn:0,

        error:0,

        debug:0,

        success:0,

        total:0

    };

    const timers = new Map();

    function now(){

        return new Date().toISOString();

    }

    function browser(){

        return navigator.userAgent;

    }

    function platform(){

        return navigator.platform;

    }

    function runtime(){

        return {

            online:navigator.onLine,

            language:navigator.language,

            timezone:
            Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone

        };

    }

    function write(
        level,
        message,
        data
    ){

        const entry={

            id:logs.length+1,

            timestamp:now(),

            level,

            message,

            data:data||null,

            session:SESSION_ID

        };

        logs.push(entry);

        statistics.total++;

        if(statistics[level]!==undefined){

            statistics[level]++;

        }

        return entry;

    }

    const Logger={

        __initialized:true,

        version(){

            return VERSION;

        },

        build(){

            return BUILD;

        },

        session(){

            return SESSION_ID;

        },

        info(message,data){

            const e=
            write(
                "info",
                message,
                data
            );

            console.info(
                "PAY54",
                e
            );

            return e;

        },

        warn(message,data){

            const e=
            write(
                "warn",
                message,
                data
            );

            console.warn(
                "PAY54",
                e
            );

            return e;

        },

        error(message,data){

            const e=
            write(
                "error",
                message,
                data
            );

            console.error(
                "PAY54",
                e
            );

            return e;

        },

        debug(message,data){

            const e=
            write(
                "debug",
                message,
                data
            );

            console.debug(
                "PAY54",
                e
            );

            return e;

        },

        success(message,data){

            const e=
            write(
                "success",
                message,
                data
            );

            console.log(
                "%cPAY54 SUCCESS",
                "color:green;font-weight:bold",
                e
            );

            return e;

        },

        statistics(){

            return{

                ...statistics,

                uptime:
                Date.now()-START_TIME,

                session:SESSION_ID

            };

        },

        health(){

            return{

                healthy:true,

                version:VERSION,

                build:BUILD,

                initialized:true,

                uptime:
                Date.now()-START_TIME,

                entries:
                logs.length

            };

        },

        runtime(){

            return runtime();

        },

        browser(){

            return browser();

        },

        platform(){

            return platform();

        },

        logs(){

            return [...logs];

        },
history(){

    return [...logs];

},

last(){

    if(logs.length===0){

        return null;

    }

    return logs[logs.length-1];

},
        clear(){

            logs.length=0;

            statistics.info=0;
            statistics.warn=0;
            statistics.error=0;
            statistics.debug=0;
            statistics.success=0;
            statistics.total=0;

        },

        time(name){

            timers.set(
                name,
                performance.now()
            );

        },

        timeEnd(name){

            if(!timers.has(name)){

                return null;

            }

            const ms=

                performance.now()-

                timers.get(name);

            timers.delete(name);

            return ms;

        }

    };

    Object.freeze(Logger);

    global.PAY54.Logger=Logger;

    console.log(

        "%cPAY54 Logger Ready",

        "color:#0a8f3d;font-weight:bold"

    );

})(window); 
