document.getElementById("signupForm").onsubmit = e => {

  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;

  localStorage.setItem("pay54_name", name);
  localStorage.setItem("pay54_email", email);

  location.href = "otp.html";

};
