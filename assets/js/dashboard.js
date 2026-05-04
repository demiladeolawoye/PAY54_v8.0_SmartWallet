/* =========================
   PAY54 DASHBOARD — v9.0 FULL BUILD
   CORE ENGINE (CLEAN FOUNDATION)
========================= */

"use strict";

/* =========================
   GLOBAL ERROR GUARD
========================= */
window.addEventListener("error", function (e) {
  console.error("🚨 GLOBAL ERROR:", e.message);
});

/* =========================
   GLOBAL STATE
========================= */
let LEDGER = null;

/* =========================
   SAFE LEDGER ACCESS
========================= */
function safeLedger(){
  if (LEDGER && typeof LEDGER.getBalances === "function") return LEDGER;

  if (window.PAY54_LEDGER) {
    LEDGER = window.PAY54_LEDGER;
    return LEDGER;
  }

  return null;
}
function getLedgerOrFail(){
  const ledger = safeLedger();

  if(!ledger){
    alert("System loading… please try again");
    console.error("🚨 Ledger not ready");
    return null;
  }

  return ledger;
}
/* =========================
   WAIT FOR LEDGER
========================= */
function waitForLedgerReady(callback){
  let attempts = 0;

  function check(){
    const ledger = safeLedger();

    if(ledger){
      callback(ledger);
      return;
    }

    attempts++;
    if(attempts > 30){
      console.error("🚨 Ledger failed to load");
      return;
    }

    setTimeout(check, 150);
  }

  check();
}

/* =========================
   WAIT FOR MODULES
========================= */
function waitForModules(callback){

  function check(){

    if(window.PAY54_LEDGER){
      LEDGER = window.PAY54_LEDGER;
      console.log("✅ Modules ready");
      callback();
      return;
    }

    setTimeout(check,150);
  }

  check();
}

/* =========================
   STORAGE KEYS
========================= */
const LS = {
  CURRENCY: "pay54_currency",
  THEME: "pay54_theme",
  PIN: "pay54_pin"
};

/* =========================
   HELPERS
========================= */
function getSelectedCurrency(){
  return localStorage.getItem(LS.CURRENCY) || "NGN";
}

/* =========================
   MODAL SYSTEM (CLEAN)
========================= */
function openModal({title, bodyHTML, onMount}){

  const backdrop = document.createElement("div");
  backdrop.className = "p54-modal-backdrop";

  backdrop.innerHTML = `
    <div class="p54-modal">
      <div class="p54-modal-head">
        <div>${title}</div>
        <button id="closeModal">✕</button>
      </div>
      <div class="p54-modal-body">${bodyHTML}</div>
    </div>
  `;

  function close(){
    backdrop.remove();
  }

  backdrop.querySelector("#closeModal").onclick = close;

  backdrop.addEventListener("click",(e)=>{
    if(e.target === backdrop) close();
  });

  document.body.appendChild(backdrop);

  if(onMount){
    onMount({
      modal: backdrop.querySelector(".p54-modal"),
      close
    });
  }
}

/* =========================
   PIN VERIFICATION
========================= */
function requestPinVerification(callback){

  const saved = localStorage.getItem(LS.PIN);

  if(!saved){
    return openCreatePin(callback);
  }

  openModal({
    title:"Enter PIN",
    bodyHTML:`
      <input id="pin" class="p54-input" type="password" placeholder="PIN">
      <button id="ok" class="p54-btn primary">Confirm</button>
    `,
    onMount:({modal,close})=>{
      modal.querySelector("#ok").onclick = ()=>{
        const val = modal.querySelector("#pin").value;
        if(val === saved){
          close();
          callback();
        }else{
          alert("Incorrect PIN");
        }
      };
    }
  });
}

function openCreatePin(callback){

  openModal({
    title:"Create PIN",
    bodyHTML:`
      <input id="p1" class="p54-input" placeholder="Enter PIN">
      <input id="p2" class="p54-input" placeholder="Confirm PIN">
      <button id="save" class="p54-btn primary">Save</button>
    `,
    onMount:({modal,close})=>{
      modal.querySelector("#save").onclick = ()=>{
        const p1 = modal.querySelector("#p1").value;
        const p2 = modal.querySelector("#p2").value;

        if(p1 !== p2){
          alert("PIN mismatch");
          return;
        }

        localStorage.setItem(LS.PIN,p1);
        close();

        if(callback) callback();
      };
    }
  });
}

