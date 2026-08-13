(() => {

"use strict";

/* ========================================================================
   PAY54 ENTERPRISE EVENT BRIDGE
======================================================================== */

const EVENTS = window.PAY54_EVENTS || null;

const SERVICE_EVENTS = Object.freeze({

    OPEN:
        "services.open",

    CLOSED:
        "services.closed",

    ERROR:
        "services.error"

});

function publishServiceEvent(

    eventName,

    payload = {}

){

    try{

        if(

            EVENTS &&

            typeof EVENTS.publish === "function"

        ){

            EVENTS.publish(

                eventName,

                payload,

                {

                    source:"services"

                }

            );

        }

    }catch(error){

        console.error(

            "[PAY54_SERVICES]",

            error

        );

    }

}

function safeHandler(fnName){

    return () => {

        /* ==========================================================
           ENTERPRISE SESSION VALIDATION
        ========================================================== */

        const SESSION =
        window.PAY54_SECURITY?.session;

        if(

            SESSION &&

            typeof SESSION.isAuthenticated === "function"

        ){

            if(

                !SESSION.isAuthenticated()

            ){

                publishServiceEvent(

                    SERVICE_EVENTS.ERROR,

                    {

                        service: fnName,

                        error:
                            "Session expired",

                        occurredAt:

                            new Date().toISOString()

                    }

                );

                window.PAY54_TOAST
                ?.showToast(

                    "Your session has expired."

                );

                return;

            }

        }

        publishServiceEvent(

            SERVICE_EVENTS.OPEN,

            {

                service: fnName,

                openedAt:

                    new Date().toISOString()

            }

        );

        try{

            const UI = window.PAY54_UI;

            if(!UI){

                throw new Error(

                    "PAY54_UI unavailable"

                );

            }

            if(

                typeof UI[fnName] !== "function"

            ){

                throw new Error(

                    `${fnName} missing`

                );

            }

            UI[fnName]();
publishServiceEvent(

    "services.security.audit",

    {

        service:

            fnName,

        executedAt:

            new Date().toISOString()

    }

);
        }catch(err){

            publishServiceEvent(

                SERVICE_EVENTS.ERROR,

                {

                    service: fnName,

                    error: err.message,

                    occurredAt:

                        new Date().toISOString()

                }

            );

            console.error(

                "SERVICE ROUTE FAILED:",

                err

            );

        }

    };

}
  const VERSION =
  "11.0.0";

function getService(name){

  return window.PAY54_SERVICES?.[
    name
  ];

}

function hasService(name){

  return !!getService(name);

}

function listServices(){

  return Object.keys(
    window.PAY54_SERVICES || {}
  );

}
window.PAY54_SERVICES = {

  send:{
    title:"Send",
    handler:safeHandler("openSend")
  },

  receive:{
    title:"Receive",
    handler:safeHandler("openReceive")
  },

  scan_pay:{
    title:"Scan & Pay",
    handler:safeHandler("openScanAndPay")
  },

  add_money:{
    title:"Add Money",
    handler:safeHandler("openAddMoney")
  },

  withdraw:{
    title:"Withdraw",
    handler:safeHandler("openWithdraw")
  },

  bank_transfer:{
    title:"Bank Transfer",
    handler:safeHandler("openBankTransfer")
  },

  fx:{
    title:"PAY54 Global Transfer",
    handler:safeHandler("openGlobalTransfer")
  },

  bills:{
    title:"PAY54 Pay",
    handler:safeHandler("openBills")
  },

  savings:{
    title:"PAY54 Vaults",
    handler:safeHandler("openSavings")
  },

  cards:{
    title:"Cards",
    handler:safeHandler("openCards")
  },

  checkout:{
    title:"Checkout",
    handler:safeHandler("openCheckout")
  },

shop:{
    title:"PAY54 Marketplace",
    handler:safeHandler("openShop")
},

refer:{
  title:"Refer & Earn",
  handler:safeHandler("openReferEarn")
},

merchantqr:{
  title:"Merchant QR",
  handler:safeHandler("openMerchantQR")
},

  request:{
    title:"Request Money",
    handler:safeHandler("openRequestMoney")
  },

 trading:{
    title:"PAY54 Invest",
    handler:safeHandler("openTrading")
  },

  bet:{
  title:"Bet Funding",
  handler:safeHandler("openBetFunding")
},
  
  agent:{
    title:"PAY54 Agent+",
    handler:safeHandler("openAgent")
  },

  risk:{
    title:"PAY54 Shield",
    handler:safeHandler("openRisk")
  }

};
  
Object.freeze(
  window.PAY54_SERVICES
);
 function getServicesHealth(){

    return {

        sessionManager:

            !!window.PAY54_SECURITY?.session,

        bootstrap:

            !!window.PAY54_SECURITY?.bootstrap,

        services:

            listServices().length,

        version:

            VERSION

    };

} 
window.PAY54_SERVICE_REGISTRY = Object.freeze({

  version:
    VERSION,

  get:
    getService,

  has:
    hasService,

  list:
    listServices,

  count(){

    return listServices().length;

  },

  names(){

    return listServices();

  }

});

console.info(

  "✅ PAY54 Services",

  VERSION,

  "loaded."

);

})();
