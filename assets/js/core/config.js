"use strict";

/* ==========================================================
   PAY54 Enterprise Configuration
   Version : 11.0.0
   Environment : Development
   ========================================================== */

(() => {

const CONFIG = {

    APP:{

        NAME:"PAY54",

        VERSION:"11.0.0",

        BUILD:"Enterprise",

        RELEASE_DATE:"2026",

        ENVIRONMENT:"development"

    },

    FEATURES:{

        WALLETS:true,

        FX:true,

        GLOBAL_TRANSFER:true,

        MARKETPLACE:true,

        INVEST:true,

        CARDS:true,

        REWARDS:true,

        AGENT_NETWORK:true,

        QR_PAYMENTS:true,

        REQUESTS:true,

        AI_RISK:true,

        NEWS:true

    },

    WALLETS:{

        BASE:"NGN",

        SUPPORTED:[

            "NGN",

            "GBP",

            "USD",

            "EUR",

            "KES",

            "GHS",

            "ZAR"

        ]

    },

    LIMITS:{

        DAILY_TRANSFER:10000000,

        DAILY_WITHDRAWAL:5000000,

        MAX_TRANSACTION:1000000

    },

    SECURITY:{

        PIN_LENGTH:4,

        SESSION_TIMEOUT:900,

        BIOMETRIC:false,

        DEVICE_BINDING:false,

        ENCRYPTION:"AES256"

    },

    API:{

        BASE_URL:"",

        VERSION:"v1",

        TIMEOUT:30000

    },

    UI:{

        THEME:"light",

        MOBILE_BREAKPOINT:980,

        DEFAULT_LANGUAGE:"en"

    }

};

Object.freeze(CONFIG);

window.PAY54_CONFIG = CONFIG;

console.log(

    "✅ PAY54 CONFIG READY",

    CONFIG.APP.VERSION

);

})();
