// PAY54 Session Manager (Phase 1)

const PAY54Session = {
  createSession(user) {
    sessionStorage.setItem("pay54_session", JSON.stringify(user));
  },

  destroySession() {
    sessionStorage.removeItem("pay54_session");
    window.location.href = "login.html";
  },

  getSession() {
    const data = sessionStorage.getItem("pay54_session");
    return data ? JSON.parse(data) : null;
  },

  isAuthenticated() {
    return !!sessionStorage.getItem("pay54_session");
  }
};