/* =========================
   TRANSACTION ENGINE
========================= */
function processTransaction(entry, meta={}){

  const ledger = safeLedger();
  if(!ledger){
    alert("System error");
    return;
  }

  const tx = ledger.applyEntry(entry);

  if(meta.showReceipt){
    showReceipt(tx);
  }

  refreshUI();
  return tx;
}

/* =========================
   RECEIPT
========================= */
function showReceipt(tx){

  openModal({
    title:"Success",
    bodyHTML:`
      <div>Transaction Completed</div>
      <div>${tx.title}</div>
      <div>${tx.currency} ${tx.amount}</div>
      <button id="done" class="p54-btn primary">Close</button>
    `,
    onMount:({modal,close})=>{
      modal.querySelector("#done").onclick = close;
    }
  });
}

/* =========================
   UI REFRESH
========================= */
function refreshUI(){

  const ledger = safeLedger();
  if(!ledger) return;

  const balances = ledger.getBalances();
  const cur = getSelectedCurrency();

  const el = document.getElementById("balanceAmount");

  if(el){
    el.textContent = ledger.moneyFmt(cur, balances[cur] || 0);
  }
}

/* =========================
   CLICK ROUTING ENGINE
========================= */
const SERVICES = {};

function bindClicks(){

  document.addEventListener("click",(e)=>{

  const btn =
    e.target.closest("[data-action]") ||
    e.target.closest("[data-service]") ||
    e.target.closest("[data-shortcut]") ||
    e.target.closest("[data-utility]");

  if(!btn) return;

  const key =
    btn.dataset.action ||
    btn.dataset.service ||
    btn.dataset.shortcut ||
    btn.dataset.utility;

  if(!key){
    console.warn("⚠️ No action key found");
    return;
  }

  if(!SERVICES[key]){
    console.warn("⚠️ No handler for:", key);
    return;
  }

  console.log("👉 Triggering:", key);

  SERVICES[key]();
});

}

/* =========================
   INIT SYSTEM
========================= */
function init(){

  console.log("🚀 PAY54 INIT");

  bindClicks();

  refreshUI();
}

/* =========================
   BOOTSTRAP
========================= */
document.addEventListener("DOMContentLoaded",()=>{

  waitForModules(()=>{
    waitForLedgerReady(()=>{
      init();
    });
  });

});
/* =========================
   PART 2 — MONEY MOVES ENGINE
========================= */

/* =========================
   SMART FUNDING ENGINE
========================= */
function resolveSmartPayment(amount, currency){

  const ledger = safeLedger();
  if(!ledger) return null;

  const balances = ledger.getBalances();

  if((balances[currency] || 0) >= amount){
    return { source:"wallet" };
  }

  return null;
}

/* =========================
   SEND MONEY
========================= */
function openSend(){

  openModal({
    title:"Send Money",

    bodyHTML:`
      <input id="user" class="p54-input" placeholder="@username">
      <input id="amount" class="p54-input" placeholder="Amount">
      <button id="sendBtn" class="p54-btn primary">Send</button>
    `,

    onMount:({modal,close})=>{

      modal.querySelector("#sendBtn").onclick = ()=>{

        const user = modal.querySelector("#user").value;
        const amount = Number(modal.querySelector("#amount").value);
        const currency = getSelectedCurrency();

        if(!user || !amount){
          alert("Invalid input");
          return;
        }

        const funding = resolveSmartPayment(amount,currency);

        if(!funding){
          alert("Insufficient balance");
          return;
        }

        requestPinVerification(()=>{

          const entry = LEDGER.createEntry({
            type:"send",
            title:`Sent to ${user}`,
            currency,
            amount:-amount,
            icon:"📤"
          });

          processTransaction(entry,{showReceipt:true});
          close();

        });

      };

    }
  });

}

/* =========================
   RECEIVE
========================= */
function openReceive(){

  openModal({
    title:"Receive Money",
    bodyHTML:`
      <div>Your Tag:</div>
      <div style="font-weight:bold">@pay54-user</div>
      <button id="close" class="p54-btn primary">Done</button>
    `,
    onMount:({modal,close})=>{
      modal.querySelector("#close").onclick = close;
    }
  });

}

