# Estética Spa Sayuri — Sitio + Portal RRHH

Proyecto responsive para Estética Spa Sayuri, con el sitio público y un portal de gestión de trabajadores conectado a Google Apps Script + Google Sheets.

## Estructura

- `index.html` — sitio público.
- `pages/login.html` — acceso de usuarios.
- `pages/admin.html` — planificación, equipos y control de asistencia.
- `pages/worker.html` — calendario personal y firma de asistencia.
- `pages/import-workers.html` — importación de trabajadores mediante Excel.
- `js/config.js` — URL de la API.
- `js/api.js` — comunicación con Google Apps Script.
- `js/app.js` — control de sesión y permisos de frontend.
- `js/admin.js` — planificación y asistencia administrativa.
- `js/worker.js` — calendario personal y firma.
- `js/import-workers.js` — lectura/importación Excel.
- `backend/Code.gs` — backend Google Apps Script.
- `templates/plantilla-trabajadores.xlsx` — plantilla de importación.

## Funcionalidades

### Administrador

- Lista de trabajadores desde Google Sheets.
- Calendario de noviembre y diciembre.
- Turnos independientes de mañana y tarde.
- Turno único.
- Fecha, hora de inicio, hora de término y cargo.
- Selección de trabajadores para formar equipos.
- Edición y desactivación de turnos.
- Cambio de integrantes de un equipo.
- Importación masiva mediante Excel.
- Consulta de firmas de asistencia.

### Trabajador

- Inicio de sesión.
- Visualización de sus datos.
- Visualización de todos sus turnos asignados.
- Fecha, tipo, horario y cargo.
- Firma electrónica de asistencia.
- Validación de la ventana de firma en el backend.
- Prevención de doble firma.

## Configuración

Edita `js/config.js`:

```js
window.SAYURI_CONFIG = {
  API_BASE_URL: "https://script.google.com/macros/s/TU_ID/exec",
  API_MODE: "api",
  DEFAULT_YEAR: new Date().getFullYear(),
  ATTENDANCE_WINDOW_MINUTES: 60
};
```

En el ZIP actual ya existe una URL `/exec` configurada. Si esa implementación cambia, reemplázala por la nueva.

## Backend

1. Abre la carpeta `backend`.
2. Copia `Code.gs` a Google Apps Script.
3. Ejecuta `iniciarSistemaSayuri()`.
4. Implementa como aplicación web.
5. Copia la URL `/exec` a `js/config.js`.
6. Publica el sitio.

## Separación de sistemas

Sayuri RRHH es independiente de VFeria:

```text
Sayuri Web → Apps Script Sayuri → Sheet Sayuri RRHH

VFeria Web → Apps Script VFeria → Sheet VFeria
```

No se comparten hojas, usuarios, sesiones ni endpoints.

## Excel

La plantilla utiliza:

```text
username, password, name, lastName, rut, email, phone, cargo
```

El backend nunca debe guardar la contraseña definitiva en texto plano.

## Firma de asistencia

La regla está implementada en el backend:

- 60 minutos antes del inicio;
- hasta 60 minutos después del inicio;
- una sola firma por asignación;
- hora validada con el servidor.

La interfaz puede deshabilitar el botón fuera de la ventana, pero la seguridad real se mantiene en Apps Script.


## Modelo de pago RRHH

Sayuri RRHH utiliza pago por evento, no pago por horas. La función se asigna individualmente en cada evento:
- Masajista: $20.000 base.
- Manicurista: $20.000 base.
- Tatuador(a): $15.000 base.

Los bonos son acumulativos y retroactivos:
- Masajista: 10+ eventos = +$1.000/evento; 15+ eventos = +$2.000/evento.
- Manicurista: 15+ eventos = +$1.000/evento.
- Tatuador(a): sin bono.
