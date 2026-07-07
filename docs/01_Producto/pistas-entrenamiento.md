---
aliases: [Pistas de Entrenamiento, Pistas del Club, Training Tracks]
tags: [producto, pistas, horarios, reservas]
status: completo
---
# 🚩 Pistas de Entrenamiento

Gestión de las **pistas de entrenamiento de cada club** y su integración con los horarios de clase (actualización de junio 2026). Hasta esta actualización la aplicación permitía crear clases y horarios, pero no contemplaba que un club pudiera tener varias pistas.

> ⚠️ No confundir con las "mangas" de competición (`Track`/`RsceTrack`/`RfecTrack`, ver [[normativa-rfec]]) ni con la feature de reservas `reservas-pistas`. La entidad de esta nota es `TrainingTrack` (tabla `training_tracks`).

---

## 📋 Modelo funcional

Cada pista de entrenamiento tiene:

| Campo | Descripción |
|---|---|
| **Nombre** | Nombre identificativo de la pista dentro del club. |
| **Foto** | Imagen opcional de la pista (máx. 2 MB, se guarda en `storage/clubs/{slug}/track_photos`). |
| **Terreno** | Tipo de superficie. **Obligatorio.** |

### Tipos de terreno (`surface`)

- `tierra` → Tierra.
- `cesped` → Césped.
- `cesped_artificial` → Césped artificial.
- `otro` → Otro.

---

## 🏁 Pista por defecto (pista principal)

- Todo club tiene **como mínimo una pista**: su pista principal o básica.
- Al **crear un club nuevo** (aprovisionamiento SaaS o panel de admin) se crea automáticamente una pista llamada **"Pista de entrenamiento"** (terreno `otro`). Está implementado en el hook `created` del modelo `Club`, por lo que aplica a cualquier vía de creación.
- Los horarios de bienvenida del [[datos-prueba-bienvenida|seed de datos de ejemplo]] se asignan a esta pista principal.

### Migración de clubes existentes

La migración `2026_07_07_100000_create_training_tracks_table`:

1. Crea la tabla `training_tracks` y la columna `time_slots.training_track_id` (nullable, `ON DELETE SET NULL`).
2. Crea la pista principal de cada club existente.
3. Asigna **todos los horarios existentes** de cada club a su pista principal, de modo que ningún horario queda sin pista tras el despliegue.

---

## 🔐 Gestión y permisos

CRUD de pistas en la ruta `/gestionar-pistas` (frontend), accesible desde el botón **"Pistas"** de la Gestión de Horarios.

| Operación | Endpoint | Roles |
|---|---|---|
| Listar | `GET /api/training-tracks` | admin, manager, staff |
| Crear | `POST /api/training-tracks` | admin, manager |
| Editar | `POST /api/training-tracks/{id}` | admin, manager |
| Eliminar | `POST /api/training-tracks/{id}/delete` | admin, manager |

### Regla de negocio: nunca cero pistas

- **No se puede borrar la última pista** de un club: el backend responde `422` y el frontend deshabilita el botón y avisa.
- Al borrar una pista, sus horarios **se reasignan automáticamente a la pista más antigua restante** (la principal): las clases y sus reservas se conservan intactas (decisión de producto de julio 2026: se prefirió conservar las clases a borrarlas en cascada). Las reservas individuales de esa pista sí desaparecen con ella (la pista física deja de existir).

---

## 🗓️ Integración con horarios de clase

- Al crear o editar un horario ([[funcionalidades|Gestión de Horarios]]) se puede elegir en qué pista se imparte la clase (selector visible cuando el club tiene más de una pista).
- Si no se indica pista, el backend asigna la **pista principal** del club: un horario nunca queda sin pista.
- `GET /api/time-slots` devuelve cada horario con su relación `training_track` (id, nombre, terreno y foto), y las tarjetas de la gestión de horarios muestran un badge con la pista cuando hay varias.

---

## 🐕 Módulo: Reserva individual de pistas (Entrenamientos Libres)

Módulo **opt-in** que el Responsable del Club activa/desactiva desde **Funcionalidades del club** (setting `track_booking_enabled`, desactivado por defecto y sin gating de plan). Permite a los socios reservar una pista **una hora** para entrenar por su cuenta, **sin monitor**.

### Experiencia del socio

- En la zona de Reservas aparece una **segunda pestaña "Reserva de Pistas"** (solo con el módulo activo; con él desactivado la pestaña no existe y la pantalla queda como siempre).
- Selector de día (hoy + 6 días) y, por cada pista del club, una parrilla de franjas de una hora (08:00–22:00) con su estado: **libre** (reservable), **clase** (ocupada por una clase, con su nombre), **ocupada** (reservada por otro socio) y **mía** (pulsando se cancela).
- Las franjas de hoy ya pasadas no son reservables.

### Reglas funcionales

- **Las clases tienen prioridad** sobre las reservas individuales:
    - Una pista ocupada por una clase no se ofrece como disponible en esa franja (las clases anuladas por excepción/festivo sí liberan la pista ese día).
    - Si el staff crea o mueve una clase sobre una franja con reservas individuales futuras, esas reservas **se eliminan automáticamente** y el socio recibe una notificación (`TrackReservationCancelledNotification`).
- Una pista ya reservada por otro socio no aparece disponible (un índice único pista+fecha+hora evita la doble reserva en condiciones de carrera).
- La disponibilidad se calcula **por pista**, no de forma global del club.
- El socio cancela sus propias reservas; el staff puede cancelar cualquiera.

### API

| Operación | Endpoint | Notas |
|---|---|---|
| Disponibilidad | `GET /api/track-bookings/availability?date=Y-m-d` | Por pista, franjas con estado |
| Mis reservas | `GET /api/track-bookings/my` | Próximas del usuario |
| Reservar | `POST /api/track-bookings` | pista + fecha + hora en punto |
| Cancelar | `POST /api/track-bookings/{id}/delete` | Propia o staff |

Todas tras el middleware `track_booking.enabled` (403 con el módulo desactivado). Modelo `TrackReservation` (tabla `track_reservations`, migración `2026_07_07_120000`).

---

## 🧪 Cobertura de tests

- `tests/Feature/TrainingTrackTest.php` (backend, 13 tests): creación automática de la pista principal, CRUD del gestor, validación de terreno, aislamiento multi-tenant ([[arquitectura-multi-tenant]]), bloqueo de borrado de la última pista, reasignación de horarios y asignación de pista en time slots.
- `tests/Feature/TrackReservationTest.php` (backend, 11 tests): gating del módulo, reserva y cancelación, prioridad de clases (incluida la purga con notificación), disponibilidad por pista y validaciones de franja.
- Frontend (Vitest): `gestionar-pistas.component.spec.ts` (9 tests) y `reserva-pistas.component.spec.ts` (7 tests).

Ver [[registro-tests]].
