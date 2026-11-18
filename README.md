# Estética Spa Sayuri — Sitio + Portal RRHH

Proyecto responsive para Estética Spa Sayuri, con el sitio público y un portal de gestión de trabajadores.

## Estructura

- `index.html` — sitio público.
- `pages/login.html` — acceso de usuarios.
- `pages/admin.html` — planificación de turnos y equipos.
- `pages/worker.html` — calendario personal y firma de asistencia.
- `pages/import-workers.html` — importación de trabajadores mediante Excel.
- `js/config.js` — configuración de la API.
- `js/api.js` — capa de comunicación con Google Apps Script.
- `js/admin.js` — lógica de planificación.
- `js/worker.js` — lógica del trabajador y firma.
- `js/import-workers.js` — lectura/importación Excel.
- `backend/Code.gs` — backend inicial para Google Apps Script.
- `templates/plantilla-trabajadores.xlsx` — plantilla Excel.

## Funcionalidades previstas

### Administrador
- Carga de trabajadores desde la API.
- Calendario de noviembre y diciembre y posibilidad de navegar otros meses.
- Turnos independientes de mañana y tarde.
- Turno único.
- Fecha, hora de inicio, hora de término y cargo.
- Selección de trabajadores para formar equipos por turno.
- Edición de turnos.
- Importación masiva de trabajadores mediante Excel.

### Trabajador
- Perfil y datos básicos.
- Calendario de turnos asignados.
- Fecha, tipo de turno, horario y cargo.
- Botón de firma de asistencia.
- Ventana de firma: desde 60 minutos antes hasta 60 minutos después del inicio.
- Prevención de doble firma.

## Configuración API

Edita `js/config.js`:

```js
window.SAYURI_CONFIG = {
  API_BASE_URL: "https://script.google.com/macros/s/TU_ID/exec",
  API_MODE: "api",
  DEFAULT_YEAR: new Date().getFullYear(),
  ATTENDANCE_WINDOW_MINUTES: 60
};
```

Durante desarrollo puedes usar `API_MODE: "demo"` para visualizar la interfaz sin backend. No usar ese modo en producción.

## Excel

La plantilla contiene:

`username, password, name, roleTitle, phone, email, active`

El archivo Excel se procesa en el navegador y luego se envía a la API. El backend debe transformar la contraseña inicial a un hash y no conservarla en texto plano.

## Próximo paso

Configurar la Google Sheet, desplegar `backend/Code.gs` como Web App, colocar la URL `/exec` en `js/config.js` y probar login, trabajadores, planificación, asignación y asistencia.

Para producción conviene añadir auditoría, recuperación de contraseña, gestión de sesiones, permisos de administrador y políticas de retención de datos.
