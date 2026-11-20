(() => {
  let schedule = [];
  let activeShift = null;

  const $ = (selector) => document.querySelector(selector);
  const pad = (n) => String(n).padStart(2, "0");

  function normalizeDateOnly(value) {
    const raw = String(value || "").trim();

    // ISO / YYYY-MM-DD / YYYY-MM-DDT...
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
    if (iso) {
      return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }

    // Evita mostrar fechas base de Excel/Sheets como 1899-12-30.
    return "";
  }

  function normalizeTimeOnly(value) {
    const raw = String(value || "").trim();

    const match = raw.match(/(?:^|[T\s])(\d{1,2}):(\d{2})(?::\d{2})?/);
    if (!match) return "";

    return `${String(match[1]).padStart(2, "0")}:${match[2]}`;
  }

  function formatDate(dateString) {
    const normalized = normalizeDateOnly(dateString);

    if (!normalized) {
      return "Fecha no disponible";
    }

    const [year, month, day] = normalized.split("-").map(Number);

    return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
  }

  function formatShiftType(type) {
    const value = String(type || "").toUpperCase();
    if (value === "MORNING") return "Mañana";
    if (value === "AFTERNOON") return "Tarde";
    return "Turno único";
  }

  function toDateTime(date, time) {
    const [y, m, d] = String(date).split("-").map(Number);
    const [h, min] = String(time).split(":").map(Number);
    return new Date(y, m - 1, d, h, min, 0, 0);
  }

  function withinWindow(shift) {
    if (!shift.date || !shift.startTime || !shift.endTime) {
      return false;
    }

    const now = new Date();

    const start = toDateTime(
      shift.date,
      shift.startTime
    );

    const end = toDateTime(
      shift.date,
      shift.endTime
    );

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return false;
    }

    const beforeMinutes =
      Number(
        window.SAYURI_CONFIG.ATTENDANCE_BEFORE_MINUTES || 120
      );

    const afterMinutes =
      Number(
        window.SAYURI_CONFIG.ATTENDANCE_AFTER_MINUTES || 120
      );

    const allowedFrom =
      start.getTime() -
      beforeMinutes * 60 * 1000;

    const allowedUntil =
      end.getTime() +
      afterMinutes * 60 * 1000;

    const nowMs =
      now.getTime();

    return (
      nowMs >= allowedFrom &&
      nowMs <= allowedUntil
    );
  }

  async function refreshActiveShift() {
    activeShift = null;

    const candidates = schedule.filter((shift) => withinWindow(shift));
    for (const shift of candidates) {
      try {
        const status = await SayuriAPI.attendanceStatus(shift.assignmentId);
        if (!status.signed) {
          activeShift = shift;
          break;
        }
        shift.attendanceSigned = true;
      } catch (_) {
        // El estado se volverá a consultar cuando el usuario intente firmar.
      }
    }

    const button = $("#sign-btn");
    const help = $("#attendance-help");
    const status = $("#sign-status");

    if (!activeShift) {
      button.disabled = true;
      help.textContent = "No hay un turno dentro de la ventana de firma en este momento.";
      return;
    }

    button.disabled = false;
    help.textContent =
      `${formatShiftType(activeShift.shiftType)} · ${activeShift.startTime}–${activeShift.endTime} · ${activeShift.cargo || "Cargo por definir"}`;

    if (status && !activeShift.attendanceSigned) {
      status.textContent = "";
    }
  }

  function tick() {
    const now = new Date();
    $("#clock").textContent = now.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    refreshActiveShift();
  }

  function renderProfile(worker) {
    const user = SayuriAPI.getSession()?.user || {};
    const name =
      [worker?.name, worker?.lastName].filter(Boolean).join(" ") ||
      [user.name, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      "—";

    document.querySelectorAll("[data-user-name]").forEach((element) => {
      element.textContent = name;
    });

    $("#profile-data").innerHTML = `
      <div><dt>Nombre</dt><dd>${esc(name)}</dd></div>
      <div><dt>Usuario</dt><dd>${esc(user.username || "—")}</dd></div>
      <div><dt>RUT</dt><dd>${esc(worker?.rut || "—")}</dd></div>
      <div><dt>Teléfono</dt><dd>${esc(worker?.phone || "—")}</dd></div>
      <div><dt>Correo</dt><dd>${esc(worker?.email || "—")}</dd></div>
    `;
  }

  function renderSchedule() {
    $("#schedule-count").textContent = schedule.length;
    const box = $("#worker-schedule");
    box.innerHTML = "";

    if (!schedule.length) {
      box.innerHTML = '<div class="empty-state">No tienes turnos asignados.</div>';
      return;
    }

    schedule.forEach((shift) => {
      const card = document.createElement("article");
      card.className = "schedule-item";

      const signed = Boolean(shift.attendanceSigned);

      const displayTime =
        `${esc(shift.startTime || "--:--")}–${esc(shift.endTime || "--:--")}`;

      card.innerHTML = `
        <div class="schedule-date">
          <strong>${esc(formatDate(shift.date))}</strong>
          <small>${esc(formatShiftType(shift.shiftType))}</small>
        </div>
        <div>
          <h3>${esc(shift.cargo || "Función no definida")}</h3>
          <p>${displayTime}</p>
        </div>
        <span class="schedule-status ${signed ? "signed" : ""}">
          ${signed ? "Asistencia firmada" : "Programado"}
        </span>
      `;

      box.appendChild(card);
    });
  }

  async function load() {
    try {
      const result = await SayuriAPI.workerSchedule();
      schedule = (result.schedule || []).map((item) => ({
        ...item,
        date: normalizeDateOnly(item.date),
        startTime: normalizeTimeOnly(item.startTime),
        endTime: normalizeTimeOnly(item.endTime),
        attendanceSigned: false
      }));

      renderProfile(result.worker || {});
      renderSchedule();
      await refreshActiveShift();
    } catch (error) {
      $("#worker-schedule").innerHTML =
        `<div class="empty-state">${esc(error.message)}</div>`;
    }
  }

  async function signCurrentAttendance() {
    if (!activeShift) return;

    const button = $("#sign-btn");
    const status = $("#sign-status");

    button.disabled = true;
    status.textContent = "Registrando asistencia…";

    try {
      const result = await SayuriAPI.signAttendance(activeShift.assignmentId);
      activeShift.attendanceSigned = true;
      status.textContent =
        `Asistencia registrada a las ${new Date(result.serverTime || Date.now()).toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit"
        })}`;
      renderSchedule();
      await refreshActiveShift();
    } catch (error) {
      status.textContent = error.message;
      await refreshActiveShift();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#sign-btn").addEventListener("click", signCurrentAttendance);
    load();
    tick();
    setInterval(tick, 15000);
  });

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }
})();