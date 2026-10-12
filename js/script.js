// Menú móvil accesible y año automático.
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector("#main-nav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
  });

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menú");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      mainNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menú");
      menuToggle.focus();
    }
  });
}

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();


// La firma es solo una maqueta: no envía ni almacena credenciales.
const attendanceForm = document.querySelector("#attendance-form");
const attendanceNotice = document.querySelector("#attendance-notice");
if (attendanceForm && attendanceNotice) {
  attendanceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    attendanceNotice.textContent = "La firma en línea todavía no está habilitada.";
    attendanceForm.reset();
  });
}
