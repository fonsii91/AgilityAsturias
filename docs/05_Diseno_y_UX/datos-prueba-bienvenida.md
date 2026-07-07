---
aliases: [Datos de Prueba, Semilla de Bienvenida, Welcome Seed]
tags: [onboarding, ux, datos-ejemplo, ciudad-fantasma]
status: implementado
---
# 🌱 Datos de Prueba de Bienvenida (Semilla del Club)

Cuando se aprovisiona un club nuevo, la plataforma lo rellena automáticamente con
un conjunto de **datos de ejemplo, borrables y marcados como `(ejemplo)`**, para
que el gestor no se encuentre la aplicación vacía nada más entrar. Es la respuesta
directa al efecto **"Ciudad Fantasma"** (ver [[estrategias-onboarding-ux]] y
[[marketing]]): un club sin datos transmite sensación de producto incompleto y
desmotiva justo después de pagar la suscripción.

Se complementa con los **estados vacíos accionables** (componente `<app-empty-state>`):
allí donde aún no hay datos reales, el usuario ve un mensaje con un CTA que le guía
a crear el primer registro, respetando el color del club (multi-tenant).

---

## 🎯 Objetivo

- Que el gestor recién suscrito vea **cómo se ve un club vivo** desde el segundo 1.
- Servir de **tutorial implícito**: cada módulo se muestra ya con datos representativos.
- Poder **borrar** todo con facilidad cuando el club empieza a meter datos reales.

---

## 📦 Qué se siembra

Al crear el club se generan:

- **1 perro de ejemplo** ("Rex (ejemplo)") propiedad del gestor.
- **3 clases** en el horario semanal (Lunes / Miércoles / Viernes).
- **1 anuncio de bienvenida** fijado en el tablón.
- **2 eventos** en el calendario: *"Día de creación de la web del club"* (hoy) y
  *"Límite para conseguir la recompensa por completar el tutorial"* (+14 días).
- **Cargas de salud** del perro repartidas en 28 días → el velocímetro de
  [[sistema-diseno|Salud Deportiva]] (ACWR) sale en **verde** (~1,1).
- **Bitácora**: 3 mangas RSCE (Canina) + 3 RFEC (Caza), con las licencias
  rellenas para que ambos módulos queden **desbloqueados**.
- **Temporada de ranking activa** + **5 socios de ejemplo** (cada uno con su
  perro, "(ejemplo)"), con **asistencias verificadas** que les dan puntos, de modo
  que la **clasificación** aparece poblada y ordenada.
- **Reservas** de cada socio para **la semana pasada (pendiente de verificar)**,
  **esta semana** y **la siguiente**, de forma que el gestor vea ocupación en las
  clases y **verificaciones de asistencia pendientes**.

### Tema visual
El club arranca con el tema **"Slate & Amber"** (`#334155` / `#F59E0B`) por defecto.

---

## 🧩 Política de activación de módulos (decisión UX)

Los módulos opcionales no arrancan todos encendidos (ver [[gestionar-club]] y la
sección **Funcionalidades del club**):

- **Gamificación → ON** (si el plan la incluye): es el núcleo de engagement y la
  semilla la deja viva (clasificación poblada).
- **Bitácoras RSCE y RFEC → ON** (si el plan incluye `modulo-canina` / `modulo-caza`):
  son diarios personales de competición y la semilla crea mangas de ejemplo que las
  dejan desbloqueadas. El gestor puede apagarlas desde **Funcionalidades del club**
  (`rsce_tracker_enabled` / `rfec_tracker_enabled`); en clubes anteriores a estas
  claves la ausencia cuenta como activado.
- **Provisión de Fondos, Patrocinadores, Liga Norte → OFF** por defecto, aunque el
  plan los incluya. Manejan dinero / cara pública / nicho; en vacío dan mala
  imagen. El gestor los activa cuando esté listo desde **Funcionalidades del club**.

---

## ⚙️ Detalles técnicos

- Código: `App\Services\ClubProvisioningService::seedWelcomeData()` (backend).
  Se invoca tras aprovisionar el club, **fuera de la transacción crítica del pago**
  y en `try/catch`: si la semilla falla, se loguea pero **nunca** bloquea el alta.
- Se ejecuta en **ambos** caminos de aprovisionamiento: pago real (webhook de
  Stripe `checkout.session.completed`) y bypass de suscripciones.
- Cada registro lleva **`club_id` explícito**: el aprovisionamiento corre fuera del
  contexto de tenant (lo dispara el webhook), así que el trait `HasClub` no lo
  autoasigna (ver [[arquitectura-multi-tenant]]).
- Desbloqueos: Canina (RSCE) requiere `dog.pivot.rsce_license` **y** `rsce_grade ≠ '0'`;
  Caza (RFEC) requiere `user.rfec_license`. La semilla rellena ambas.
- Velocímetro verde: el ACWR es un ratio carga aguda/crónica; con cargas repartidas
  y la semana reciente algo más exigente se obtiene ~1,1 (zona óptima).

---

## 🧹 Limpieza de los datos de prueba (borrado en bloque)

Implementado un **borrado en bloque seguro**: la semilla registra los **IDs exactos**
de lo que crea en `settings['_demo_seed']`, y el borrado elimina justo esos
registros (los hijos —reservas, cargas, mangas, puntos— por `dog_id`), sin tocar
datos reales.

- **Backend**: `ClubProvisioningService::clearDemoData()` (idempotente; si no hay
  marcador, no hace nada). Endpoint `POST /admin/clubs/{club}/clear-demo` (gestor
  sobre su propio club). También limpia la licencia RFEC de ejemplo del gestor (solo
  si no la ha cambiado) y quita el marcador `_demo_seed`.
- **Frontend**: en **Funcionalidades del club** aparece un banner *"Datos de ejemplo
  activos"* con el botón **"Eliminar datos de ejemplo"** (con diálogo de
  confirmación), visible solo mientras quede `_demo_seed`.

Se conserva el **borrado individual** de cada registro por si el gestor quiere quedarse
con parte (p.ej. el horario de clases como plantilla).

Posible mejora futura: ofrecer el borrado **proactivamente** al detectar el primer
dato real (p.ej. un socio real registrado) — "Parece que ya tienes datos propios,
¿quieres limpiar los de ejemplo?".

> Estado: **implementado**.
