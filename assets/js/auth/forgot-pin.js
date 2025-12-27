document.getElementById("resetBtn").onclick = () => {
  const msg = document.getElementById("message");
  msg.textContent = "Reset link sent. Continue to create new PIN.";
  msg.className = "message success";

  setTimeout(() => {
    window.location.href = "create-new-pin.html";
  }, 1200);
};
