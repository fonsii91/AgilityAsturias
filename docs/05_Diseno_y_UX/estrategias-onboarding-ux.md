# Estrategias UX/UI: Onboarding y Estados Vacíos

Este documento detalla las estrategias de experiencia de usuario (UX) para mitigar el problema del "Cold Start" o "Efecto Ciudad Fantasma" en Club Agility: un usuario que entra por primera vez y se encuentra módulos vacíos, lo que genera frustración y abandono.

> **Importante (negocio):** completar el onboarding **no es cosmético**. Es la métrica del *Reto de Activación* del programa de referidos: cuando **7 miembros completan el tutorial**, el club desbloquea descuentos de Stripe (ver [[marketing]]). Por eso el objetivo de diseño nº1 es que **cualquier socio pueda llegar al 100%**, incluso en un club recién creado y vacío.

> Este documento describe el sistema **as-built** (implementado). La fuente única de los pasos vive en `frontend/src/app/services/onboarding.ts`; el estado del club y el reto, en `OnboardingController`. Roles en [[usuarios]]; funciones y su ubicación en el menú en [[funcionalidades]] y [[sistema-diseno]] §7.

---

## 1. Widget Flotante Global (Global Popover)

El checklist se implementa como un **FAB** (botón flotante) fijo abajo a la derecha, persistente en toda la app.

*   **Minimizado:** anillo de progreso con el % del tutorial activo.
*   **Expandido:** *popover* con la lista de pasos; cada paso navega a su pantalla y el widget sigue visible (no se pierde el contexto).
*   **Finalización:** al llegar al 100% del tutorial de Miembro se lanza confeti + "¡Felicidades!" y el widget se oculta.

El widget solo aparece si hay un tutorial activo para el rol del usuario (ver cascada). El theming usa `var(--primary-color)` (multi-tenant, ver [[arquitectura-multi-tenant]]).

---

## 2. Modelo de pasos (clave para evitar la frustración)

Cada paso declara una **naturaleza** (`kind`) y, opcionalmente, condiciones de visibilidad y de auto-compleción. Esto es lo que evita los dos problemas que llevaron a ocultar el widget en su día (pasos imposibles, y pasos redundantes/destructivos):

| Mecanismo | Campo | Comportamiento |
|---|---|---|
| **Módulo no disponible** | `feature` (plan) / `setting` (flag del gestor) | El paso se **elimina** del tutorial (no se ve ni cuenta). Mismo criterio que el navbar. |
| **Sin datos todavía** | `requires` → `club_state` (kind `dependiente`) | El paso se muestra **atenuado** ("Disponible cuando tu club lo prepare") y **no bloquea** el 100% (se excluye del denominador). |
| **Ya existe en el club** | `satisfiedBy` → `club_state` | El paso cuenta como **hecho automáticamente** si el club ya tiene el dato (lo creara quien lo creara). Resuelve el "ya lo hizo otro del staff". |

Tipos (`kind`): `personal` (datos propios, siempre posible), `explorar` (solo visitar una pantalla), `setup-club` (configuración de club), `dependiente` (necesita datos creados por el club).

`club_state` lo calcula el backend (`OnboardingController@getProgress`): `has_bookable_classes`, `has_events`, `has_announcements`, `has_gallery`, `has_team`.

### Salidas de emergencia
*   **Omitir paso:** lo marca como completado (en Miembro cuenta para la métrica del reto).
*   **Saltar tutorial:** marca el tutorial como finalizado y oculta el widget.

Nadie debe quedar atrapado en un paso que no puede completar.

---

## 3. Cascada de tutoriales (Gestor → Staff → Miembro)

Los checklists se encadenan para que los roles con más permisos dominen toda la app:
*   **Responsable/Gestor:** Gestor → Staff → Miembro.
*   **Staff:** Staff → Miembro.
*   **Socio:** solo Miembro.

> La cascada **se mantiene** porque la métrica del reto cuenta a socios **y** staff que completen el tutorial de Miembro (final de la cascada). Pero ya **no es frustrante**: gracias a `satisfiedBy`, en un club configurado los pasos de Gestor/Staff se auto-marcan, y al cerrar un tutorial se encadena el siguiente automáticamente; el usuario aterriza directo en el primer paso que requiere acción real.

---

## 4. Pasos de cada tutorial (as-built)

