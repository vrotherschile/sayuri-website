(() => {
  let schedule = [];
  let activeShift = null;

  const $ = (selector) => document.querySelector(selector);
  const pad = (n) => String(n).padStart(2, "0");

  /*
   * Normaliza una fecha proveniente de Google Sheets / Apps Script.
   *
   * Formato esperado:
   * YYYY-MM-DD
   *
   * También acepta:
   * YYYY-MM-DDTHH:mm:ss
   * YYYY-MM-DD HH:mm:ss
   */
  function normalizeDateOnly(value) {
    const raw = String(value || "").trim();

    if (!raw) {
      return "";
    }

    // YYYY-MM-DD, con o sin hora posterior.
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);

    if (iso) {
      return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }

    // Si por alguna razón llega como DD-MM-YYYY.
    const latin = raw.match(/^(\d{2})-(\d{2})-(\d{4})(?:[T\s].*)?$/);

    if (latin) {
      return `${latin[3]}-${latin[2]}-${latin[1]}`;
    }

    // Evita que valores inválidos de Sheets/Excel,
    // como 1899-12-30 utilizados internamente para horas,
    // sean tratados como fechas de turno.
    return "";
  }

  /*
   * Normaliza una hora.
   *
   * Formatos aceptados:
   * 13:00
   * 13:00:00
   * 2026-11-20T13:00:00
   * 1899-12-30T13:00:00
   *
   * En todos los casos devuelve:
   * HH:mm
   */
  function normalizeTimeOnly(value) {
    const raw = String(value || "").trim();

    if (!raw) {
      return "";
    }

    // Busca una hora HH:mm o H:mm en cualquier parte del valor.
    const match = raw.match(/(?:^|[T\s])(\d{1,2}):(\d{2})(?::\d{2})?/);

    if (!match) {
      return "";
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return "";
    }

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  /*
   * Convierte YYYY-MM-DD a:
   * DD-MM-YYYY
   *
   * Este es solamente el formato visual
   * que verá la trabajadora.
   */
  function formatDate(dateString) {
    const normalized = normalizeDateOnly(dateString);

    if (!normalized) {
      return "Fecha no disponible";
    }

    const [year, month, day] = normalized.split("-").map(Number);

    if (
      !year ||
      !month ||
      !day ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return "Fecha no disponible";
    }

    return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
  }

  function formatShiftType(type) {
    const value = String(type || "").toUpperCase();

    if (value === "MORNING") {
      return "Mañana";
    }

    if (value === "AFTERNOON") {
      return "Tarde";
    }

    return "Turno único";
  }

  /*
   * Convierte la fecha y hora del turno en un Date local.
   *
   * IMPORTANTE:
   * La fecha utilizada para firmar es la fecha real
   * del turno, no la fecha visual DD-MM-YYYY.
   */
  function toDateTime(date, time) {
    const normalizedDate = normalizeDateOnly(date);
    const normalizedTime = normalizeTimeOnly(time);

    if (!normalizedDate || !normalizedTime) {
      return new Date(NaN);
    }

    const [y, m, d] = normalizedDate.split("-").map(Number);
    const [h, min] = normalizedTime.split(":").map(Number);

    return new Date(
      y,
      m - 1,
      d,
      h,
      min,
      0,
      0
    );
  }

  /*
   * Determina si el turno está dentro de la ventana
   * permitida para firmar.
   *
   * Por defecto:
   * 60 minutos antes
   * hasta
   * 60 minutos después del inicio.
   */
  function withinWindow(shift) {
    if (!shift.date || !shift.startTime) {
      return false;
    }

    const now = new Date();

    const start = toDateTime(
      shift.date,
      shift.startTime
    );

    if (Number.isNaN(start.getTime())) {
      return false;
    }

    const diff =
      (now.getTime() - start.getTime()) / 60000;

    const limit =
      Number(
        window.SAYURI_CONFIG?.ATTENDANCE_WINDOW_MINUTES || 60
      );

    return (
      diff >= -limit &&
      diff <= limit
    );
  }

  /*
   * Busca el turno que actualmente puede ser firmado.
   */
  async function refreshActiveShift() {
    activeShift = null;

    const candidates =
      schedule.filter((shift) =>
        withinWindow(shift)
      );

    for (const shift of candidates) {

      try {

        const status =
          await SayuriAPI.attendanceStatus(
            shift.assignmentId
          );

        if (!status.signed) {

          activeShift = shift;
          break;

        }

        shift.attendanceSigned = true;

      } catch (_) {

        /*
         * Si falla la consulta de estado,
         * no se habilita automáticamente
         * una firma incorrecta.
         *
         * El estado se volverá a consultar
         * cuando corresponda.
         */
      }
    }

    const button =
      $("#sign-btn");

    const help =
      $("#attendance-help");

    const status =
      $("#sign-status");

    if (!activeShift) {

      button.disabled = true;

      help.textContent =
        "No hay un turno dentro de la ventana de firma en este momento.";

      return;
    }

    button.disabled = false;

    help.textContent =
      `${formatShiftType(activeShift.shiftType)} · ` +
      `${activeShift.startTime || "--:--"}–${activeShift.endTime || "--:--"} · ` +
      `${activeShift.cargo || "Función no definida"}`;

    if (
      status &&
      !activeShift.attendanceSigned
    ) {
      status.textContent = "";
    }
  }

  function tick() {

    const now =
      new Date();

    $("#clock").textContent =
      now.toLocaleTimeString(
        "es-CL",
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }
      );

    refreshActiveShift();
  }

  function renderProfile(worker) {

    const user =
      SayuriAPI.getSession()?.user || {};

    const name =
      [
        worker?.name,
        worker?.lastName
      ]
        .filter(Boolean)
        .join(" ") ||

      [
        user.name,
        user.lastName
      ]
        .filter(Boolean)
        .join(" ") ||

      user.username ||
      "—";

    document
      .querySelectorAll("[data-user-name]")
      .forEach((element) => {

        element.textContent =
          name;

      });

    $("#profile-data").innerHTML = `

      <div>
        <dt>Nombre</dt>
        <dd>${esc(name)}</dd>
      </div>

      <div>
        <dt>Usuario</dt>
        <dd>${esc(user.username || "—")}</dd>
      </div>

      <div>
        <dt>RUT</dt>
        <dd>${esc(worker?.rut || "—")}</dd>
      </div>

      <div>
        <dt>Teléfono</dt>
        <dd>${esc(worker?.phone || "—")}</dd>
      </div>

      <div>
        <dt>Correo</dt>
        <dd>${esc(worker?.email || "—")}</dd>
      </div>

    `;
  }

  /*
   * Renderiza el calendario de la trabajadora.
   *
   * Se muestra únicamente:
   * - Fecha DD-MM-YYYY
   * - Mañana/Tarde/Turno único
   * - Función
   * - Hora inicio
   * - Hora término
   * - Estado de firma
   */
  function renderSchedule() {

    $("#schedule-count").textContent =
      schedule.length;

    const box =
      $("#worker-schedule");

    box.innerHTML = "";

    if (!schedule.length) {

      box.innerHTML =
        '<div class="empty-state">No tienes turnos asignados.</div>';

      return;
    }

    schedule.forEach((shift) => {

      const card =
        document.createElement("article");

      card.className =
        "schedule-item";

      const signed =
        Boolean(
          shift.attendanceSigned
        );

      const date =
        formatDate(
          shift.date
        );

      const startTime =
        normalizeTimeOnly(
          shift.startTime
        ) || "--:--";

      const endTime =
        normalizeTimeOnly(
          shift.endTime
        ) || "--:--";

      const displayTime =
        `${esc(startTime)}–${esc(endTime)}`;

      card.innerHTML = `

        <div class="schedule-date">

          <strong>
            ${esc(date)}
          </strong>

          <small>
            ${esc(
              formatShiftType(
                shift.shiftType
              )
            )}
          </small>

        </div>

        <div>

          <h3>
            ${esc(
              shift.cargo ||
              "Función no definida"
            )}
          </h3>

          <p>
            ${displayTime}
          </p>

        </div>

        <span
          class="schedule-status ${
            signed ? "signed" : ""
          }"
        >
          ${
            signed
              ? "Asistencia firmada"
              : "Programado"
          }
        </span>

      `;

      box.appendChild(card);

    });
  }

  /*
   * Carga los turnos desde Apps Script.
   */
  async function load() {

    try {

      const result =
        await SayuriAPI.workerSchedule();

      /*
       * Normalizamos inmediatamente los datos
       * recibidos del backend.
       *
       * Esto evita que valores de Google Sheets
       * como:
       *
       * 1899-12-30T13:00:00
       *
       * lleguen al resto de la aplicación.
       */
      schedule =
        (result.schedule || [])
          .map((item) => ({

            ...item,

            date:
              normalizeDateOnly(
                item.date
              ),

            startTime:
              normalizeTimeOnly(
                item.startTime
              ),

            endTime:
              normalizeTimeOnly(
                item.endTime
              ),

            attendanceSigned:
              false

          }));

      renderProfile(
        result.worker || {}
      );

      renderSchedule();

      await refreshActiveShift();

    } catch (error) {

      $("#worker-schedule").innerHTML =
        `<div class="empty-state">${esc(error.message)}</div>`;

    }
  }

  /*
   * Firma el turno actualmente habilitado.
   */
  async function signCurrentAttendance() {

    if (!activeShift) {
      return;
    }

    const button =
      $("#sign-btn");

    const status =
      $("#sign-status");

    button.disabled = true;

    status.textContent =
      "Registrando asistencia…";

    try {

      const result =
        await SayuriAPI.signAttendance(
          activeShift.assignmentId
        );

      activeShift.attendanceSigned =
        true;

      status.textContent =
        `Asistencia registrada a las ${
          new Date(
            result.serverTime ||
            Date.now()
          ).toLocaleTimeString(
            "es-CL",
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          )
        }`;

      renderSchedule();

      await refreshActiveShift();

    } catch (error) {

      status.textContent =
        error.message;

      await refreshActiveShift();

    }
  }

  /*
   * Inicialización.
   */
  document.addEventListener(
    "DOMContentLoaded",
    () => {

      $("#sign-btn")
        .addEventListener(
          "click",
          signCurrentAttendance
        );

      load();

      tick();

      /*
       * Actualiza la disponibilidad
       * de firma cada 15 segundos.
       */
      setInterval(
        tick,
        15000
      );

    }
  );

  /*
   * Escape HTML para evitar que los
   * datos provenientes del backend
   * sean interpretados como HTML.
   */
  function esc(value) {

    return String(
      value ?? ""
    ).replace(
      /[&<>"']/g,
      (char) => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"

      }[char])
    );

  }

})();