document.getElementById("signupForm").onsubmit = e => {

  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;

  // Save to browser storage
  localStorage.setItem("pay54_name", name);
  localStorage.setItem("pay54_email", email);

  // Continue to OTP page
  location.href = "otp.html";

};