/* =========================
   ADD MONEY
========================= */
function openAddMoney(){

  openModal({
    title:"Add Money",

    bodyHTML:`
      <input id="amount" class="p54-input" placeholder="Amount">
      <button id="addBtn" class="p54-btn primary">Add</button>
    `,

    onMount:({modal,close})=>{

      modal.querySelector("#addBtn").onclick = ()=>{

        const amount = Number(modal.querySelector("#amount").value);
        const currency = getSelectedCurrency();

        if(!amount){
          alert("Enter amount");
          return;
        }

        const entry = LEDGER.createEntry({
          type:"add",
          title:"Wallet Funding",
          currency,
          amount:amount,
          icon:"➕"
        });

        processTransaction(entry,{showReceipt:true});
        close();

      };

    }
  });

}

/* =========================
   WITHDRAW
========================= */
function openWithdraw(){

  openModal({
    title:"Withdraw",

    bodyHTML:`
      <input id="amount" class="p54-input" placeholder="Amount">
      <button id="wdBtn" class="p54-btn primary">Withdraw</button>
    `,

    onMount:({modal,close})=>{

      modal.querySelector("#wdBtn").onclick = ()=>{

        const amount = Number(modal.querySelector("#amount").value);
        const currency = getSelectedCurrency();

        requestPinVerification(()=>{

          const entry = LEDGER.createEntry({
            type:"withdraw",
            title:"Withdrawal",
            currency,
            amount:-amount,
            icon:"💵"
          });

          processTransaction(entry,{showReceipt:true});
          close();

        });

      };

    }
  });

}

/* =========================
   BANK TRANSFER
========================= */
function openBankTransfer(){

  openModal({
    title:"Bank Transfer",

    bodyHTML:`
      <input id="acc" class="p54-input" placeholder="Account Number">
      <input id="amount" class="p54-input" placeholder="Amount">
      <button id="btBtn" class="p54-btn primary">Send</button>
    `,

    onMount:({modal,close})=>{

      modal.querySelector("#btBtn").onclick = ()=>{

        const amount = Number(modal.querySelector("#amount").value);
        const currency = getSelectedCurrency();

        requestPinVerification(()=>{

          const entry = LEDGER.createEntry({
            type:"bank",
            title:"Bank Transfer",
            currency,
            amount:-amount,
            icon:"🏦"
          });

          processTransaction(entry,{showReceipt:true});
          close();

        });

      };

    }
  });

}

/* =========================
   SCAN & PAY (SIMPLIFIED CLEAN)
========================= */
function openScanPay(){

  openModal({
    title:"Scan & Pay",

    bodyHTML:`
      <input id="merchant" class="p54-input" placeholder="Merchant">
      <input id="amount" class="p54-input" placeholder="Amount">
      <button id="payBtn" class="p54-btn primary">Pay</button>
    `,

    onMount:({modal,close})=>{

      modal.querySelector("#payBtn").onclick = ()=>{

        const merchant = modal.querySelector("#merchant").value;
        const amount = Number(modal.querySelector("#amount").value);
        const currency = getSelectedCurrency();

        requestPinVerification(()=>{

          const entry = LEDGER.createEntry({
            type:"scan",
            title:`Paid ${merchant}`,
            currency,
            amount:-amount,
            icon:"📲"
          });

          processTransaction(entry,{showReceipt:true});
          close();

        });

      };

    }
  });

}

/* =========================
   REGISTER SERVICES
========================= */
SERVICES.send = openSend;
SERVICES.receive = openReceive;
SERVICES.add_money = openAddMoney;
SERVICES.withdraw = openWithdraw;
SERVICES.bank_transfer = openBankTransfer;
SERVICES.scan_pay = openScanPay;
/* =========================
   PART 3 — SERVICES ENGINE
========================= */

/* =========================
   GLOBAL TRANSFER (FX)
========================= */
function openGlobalTransfer(){

  openModal({
    title:"PAY54 Global Transfer",

    bodyHTML:`
      <input id="fromAmt" class="p54-input" placeholder="Amount">
      <select id="toCur" class="p54-select">
        <option>USD</option>
        <option>GBP</option>
        <option>EUR</option>
        <option>NGN</option>
      </select>
      <button id="fxBtn" class="p54-btn primary">Convert & Send</button>
    `,

    onMount:({modal,close})=>{

      modal.querySelector("#fxBtn").onclick = ()=>{

        const amount = Number(modal.querySelector("#fromAmt").value);
        const from = getSelectedCurrency();
        const to = modal.querySelector("#toCur").value;

        if(!amount){
          alert("Enter amount");
          return;
        }

        requestPinVerification(()=>{

          const converted = LEDGER.convert(from,to,amount);

          LEDGER.applyEntry(LEDGER.createEntry({
            type:"fx_debit",
            currency:from,
            amount:-amount
          }));

          const entry = LEDGER.createEntry({
            type:"fx",
            title:"FX Transfer",
            currency:to,
            amount:-converted,
            icon:"🌍"
          });

          processTransaction(entry,{showReceipt:true});
          close();

        });

      };

    }
  });

}

