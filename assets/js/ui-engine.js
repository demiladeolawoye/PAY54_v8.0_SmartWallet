"use strict";

/* =========================================
   PAY54 UNIVERSAL UI ENGINE v10.0
========================================= */

console.log("🎨 PAY54 UI ENGINE LOADED");

/* =========================================
   TOAST ENGINE
========================================= */

function showToast(message = "Done"){

  let container =
    document.getElementById("toastContainer");

  if(!container){

  container =
    document.createElement("div");

  container.id =
    "toastContainer";

  container.className =
    "p54-toast-container--fallback";

  document.body.appendChild(
    container
  );

}

  const toast =
  document.createElement("div");

toast.className =
  "p54-toast p54-toast--ui-engine";

  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(()=>{

  toast.classList.add(
    "is-exiting"
  );

  setTimeout(()=>{

    toast.remove();

  },250);

},2500);

}

window.PAY54_TOAST = {

  showToast

};

console.log("✅ PAY54 UI ENGINE READY");
