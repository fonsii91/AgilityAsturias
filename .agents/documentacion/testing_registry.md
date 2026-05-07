# Registro de Pruebas (Testing Registry)

Este documento mantiene un historial de las pruebas automatizadas implementadas para cada bloque funcional del proyecto.

---

## 1. Vistas Públicas: Páginas informativas (Bienvenida, Galería Pública, Videoteca Pública)
**Fecha:** 28/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit / Pest)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/PublicViewsTest.php` (Pruebas de endpoints `/api/gallery` y `/api/public-videos`)
  - `agility_back/database/factories/VideoFactory.php`
  - `agility_back/database/factories/GalleryImageFactory.php`
- **Descripción:** Se validó que los endpoints devuelven correctamente la data pública paginada y ordenada.

### Frontend (Vitest + Testing Library)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/home/home.component.spec.ts`
  - `frontend/src/app/components/galeria/galeria.component.spec.ts`
  - `frontend/src/app/components/galeria-videos-publica/galeria-videos-publica.component.spec.ts`
- **Descripción:** Se probó el renderizado correcto de la vista de bienvenida con variables de Tenant, la visualización de la cuadrícula de fotos y la vista del componente de vídeos públicos simulando respuestas del backend.

### End-to-End (Playwright)
- No requerido (Sección informativa no crítica).

---

## 2. Contacto: Información de Contacto (Visualización de datos del Tenant)
**Fecha:** 28/04/2026
**Capas Cubiertas:** Frontend

### Backend (PHPUnit / Pest)
- **Archivos Modificados/Creados:** Ninguno
- **Descripción:** El componente es puramente informativo, por lo que no requiere endpoints específicos de backend.

### Frontend (Vitest + Testing Library)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/contacto/contacto.component.spec.ts`
- **Descripción:** Se probó el correcto renderizado de los datos de contacto (teléfono, correo, ubicación y redes sociales) extrayéndolos dinámicamente del `TenantService`.

### End-to-End (Playwright)
- No requerido.

---

## 3. Gestión de Cuenta y Perfil (Base)
**Fecha:** 28/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit / Pest)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/ProfileTest.php`
- **Descripción:** Se probó el endpoint `/api/user/profile` verificando la correcta actualización de datos como el nombre y la licencia RFEC (cifrada en base de datos), asegurando soporte para la arquitectura Multi-Tenant e inicialización correcta de Clubs para las pruebas.

### Frontend (Vitest + Angular TestBed)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/services/auth.service.spec.ts`
  - `frontend/src/app/components/perfil/perfil.spec.ts`
- **Descripción:** Se validó la lógica de actualización del perfil incluyendo envío de archivos en `FormData` en el servicio de autenticación. Además, se verificó el renderizado dinámico del `PerfilComponent`, edición interactiva del nombre y de la información RFEC, asegurando que los métodos de guardado interactúan correctamente con el servicio.

### End-to-End (Playwright)
- `frontend/e2e/tests/perfil.spec.ts`: Test E2E del Perfil de Usuario.
  - Verifica el inicio de sesión exitoso.
  - Verifica la edición del nombre del usuario y su persistencia.
  - Verifica la subida de una imagen usando un fixture local (`test-image.jpg`) y la confirmación del servidor.

---

## 4. Seguridad: Recuperación y cambio de contraseña
**Fecha:** 29/04/2026
**Capas Cubiertas:** Frontend, Backend, E2E

### Backend (PHPUnit / Pest)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/PasswordResetTest.php`
- **Descripción:** Se probó el endpoint `/api/users/{id}/generate-reset-link` asegurando que sólo administradores y staff pueden generar tokens. También se validó `/api/reset-password` para comprobar que el cambio de contraseña funciona con tokens válidos, longitud mínima de clave y coincidencia de confirmación.

### Frontend (Vitest + Angular TestBed)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/reset-password/reset-password.spec.ts`
- **Descripción:** Se validó el comportamiento del componente `ResetPasswordComponent`, comprobando que carga correctamente el token de la URL, que el formulario reactivo funciona y valida las contraseñas, y que interactúa adecuadamente con el servicio al recibir una respuesta exitosa o de error.

### End-to-End (Playwright)
- **Archivos Modificados/Creados:**
  - `frontend/e2e/tests/password-reset.spec.ts`
- **Descripción:** Test E2E que inicia sesión como administrador, genera el enlace mediante petición API, y después navega al enlace de recuperación para usar el formulario y resetear la contraseña del usuario `member@agility.com`. Se verificó el flujo de éxito y también el de error con un token no válido.

---

## 5. Gestión de Perros ("Mi Manada") - CRUD Base
**Fecha:** 29/04/2026
**Capas Cubiertas:** Frontend, Backend, E2E

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/DogCrudTest.php`
  - `agility_back/app/Http/Controllers/DogController.php` (Solución para herencia de `user_id` en tests SQLite)
- **Descripción:** Se probó el CRUD completo de perros en `/api/dogs`, verificando la creación con asignación de usuario actual, lectura de la lista propia pero no la de otros miembros, actualización mediante petición POST, y eliminación a través de `POST /api/dogs/{id}/delete`.

### Frontend (Vitest + Angular TestBed)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/gestionar-perros/dog-form/dog-form.component.spec.ts`
- **Descripción:** Se validó la lógica de registro de perros comprobando las deshabilitaciones del botón sin nombre, interacción con el servicio `DogService`, uso del enrutador tras éxito, y notificaciones vía `ToastService`.

