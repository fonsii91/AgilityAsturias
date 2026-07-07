---
aliases: [Provisión de Fondos, Finanzas de Socios, Saldo de Socios]
tags: [producto, finanzas, boveda, funcional]
status: borrador
---

# 💰 Provisión de Fondos de Socios

La **Provisión de Fondos** es un módulo financiero dentro de ClubAgility diseñado para agilizar el cobro y gestión de las actividades cotidianas del club. Permite a los socios depositar dinero por adelantado en una cuenta virtual dentro del club para que de ahí se vayan descontando automáticamente las cuotas mensuales, el coste de las licencias, inscripciones a pruebas de agility, seminarios o merchandising.

---

## 1. ⚙️ Reglas de Negocio y Flujo

1.  **Saldo Virtual:** Cada socio tiene asignado un saldo acumulado (neto) calculado en tiempo real mediante la fórmula: `Total Ingresos - Total Gastos`.
2.  **Límite de Descubierto:** Por defecto, no se permiten gastos si el saldo resultante es negativo, a menos que el Gestor autorice explícitamente un descubierto para un socio de confianza.
3.  **Moneda:** Todas las transacciones se realizan en Euros (€).
4.  **Auditoría Estricta:** Cada movimiento de fondos (ingreso o gasto) debe quedar registrado de forma inmutable, registrando qué usuario (Gestor) creó la transacción. No se permiten borrados físicos definitivos, sino anulaciones de transacciones mediante un movimiento de signo contrario o un estado "Anulado" para mantener la integridad contable.

---

## 📊 2. Modelo de Datos (Movimientos)

Cada registro de la provisión de fondos contiene los siguientes campos obligatorios y opcionales:

| Campo | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| **id** | Integer (Auto) | Sí | Identificador único de la transacción. |
| **socio_id** | Integer (FK) | Sí | Vínculo al socio (tabla `users`) al que pertenece la provisión. |
| **fecha** | DateTime | Sí | Fecha y hora en la que se efectúa el movimiento. |
| **concepto** | String (255) | Sí | Explicación del movimiento (ej. "Cuota mensual junio 2026", "Ingreso efectivo"). |
| **tipo** | Enum | Sí | `ingreso` (suma al saldo) o `gasto` (resta del saldo). |
| **importe** | Decimal (8,2) | Sí | Cantidad económica siempre positiva. |
| **metodo_pago** | Enum | Sí | `transferencia`, `bizum`, `efectivo`, `tarjeta`, `otro`. |
| **justificante** | String (URL) | No | Enlace al PDF o imagen del ticket/recibo subido por el Gestor. |
| **creado_por** | Integer (FK) | Sí | ID del usuario (Gestor) que registró el movimiento para fines de auditoría. |

---

## 👥 3. Permisos y Matriz de Control de Acceso (RBAC)

De acuerdo con las reglas de privacidad y jerarquía del club, el acceso a la información financiera se divide estrictamente de la siguiente manera:

*   **Socio / Miembro (`member`):**
    *   *Lectura:* Únicamente puede visualizar su saldo acumulado y la lista histórica de sus propios movimientos (ingresos y gastos).
    *   *Escritura:* No tiene permisos de creación, edición ni eliminación de movimientos.
*   **Gestor (Responsable del Club / `manager`):**
    *   *Lectura:* Acceso a un panel global de provisión de fondos. Puede filtrar y buscar por socio, y consultar el extracto de cualquier miembro.
    *   *Escritura:* Control total de los registros (crear nuevos ingresos/gastos, subir justificantes, anular movimientos erróneos).
*   **Staff / Entrenador (`staff`):**
    *   *Sin acceso:* Por motivos de privacidad financiera, los entrenadores y monitores no tienen visibilidad de la provisión de fondos ni del estado de cuentas de los socios. Se deniega el acceso a nivel de API (`403 Forbidden`) y se ocultan los accesos en frontend.
*   **Administrador Global (SaaS Admin / `admin`):**
    *   Soporte técnico global sin intervenir en la contabilidad ordinaria del club a menos que se solicite asistencia para restauraciones.

---

## ⚙️ 4. Configuración y Disponibilidad Opcional

