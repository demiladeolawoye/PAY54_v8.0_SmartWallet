/* =========================
   PAY54 MODAL ENGINE v9.0
========================= */

"use strict";

window.PAY54_MODALS = (function(){

  function ensureModalStyles(){

    if(document.getElementById("pay54-modal-style")) return;

    const style = document.createElement("style");

    style.id = "pay54-modal-style";

    style.textContent = `

      .p54-modal-backdrop{
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.55);
        display:grid;
        place-items:center;
        z-index:9999;
        padding:18px;
      }

      .p54-modal{
        width:min(720px,100%);
        border-radius:18px;
        background:#0f172a;
        color:#fff;
        overflow:hidden;
      }

      body.light .p54-modal{
        background:#ffffff;
        color:#0f172a;
      }

      .p54-modal-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:14px 16px;
        border-bottom:1px solid rgba(255,255,255,.1);
      }

      .p54-modal-title{
        font-size:16px;
        font-weight:800;
      }

      .p54-x{
        width:36px;
        height:36px;
        border-radius:999px;
        border:none;
        cursor:pointer;
      }

      .p54-modal-body{
        padding:16px;
      }

    `;

    document.head.appendChild(style);

  }

  function openModal({title="", bodyHTML="", onMount}){

    ensureModalStyles();

    const backdrop = document.createElement("div");

    backdrop.className = "p54-modal-backdrop";

    backdrop.innerHTML = `
      <div class="p54-modal">

        <div class="p54-modal-head">

          <div class="p54-modal-title">
            ${title}
          </div>

          <button class="p54-x" type="button">
            ✕
          </button>

        </div>

        <div class="p54-modal-body">
          ${bodyHTML}
        </div>

      </div>
    `;

    const modal = backdrop.querySelector(".p54-modal");

    function close(){

      backdrop.remove();

      document.body.classList.remove("modal-open");

      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";

      document.removeEventListener("keydown", escClose);

    }

    function escClose(e){
      if(e.key === "Escape"){
        close();
      }
    }

    backdrop.querySelector(".p54-x")
      .addEventListener("click", close);

    backdrop.addEventListener("click",(e)=>{
      if(e.target === backdrop){
        close();
      }
    });

    document.addEventListener("keydown", escClose);

    document.body.classList.add("modal-open");

    document.body.appendChild(backdrop);

    if(typeof onMount === "function"){
      onMount({
        modal,
        close
      });
    }

    return { close };

  }

 window.PAY54_MODALS = {
  openModal
};

window.openModal = openModal;

return {
  openModal
};

})();
