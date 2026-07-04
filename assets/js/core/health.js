"use strict";

/* ============================================================
   PAY54 Enterprise Health Manager
   ------------------------------------------------------------
   Version : 11.0.0
   Build   : Enterprise
   Stage   : 7.9
============================================================ */

(function (global) {

    if (!global) {

        throw new Error(
            "PAY54 requires Window."
        );

    }

    global.PAY54 =
        global.PAY54 || {};

    if (
        global.PAY54.Health &&
        global.PAY54.Health.__initialized
    ) {

        return;

    }

    const VERSION = "11.0.0";

    const BUILD = "Enterprise";

    const START =
        performance.now();

    function exists(name){

        return !!global.PAY54[name];

    }

    function online(){

        return navigator.onLine;

    }

    function memory(){

        if(
            performance &&
            performance.memory
        ){

            return {

                used:
                performance.memory.usedJSHeapSize,

                total:
                performance.memory.totalJSHeapSize,

                limit:
                performance.memory.jsHeapSizeLimit

            };

        }

        return null;

    }

    function modules(){

        return{

            Registry:
            exists("Registry"),

            Logger:
            exists("Logger"),

            Errors:
            exists("Errors"),

            Diagnostics:
            exists("Diagnostics"),

            Router:
            exists("Router"),

            Bootstrap:
            exists("Bootstrap"),

            App:
            exists("App")

        };

    }

    function services(){

        return{

            Ledger:
            !!global.PAY54_LEDGER,

            UI:
            !!global.PAY54_UI,

            MerchantQR:
            !!global.PAY54_MERCHANT_QR,

            Transactions:
            !!global.PAY54_TRANSACTIONS,

            Services:
            !!global.PAY54_SERVICES,

            Cards:
            !!global.PAY54_CARDS

        };

    }

    function healthy(){

        const m=
            modules();

        const s=
            services();

        return Object.values(m)
            .every(Boolean)

            &&

            Object.values(s)
            .every(Boolean)

            &&

            online();

    }

    const Health={

        __initialized:true,

        version(){

            return VERSION;

        },

        build(){

            return BUILD;

        },

        uptime(){

            return Math.round(

                performance.now()-START

            );

        },

        online(){

            return online();

        },

        memory(){

            return memory();

        },

        modules(){

            return modules();

        },

        services(){

            return services();

        },

        healthy(){

            return healthy();

        },

        report(){

            return{

                version:
                VERSION,

                build:
                BUILD,

                uptime:
                this.uptime(),

                online:
                online(),

                healthy:
                healthy(),

                modules:
                modules(),

                services:
                services(),

                memory:
                memory()

            };

        }

    };

    Object.freeze(
        Health
    );

    global.PAY54.Health=
        Health;

    console.log(

        "%cPAY54 Health Ready",

        "color:#009688;font-weight:bold"

    );

})(window);