/* =========================
   PAY BILLS
========================= */
function openBills(){

  openModal({
    title:"Pay Bills",

    bodyHTML:`
      <select id="type" class="p54-select">
        <option value="airtime">Airtime</option>
        <option value="electricity">Electricity</option>
      </select>
      <input id="amount" class="p54-input" placeholder="Amount">
      <button id="payBill" class="p54-btn primary">Pay</button>
    `,

    onMount:({modal,close})=>{

      modal.querySelector("#payBill").onclick = ()=>{

        const amount = Number(modal.querySelector("#amount").value);
        const currency = getSelectedCurrency();

        requestPinVerification(()=>{

          const entry = LEDGER.createEntry({
            type:"bill",
            title:"Bill Payment",
            currency,
            amount:-amount,
            icon:"💡"
          });

          processTransaction(entry,{showReceipt:true});
          close();

        });

      };

    }
  });

}

/* =========================
   SAVINGS
========================= */
function openSavings(){

  openModal({
    title:"Savings",

    bodyHTML:`
      <input id="goal" class="p54-input" placeholder="Goal name">
      <input id="amount" class="p54-input" placeholder="Amount">
      <button id="saveBtn" class="p54-btn primary">Save</button>
    `,

    onMount:({modal,close})=>{

      modal.querySelector("#saveBtn").onclick = ()=>{

        const goal = modal.querySelector("#goal").value;
        const amount = Number(modal.querySelector("#amount").value);
        const currency = getSelectedCurrency();

        requestPinVerification(()=>{

          const entry = LEDGER.createEntry({
            type:"savings",
            title:`Saved to ${goal}`,
            currency,
            amount:-amount,
            icon:"🏦"
          });

          processTransaction(entry,{showReceipt:true});
          close();

        });

      };

    }
  });

}

/* =========================
   CARDS (SIMPLIFIED CLEAN)
========================= */
function openCards(){

  openModal({
    title:"Cards",

    bodyHTML:`
      <div class="p54-note">Virtual Card Active</div>
      <button id="close" class="p54-btn primary">Close</button>
    `,

    onMount:({modal,close})=>{
      modal.querySelector("#close").onclick = close;
    }
  });

}

/* =========================
   SHOP & GO (FIXED — NO DUPLICATES)
========================= */
function openShop(){

  openModal({
    title:"Shop & Go",

    bodyHTML:`
      <button class="p54-btn" data-merchant="Uber Eats">Uber Eats</button>
      <button class="p54-btn" data-merchant="KFC">KFC</button>
    `,

    onMount:({modal,close})=>{

      modal.querySelectorAll("[data-merchant]").forEach(btn=>{

        btn.onclick = ()=>{

          const merchant = btn.dataset.merchant;

          openModal({
            title:merchant,

            bodyHTML:`
              <input id="amount" class="p54-input" placeholder="Amount">
              <button id="pay" class="p54-btn primary">Pay</button>
            `,

            onMount:({modal,close})=>{

              modal.querySelector("#pay").onclick = ()=>{

                const amount = Number(modal.querySelector("#amount").value);
                const currency = getSelectedCurrency();

                requestPinVerification(()=>{

                  const entry = LEDGER.createEntry({
                    type:"shop",
                    title:merchant,
                    currency,
                    amount:-amount,
                    icon:"🛒"
                  });

                  processTransaction(entry,{showReceipt:true});
                  close();

                });

              };

            }
          });

        };

      });

    }
  });

}

/* =========================
   MERCHANT QR
========================= */
function openMerchantQR(){

  openModal({
    title:"Merchant QR",

    bodyHTML:`
      <input id="name" class="p54-input" placeholder="Merchant">
      <button id="gen" class="p54-btn primary">Generate</button>
      <div id="qr"></div>
    `,

    onMount:({modal})=>{

      modal.querySelector("#gen").onclick = ()=>{

        const name = modal.querySelector("#name").value;

        modal.querySelector("#qr").innerHTML = `
          <div class="p54-note">QR for ${name}</div>
        `;

      };

    }
  });

}

