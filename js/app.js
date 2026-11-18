(() => {
  const path = location.pathname.toLowerCase();
  const session = SayuriAPI.getSession();

  const isProtected =
    /\/pages\/(admin|worker|import-workers)\.html$/.test(path);

  const isAdminPage =
    /\/pages\/(admin|import-workers)\.html$/.test(path);

  const isWorkerPage =
    /\/pages\/worker\.html$/.test(path);

  const isLoginPage =
    /\/pages\/login\.html$/.test(path);

  const role = String(session?.user?.role || "").toUpperCase();

  function redirectByRole(user = session?.user) {
    const userRole = String(user?.role || "").toUpperCase();
    location.href = userRole === "ADMIN" ? "admin.html" : "worker.html";
  }

  if (isProtected && !session?.token) {
    location.href = "login.html";
    return;
  }

  if (isProtected && session?.token) {
    if (isAdminPage && role !== "ADMIN") {
      location.href = "worker.html";
      return;
    }

    if (isWorkerPage && role !== "WORKER") {
      location.href = "admin.html";
      return;
    }
  }

  if (isLoginPage && session?.token) {
    redirectByRole();
    return;
  }

  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await SayuriAPI.logout();
      } catch (_) {
        // Aunque el backend falle, la sesión local se elimina.
      } finally {
        SayuriAPI.clearSession();
        location.href = "login.html";
      }
    });
  });

  document.querySelectorAll("[data-login-link]").forEach((element) => {
    element.href = "pages/login.html";
  });

  document.querySelectorAll("[data-user-name]").forEach((element) => {
    const user = session?.user || {};
    element.textContent =
      [user.name, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      "Usuario";
  });

  window.SayuriApp = {
    session,
    redirectByRole
  };
})();