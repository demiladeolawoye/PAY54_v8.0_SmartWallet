/* PAY54 Dashboard v805.1 — DOM SAFE */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const LS = {
    CUR: "pay54_currency",
    BAL: "pay54_balances",
    TX: "pay54_tx",
    THEME: "pay54_theme"
  };

  const symbols = { NGN:"₦", GBP:"£", USD:"$", EUR:"€", GHS:"₵", KES:"KSh", ZAR:"R" };

  const balances = JSON.parse(localStorage.getItem(LS.BAL)) || {
    NGN:1250000.5, GBP:8420, USD:15320, EUR:11890, GHS:9650, KES:132450, ZAR:27890
  };

  const txs = JSON.parse(localStorage.getItem(LS.TX)) || [];

  function fmt(c,a){return `${symbols[c]} ${a.toLocaleString(undefined,{minimumFractionDigits:2})}`}

  function activeFeed(){
    return $$('[data-role="recentTxFeed"]').find(f=>f.offsetParent!==null);
  }

  function renderBalance(c){
    $("#balanceAmount").textContent = fmt(c, balances[c]);
  }

  function addTx(title,c,amt){
    const tx={title,currency:c,amount:amt,time:new Date().toLocaleString()};
    txs.unshift(tx);
    localStorage.setItem(LS.TX,JSON.stringify(txs));
    const feed=activeFeed();
    if(feed){
      const d=document.createElement("div");
      d.className="feed-item";
      d.innerHTML=`<div class="feed-main"><div class="feed-title">${title}</div><div class="feed-sub">${tx.time}</div></div><div class="feed-amt ${amt>=0?"pos":"neg"}">${fmt(c,Math.abs(amt))}</div>`;
      feed.prepend(d);
    }
  }

  let cur=localStorage.getItem(LS.CUR)||"NGN";
  renderBalance(cur);

  $$(".currency").forEach(b=>b.onclick=()=>{
    cur=b.dataset.cur;
    localStorage.setItem(LS.CUR,cur);
    $$(".currency").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    renderBalance(cur);
  });

  $("#currencySelect")?.addEventListener("change",e=>{
    cur=e.target.value;
    localStorage.setItem(LS.CUR,cur);
    renderBalance(cur);
  });

  $("#addMoneyBtn").onclick=()=>{balances[cur]+=1000;localStorage.setItem(LS.BAL,JSON.stringify(balances));renderBalance(cur);addTx("Wallet funding",cur,1000)};
  $("#withdrawBtn").onclick=()=>{if(balances[cur]>=500){balances[cur]-=500;localStorage.setItem(LS.BAL,JSON.stringify(balances));renderBalance(cur);addTx("Withdrawal",cur,-500)}};

  $$("[data-action]").forEach(b=>b.onclick=()=>{
    const a=b.dataset.action;
    if(a==="add")$("#addMoneyBtn").click();
    if(a==="withdraw")$("#withdrawBtn").click();
    if(a==="send")addTx("PAY54 transfer sent",cur,-250);
    if(a==="request")addTx("Payment request",cur,0);
  });

  $("#viewAllTx")?.addEventListener("click",()=>alert("Ledger OK"));
  $("#viewAllTxMobile")?.addEventListener("click",()=>alert("Ledger OK"));

  $("#clearAlerts")?.addEventListener("click",()=>{$("#alerts").innerHTML=""});

  const theme=localStorage.getItem(LS.THEME)||"light";
  document.body.classList.toggle("light",theme==="light");
  $("#themeToggle").onclick=()=>{
    document.body.classList.toggle("light");
    localStorage.setItem(LS.THEME,document.body.classList.contains("light")?"light":"dark");
  };
});
