/* =========================
   PAY54 Service Registry
   Super-App Feature Map
========================= */

window.PAY54_SERVICES = {

  /* =====================
     MONEY MOVES
  ===================== */

  send:{
    title:"Send",
    section:"money_moves",
    handler:() => openSend()
  },

  receive:{
    title:"Receive",
    section:"money_moves",
    handler:() => openReceive()
  },

  scanpay:{
    title:"Scan & Pay",
    section:"money_moves",
    handler:() => openScanAndPay()
  },

  addmoney:{
    title:"Add Money",
    section:"money_moves",
    handler:() => openAddMoney()
  },

  withdraw:{
    title:"Withdraw",
    section:"money_moves",
    handler:() => openWithdraw()
  },

  banktransfer:{
    title:"Bank Transfer",
    section:"money_moves",
    handler:() => openBankTransfer()
  },


  /* =====================
     SERVICES
  ===================== */

  crossfx:{
    title:"Cross-Border FX",
    section:"services",
    handler:() => openFX()
  },

  bills:{
    title:"Pay Bills & Top Up",
    section:"services",
    handler:() => openBills()
  },

  savings:{
    title:"Savings & Goals",
    section:"services",
    handler:() => openSavings()
  }

};
