/* =====================================================
   PAY54 DASHBOARD v805.2-hotfix8 FINAL
   Single Wiring Engine • No Regressions • Stable
===================================================== */

(()=>{

"use strict";

/* ---------------- CORE MODULES ---------------- */
const LEDGER = window.PAY54_LEDGER;
const RECIP  = window.PAY54_RECIPIENT;
const RCPT   = window.PAY54_RECEIPTS;

if(!LEDGER||!RECIP||!RCPT){
 console.error("Missing PAY54 modules");
 return;
}

/* ---------------- HELPERS ---------------- */

function qs(q){return document.querySelector(q);}
function qsa(q){return document.querySelectorAll(q);}

function getCur(){
 return localStorage.getItem("pay54_currency") || "NGN";
}

function refreshUI(){
 const cur=getCur();
 const balances=LEDGER.getBalances();
 let total=0;

 Object.keys(balances).forEach(c=>{
  const amt=Number(balances[c]||0);
  if(c===cur) total+=amt;
  else total+=Number(LEDGER.convert(c,cur,amt)||0);
 });

 const balEl=qs("#balanceAmount");
 if(balEl) balEl.textContent=LEDGER.moneyFmt(cur,total);
}

/* ---------------- MODAL CORE ---------------- */

function openModal({title,bodyHTML,onMount}){
 const b=document.createElement("div");
 b.className="p54-modal-backdrop";
 b.innerHTML=`
 <div class="p54-modal">
  <div class="p54-modal-head">
   <div>${title}</div>
   <button id="x">✕</button>
  </div>
  <div class="p54-modal-body">${bodyHTML}</div>
 </div>`;
 b.querySelector("#x").onclick=()=>b.remove();
 document.body.appendChild(b);
 if(onMount) onMount({modal:b,close:()=>b.remove()});
}

/* ---------------- CORE ACTIONS ---------------- */

function openSendUnified(){ alert("Send opened"); }
function openReceive(){ alert("Receive opened"); }
function openBankTransfer(){ alert("Bank Transfer opened"); }
function openCrossBorderFXUnified(){ alert("Cross-border FX opened"); }

function openScanAndPay(){
 openModal({
  title:"Scan & Pay",
  bodyHTML:`
   <div class="p54-form">
    <input id="mref" placeholder="Merchant tag / QR">
    <input id="amt" type="number" placeholder="Amount">
    <button id="pay">Pay</button>
   </div>
  `,
  onMount:({modal,close})=>{
   modal.querySelector("#pay").onclick=()=>{
    alert("Scan & Pay simulated");
    close();
   };
  }
 });
}

function openAddMoney(){
 openModal({
  title:"Add Money",
  bodyHTML:`
   <select id="method">
    <option>Card</option>
    <option>Agent</option>
   </select>
   <input id="amt" type="number" placeholder="Amount">
   <button id="ok">Add</button>
  `,
  onMount:({modal,close})=>{
   modal.querySelector("#ok").onclick=()=>{
    alert("Add Money simulated");
    close();
   };
  }
 });
}

function openWithdraw(){
 openModal({
  title:"Withdraw",
  bodyHTML:`
   <select id="route">
    <option>Card</option>
    <option>Agent</option>
   </select>
   <input id="amt" type="number" placeholder="Amount">
   <button id="ok">Withdraw</button>
  `,
  onMount:({modal,close})=>{
   modal.querySelector("#ok").onclick=()=>{
    alert("Withdraw simulated");
    close();
   };
  }
 }

/* ---------------- TILE RENAME ---------------- */

function renameTiles(){
 qsa(".tile-title").forEach(el=>{
  if(el.textContent.trim()==="Request Money") el.textContent="Scan & Pay";
  if(el.textContent.trim()==="Shop on the Fly") el.textContent="Pay & Go";
 });
}

/* ---------------- MASTER TILE WIRING ---------------- */

function wireTiles(){

 qsa(".tile").forEach(tile=>{
  tile.style.cursor="pointer";

  tile.onclick=()=>{
   const t=(tile.querySelector(".tile-title")?.textContent||"")
            .toLowerCase();

   if(t==="send") return openSendUnified();
   if(t==="receive") return openReceive();
   if(t==="add money") return openAddMoney();
   if(t==="withdraw") return openWithdraw();
   if(t==="bank transfer") return openBankTransfer();
   if(t.includes("scan")) return openScanAndPay();
   if(t.includes("cross")) return openCrossBorderFXUnified();
   if(t.includes("pay & go")||t.includes("shop")){
     window.open("https://www.booking.com","_blank");
     return;
   }

   openModal({
    title:"Coming Soon",
    bodyHTML:`<p>${t}</p>`
   });
  };
 });

 console.log("PAY54 HOTFIX8 WIRED");
}

/* ---------------- HEADER BUTTONS ---------------- */

const addBtn=qs("#addMoneyBtn");
const wdBtn =qs("#withdrawBtn");

if(addBtn) addBtn.onclick=openAddMoney;
if(wdBtn)  wdBtn.onclick=openWithdraw;

/* ---------------- INIT ---------------- */

function init(){
 renameTiles();
 wireTiles();
 refreshUI();
}

if(document.readyState==="loading"){
 document.addEventListener("DOMContentLoaded",init);
}else{
 init();
}

})();
