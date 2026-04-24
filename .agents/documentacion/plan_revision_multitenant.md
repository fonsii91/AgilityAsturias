# Plan de Revisión: Arquitectura Multi-Tenant

Este plan detalla los casos de prueba manuales necesarios para verificar que la refactorización a arquitectura multi-tenant (aislamiento por clubes y rol de administrador) funciona correctamente en toda la aplicación.

## Fase 1: Preparación del Entorno (Datos)
Antes de empezar a probar, asegúrate de tener los siguientes datos en tu entorno local:
- [ ] **Club A**: Un club con algunos registros (perros, eventos, socios).
- [ ] **Club B**: Otro club diferente, con sus propios registros.
- [ ] **Usuario A**: Un socio o administrador que pertenece **solo** al Club A.
  - *Email:* `usuario_a@example.com`
  - *Password:* `password123`
- [ ] **Usuario B**: Un socio o administrador que pertenece **solo** al Club B.
  - *Email:* `usuario_b@example.com`
  - *Password:* `password123`
- [ ] **Admin**: Un usuario que tenga el rol de `admin` activado.
  - *Email:* `admin_global@example.com`
  - *Password:* `password123`

---

## Fase 2: Pruebas de Aislamiento (Usuarios de Club)
El objetivo es asegurar que no haya "fugas de datos" entre diferentes clubes.

**Acciones con el Usuario A:**
- [ ] **Visibilidad de Listados**: Entra a las secciones principales (Listado de Perros, Calendario/Eventos, Miembros). Verifica que **solo** ves los datos del Club A.
- [ ] **Creación Automática de Contexto**: Crea un nuevo registro (ej. un perro o un evento). Una vez guardado, revisa la base de datos (o haz una petición GET) y comprueba que se le ha asignado automáticamente el `club_id` del Club A.
- [ ] **Prueba de Intrusión (ID Spoofing)**: Busca el ID de un recurso (ej. un perro) que pertenezca al **Club B**. Intenta acceder directamente a la URL de edición o detalle de ese perro estando logueado como Usuario A.
  - *Resultado esperado*: La aplicación debe bloquearte (devolviendo un error `403 Forbidden` o `404 Not Found` desde el backend).

*Tip: Repite el proceso con el Usuario B para confirmar que funciona en ambas direcciones.*

---

## Fase 3: Pruebas del Administrador
El objetivo es comprobar que el `TenantScope` se desactiva correctamente para el rol más alto y que tiene permisos globales.

**Acciones con el Admin:**
- [ ] **Listado Global**: Navega al componente de gestión de clubes (`clubs-list`).
  - *Resultado esperado*: Debes ver todos los clubes del sistema (Club A, Club B, etc.).
- [ ] **Acceso a Entidades**: Accede a ver o editar la información de cualquier club. El backend no debe bloquearte, ya que el `TenantScope` debería omitirse para ti.
- [ ] **Creación/Edición**: Edita el nombre de un club o crea uno nuevo y comprueba que se guarda sin problemas de permisos.

---

## Fase 4: Flujo de Autenticación y Estado
- [ ] **Limpieza de Estado (Login/Logout)**: Inicia sesión con el Usuario A. Cierra sesión. Inicia sesión con el Usuario B.
  - *Resultado esperado*: Comprueba que el frontend limpia correctamente el estado (en Angular) y no te muestra momentáneamente datos cacheados del Club A antes de cargar los del B.
- [ ] **Nuevos Usuarios / Sin Club**: Si el registro está abierto, crea una cuenta nueva.
  - *Resultado esperado*: El sistema no debe fallar; si el usuario no tiene club asignado, debe mostrar una pantalla de espera o invitarle a unirse/crear un club.

---

## Fase 5: Revisión de Base de Datos / Logs del Backend
- [ ] **Verificación de Consultas SQL**: Mientras navegas con el Usuario A, fíjate en las consultas que el backend hace a la base de datos (puedes usar Laravel Telescope o los logs).
  - *Resultado esperado*: Todas las sentencias `SELECT`, `UPDATE` y `DELETE` hacia tablas protegidas deben tener automáticamente la condición `WHERE club_id = X` al final, demostrando que el `TenantScope` global está funcionando.