### End-to-End (Playwright)
- **Archivos Modificados/Creados:**
  - `frontend/e2e/tests/dog-crud.spec.ts`
- **Descripción:** Flujo visual comprobando que un miembro inicia sesión, crea un nuevo perro, confirma que aparece en el listado de su manada, accede al perfil detallado y finalmente elimina el perfil desde la pestaña de ajustes confirmando en el modal.

---

## 6. Gestión de Perros ("Mi Manada") - Dashboard (Pestañas Básicas)
**Fecha:** 29/04/2026
**Capas Cubiertas:** Frontend, Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/DogCrudTest.php`
- **Descripción:** Se añadió la prueba `test_user_can_upload_dog_photo` para validar el endpoint de subida de foto de perfil (`/api/dogs/{id}/photo`), asegurando la correcta manipulación de la imagen y el almacenamiento usando `Storage::fake`.

### Frontend (Vitest + Angular TestBed)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/gestionar-perros/dog-dashboard/dog-dashboard.component.spec.ts`
  - `frontend/src/app/components/gestionar-perros/tabs/dog-summary/dog-summary.component.spec.ts`
  - `frontend/src/app/components/gestionar-perros/tabs/dog-settings/dog-settings.component.spec.ts`
- **Descripción:** Se validó el comportamiento de los componentes del Dashboard, asegurando la correcta visualización de los datos principales del perro, el cálculo de edad y progreso de perfil, la lógica de subida de fotos (incluyendo compresión), la actualización de datos generales y la protección mediante validaciones (como nombre vacío). También se probó el modal de borrado/desvinculación con confirmación manual en la pestaña de ajustes.

### End-to-End (Playwright)
- No requerido (Las acciones están parcialmente cubiertas en el E2E del CRUD y el resto son cambios menores validados unitariamente).

---

## 7. Gestión de Perros ("Mi Manada") - Dashboard (Métricas)
**Fecha:** 29/04/2026
**Capas Cubiertas:** Frontend, Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/DogCrudTest.php`
- **Descripción:** Se añadió la prueba `test_user_can_update_health_and_training_metrics` validando que la API procesa y persiste correctamente los campos biométricos (`weight_kg`, `height_cm`, `has_previous_injuries`, `sterilized_at`, `rsce_category`).

### Frontend (Vitest + Angular TestBed)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/gestionar-perros/tabs/dog-health/dog-health.component.spec.ts`
  - `frontend/src/app/components/gestionar-perros/tabs/dog-training/dog-training.component.spec.ts`
- **Descripción:** Se validó la lógica reactiva en la pestaña de Entrenamiento para el formulario de biométricas (peso, altura, lesiones previas). Se testeó la lógica algorítmica de conversión de fecha de esterilización y el auto-cálculo de categoría RSCE según altura antes de su envío al backend. En la pestaña de Salud, se validó el correcto renderizado del "coming soon".

### End-to-End (Playwright)
- No requerido (Se trata de validaciones biométricas e interfaces de sólo visualización).

---

## 8. Gestión de Perros ("Mi Manada") - Dashboard (Archivos)
**Fecha:** 29/04/2026
**Capas Cubiertas:** Frontend, Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/DogCrudTest.php`
- **Descripción:** Se añadió la prueba `test_user_can_update_documentation_and_licenses` para validar el endpoint de actualización de perfil de perro, garantizando que campos como `microchip` y `pedigree`, junto con los atributos de la licencia RSCE cifrados en la tabla pivot `dog_user` (`rsce_license`, `rsce_expiration_date`, `rsce_grade`), se procesen y persistan correctamente.

### Frontend (Vitest + Angular TestBed)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/gestionar-perros/tabs/dog-docs/dog-docs.component.spec.ts`
- **Descripción:** Se validó la lógica en la pestaña de Documentación para el manejo del formulario de identificación (Microchip, LOE) y licencia RSCE. Se comprobó la correcta inicialización de atributos, interacción con el `DogService` y la función calculada para la categoría basándose en la altura del perro.

### End-to-End (Playwright)
- No requerido (La persistencia de estos atributos está parcialmente cubierta y es un formulario estándar ya validado).

---

