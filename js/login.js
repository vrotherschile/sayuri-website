document.addEventListener("DOMContentLoaded", () => {
  const form=document.getElementById("login-form");
  const msg=document.getElementById("login-message");
  form.addEventListener("submit", async e => {
    e.preventDefault(); msg.textContent="Validando acceso…";
    try {
      const r=await SayuriAPI.login(form.username.value.trim(), form.password.value);
      SayuriAPI.setSession(r);
      location.href=r.user.role==="admin"?"admin.html":"worker.html";
    } catch(err) { msg.textContent=err.message; }
  });
});
