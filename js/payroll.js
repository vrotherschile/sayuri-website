(() => {
  const $ = (selector) => document.querySelector(selector);
  const fmt = (n) => new Intl.NumberFormat("es-CL", {
    style: "currency", currency: "CLP", maximumFractionDigits: 0
  }).format(Number(n || 0));
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));

  function monthRange() {
    const year = Number($("#payroll-year").value);
    const month = Number($("#payroll-month").value);
    const last = new Date(year, month + 1, 0).getDate();
    return {
      startDate: `${year}-${String(month + 1).padStart(2, "0")}-01`,
      endDate: `${year}-${String(month + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`
    };
  }

  function render(result) {
    const rows = result.rows || [];
    const totals = result.totals || {};
    $("#payroll-worker-count").textContent = totals.workers ?? 0;
    $("#payroll-event-count").textContent = totals.events ?? 0;
    $("#payroll-signature-count").textContent = totals.signatures ?? 0;
    $("#payroll-bonus-total").textContent = fmt(totals.bonusTotal);
    $("#payroll-total").textContent = fmt(totals.totalPay);
    $("#payroll-effective-total").textContent = fmt(totals.effectivePayment);

    const box = $("#payroll-table");
    if (!rows.length) {
      box.innerHTML = '<div class="empty-state">No existen eventos asignados en este período.</div>';
      return;
    }

    box.innerHTML = `
      <div class="table-wrap payroll-wrap">
        <table class="payroll-table">
          <thead>
            <tr>
              <th>Trabajadora</th>
              <th>Función</th>
              <th>Eventos</th>
              <th>Firmas</th>
              <th>Pago por evento</th>
              <th>Bono total</th>
              <th>Pago total</th>
              <th>Pago efectivo</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td><strong>${esc(r.workerName)}</strong></td>
                <td><span class="function-badge">${esc(r.funcion)}</span></td>
                <td>${Number(r.eventCount || 0)}</td>
                <td>${Number(r.signatureCount || 0)}</td>
                <td>${fmt(r.payPerEvent)}</td>
                <td>${fmt(r.bonusTotal)}</td>
                <td><strong>${fmt(r.totalPay)}</strong></td>
                <td><strong>${fmt(r.effectivePayment)}</strong></td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2"><strong>Total</strong></td>
              <td><strong>${Number(totals.events || 0)}</strong></td>
              <td><strong>${Number(totals.signatures || 0)}</strong></td>
              <td>—</td>
              <td><strong>${fmt(totals.bonusTotal)}</strong></td>
              <td><strong>${fmt(totals.totalPay)}</strong></td>
              <td><strong>${fmt(totals.effectivePayment)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  async function load() {
    const box = $("#payroll-table");
    box.innerHTML = '<div class="loading">Calculando remuneraciones…</div>';
    $("#payroll-message").textContent = "";

    try {
      const range = monthRange();
      const result = await SayuriAPI.payrollSummary(range.startDate, range.endDate);
      render(result);
      $("#payroll-message").textContent =
        `Período: ${range.startDate} al ${range.endDate}. "Eventos" son asignaciones; "Firmas" son asistencias firmadas correctamente. El pago efectivo considera únicamente las firmas válidas. Los bonos mantienen el cálculo retroactivo según los eventos acumulados de cada función.`;
    } catch (error) {
      box.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`;
      $("#payroll-message").textContent = "";
    }
  }

  function init() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    $("#payroll-year").innerHTML = "";
    for (let y = year - 1; y <= year + 2; y++) {
      $("#payroll-year").insertAdjacentHTML("beforeend",
        `<option value="${y}">${y}</option>`);
    }
    $("#payroll-year").value = year;
    $("#payroll-month").value = String(month);
    $("#payroll-refresh").addEventListener("click", load);
    load();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