## 9. Gestión de Perros ("Mi Manada") - Accesos (Familia/Guías)
**Fecha:** 29/04/2026
**Capas Cubiertas:** Frontend, Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/DogCrudTest.php`
- **Descripción:** Se añadieron las pruebas `test_user_can_share_their_dog`, `test_user_can_unshare_their_dog` y `test_only_primary_owner_can_unshare_a_dog`. Esto valida el ciclo completo de compartir acceso (via email), la revocación y la protección para asegurar que sólo el dueño primario (`is_primary_owner = 1`) puede eliminar co-dueños en la tabla pivot.

### Frontend (Vitest + Angular TestBed)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/gestionar-perros/tabs/dog-family/dog-family.component.spec.ts`
- **Descripción:** Se probó el componente responsable de gestionar accesos comprobando el renderizado de la lista de usuarios (identificando al dueño original con badge), y la lógica de vinculación mediante email usando señales. También se simuló la petición para añadir usuarios y revocar accesos (incluyendo la respuesta afirmativa a la alerta nativa `confirm()`), así como el control de UI para que sólo el dueño primario vea el botón de eliminar.

### End-to-End (Playwright)
- No requerido (Flujo satelital al CRUD principal validado de forma unitaria y de integración sin bifurcaciones visuales complejas).

---

## 10. Salud Deportiva (Monitor ACWR) - Ingreso de Datos: Registro de Cargas
**Fecha:** 29/04/2026
**Capas Cubiertas:** Frontend, Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/DogWorkloadTest.php`
- **Descripción:** Se probó la creación, actualización y validación de seguridad (solo dueños o admin) de las cargas de trabajo (entrenamientos) de un perro, asegurando la persistencia y control de accesos usando la API para mantener el contexto del tenant.

### Frontend (Vitest + Angular TestBed)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/explorar/salud-deportiva/salud-deportiva.spec.ts`
- **Descripción:** Se validó el comportamiento del componente `SaludDeportivaComponent` asegurando la correcta carga de datos del perro y el envío del formulario manual de cargas (minutos e intensidad), junto con las interacciones con `DogWorkloadService` y simulaciones de notificaciones de éxito/error.

### End-to-End (Playwright)
- No requerido (Es un flujo satelital probado en profundidad a nivel de integración y unitario).

---

## 11. Salud Deportiva (Monitor ACWR) - Motor ACWR: Visualización del Ratio y Revisiones
**Fecha:** 29/04/2026
**Capas Cubiertas:** Frontend, Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/AcwrEngineTest.php`
- **Descripción:** Se testeó la lógica algorítmica del ACWR devolviendo los campos (`acwr`, `acute_load`, `chronic_load`, thresholds). También se validó la generación automática de revisiones pendientes (`pending_review`) basadas en asistencias auto-reportadas y su correcta confirmación en base de datos.

### Frontend (Vitest + Angular TestBed)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/explorar/salud-deportiva/workload-gauge/workload-gauge.spec.ts`
  - `frontend/src/app/components/explorar/salud-deportiva/salud-deportiva.spec.ts`
- **Descripción:** Se validó el comportamiento visual del "Velocímetro ACWR" en Angular y `ngx-echarts`, testeando la representación correcta de Fases de calibración (Phase 1/2/3) y las alertas semánticas de colores basadas en los umbrales recibidos. Se añadieron mocks globales para `ResizeObserver` y la inicialización Canvas de Echarts para la compatibilidad con JSDOM. Adicionalmente, se probó la validación interactiva de entrenamientos pendientes (`confirmPending()`).

### End-to-End (Playwright)
- No requerido (Es un componente meramente visual cuyas lógicas complejas se evaluaron de forma unitaria).

---

## 12. Reservas y Calendario (Lado Miembro) - Gestión Propia (Mis Reservas)
**Fecha:** 29/04/2026
**Capas Cubiertas:** Frontend, Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/MemberReservationTest.php`
- **Descripción:** Se probó la lista de reservas propias (`/api/reservations`), verificando que se devuelven correctamente y que el modelo `Reservation` asegura la integridad del multi-tenant usando el `club_id`. Adicionalmente, se testeó la visualización de disponibilidad (`/api/availability`) y el proceso de reserva/cancelación asegurando la regla de negocio de cancelación mínima con 24 horas de antelación.

### Frontend (Vitest + Angular TestBed)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/mis-reservas/mis-reservas.component.spec.ts`
- **Descripción:** Se validó la lógica reactiva (`computed` signals) para agrupar visualmente reservas futuras y del día por hora, filtrado de datos del usuario, y la inyección de contexto de dependencias usando `TestBed.runInInjectionContext` para eludir conflictos de ciclo en standalone components importando `RouterModule`.

### End-to-End (Playwright)
- No requerido (Sección de gestión base validada sólidamente a nivel de integración y unitario).

---

## 13. Comunidad y Multimedia (Lado Miembro) - Feedback: Sistema de Sugerencias / Tickets
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend, Backend

### Backend (PHPUnit / Feature Tests)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/SuggestionTest.php`
  - `agility_back/database/factories/SuggestionFactory.php`
- **Descripción:** Se testeó la funcionalidad completa del CRUD de sugerencias, verificando que un miembro pueda crear un ticket y envíe notificaciones a los administradores. Además, se validó el soporte Multi-Tenant limitando la lectura y resolución de tickets a los administradores de su propio club y asegurando que usuarios normales reciban error 403 al intentar acceder a las rutas de admin.