### A. Gestor (`setup-club`)
1.  **Personaliza tu Club** (logo, eslogan, imágenes, colores).
2.  **Configura el Horario Base** — *feature* `reservas-pistas`; auto-hecho si ya hay clases.
3.  **Añade a tu Equipo** (enlaces de invitación) — auto-hecho si el club ya tiene más miembros.
4.  **Inaugura la Galería** — auto-hecho si ya hay fotos en la galería.

### B. Staff
1.  **Añade a tu perro** (`personal`).
2.  **Configura el horario** — auto-hecho si ya hay clases (*feature* `reservas-pistas`).
3.  **Programa un evento** — auto-hecho si ya hay eventos.
4.  **Publica un anuncio** — auto-hecho si ya hay anuncios.
5.  **Visita la clasificación** (`explorar`) — *setting* `gamification_enabled`.
6.  **Dar puntos extra** (`explorar`, desde la Clasificación) — *setting* `gamification_enabled`.

> Los pasos de "crear" del Staff (horario/evento/anuncio) **no obligan a generar datos basura**: si el club ya tiene ese contenido, se dan por hechos; si está vacío, son acciones legítimas de puesta en marcha. Nunca fuerzan un envío de notificación ni tocar datos en vivo.

### C. Miembro (intocable: es la métrica del reto)
1.  **Añade o edita a tu Compañero** (`personal`).
2.  **Apúntate a una clase** (`dependiente` → `has_bookable_classes`, *feature* `reservas-pistas`).
3.  **Apúntate a un evento** (`dependiente` → `has_events`).
4.  **Revisa el tablón** (`explorar`).
5.  **Revisa la clasificación** (`explorar`, *setting* `gamification_enabled`).
6.  **Completa los perfiles** (`personal`).

Los pasos 2 y 3 son los únicos que dependen de datos del club: si no los hay, se atenúan y **no impiden** llegar al 100%.

---

## 5. Reto de Activación (visualización en el calendario)

El programa de referidos (ver [[marketing]]) se materializa como un evento de calendario y un panel de progreso:

*   **Evento tipo `reto`:** al aprovisionar un club se crea el evento *"Límite para conseguir la recompensa por completar el tutorial"* (`Competition.tipo = 'reto'`, a +14 días). En el calendario muestra un **badge de trofeo**.
*   **Modal del reto** (`app-challenge-modal`): al pulsar ese evento se abre, en lugar del detalle de evento normal, un panel con la **fecha límite**, una **barra global hacia el objetivo (700% = 7 miembros × 100%)** y el **progreso de cada miembro**.
*   **Cálculo (endpoint `GET /user/onboarding/challenge`):** un miembro que **ha terminado** el tutorial cuenta como **100%** (aunque algunos pasos le salieran ya completos por el estado del club); el resto suma su porcentaje en curso. Objetivo: suma ≥ 700%.
*   **Monitor de admin** (`/admin/onboarding-monitor`): reutiliza el mismo endpoint para que la administración supervise el progreso del reto del club.

---

## 6. Estados Vacíos (`<app-empty-state>`) — implementado

Ninguna sección muestra tablas vacías ni "No hay resultados" a secas. Existe un **componente reutilizable** `<app-empty-state>` (icono + título + mensaje + CTA opcional), usado en toda la app (galería, fotos, vídeos, recursos, bitácoras RSCE/RFEC, Salud Deportiva, reservas, clasificación, etc.).

*   **CTA:** navega a una ruta (`ctaRoute`) o emite `ctaClick`; opcionalmente marca un paso de onboarding (`onboardingStep`), enganchando los vacíos con el checklist.
*   **Variantes:** `first-use` (vacío real, guía a actuar) vs `no-results` (filtro/búsqueda sin resultados).
*   **Caso reservas:** si el club no tiene clases, la pantalla de Reservas muestra un empty-state explicativo (en vez de quedar en blanco), coherente con el paso atenuado del widget.

### Consideraciones técnicas (Multi-Tenant)
*   **Theming dinámico:** es **imperativo** usar variables CSS globales (`var(--primary-color)`, etc.); nada de colores hardcodeados, para que la UI adopte la identidad de cada club en tiempo de ejecución (ver [[arquitectura-multi-tenant]], [[sistema-diseno]]).
*   **Iconografía:** `<mat-icon>` / SVG, **sin emojis** en la interfaz, para un acabado uniforme.
