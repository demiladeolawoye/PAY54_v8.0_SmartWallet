/* =========================
   PAY54 MODAL ENGINE v11.0.0
   Enterprise Event Bus
========================= */
"use strict";
/* ========================================================================
   PAY54 ENTERPRISE EVENT BRIDGE
======================================================================== */

const EVENTS =
window.PAY54_EVENTS || null;

const MODAL_EVENTS =
Object.freeze({

  OPENED:
    "modal.opened",

  CLOSED:
    "modal.closed",

  ERROR:
    "modal.error",

  SERVICE_CLOSED:
    "services.closed"

});

function publishModalEvent(

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

          source:"modals"

        }

      );

    }

  }catch(error){

  console.error(

    "[PAY54_MODALS]",

    eventName,

    error

);

  }

}

window.PAY54_MODALS = (function(){

  
  function openModal({title="", bodyHTML="", onMount}){

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

  if(

    !backdrop.isConnected

  ){

    return;

  }

  backdrop.remove();

document.body.classList.remove(
  "modal-open"
);

document.documentElement.classList.remove(
  "modal-open"
);

  document.removeEventListener(

    "keydown",

    escClose

  );

 publishModalEvent(

  MODAL_EVENTS.CLOSED,

  {

    title,

    closedAt:

      new Date()
        .toISOString()

  }

);

publishModalEvent(

  MODAL_EVENTS.SERVICE_CLOSED,

  {

    service:

      title,

    closedAt:

      new Date()
        .toISOString()

  }

);

} // End close()

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

    document.body.classList.add(
  "modal-open"
);

document.documentElement.classList.add(
  "modal-open"
);

  document.body.appendChild(
  backdrop
);

publishModalEvent(

  MODAL_EVENTS.OPENED,

  {

    title,

    openedAt:
      new Date().toISOString()

  }

);

if(typeof onMount === "function"){

  try{

    onMount({

      modal,

      close

    });

  }catch(error){

    publishModalEvent(

      MODAL_EVENTS.ERROR,

      {

        title,

        error:
          error.message,

        occurredAt:
          new Date().toISOString()

      }

    );

   console.error(
    "[PAY54_MODALS]",
    MODAL_EVENTS.ERROR,
    error
);

  }

}

return{

  close

};

} // End openModal()

/* =========================================
   GLOBAL LEGACY SUPPORT
========================================= */

window.openModal =
openModal;

window.closeAllModals =
function(){

  document
    .querySelectorAll(
      ".p54-modal-backdrop"
    )
    .forEach(el=>el.remove());

};

return{

  openModal

};

})();