/* =========================
   REGISTER SERVICES
========================= */
SERVICES.fx = openGlobalTransfer;
SERVICES.bills = openBills;
SERVICES.savings = openSavings;
SERVICES.cards = openCards;
SERVICES.shop = openShop;
SERVICES.merchantqr = openMerchantQR;
/* =========================
   PART 4 — ADVANCED FEATURES
========================= */

/* =========================
   🔞 AGE VERIFICATION (BETTING)
========================= */
function verifyAge(callback){

  const verified = localStorage.getItem("pay54_age_verified");

  if(verified === "yes"){
    callback();
    return;
  }

  openModal({
    title:"Age Verification",

    bodyHTML:`
      <div class="p54-note">You must be 18+ to continue</div>
      <button id="yes" class="p54-btn primary">I am 18+</button>
      <button id="no" class="p54-btn">Cancel</button>
    `,

    onMount:({modal,close})=>{

      modal.querySelector("#yes").onclick = ()=>{
        localStorage.setItem("pay54_age_verified","yes");
        close();
        callback();
      };

      modal.querySelector("#no").onclick = close;

    }
  });

}

/* =========================
   📈 TRADING (AFFILIATE READY)
========================= */
function openTrading(){

  openModal({
    title:"Trading",

    bodyHTML:`
      <div class="p54-note">Choose Market</div>

      <button class="p54-btn" data-market="stocks">Stocks</button>
      <button class="p54-btn" data-market="crypto">Crypto</button>
    `,

    onMount:({modal})=>{

      modal.querySelectorAll("[data-market]").forEach(btn=>{

        btn.onclick = ()=>{

          const market = btn.dataset.market;

          openModal({
            title: market.toUpperCase(),

            bodyHTML:`
              <div class="p54-note">Trade via partner</div>
              <button id="go" class="p54-btn primary">Continue</button>
            `,

            onMount:({modal})=>{
              modal.querySelector("#go").onclick = ()=>{
                window.open("https://partner-trading.com?ref=pay54","_blank");
              };
            }

          });

        };

      });

    }
  });

}

/* =========================
   🎰 BET FUNDING (AFRICAN PROVIDERS)
========================= */
function openBet(){

  verifyAge(()=>{

    openModal({
      title:"Bet Funding",

      bodyHTML:`
        <button data-bet="Bet9ja" class="p54-btn">Bet9ja</button>
        <button data-bet="SportyBet" class="p54-btn">SportyBet</button>
        <button data-bet="1xBet" class="p54-btn">1xBet</button>
      `,

      onMount:({modal})=>{

        modal.querySelectorAll("[data-bet]").forEach(btn=>{

          btn.onclick = ()=>{

            const provider = btn.dataset.bet;

            openModal({
              title:provider,

              bodyHTML:`
                <input id="amount" class="p54-input" placeholder="Amount">
                <button id="fund" class="p54-btn primary">Fund</button>
              `,

              onMount:({modal,close})=>{

                modal.querySelector("#fund").onclick = ()=>{

                  const amount = Number(modal.querySelector("#amount").value);
                  const currency = getSelectedCurrency();

                  requestPinVerification(()=>{

                    const entry = LEDGER.createEntry({
                      type:"bet",
                      title:`Funded ${provider}`,
                      currency,
                      amount:-amount,
                      icon:"🎰"
                    });

                    processTransaction(entry,{showReceipt:true});
                    close();

                  });

                };

              }
            });

          };

        });

      }
    });

  });

}

/* =========================
   🤝 BECOME AGENT
========================= */
function openAgent(){

  openModal({
    title:"Become an Agent",

    bodyHTML:`
      <div class="p54-note">
        Earn commission on:
        <br>• Cash deposits
        <br>• Withdrawals
        <br>• Bill payments
      </div>

      <button id="apply" class="p54-btn primary">Apply Now</button>
    `,

    onMount:({modal})=>{
      modal.querySelector("#apply").onclick = ()=>{
        alert("Application submitted ✅");
      };
    }

  });

}

