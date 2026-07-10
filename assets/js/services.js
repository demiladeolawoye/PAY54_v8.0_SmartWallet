(() => {

"use strict";

function safeHandler(fnName){

  return async () => {

    try{

      const UI =
        window.PAY54_UI;

      if(!UI){

        console.warn(
          "PAY54_UI unavailable"
        );

        return false;

      }

      if(typeof UI[fnName] !== "function"){

        console.warn(
          `${fnName} missing`
        );

        return false;

      }

      await Promise.resolve(
        UI[fnName]()
      );

      return true;

    }catch(err){

      console.error(

        "[PAY54 SERVICES]",

        fnName,

        err

      );

      return false;

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
