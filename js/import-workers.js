(() => {
  let rows = [];

  const $ = (selector) => document.querySelector(selector);

  function normalize(row) {
    return {
      username: String(row.username || row.Usuario || "").trim(),
      password: String(row.password || row.Contraseña || "").trim(),
      name: String(row.name || row.Nombre || "").trim(),
      lastName: String(row.lastName || row.Apellido || "").trim(),
      rut: String(row.rut || row.RUT || "").trim(),
      email: String(row.email || row.Email || "").trim(),
      phone: String(row.phone || row.Telefono || "").trim()
    };
  }

  function render() {
    const box = $("#preview");

    if (!rows.length) {
      box.innerHTML = "";
      $("#import-btn").disabled = true;
      return;
    }

    const columns = ["username", "name", "lastName", "rut", "phone", "email", "password"];

    box.innerHTML = `
      <table>
        <thead>
          <tr>${columns.map((column) => `<th>${esc(column)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${columns.map((column) => `
                <td>${esc(column === "password" ? "••••••" : row[column] || "")}</td>
              `).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    $("#import-btn").disabled = rows.some(
      (row) => !row.username || !row.password || !row.name
    );
  }

  $("#worker-file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    $("#import-message").textContent = "Leyendo archivo…";

    try {
      if (!window.XLSX) {
        throw new Error("No se cargó el lector Excel. Revisa tu conexión.");
      }

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      rows = XLSX.utils
        .sheet_to_json(sheet, { defval: "" })
        .map(normalize);

      render();
      $("#import-message").textContent =
        `${rows.length} registros listos para importar.`;
    } catch (error) {
      rows = [];
      render();
      $("#import-message").textContent = error.message;
    }
  });

  $("#import-btn").addEventListener("click", async () => {
    const message = $("#import-message");
    message.textContent = "Enviando trabajadores a la API…";
    $("#import-btn").disabled = true;

    try {
      const result = await SayuriAPI.importWorkers(rows);
      const created = result.created?.length || 0;
      const errors = result.errors?.length || 0;

      message.textContent =
        `Importación completada: ${created} creados${errors ? ` y ${errors} con error` : ""}.`;

      rows = [];
      render();
    } catch (error) {
      message.textContent = error.message;
      $("#import-btn").disabled = false;
    }
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