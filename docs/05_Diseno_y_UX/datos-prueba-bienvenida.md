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

## ❓ Decisión abierta: limpieza de los datos de prueba

¿Conviene un botón de **"Eliminar datos de ejemplo" de golpe**, o que el gestor los
vaya borrando uno a uno?

**Recomendación:** ofrecer un **borrado en bloque** (un botón en *Funcionalidades* o
*Configurar club*: "Eliminar todos los datos de ejemplo"), por:
- Todos los registros están **marcados `(ejemplo)`** → identificarlos es trivial.
- Borrar a mano 5 socios + 6 perros + reservas + mangas + temporada es **tedioso y
  propenso a dejar restos** (p.ej. la temporada de ranking, que no es obvia).
- Da **control y limpieza inmediata** cuando el club arranca de verdad.

Matices:
- Mantener también el borrado individual (por si quieren conservar parte, p.ej. el
  horario de clases como plantilla).
- Confirmación clara e **idempotente** (que no borre datos reales: filtrar por la
  marca de ejemplo / por los IDs sembrados, nunca "borrar todo lo del club").
- Opcional: ofrecerlo proactivamente cuando se detecte que el club ya tiene datos
  reales (p.ej. un socio real registrado) — "Parece que ya tienes datos propios,
  ¿quieres limpiar los de ejemplo?".

> Estado: **pendiente de implementar** el borrado en bloque.