### Frontend (Vitest + Angular TestBed)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/services/suggestion.service.spec.ts`
  - `frontend/src/app/components/sugerencias/sugerencia-dialog/sugerencia-dialog.spec.ts`
- **Descripción:** Se implementaron pruebas unitarias para el servicio de red para asegurar la comunicación con el API de Sugerencias. Asimismo, se validó el comportamiento del componente visual del diálogo modal verificando la validación del formulario (texto en blanco), los mocks del envío de los datos a través de `vitest`, simulaciones correctas de éxito con cierre del modal y captura de errores de red (alertas).

### End-to-End (Playwright)
- No requerido (Es un flujo satelital que solo incluye un diálogo, probado extensamente en frontend y backend).


## 13. Comunidad y Multimedia (Lado Miembro) - Lectura Comunal
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/AnnouncementControllerTest.php`
  - `agility_back/tests/Feature/ResourceControllerTest.php`
  - `agility_back/tests/Feature/NotificationControllerTest.php`
- **Descripción:** Se probó el ciclo de vida de los Recursos (listado y creación con validación de niveles y subida de archivos simulados con Storage::fake), el Tablón de Anuncios (creación, listado filtrado y marcado de lectura interceptando Notificaciones generadas con Notification::fake), y Notificaciones (listado limpio mostrando solo las 10 últimas y endpoints de marcado como leído global o individual).

### Frontend (Vitest + Angular TestBed)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/tablon-anuncios/tablon-anuncios.component.spec.ts`
  - `frontend/src/app/components/recursos/recursos-list/recursos-list.component.spec.ts`
- **Descripción:** Se validó la lógica reactiva en Angular de Tablón de Anuncios y Recursos (filtrados vía señales, comprobación de visibilidad IntersectionObserver para marcado automático como leído y lógicas de permisos según rol de usuario), configurando el TestBed de Angular para la renderización usando stubs HTTP.

### End-to-End (Playwright)
- No requerido (Esquema simple validado por unidad e integración en todos los bordes).
---

## Funcionalidad Probada: Reservas y Calendario (Vistas Comunes: Calendario Global y Eventos Personales)
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/PersonalEventTest.php`
  - `agility_back/tests/Feature/CompetitionAttendanceTest.php`
  - `agility_back/database/factories/PersonalEventFactory.php`
- **Descripción:** Se implementaron pruebas Feature para asegurar que un miembro puede consultar, crear, modificar y eliminar eventos personales de sus perros y que estos queden registrados exclusivamente a su nombre. También se validó la obtención y el registro de la asistencia a las competiciones (flujo attend y unattend) con el uso de la arquitectura multi-tenant de la tabla pivot dog_user.

### Frontend (Vitest + Angular TestBed)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/calendario/calendario.component.spec.ts`
- **Descripción:** Se validó la lógica general del Calendario (estructuración de meses y días, asignación de indicadores visuales según fecha de competiciones o de eventos personales), la correcta apertura del modal correspondiente según el contenido del día y el proceso de confirmación de asistencia utilizando componentes y servicios simulados.

### End-to-End (Playwright)
- No requerido por el momento.
---
## 14. Competiciones y Ranking (Lado Miembro) - Asistencia
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/CompetitionAttendanceTest.php`
- **Descripción:** Se validó el flujo completo de la asistencia a las competiciones (flujo attend y unattend) comprobando la asignación del usuario y la lista de perros a la competición usando la arquitectura multi-tenant de la base de datos (tablas pivot `competition_user` y `competition_dog`).

### Frontend (Vitest + Angular TestBed)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/services/competition.service.spec.ts`
  - `frontend/src/app/components/calendario/calendario.component.spec.ts`
- **Descripción:** Se probó de forma exhaustiva el servicio web `CompetitionService`, validando la descarga de competiciones, parseo de información del backend, y envío de operaciones CRUD y de asistencia con inyecciones de `HttpTestingController`. A nivel de componente, se confirmó la lógica visual e interacciones con el servicio en el `CalendarioComponent`.

### End-to-End (Playwright)
- No requerido (El flujo principal se ha cubierto integralmente a nivel Unitario y de Integración con tests sobre el UI Component, Interacciones y API).

---

## 15. Comunidad y Multimedia (Lado Miembro) - Videoteca
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/MemberVideoTest.php`
- **Descripción:** Se probó el ciclo completo de la videoteca, incluyendo subir videos (validando que se asocian al tenant), visualizarlos, alternar likes (toggleLike) y eliminar los videos propios con registro histórico. También se adaptó el controlador para retornar los videos con `Storage::disk('public')->download` para facilitar el testing.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/services/video.service.spec.ts`
  - `frontend/src/app/components/galeria-videos/upload-video/upload-video.component.spec.ts`
  - `frontend/src/app/components/galeria-videos/video-list/video-list.component.spec.ts`
  - `frontend/vitest.config.ts` (creado para soporte global JIT Angular)
  - `frontend/src/test-setup.ts` (creado para configuración TestBed)