Este módulo financiero no es obligatorio para el funcionamiento de la plataforma. El **Gestor (Responsable del Club)** puede activar o desactivar la funcionalidad en cualquier momento:
- **Gestión:** Desde el panel **[[gestionar-club]]** (`/admin/clubs/edit/:id`), modificando la clave de configuración `settings.provision_fondos_enabled` a través del interruptor correspondiente.
- **Comportamiento al Desactivar:**
  - Se ocultan todos los accesos en el menú lateral y la barra de navegación del frontend para Socios y Gestores.
  - Los endpoints de la API backend de Laravel vinculados a los movimientos y saldos devuelven `403 Forbidden` (bloqueo mediante middleware que verifica la configuración del club).

---

## 🎨 5. Especificaciones UX/UI (Mobile-First)

Para garantizar una usabilidad óptima a pie de pista (bajo el sol directo y con una sola mano), la interfaz debe respetar las directrices descritas en [[sistema-diseno]]:

### Vista del Socio (Consulta)
*   **Encabezado de Saldo:** Un panel destacado y de alto contraste en la parte superior que muestra el saldo actual. Si el saldo es positivo, se muestra en color de éxito (`--success` / Verde); si está a cero o es negativo, se muestra en color de error/peligro (`--danger` / Rojo).
*   **Lista de Tarjetas (`mat-card`):** En móviles se prohíbe el uso de tablas. Los movimientos se listan verticalmente como tarjetas ordenadas cronológicamente (de más reciente a más antiguo).
    *   Cada tarjeta muestra en grande el **Concepto** y la **Fecha**.
    *   El **Importe** se muestra a la derecha con un tamaño de fuente de peso semibold (`font-weight: 600`) y con prefijo de color: un signo `+` verde para ingresos y un signo `-` rojo para gastos.
    *   Icono identificador rápido según el método de pago o tipo de movimiento.
*   **Estado Vacío (Empty State):** Si un socio no posee ningún movimiento, se mostrará una interfaz limpia con un icono de billetera y el texto: *"Tu provisión de fondos no tiene movimientos registrados. Contacta con la directiva para realizar tu primer depósito."*

### Vista del Gestor (Administración)
El panel de administración del gestor (`/admin/finanzas`) emplea una estructura **Split-View (Vista Dividida)** en pantallas de escritorio y una interfaz optimizada por **pestañas reactivas** en dispositivos móviles para gestionar eficientemente clubes de gran volumen (más de 100 socios):

*   **Estructura Split-View (Escritorio):**
    *   **Barra Lateral (30%):** Buscador rápido de socios por nombre/email, pestañas de filtro rápido (`Todos`, `Con Saldo`, `Deudores`) y una lista vertical de miembros que muestra el saldo neto en tiempo real (con colores verde/rojo para saldos positivos o deudas).
    *   **Panel de Detalle / Dashboard (70%):** Cuando no hay un socio seleccionado, se muestra el **Dashboard General** (Bento Grid de KPIs y feed de actividad reciente global). Cuando se selecciona un socio, se despliega su historial detallado y balance destacado.
*   **Diseño Bento Grid de KPIs (Resumen Global):**
    *   Muestra 4 tarjetas de alto impacto visual: *Caja Total del Club* (Ingresos - Gastos), *Fondos a Favor* (saldos positivos), *Deuda Acumulada* y *Socios Deudores* (conteos).
    *   Las tarjetas de deudores actúan como accesos directos interactivos que filtran instantáneamente la barra lateral y redirigen a la sección correspondiente.
*   **Selector de Pestañas (Tabs) en Móvil:**
    *   Para evitar la fatiga por scroll vertical infinito en móviles (al apilar Bento Grid, actividad y 100+ socios), la interfaz utiliza un control segmentado en la cabecera:
        *   **Pestaña "Resumen":** Bento Grid, Feed Reciente de movimientos y el CTA de Registro Múltiple.
        *   **Pestaña "Socios":** Barra de búsqueda y lista de miembros con saldos.
    *   **Interacciones inteligentes:** Al tocar el KPI de deudores en la pestaña de Resumen, la app filtra automáticamente a los deudores y cambia de pestaña a "Socios" sin requerir navegación manual.
