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
