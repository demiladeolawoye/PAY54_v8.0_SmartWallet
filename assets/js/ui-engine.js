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

    container = document.createElement("div");

    container.id = "toastContainer";

    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.right = "20px";
    container.style.zIndex = "99999";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "10px";

    document.body.appendChild(container);

  }

  const toast =
    document.createElement("div");

  toast.className = "p54-toast";

  toast.style.padding = "14px 18px";
  toast.style.borderRadius = "14px";
  toast.style.background =
    "linear-gradient(135deg,#2563eb,#1d4ed8)";
  toast.style.color = "#fff";
  toast.style.fontWeight = "800";
  toast.style.boxShadow =
    "0 10px 30px rgba(0,0,0,.35)";
  toast.style.animation =
    "fadeIn .25s ease";

  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(()=>{

    toast.style.opacity = "0";

    toast.style.transform =
      "translateY(-6px)";

    setTimeout(()=>{
      toast.remove();
    },250);

  },2500);

}

window.PAY54_TOAST = {

  showToast

};

console.log("✅ PAY54 UI ENGINE READY");