- **Descripción:** Se reestructuró la configuración de `Vitest` añadiendo soporte global para el compilador JIT de Angular. Se validó de forma aislada el servicio (`VideoService`) usando mocks robustos, y se probó la lógica de subida y visualización de videos empleando `TestBed.runInInjectionContext` para sortear los conflictos de compilación en componentes standalone.

### End-to-End (Playwright)
- No requerido (La persistencia, el procesamiento y la capa de red están probadas exhaustivamente a nivel unitario e integración).

---

## 16. Competiciones y Ranking (Lado Miembro) - Métricas: Ranking Comunitario y Bitácora de pistas RSCE
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/RankingTest.php`
  - `agility_back/tests/Feature/RsceTrackTest.php`
  - `agility_back/database/factories/RsceTrackFactory.php`
- **Descripción:** Se validó que el endpoint del ranking devuelva los datos con la posición actualizada y la indicación de variaciones ("NEW", o el cálculo del cambio) según las reglas de reservas recientes, y que filtre correctamente los perros con 0 puntos. También se probó exhaustivamente el CRUD de la bitácora RSCE (`RsceTrack`), garantizando que los dueños solo puedan modificar sus propios perros, y el endpoint de monitoreo RSCE reservado solo a administradores.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/services/rsce-track.service.spec.ts`
  - `frontend/src/app/components/ranking/ranking.component.spec.ts`
  - `frontend/src/app/components/rsce-tracker/rsce-tracker.component.spec.ts`
- **Descripción:** Se validó de forma aislada el servicio (`RsceTrackService`) usando mocks de red para el CRUD de pistas. Se probó la lógica de frontend para el ranking (verificando la asignación de medallas, cálculo de propietarios y emojis). Finalmente, se testeó exhaustivamente el componente rastreador RSCE (`RsceTrackerComponent`), incluyendo la simulación de lógica algorítmica para determinar si las pistas logradas cumplen con los requisitos de ascenso a Grado 1 y Grado 2 (opción A/B, velocidades, etc), utilizando `TestBed.runInInjectionContext` para sortear problemas de inicialización del `TestBed`.

### End-to-End (Playwright)
- No requerido (La interfaz principal y los flujos lógicos están altamente cubiertos en el frontend a nivel de componente aislado).

---

## 17. Gestión de Reservas e Instalaciones (Staff) - Excepciones: Bloqueos de Horario y Días Festivos
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/TimeSlotExceptionTest.php`
  - `agility_back/database/factories/TimeSlotExceptionFactory.php`
  - `agility_back/app/Models/TimeSlotException.php`
  - `agility_back/app/Http/Controllers/TimeSlotExceptionController.php`
- **Descripción:** Se testeó completamente la lógica de "Bloqueos y Excepciones" en horarios. Se validó que el Staff pueda crear excepciones y, como consecuencia, las reservas afectadas se eliminen automáticamente. A su vez, se simuló y aseguró el envío de la notificación (`ClassCancelledNotification`) a los propietarios implicados. Se validó la seguridad verificando que los miembros estándar reciban error de autorización al interactuar con las rutas de gestión.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/services/reservation.service.spec.ts`
  - `frontend/src/app/reservas/gestionar-reservas/gestionar-reservas.component.spec.ts`
- **Descripción:** Se validó que `ReservationService` ejecute las llamadas `GET` (fetchExceptions), `POST` (addException y deleteException) y mantenga el signal reactivo actualizado con la última información. A nivel de componente UI (`GestionarReservasComponent`), se verificó mediante inicialización aislada que las celdas canceladas por excepción bloqueen lógicamente su estado visual, comprobando que las acciones del modal del Staff llamen adecuadamente a los métodos de servicio de bloquear y desbloquear.

### End-to-End (Playwright)
- Pendiente/Opcional (El comportamiento reactivo de UI e integración con persistencia ya está testeado y estabilizado a fondo en unitario/componente).

---

## 18. Gestión de Reservas e Instalaciones (Staff) - Monitorización: Info de Reservas Global
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/StaffReservationMonitorTest.php`
- **Descripción:** Se validó el endpoint `/api/reservations` para roles de Staff y Administrador, asegurando que devuelva un listado global de todas las reservas activas (ignorando las canceladas). También se verificó la correcta inyección del campo computado `acwr_color` para el estado de salud de cada perro, y se comprobó que un usuario normal siga recibiendo solo sus propias reservas desde el mismo endpoint como fallback.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/info-reservas/info-reservas.component.spec.ts`
- **Descripción:** Se probó la lógica de monitorización (`InfoReservasComponent`) inicializando el componente bajo `runInInjectionContext` para eludir conflictos del inyector de Angular con los signals. Se validaron las computaciones reactivas que dividen y agrupan las reservas de hoy por horas y asistentes, agrupan las reservas futuras por fecha y hora, y el cálculo certero de estadísticas resumidas.

### End-to-End (Playwright)
- No requerido (Es un componente dashboard puramente de lectura que ya cuenta con cobertura completa en unitarias e integración de red).

---

