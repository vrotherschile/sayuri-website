(() => {
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const state = {
    year: Number(window.SAYURI_CONFIG.DEFAULT_YEAR),
    month: new Date().getMonth() === 11 ? 11 : 10,
    workers: [],
    shifts: [],
    selectedWorkers: new Set()
  };

  const $ = (selector) => document.querySelector(selector);
  const pad = (n) => String(n).padStart(2, "0");

  function isoDate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function normalizeShift(shift) {
    const rawDate = shift.date || shift.scheduledDate || "";
    const normalizedDate = String(rawDate).substring(0, 10);

    return {
      ...shift,
      shiftId: shift.shiftId || shift.id,
      date: normalizedDate,
      shiftType: String(shift.shiftType || shift.type || "SINGLE").toUpperCase(),
      startTime: shift.startTime || shift.start || "",
      endTime: shift.endTime || shift.end || "",
      description: shift.description || shift.position || "",
      assignments: Array.isArray(shift.assignments) ? shift.assignments : []
    };
  }

  function formatType(type) {
    const value = String(type || "").toUpperCase();
    if (value === "MORNING") return "Mañana";
    if (value === "AFTERNOON") return "Tarde";
    return "Único";
  }

  function initYear() {
    const select = $("#year-select");
    select.innerHTML = "";

    for (let year = state.year - 1; year <= state.year + 2; year++) {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      select.appendChild(option);
    }

    select.value = state.year;
  }

  function changeMonth(delta) {
    state.month += delta;
    if (state.month < 10) state.month = 11;
    if (state.month > 11) state.month = 10;
    load();
  }

  async function load() {
    $("#calendar").innerHTML = '<div class="loading">Cargando planificación…</div>';

    try {
      const [workersResult, shiftsResult] = await Promise.all([
        SayuriAPI.workers(),
        SayuriAPI.shifts()
      ]);

      state.workers = (workersResult.workers || []).filter((worker) => worker.active !== false);
      state.shifts = (shiftsResult.shifts || []).map(normalizeShift);

      $("#worker-count").textContent = state.workers.length;

      renderWorkers();
      renderCalendar();
      renderAttendance();
    } catch (error) {
      $("#calendar").innerHTML =
        `<div class="empty-state">No se pudo cargar la información: ${esc(error.message)}</div>`;
    }
  }

  function renderWorkers() {
    const box = $("#workers-list");
    box.innerHTML = "";

    if (!state.workers.length) {
      box.innerHTML = '<div class="empty-state">No hay trabajadores disponibles.</div>';
      return;
    }

    state.workers.forEach((worker) => {
      const fullName = [worker.name, worker.lastName].filter(Boolean).join(" ");
      const element = document.createElement("article");
      element.className = "worker-chip";
      element.innerHTML = `
        <div class="avatar">${esc((worker.name || worker.username || "?").charAt(0).toUpperCase())}</div>
        <div>
          <strong>${esc(fullName || worker.username)}</strong>
          <small>${"Trabajadora activa"} · ${esc(worker.username || "")}</small>
        </div>
      `;
      box.appendChild(element);
    });
  }

  function renderCalendar() {
    $("#month-label").textContent = monthNames[state.month];

    const calendar = $("#calendar");
    calendar.innerHTML = "";

    ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].forEach((day) => {
      const header = document.createElement("div");
      header.className = "calendar-day-name";
      header.textContent = day;
      calendar.appendChild(header);
    });

    const first = new Date(state.year, state.month, 1);
    const last = new Date(state.year, state.month + 1, 0);
    const offset = (first.getDay() + 6) % 7;

    for (let i = 0; i < offset; i++) {
      calendar.appendChild(document.createElement("div"));
    }

    for (let day = 1; day <= last.getDate(); day++) {
      const date = `${state.year}-${pad(state.month + 1)}-${pad(day)}`;
      const cell = document.createElement("article");
      cell.className = "calendar-cell";

      const dayShifts = state.shifts.filter((shift) => shift.date === date);

      cell.innerHTML = `
        <div class="day-top">
          <strong>${day}</strong>
          <button class="mini-add" type="button" data-date="${date}" title="Crear turno">+</button>
        </div>
      `;

      if (!dayShifts.length) {
        cell.insertAdjacentHTML("beforeend", '<span class="empty-day">Sin turnos</span>');
      } else {
        dayShifts.forEach((shift) => {
          const workerCount = shift.assignments.length;
          const item = document.createElement("button");
          item.className = `shift-mini ${String(shift.shiftType).toLowerCase()}`;
          item.type = "button";
          item.innerHTML = `
            <span>${esc(formatType(shift.shiftType))}</span>
            <strong>${esc(shift.startTime)}–${esc(shift.endTime)}</strong>
            <small>${esc(shift.description || "Sin descripción")} · ${workerCount} pers.</small>
          `;
          item.addEventListener("click", () => openEdit(shift));
          cell.appendChild(item);
        });
      }

      calendar.appendChild(cell);
    }

    calendar.querySelectorAll(".mini-add").forEach((button) => {
      button.addEventListener("click", () => openNew(button.dataset.date));
    });
  }

  function renderPicker(assignments = []) {
    const selected = assignments.map((assignment) => assignment.workerId);
    state.selectedWorkers = new Set(selected);

    const box = $("#worker-picker");
    box.innerHTML = "";

    state.workers.forEach((worker) => {
      const existing = assignments.find((assignment) => assignment.workerId === worker.workerId);
      const label = document.createElement("label");
      label.className = "picker-item picker-item-function";

      label.innerHTML = `
        <input type="checkbox" value="${esc(worker.workerId)}" ${state.selectedWorkers.has(worker.workerId) ? "checked" : ""}>
        <span class="picker-worker-info">
          <strong>${esc([worker.name, worker.lastName].filter(Boolean).join(" ") || worker.username)}</strong>
          <small>Selecciona una función para este evento</small>
        </span>
        <select class="assignment-function" data-worker-id="${esc(worker.workerId)}">
          <option value="">Función…</option>
          <option value="MASAJISTA" ${String(existing?.cargo || "").toUpperCase() === "MASAJISTA" ? "selected" : ""}>Masajista</option>
          <option value="MANICURISTA" ${String(existing?.cargo || "").toUpperCase() === "MANICURISTA" ? "selected" : ""}>Manicurista</option>
          <option value="TATUADOR(A)" ${String(existing?.cargo || "").toUpperCase() === "TATUADOR(A)" ? "selected" : ""}>Tatuador(a)</option>
        </select>
      `;

      const checkbox = label.querySelector("input");
      const select = label.querySelector("select");

      checkbox.addEventListener("change", (event) => {
        if (event.target.checked) {
          state.selectedWorkers.add(worker.workerId);
        } else {
          state.selectedWorkers.delete(worker.workerId);
          select.value = "";
        }
        $("#selected-count").textContent = state.selectedWorkers.size;
      });

      select.addEventListener("change", () => {
        if (select.value) {
          checkbox.checked = true;
          state.selectedWorkers.add(worker.workerId);
        }
        $("#selected-count").textContent = state.selectedWorkers.size;
      });

      box.appendChild(label);
    });

    $("#selected-count").textContent = state.selectedWorkers.size;
    renderCurrentAssignments(assignments);
  }

  function renderCurrentAssignments(assignments = []) {
    const box = $("#current-assignments");
    if (!box) return;

    box.innerHTML = "";

    if (!assignments.length) {
      box.innerHTML = '<div class="empty-state compact">Aún no hay trabajadores asignados.</div>';
      return;
    }

    assignments.forEach((assignment) => {
      const row = document.createElement("div");
      row.className = "assignment-row";
      row.innerHTML = `
        <div>
          <strong>${esc(assignment.workerName || assignment.workerId)}</strong>
          <small>${esc(assignment.cargo || "Función no definida")}</small>
        </div>
        <button type="button" class="remove-assignment" data-id="${esc(assignment.assignmentId)}">Quitar</button>
      `;

      row.querySelector(".remove-assignment").addEventListener("click", async () => {
        if (!confirm("¿Quitar a este trabajador del turno?")) return;

        try {
          await SayuriAPI.removeAssignment(assignment.assignmentId);
          await load();
          const refreshed = state.shifts.find((shift) => shift.shiftId === $("#shift-form").dataset.id);
          if (refreshed) {
            renderPicker(refreshed.assignments);
          }
        } catch (error) {
          $("#shift-message").textContent = error.message;
        }
      });

      box.appendChild(row);
    });
  }

  function openNew(date = isoDate(new Date())) {
    $("#shift-title").textContent = "Crear turno";
    $("#shift-form").dataset.id = "";
    $("#shift-date").value = date;
    $("#shift-type").value = "MORNING";
    $("#shift-start").value = "09:00";
    $("#shift-end").value = "13:00";
    $("#shift-description").value = "";
    $("#shift-message").textContent = "";
    $("#delete-shift").hidden = true;
    renderPicker([]);
    $("#shift-modal").hidden = false;
  }

  function openEdit(shift) {
    $("#shift-title").textContent = "Editar turno";
    $("#shift-form").dataset.id = shift.shiftId;
    $("#shift-date").value = shift.date;
    $("#shift-type").value = shift.shiftType;
    $("#shift-start").value = shift.startTime;
    $("#shift-end").value = shift.endTime;
    $("#shift-description").value = shift.description || "";
    $("#shift-message").textContent = "";
    $("#delete-shift").hidden = false;
    renderPicker(shift.assignments || []);
    $("#shift-modal").hidden = false;
  }

  function closeModal() {
    $("#shift-modal").hidden = true;
  }

  async function save(event) {
    event.preventDefault();

    const message = $("#shift-message");
    message.textContent = "Guardando…";

    const shiftId = event.target.dataset.id || "";
    const data = {
      shiftId,
      date: $("#shift-date").value,
      shiftType: $("#shift-type").value,
      startTime: $("#shift-start").value,
      endTime: $("#shift-end").value,
      description: $("#shift-description").value.trim()
    };

    if (!data.date || !data.startTime || !data.endTime) {
      message.textContent = "Completa fecha, hora de inicio y hora de término.";
      return;
    }

    if (data.startTime >= data.endTime) {
      message.textContent = "El horario de término debe ser posterior al inicio.";
      return;
    }

    if (!state.selectedWorkers.size) {
      message.textContent = "Selecciona al menos un trabajador para formar el equipo.";
      return;
    }

    // Validar primero la configuración completa del equipo.
    // Así no se modifica el evento actual si falta una función.
    const selectedIds = [...state.selectedWorkers];
    const assignmentPayload = selectedIds.map((workerId) => {
      const select = document.querySelector(`.assignment-function[data-worker-id="${workerId}"]`);
      return { workerId, cargo: select?.value || "" };
    });

    if (assignmentPayload.some((item) => !item.cargo)) {
      message.textContent = "Cada trabajadora seleccionada debe tener una función.";
      return;
    }

    try {
      let savedShiftId = shiftId;

      if (shiftId) {
        await SayuriAPI.updateShift(data);

        const current = state.shifts.find((shift) => shift.shiftId === shiftId);
        const previousAssignments = current?.assignments || [];

        const previousIds = previousAssignments.map((assignment) => assignment.workerId);

        for (const assignment of previousAssignments) {
          if (!state.selectedWorkers.has(assignment.workerId)) {
            await SayuriAPI.removeAssignment(assignment.assignmentId);
          }
        }

        const newWorkers = assignmentPayload.filter((item) => !previousIds.includes(item.workerId));

        if (newWorkers.length) {
          await SayuriAPI.assignWorkers(savedShiftId, newWorkers);
        }

        for (const assignment of previousAssignments) {
          const current = assignmentPayload.find((item) => item.workerId === assignment.workerId);
          if (current) {
            await SayuriAPI.updateAssignment(assignment.assignmentId, {
              cargo: current.cargo
            });
          }
        }
      } else {
        const result = await SayuriAPI.createShift(data);
        savedShiftId = result.shift.shiftId;

        await SayuriAPI.assignWorkers(savedShiftId, assignmentPayload);
      }

      message.textContent = "Turno y equipo guardados correctamente.";
      await load();

      setTimeout(() => {
        closeModal();
      }, 500);
    } catch (error) {
      message.textContent = error.message;
    }
  }

  async function deleteCurrentShift() {
    const shiftId = $("#shift-form").dataset.id;
    if (!shiftId) return;

    if (!confirm("¿Desactivar este turno? Las asignaciones existentes quedarán asociadas al registro histórico.")) {
      return;
    }

    $("#shift-message").textContent = "Desactivando turno…";

    try {
      await SayuriAPI.deleteShift(shiftId);
      closeModal();
      await load();
    } catch (error) {
      $("#shift-message").textContent = error.message;
    }
  }

  async function renderAttendance() {
    const box = $("#attendance-table");
    if (!box) return;

    try {
      const result = await SayuriAPI.adminAttendance();
      const records = result.attendance || [];

      if (!records.length) {
        box.innerHTML = '<div class="empty-state">Todavía no existen registros de asistencia.</div>';
        return;
      }

      const rows = records
        .sort((a, b) => String(b.signedAt).localeCompare(String(a.signedAt)))
        .map((record) => {
          const signedAt = record.signedAt
            ? new Date(record.signedAt).toLocaleString("es-CL", {
                dateStyle: "short",
                timeStyle: "short"
              })
            : "—";

          return `
            <tr>
              <td>${esc(record.workerName || "—")}</td>
              <td>${esc(record.date || "—")}</td>
              <td>${esc(formatType(record.shiftType))}</td>
              <td>${esc(record.startTime || "—")}–${esc(record.endTime || "—")}</td>
              <td>${esc(record.cargo || "—")}</td>
              <td><strong class="attendance-signed">Firmado</strong></td>
              <td>${esc(signedAt)}</td>
            </tr>
          `;
        })
        .join("");

      box.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Fecha</th>
                <th>Turno</th>
                <th>Horario</th>
                <th>Cargo</th>
                <th>Estado</th>
                <th>Firma</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    } catch (error) {
      box.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`;
    }
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  document.addEventListener("DOMContentLoaded", () => {
    initYear();
    load();

    $("#prev-month").addEventListener("click", () => changeMonth(-1));
    $("#next-month").addEventListener("click", () => changeMonth(1));
    $("#year-select").addEventListener("change", (event) => {
      state.year = Number(event.target.value);
      load();
    });

    $("#new-shift").addEventListener("click", () => openNew());
    $("#close-modal").addEventListener("click", closeModal);
    $("#cancel-shift").addEventListener("click", closeModal);
    $("#shift-form").addEventListener("submit", save);
    $("#delete-shift").addEventListener("click", deleteCurrentShift);
    $("#refresh-attendance").addEventListener("click", renderAttendance);
  });
})();