(() => {
  const cfg = window.SAYURI_CONFIG || {};
  const STORAGE_KEY = "sayuri_session";
  const LEGACY_STORAGE_KEY = "sayuri_session";

  function getSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function setSession(session) {
    const normalized = {
      token: session?.token || "",
      user: normalizeUser(session?.user || {})
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return normalized;
  }

  function clearSession() {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  function normalizeUser(user) {
    return {
      userId: user.userId ?? user.id ?? "",
      username: user.username ?? "",
      role: String(user.role ?? "").toUpperCase(),
      workerId: user.workerId ?? "",
      name: user.name ?? "",
      lastName: user.lastName ?? "",
      cargoDefault: user.cargoDefault ?? user.roleTitle ?? "",
      mustChangePassword: Boolean(user.mustChangePassword)
    };
  }

  function serializeValue(value) {
    if (value === undefined || value === null) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  async function request(action, payload = {}) {
    if (cfg.API_MODE === "demo") {
      return demoRequest(action, payload);
    }

    if (!cfg.API_BASE_URL || cfg.API_BASE_URL.includes("YOUR_")) {
      throw new Error("API_BASE_URL no está configurada.");
    }

    const body = new URLSearchParams();
    body.set("action", action);

    Object.entries(payload).forEach(([key, value]) => {
      body.set(key, serializeValue(value));
    });

    let response;
    try {
      response = await fetch(cfg.API_BASE_URL, {
        method: "POST",
        body
      });
    } catch (error) {
      throw new Error("No se pudo conectar con el servidor de Sayuri. Verifica la URL /exec y que la aplicación web de Apps Script esté publicada.");
    }

    let data;
    try {
      data = await response.json();
    } catch (_) {
      throw new Error("El servidor devolvió una respuesta inválida.");
    }

    if (!response.ok || data.success === false) {
      const error = new Error(data.message || mapApiError(data.error));
      error.code = data.error || "API_ERROR";
      error.data = data;
      throw error;
    }

    return data;
  }

  function mapApiError(code) {
    const messages = {
      INVALID_LOGIN: "Usuario o contraseña incorrectos.",
      USER_INACTIVE: "La cuenta está desactivada.",
      UNAUTHORIZED: "Tu sesión ya no es válida. Ingresa nuevamente.",
      TOO_EARLY: "La firma todavía no está disponible.",
      TOO_LATE: "El período permitido para firmar ha finalizado.",
      ALREADY_SIGNED: "Este turno ya fue firmado.",
      ASSIGNMENT_NOT_YOURS: "Esta asignación no pertenece al trabajador.",
      SHIFT_NOT_FOUND: "El turno no existe.",
      WORKER_NOT_FOUND: "El trabajador no existe.",
      UNKNOWN_ACTION: "La operación solicitada no existe en la API.",
      SERVER_ERROR: "El servidor de Sayuri encontró un error."
    };
    return messages[code] || "No fue posible completar la operación.";
  }

  function ensureAuthenticated() {
    const session = getSession();
    if (!session?.token) {
      throw new Error("No hay una sesión activa.");
    }
    return session;
  }

  const api = {
    getSession,
    setSession,
    clearSession,
    request,
    ping: () => request("ping"),
    me: () => request("me", { token: getSession()?.token }),
    login: (username, password) => request("login", { username, password }),
    logout: () => request("logout", { token: getSession()?.token }),
    workers: () => request("listWorkers", { token: getSession()?.token }),
    createWorker: data => request("createWorker", { token: getSession()?.token, ...data }),
    updateWorker: data => request("updateWorker", { token: getSession()?.token, ...data }),
    importWorkers: workers => request("importWorkers", { token: getSession()?.token, workers }),
    shifts: () => request("listShifts", { token: getSession()?.token }),
    createShift: data => request("createShift", { token: getSession()?.token, ...data }),
    updateShift: data => request("updateShift", { token: getSession()?.token, ...data }),
    deleteShift: shiftId => request("deleteShift", { token: getSession()?.token, shiftId }),
    assignWorkers: (shiftId, workers) => request("assignWorkers", { token: getSession()?.token, shiftId, workers }),
    removeAssignment: assignmentId => request("removeAssignment", { token: getSession()?.token, assignmentId }),
    updateAssignment: (assignmentId, data) => request("updateAssignment", { token: getSession()?.token, assignmentId, ...data }),
    workerSchedule: workerId => request("mySchedule", { token: getSession()?.token, ...(workerId ? { workerId } : {}) }),
    attendanceStatus: assignmentId => request("attendanceStatus", { token: getSession()?.token, assignmentId }),
    signAttendance: assignmentId => request("signAttendance", {
      token: getSession()?.token,
      assignmentId,
      userAgent: navigator.userAgent
    }),
    adminAttendance: () => request("adminAttendance", { token: getSession()?.token }),
    payrollSummary: (startDate, endDate) => request("payrollSummary", { token: getSession()?.token, startDate, endDate }),
    ensureAuthenticated
  };

  function demoRequest(action, payload) {
    if (action === "login") {
      const isAdmin = String(payload.username).toLowerCase() === "admin";
      return Promise.resolve({
        success: true,
        token: "demo-token",
        user: {
          userId: isAdmin ? "USR-DEMO-ADMIN" : "USR-DEMO-WORKER",
          username: payload.username,
          role: isAdmin ? "ADMIN" : "WORKER",
          workerId: isAdmin ? "" : "WRK-DEMO-01",
          name: isAdmin ? "Administración" : "Ana González",
          lastName: "",
          cargoDefault: isAdmin ? "Administración" : "Masajista"
        }
      });
    }

    if (action === "listWorkers") {
      return Promise.resolve({
        success: true,
        workers: [
          { workerId: "WRK-DEMO-01", username: "ana", name: "Ana", lastName: "González", cargoDefault: "Masajista", active: true },
          { workerId: "WRK-DEMO-02", username: "camila", name: "Camila", lastName: "Rojas", cargoDefault: "Masajista", active: true }
        ]
      });
    }

    if (action === "listShifts") {
      return Promise.resolve({ success: true, shifts: [] });
    }

    if (action === "mySchedule") {
      return Promise.resolve({ success: true, worker: {}, schedule: [] });
    }

    if (action === "attendanceStatus") {
      return Promise.resolve({ success: true, signed: false, attendance: null });
    }

    return Promise.resolve({ success: true, message: "Operación demo completada." });
  }

  window.SayuriAPI = api;
})();