## 19. Gestión de Eventos y Competiciones - CRUD de Eventos
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/CompetitionCrudTest.php`
- **Descripción:** Se validó el endpoint `/api/competitions` para las operaciones CRUD completas sobre las competiciones, asegurando que un administrador o staff pueda crear, editar y eliminar eventos, y bloqueando el acceso a miembros. Se verificó el almacenamiento exitoso y los códigos HTTP 201, 200 y 204.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/crud-competicion/crud-competicion.component.spec.ts`
- **Descripción:** Se probó la lógica del componente responsable del CRUD de competiciones (`CrudCompeticionComponent`). Se inicializó el `TestBed` correctamente y se validó el parseo de señales, ordenación de fechas, el llenado del formulario reactivo, la simulación de subida de imágenes, y la comprobación de llamadas de red al confirmar guardados, ediciones y eliminaciones de competiciones.

### End-to-End (Playwright)
- No requerido (Esquema simple validado por unidad e integración).

---

## 20. Gestión de Eventos y Competiciones: Asistencia Staff (Verificación)
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit / Pest)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/StaffAttendanceTest.php`
- **Descripción:** Se validó la lógica del controlador `AttendanceController`, verificando que el Staff puede obtener entrenamientos y competiciones pendientes de validación. Se aseguró que al confirmar asistencias se otorguen correctamente los puntos a los perros (según posición en caso de competiciones) y se generen o actualicen las cargas de trabajo (DogWorkload) automatizadas.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/attendance-verification/attendance-verification.component.spec.ts`
- **Descripción:** Se probó la inicialización de datos pendientes, lógica de estado para marcado y desmarcado de casillas, lógica para añadir participantes extra a competiciones, y la correcta generación de los payloads para la confirmación en el backend.

### End-to-End (Playwright)
- No requerido (Esquema validado por unidad e integración). 

---

## 21. Gestión de Comunidad y Comunicación (Staff) - Redacción
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit / Pest)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/AnnouncementControllerTest.php` (Ya existente, cubría también la parte del miembro)
- **Descripción:** Se validó que los administradores y staff puedan crear anuncios, y que se despachen correctamente notificaciones al crear el anuncio (`Notification::assertSentTo`), además de proteger las rutas de borrado/creación frente a usuarios regulares.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/tablon-anuncios/tablon-anuncios.component.spec.ts`
  - `frontend/src/app/components/tablon-anuncios/crear-anuncio/crear-anuncio.component.spec.ts`
- **Descripción:** Se implementaron pruebas exhaustivas para aislar el comportamiento interactivo del Tablón de Anuncios y la creación de comunicados. Se validó la lógica de filtros, búsqueda, marcado de alertas (borrado), inicializando los test en el `TestBed.runInInjectionContext` para eludir conflictos del compilador JIT con componentes *standalone*. También se probó el componente de creación verificando la inyección dinámica de la lista de usuarios y validaciones del formulario.

### End-to-End (Playwright)
- No requerido (El flujo principal de notificaciones, listados y escritura se ha cubierto integralmente a nivel unitario y de integración).

---

## 22. Gestión de Comunidad y Comunicación (Staff) - Directorio: Gestión de Miembros y generación de Enlaces de Reseteo
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/UserManagementTest.php`
  - `agility_back/app/Http/Controllers/AuthController.php` (Solución para herencia y protección `user_id` en borrados en cascada)
- **Descripción:** Se validó el endpoint `/api/users` para listar usuarios con protección de roles (admin/staff). También se probaron exhaustivamente las actualizaciones de roles (validando que el staff no pueda asignar/modificar administradores) y las operaciones de eliminación, asegurando que los perros compartidos no se eliminen si su dueño principal es eliminado.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/gestionar-miembros/gestionar-miembros.component.spec.ts`
- **Descripción:** Se testeó la inicialización del componente bajo `TestBed.runInInjectionContext`, la lógica de filtrado de roles, el modal de borrado, la interacción con `AuthService` para generar enlaces de reseteo, y el copiado de los mismos al portapapeles.

### End-to-End (Playwright)
- No requerido (Esquema cubierto robustamente a nivel unitario y de integración).

---

## 23. Gestión de Recursos y Multimedia (Staff) - Archivos
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/ResourceControllerTest.php`
- **Descripción:** Se testeó la funcionalidad de listar, crear y borrar recursos (documentos, vídeos, enlaces). Se validó que solo administradores o staff pueden crear y borrar, y se probó la subida de archivos utilizando `Storage::fake`.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/recursos/recursos-list/recursos-list.component.spec.ts`
  - `frontend/src/app/components/recursos/recursos-form/recursos-form.component.spec.ts`
- **Descripción:** Se refactorizaron y crearon pruebas usando el patrón `runInInjectionContext` para eludir errores del compilador JIT en componentes con signals. Se validaron los listados, los filtros por nivel/categoría, y la funcionalidad completa del formulario de creación y edición (incluyendo la obligación condicional de campos según tipo de recurso).

### End-to-End (Playwright)
- No requerido (Comportamiento aislado en el dashboard probado exhaustivamente en pruebas unitarias e integración de API).

