(() => {
  const cfg = window.SAYURI_CONFIG || {};
  const STORAGE_KEY = "sayuri_session";

  function getSession() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
    catch { return null; }
  }
  function setSession(session) { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); }
  function clearSession() { localStorage.removeItem(STORAGE_KEY); }

  async function request(action, payload = {}, method = "POST") {
    if (cfg.API_MODE === "demo") return demoRequest(action, payload);
    if (!cfg.API_BASE_URL) throw new Error("API_BASE_URL no está configurada.");
    const url = method === "GET"
      ? `${cfg.API_BASE_URL}?action=${encodeURIComponent(action)}&${new URLSearchParams(payload)}`
      : cfg.API_BASE_URL;
    const options = { method, headers: { "Content-Type": "application/json" } };
    if (method !== "GET") options.body = JSON.stringify({ action, ...payload });
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({ ok: false, message: "Respuesta inválida del servidor." }));
    if (!response.ok || data.ok === false) throw new Error(data.message || "No fue posible completar la operación.");
    return data;
  }

  function demoRequest(action, payload) {
    const demoWorkers = [
      { id: "W001", username: "ana", name: "Ana González", role: "Masajista", phone: "+56 9 1111 1111", active: true },
      { id: "W002", username: "camila", name: "Camila Rojas", role: "Masajista", phone: "+56 9 2222 2222", active: true },
      { id: "W003", username: "sofia", name: "Sofía Pérez", role: "Coordinadora", phone: "+56 9 3333 3333", active: true }
    ];
    const today = new Date();
    const pad = n => String(n).padStart(2, "0");
    const date = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
    const demoShifts = [
      { id: "S-DEMO-01", date, type: "morning", label: "Turno mañana", start: "09:00", end: "13:00", position: "Masajista", status: "scheduled", workerIds: ["W001","W002"] }
    ];
    if (action === "login") return Promise.resolve({ ok: true, token: "demo-token", user: payload.username === "admin" ? { id:"A001", username:"admin", name:"Administración", role:"admin" } : demoWorkers[0] });
    if (action === "workers") return Promise.resolve({ ok: true, workers: demoWorkers });
    if (action === "shifts") return Promise.resolve({ ok: true, shifts: demoShifts });
    if (action === "assignments") return Promise.resolve({ ok: true, assignments: [] });
    if (action === "attendance/status") return Promise.resolve({ ok: true, attendance: null });
    return Promise.resolve({ ok: true, message: "Operación demo completada." });
  }

  window.SayuriAPI = {
    getSession, setSession, clearSession,
    login: (username, password) => request("login", { username, password }),
    workers: () => request("workers", { token: getSession()?.token }),
    shifts: (year) => request("shifts", { token: getSession()?.token, year }),
    createShift: data => request("shift/create", { token: getSession()?.token, ...data }),
    updateShift: data => request("shift/update", { token: getSession()?.token, ...data }),
    assignWorkers: (shiftId, workerIds) => request("shift/assign", { token: getSession()?.token, shiftId, workerIds }),
    workerSchedule: () => request("worker/schedule", { token: getSession()?.token }),
    attendanceStatus: shiftId => request("attendance/status", { token: getSession()?.token, shiftId }),
    signAttendance: shiftId => request("attendance/sign", { token: getSession()?.token, shiftId }),
    importWorkers: workers => request("workers/import", { token: getSession()?.token, workers }),
  };
})();
