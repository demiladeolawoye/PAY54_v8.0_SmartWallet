(() => {

"use strict";

function safeHandler(fnName){

  return () => {

    try{

      const UI = window.PAY54_UI;

      if(!UI){
        console.warn("PAY54_UI unavailable");
        return;
      }

      if(typeof UI[fnName] !== "function"){
        console.warn(`${fnName} missing`);
        return;
      }

      UI[fnName]();

    }catch(err){

      console.error("SERVICE ROUTE FAILED:", err);

    }

  };

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
    title:"Bills & Top Up",
    handler:safeHandler("openBills")
  },

  savings:{
    title:"Savings",
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
  title:"Shop & Go",
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
    title:"Trading",
    handler:safeHandler("openTrading")
  },

  bet:{
  title:"Bet Funding",
  handler:safeHandler("openBetFunding")
},
  
  agent:{
    title:"Agent",
    handler:safeHandler("openAgent")
  },

  risk:{
    title:"AI Risk Watch",
    handler:safeHandler("openRisk")
  }

};

console.log("✅ PAY54 SERVICES READY");

})();