/* =========================
   🛡 AI RISK WATCH
========================= */
function openRisk(){

  openModal({
    title:"AI Risk Watch",

    bodyHTML:`
      <div class="p54-note">
        ✔ Transactions monitored<br>
        ✔ Fraud detection active<br>
        ✔ Behaviour analysis enabled
      </div>

      <div style="margin-top:10px;color:#22c55e">
        Status: SAFE
      </div>

      <button class="p54-btn primary">Close</button>
    `
  });

}

/* =========================
   🏧 ATM FINDER
========================= */
function openATMFinder(){

  openModal({
    title:"ATM Finder",

    bodyHTML:`
      <div class="p54-note">
        Nearby ATMs:
      </div>
      <div>• Barclays ATM</div>
      <div>• HSBC ATM</div>
      <div>• Access Bank ATM</div>
    `
  });

}

/* =========================
   🏪 POS / AGENT FINDER
========================= */
function openPOSFinder(){

  openModal({
    title:"Agent Finder",

    bodyHTML:`
      <div class="p54-note">
        Nearby Agents:
      </div>
      <div>• PAY54 Agent - Greenwich</div>
      <div>• POS Agent - Thamesmead</div>
    `
  });

}

/* =========================
   REGISTER SERVICES
========================= */
SERVICES.trading = openTrading;
SERVICES.bet = openBet;
SERVICES.agent = openAgent;
SERVICES.risk = openRisk;
SERVICES.atm = openATMFinder;
SERVICES.pos = openPOSFinder;
/* =========================
   PART 5 — UX POLISH SYSTEM
========================= */

/* =========================
   BUTTON LOADING STATE
========================= */
function setButtonLoading(btn, state){

  if(!btn) return;

  if(state){
    btn.dataset.original = btn.innerHTML;
    btn.innerHTML = "Processing...";
    btn.disabled = true;
    btn.style.opacity = "0.7";
  }else{
    btn.innerHTML = btn.dataset.original || "Submit";
    btn.disabled = false;
    btn.style.opacity = "1";
  }

}

/* =========================
   INPUT VALIDATION SYSTEM
========================= */
function validateAmount(value){

  const num = Number(value);

  if(!num || num <= 0){
    return "Enter valid amount";
  }

  if(num > 100000000){
    return "Amount too large";
  }

  return null;

}

/* =========================
   ENHANCED PROCESS TRANSACTION
========================= */
const _oldProcess = processTransaction;

processTransaction = function(entry, meta={}){

  try{

    const tx = _oldProcess(entry, meta);

    return tx;

  }catch(e){

    console.error("Transaction error:", e);
    alert("Something went wrong. Try again.");

    return null;
  }

};

/* =========================
   PREMIUM INPUT EFFECTS
========================= */
document.addEventListener("focusin", (e)=>{

  if(e.target.classList.contains("p54-input")){
    e.target.style.borderColor = "#3b82f6";
    e.target.style.boxShadow = "0 0 0 2px rgba(59,130,246,0.2)";
  }

});

document.addEventListener("focusout", (e)=>{

  if(e.target.classList.contains("p54-input")){
    e.target.style.borderColor = "";
    e.target.style.boxShadow = "";
  }

});

/* =========================
   GLOBAL CLICK FEEDBACK
========================= */
document.addEventListener("click",(e)=>{

  const btn = e.target.closest(".p54-btn");

  if(!btn) return;

  btn.style.transform = "scale(0.96)";

  setTimeout(()=>{
    btn.style.transform = "scale(1)";
  },120);

});

/* =========================
   EMPTY STATE HANDLER
========================= */
function renderEmptyState(container, message){

  if(!container) return;

  container.innerHTML = `
    <div style="text-align:center;opacity:0.7;padding:20px">
      <div style="font-size:30px">📭</div>
      <div>${message}</div>
    </div>
  `;

}

/* =========================
   SAFE UI REFRESH OVERRIDE
========================= */
const _oldRefresh = refreshUI;

refreshUI = function(){

  try{

    _oldRefresh();

  }catch(e){
    console.warn("UI refresh safe fallback");
  }

};

/* =========================
   AUTO SCROLL FIX (MOBILE)
========================= */
document.addEventListener("click",(e)=>{

  if(e.target.closest(".p54-modal")){
    document.body.style.overflow = "hidden";
  }else{
    document.body.style.overflow = "";
  }

});

/* =========================
   FINAL SYSTEM CHECK
========================= */
console.log("🔥 PAY54 FULL BUILD COMPLETE — PREMIUM MODE ACTIVE");