---

## 24. Gestión de Recursos y Multimedia (Staff) - Administración de la Galería y Aprobación/Rechazo de Vídeos Públicos (Moderación)
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/VideoModerationTest.php`
- **Descripción:** Se validó el endpoint `/api/videos/{id}/toggle-public-gallery` asegurando que los roles de Administrador y Staff pueden modificar la visibilidad de los vídeos en la galería pública mediante el atributo `in_public_gallery`. También se aseguró que los miembros regulares reciban un error 403 al intentar acceder a esta funcionalidad.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/galeria-videos/video-list/video-list.component.spec.ts`
  - `frontend/src/app/components/galeria-videos-publica/galeria-videos-publica.component.spec.ts`
- **Descripción:** Se testeó la funcionalidad de `removeFromPublic` en la galería pública, asegurando que se actualiza el UI y se llama a `VideoService.togglePublicGallery`. Se usó `runInInjectionContext` para solucionar problemas con el compilador JIT. También se añadió una validación del método `togglePublicGallery` en la lista general de vídeos (`VideoListComponent`).

### End-to-End (Playwright)
- No requerido (Flujo cubierto exhaustivamente con pruebas unitarias y de integración de API).

---

## 25. Gestión Deportiva - Puntuación Extra: Asignación de Puntos manuales para el Ranking y supervisión de Salud Deportiva
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/ExtraPointsTest.php`
- **Descripción:** Se testeó la funcionalidad para que Administradores y Staff puedan asignar (o restar) puntos extra manualmente a un perro. Se validó la restricción para que los miembros normales no puedan usar este endpoint. También se validaron las reglas de negocio (mínimo -3, máximo 3, no cero, categoría requerida) y el envío de notificaciones (`DogExtraPointNotification`) al dueño del perro.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/dar-puntos-extra-dialog/dar-puntos-extra-dialog.component.spec.ts`
- **Descripción:** Se probó el comportamiento interactivo del modal para dar puntos extra, verificando validaciones del formulario, cambios lógicos entre asignar/restar, validaciones de categorías personalizadas, y el envío correcto de la petición al `DogService`. Se utilizó una instanciación manual aislada en lugar de `TestBed` para evitar conflictos del inyector en tests de componentes.

### End-to-End (Playwright)
- No requerido (Es un flujo satelital cubierto exhaustivamente con pruebas unitarias y de integración de API).

---

## 26. Comunidad y Multimedia - Novedades: Pantalla de Actualizaciones (Changelog)
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend

### Backend (PHPUnit / Feature Tests)
- No requerido (Es una pantalla que consume un archivo JSON estático público, sin lógica ni persistencia en la base de datos).

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/novedades/novedades.component.spec.ts`
- **Descripción:** Se testeó el comportamiento del `NovedadesComponent` usando `runInInjectionContext` para eludir conflictos del inyector JIT de Angular con señales (`signals`). Se validó que el componente obtiene y procesa correctamente el JSON estático de versiones mediante `HttpTestingController` y actualiza la interfaz, incluyendo la simulación de errores en la petición de red sin que la aplicación se caiga.

### End-to-End (Playwright)
- No requerido (Flujo visual satelital puramente informativo validado extensamente a nivel de componente).

---

## 27. Gestión Global y Monitorización Avanzada (Administrador) - Panel de Usuarios
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit / Pest)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/UserManagementTest.php`
  - `agility_back/tests/Feature/PasswordResetTest.php`
