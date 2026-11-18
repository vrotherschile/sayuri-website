document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const msg = document.getElementById("login-message");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    msg.textContent = "Validando acceso…";
    msg.className = "form-message";

    const button = form.querySelector("button[type='submit']");
    button.disabled = true;

    try {
      const result = await SayuriAPI.login(
        form.username.value.trim(),
        form.password.value
      );

      SayuriAPI.setSession(result);

      const role = String(result.user?.role || "").toUpperCase();
      location.href = role === "ADMIN" ? "admin.html" : "worker.html";
    } catch (error) {
      msg.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
});