*   **Formulario de Registro (Bottom Sheet Modal):**
    *   Se despliega desde el borde inferior de la pantalla con una **cabecera y botones de acción ("Cancelar" / "Registrar") fijos (sticky)**. Esto garantiza que las acciones principales sigan siendo accesibles al instante sin tener que desplazarse por el formulario.
    *   **Registro Múltiple (Bulk Mode):** Permite al gestor emitir una transacción única (como cuotas mensuales o licencias) en lote para varios socios de una sola vez. Dispone de un listado interno con checkboxes y accesos rápidos de selección colectiva (`Todos`, `Deudores`, `Ninguno`).
    *   El selector de método de pago cuenta con un diseño opaco sólido para evitar que las opciones se solapen visualmente con los campos inferiores.
    *   **Justificante Drag-and-Drop:** Zona interactiva de carga de archivos (PDF o imágenes, máx. 5MB) que reacciona con micro-animaciones y cambios de color según el estado del archivo (`drag-over`, `has-file`).
    *   **Prevención de Errores (Double-submit):** El botón de guardar se deshabilita instantáneamente al iniciar el guardado para evitar registros duplicados.


---

## 🎟️ 6. Bonos de Clases

Además de los movimientos de dinero, la sección de Provisión de Fondos gestiona los **bonos de clases** de los socios: un **contador de clases disponibles por miembro, sin caducidad**.

### Activación (opt-in del gestor)

Funcionalidad activable/desactivable por el Responsable del Club (setting `class_bonuses_enabled`, desactivada por defecto) desde dos sitios equivalentes:

- **Funcionalidades del club** → tarjeta "Bonos de Clases".
- **Gestión de Horarios → Ajustes (Reglas de Reservas)** → checkbox "Bonos de clases".

### Gestión (staff)

- **Gestión de Miembros** es el sitio canónico de recarga (accesible al staff): cada socio muestra un distintivo verde con su saldo de bono; pulsándolo se abre el modal para añadir clases. No depende de ningún otro módulo — el enlace "Recargar bonos" de la tarjeta del módulo en Funcionalidades apunta aquí, precisamente porque los bonos pueden estar activos con la Provisión de Fondos apagada (`/admin/finanzas` está tras `provisionFondosGuard`).
- En **Administrar Finanzas** (gestor), como sitio secundario y solo si la Provisión de Fondos está activa, al seleccionar un socio aparece la tarjeta de su bono con el saldo actual y un campo para **añadir clases directamente** (los valores negativos corrigen errores; el saldo nunca baja de 0). Útil cuando se cobra el bono y se registra el ingreso en la misma pantalla.
- Endpoint: `POST /api/class-bonuses/{userId}/add` con `{ classes }` (roles admin/manager/staff, tras el middleware `class_bonuses.enabled`).
- El dashboard financiero (`users_with_balances`) incluye el campo `class_bonus` de cada socio.

### Consumo y devolución automáticos

Con la funcionalidad **activada**:

- **Apuntarse a una clase consume una clase del bono** en el momento de la inscripción (una por perro/plaza; el descuento es atómico para evitar carreras).
- **Sin clases disponibles no se puede apuntar**: se bloquea la inscripción del socio (y también la del staff en su nombre, con un mensaje que le indica recargar el bono primero).
- La clase consumida **se devuelve al bono** en todas las vías de cancelación: el socio cancela, el staff le desapunta (individual o en bloque), el staff anula la clase por excepción/festivo, o se borra el horario completo.
- Cada reserva guarda la marca `bonus_consumed`: solo se devuelve lo que realmente se consumió (sin dobles devoluciones y sin devoluciones de reservas hechas con la funcionalidad desactivada).
- Las reservas de usuarios staff/gestor para sí mismos no consumen bono.

Con la funcionalidad **desactivada**, las clases funcionan como siempre, sin consumir bonos (los saldos se conservan).

### Vista del Socio

El socio ve cuántas clases le quedan en tres puntos:

- **Reservas**: distintivo en la cabecera ("Bono: X clases disponibles", o aviso de bono agotado), que se refresca tras reservar o cancelar.
- **Modal de confirmación de reserva**: recordatorio de que se consumirá 1 clase por perro y del saldo actual, justo antes de confirmar.
- **Mis gastos (/finanzas)**: tarjeta "Tu Bono de Clases" junto al saldo de fondos (azul con saldo, ámbar si está agotado), con el dato refrescado al entrar.