- **Descripción:** Se validaron los endpoints para listar usuarios, modificar roles y eliminar cuentas (garantizando que se preserven las entidades pivot compartidas). Además se validó completamente el flujo de recuperación y reseteo de contraseñas.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/admin-usuarios/admin-usuarios.component.spec.ts`
- **Descripción:** Se testeó la vista exclusiva del Panel de Usuarios para administradores (`AdminUsuariosComponent`), validando la obtención interactiva de todos los usuarios de la plataforma, actualización en vivo de roles con confirmaciones visuales de éxito, manejo de errores y manipulación del zoom de imágenes de perfiles usando inyección de contexto.

### End-to-End (Playwright)
- No requerido (Gestión cubierta a fondo en los test unitarios y de integración de la API).

---

## 28. Gestión Global y Monitorización Avanzada (Administrador) - Gestión Avanzada de Sugerencias
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit / Pest)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/SuggestionTest.php` (Implementado previamente)
- **Descripción:** Se validó que el administrador pueda listar todas las sugerencias de la plataforma (solo las de su propio club/tenant) y modificar su estado (resolver y des-resolver), comprobando las notificaciones y los fallos de autorización para miembros estándar (Error 403).

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/admin-sugerencias/admin-sugerencias.spec.ts`
- **Descripción:** Se testeó la vista de administración global de tickets (`AdminSugerencias`), verificando que se obtengan los datos desde el servicio con `HttpTestingController`, el comportamiento de los filtros (`pending`, `resolved`, `all`), y las lógicas interactivas para marcar como resueltas o no resueltas mediante señales (`signals`) y comprobaciones nativas (`window.confirm`).

### End-to-End (Playwright)
- No requerido (El flujo de estado de tickets está cubierto robustamente a nivel unitario y de integración API).

---

## 29. Gestión Global y Monitorización Avanzada (Administrador) - Monitorización de Salud (ACWR Global)
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit / Pest)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/DogWorkloadTest.php`
- **Descripción:** Se testeó exhaustivamente el endpoint `/api/admin/salud/monitor`. Se validó que el administrador pueda obtener las estadísticas globales de salud de los últimos 28 días, comprobando que se sumen correctamente las métricas (cargas manuales vs automáticas) y que los resultados se devuelvan agrupados por usuario (dueño de los perros). Además, se validó la protección de la ruta, asegurando que los miembros estándar reciban error 403 (Forbidden) al intentar acceder.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/admin-salud-monitor/admin-salud-monitor.spec.ts`
- **Descripción:** Se testeó la vista exclusiva del panel de Monitorización de Salud para administradores (`AdminSaludMonitorComponent`), comprobando la obtención correcta del listado de métricas (cargas totales y perros del usuario), el control de la carga inicial (`isLoading`) y el robusto manejo de errores de red (alertas dinámicas `Toast`) utilizando `runInInjectionContext` y emulando `DogWorkloadService`.

### End-to-End (Playwright)
- No requerido (Dashboard estático de monitorización validado de manera completa en unitario y capa de red).

---

## 30. Gestión Global y Monitorización Avanzada (Administrador) - Monitorización RSCE (Licencias y Pistas)
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit / Pest)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/RsceTrackTest.php`
- **Descripción:** Se testeó exhaustivamente el endpoint `/api/admin/rsce/monitor`. Se validó que el administrador pueda obtener las estadísticas globales de pistas RSCE, comprobando que se devuelvan los totales de pistas por usuario y listas de perros, y se validó la protección de la ruta, asegurando que los miembros estándar reciban error 403 (Forbidden) al intentar acceder.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/admin-rsce-monitor/admin-rsce-monitor.spec.ts`
- **Descripción:** Se creó la prueba unitaria exclusiva del panel de Monitorización RSCE para administradores (`AdminRsceMonitorComponent`), comprobando la obtención correcta del listado de pistas RSCE y la carga inicial (`isLoading`), además del robusto manejo de errores de red utilizando inyección de contexto manual (`runInInjectionContext`) y emulando `RsceTrackService`.

### End-to-End (Playwright)
- No requerido (Dashboard estático validado completamente a nivel de componentes aislados y de red).

---

## 31. Gestión Global y Monitorización Avanzada (Administrador) - Revisar Vídeos
**Fecha:** 30/04/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit / Pest)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/AdminVideoStatsTest.php`
- **Descripción:** Se validaron los endpoints para listar estadísticas globales de vídeos, historial de subidas diarias y paginación de vídeos eliminados. Se garantizó que los endpoints solo puedan ser accedidos por el rol de administrador y el rol de staff, y se validó el reintento de subida a YouTube de vídeos fallidos.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/components/admin-videos-stats/admin-videos-stats.component.spec.ts`
  - `frontend/src/app/components/admin-deleted-videos/admin-deleted-videos.component.spec.ts`
- **Descripción:** Se crearon pruebas unitarias para los componentes del panel "Revisar Vídeos". Para el dashboard de estadísticas, se probó la carga inicial de datos y el reintento de subidas, usando la inyección de dependencias estricta de Angular (`runInInjectionContext`). Para el historial de borrados, se validó la carga de datos paginada interceptando el `VideoService`.

- No requerido (Las interfaces y la integración del historial/estadísticas están ampliamente probadas a nivel unitario).

---

## 32. Experiencia de Usuario (UX) Global - Onboarding Multipaso
**Fecha:** 07/05/2026
**Capas Cubiertas:** Frontend y Backend

### Backend (PHPUnit)
- **Archivos Modificados/Creados:**
  - `agility_back/tests/Feature/OnboardingControllerTest.php`
- **Descripción:** Se testeó la funcionalidad de guardar y consultar el progreso del onboarding. Se validó que un usuario pueda marcar un paso específico como completado y que pueda marcar un tutorial entero como finalizado, persistiendo el progreso en un campo JSON.

### Frontend (Vitest + Angular)
- **Archivos Modificados/Creados:**
  - `frontend/src/app/services/onboarding.service.spec.ts`
- **Descripción:** Se validó el servicio `OnboardingService`, probando la inferencia automática del rol desde el ID del paso, el manejo de progreso con Signals reactivos y el activador automático (`checkAutoFinish`) para mostrar la animación interactiva de finalización tras completar todos los pasos. Se usaron utilidades como `vi.spyOn` para falsear interacciones con el DOM (Canvas de confeti y animaciones).

### End-to-End (Playwright)
- No requerido (El flujo de estado del progreso y su interacción cruzada están probados ampliamente en Backend y test unitarios en el Frontend).