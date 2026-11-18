(() => {
  const session = SayuriAPI.getSession();
  const path = location.pathname;
  const onProtected = /\/pages\/(admin|worker|import-workers)\.html$/.test(path);

  function redirectByRole(user) {
    location.href = user?.role === "admin" ? "admin.html" : "worker.html";
  }

  document.querySelectorAll("[data-logout]").forEach(btn => {
    btn.addEventListener("click", () => { SayuriAPI.clearSession(); location.href = "login.html"; });
  });

  document.querySelectorAll("[data-login-link]").forEach(el => {
    el.href = "pages/login.html";
  });

  if (onProtected && !session?.token) {
    location.href = "login.html";
    return;
  }
  if (onProtected && session?.token) {
    const isAdminPage = /\/pages\/(admin|import-workers)\.html$/.test(path);
    const isWorkerPage = /\/pages\/worker\.html$/.test(path);
    if (isAdminPage && session.user?.role !== "admin") {
      location.href = "worker.html";
      return;
    }
    if (isWorkerPage && session.user?.role !== "worker") {
      location.href = "admin.html";
      return;
    }
  }

  document.querySelectorAll("[data-user-name]").forEach(el => {
    el.textContent = session?.user?.name || session?.user?.username || "Usuario";
  });

  window.SayuriApp = { session, redirectByRole };
})();
