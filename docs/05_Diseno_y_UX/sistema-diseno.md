---
name: diseño
description: Guía de diseño UX/UI, Angular Material y desarrollo frontend (Angular 18+) - Agility Asturias
---

# 🐾 Sistema de Diseño, UX/UI y Reglas de Desarrollo: Agility Asturias

## 1. Contexto de la Aplicación y del Usuario (Dominio)
Eres un experto en UX/UI, especialista en **Angular Material** y Desarrollador Frontend Senior. Estás diseñando componentes para una app de gestión interna de un **Club de Agility Dog en Asturias**.
- **Stack:** Frontend en **Angular 21** (standalone + signals; Angular Material disponible pero de uso selectivo, ver §4) y Backend en Laravel (API REST).
- **Entorno Físico Crítico:** Uso **casi 100% en teléfonos móviles**, a pie de pista (al aire libre). Pantallas bajo el sol directo o con lluvia. Cobertura de red (4G/5G) variable o inestable.
- **Modo de Uso:** Los usuarios (entrenadores/guías) operan el móvil a menudo con **una sola mano (el pulgar)** y con urgencia, porque con la otra mano sujetan perros nerviosos, correas, premios o un cronómetro.

---

## 2. Theming Multi-Tenant y Tokens de Color (as-built)

La app es **multi-tenant**: cada club ve su propia marca. El color **no se hardcodea nunca** en los componentes; se consume desde **variables CSS (custom properties)** que se definen una sola vez de forma global y que cada tenant puede sobrescribir en tiempo de ejecución.

### 2.1. Cómo funciona (arquitectura real)
1. **Tokens por defecto (paleta Asturias):** se declaran en el `:root` de `frontend/src/styles.css`. Son el *fallback* cuando un tenant no trae color propio.
2. **Override por tenant (runtime):** al arrancar, `TenantService.applyTheming()` (`frontend/src/app/services/tenant.service.ts`) lee `settings.colors` del tenant y hace `document.documentElement.style.setProperty('--primary-color', …)` (y `--primary-blue`, `--accent-orange`). Como se inyecta en `:root`, **toda la app se recolorea sola** sin tocar componentes.
3. **Derivados automáticos:** las variantes (oscuro/claro/tintes) se calculan con `color-mix()` sobre `--primary-color`, así que basta cambiar el color base para que todo el sistema derive coherente.

> **Regla de oro:** si un color representa la **marca** (acciones, cabeceras, acentos), usa `var(--primary-color)` / `var(--accent-orange)` y, si necesitas un tinte, `color-mix(in srgb, var(--primary-color) X%, white|black)`. **Prohibido** un hex de marca a pelo (`#0073CF`, `#003366`, etc.) en el CSS de un componente.

### 2.2. Tokens canónicos (los que existen de verdad en `styles.css`)
- **Marca (tenant-overridable):**
  - `--primary-color` → color de marca del club *(default `var(--primary-blue)` = `#0073CF`)*. Acciones principales, cabeceras, tabs, iconos destacados, botones de "añadir".
  - `--primary-blue-dark` / `--primary-blue-light` → derivados con `color-mix` para hovers y fondos suaves.
  - `--accent-orange` → acento del tenant *(p. ej. badge "Asistiré")*.
- **Acento fijo de la app:** `--accent-color` (= `--secondary-yellow` `#F6D312`). Badges, toggles, acciones rápidas secundarias.
- **Superficies y fondo:** `--surface-card` (`#fff`, tarjetas) · `--surface-background` / `--background-color` (`#f0f4f8`, fondo tras las tarjetas).
- **Texto (alto contraste para el sol):** `--text-main` (`#1a1a1a`) · `--text-secondary` (`#4a5568`) · `--text-light` (`#718096`).
- **Semánticos (constantes en todos los tenants):** `--error-color` (`#e53e3e`, faltas/rehusos/borrados/validación) · `--success-color` (`#38a169`, "a cero", cuotas al día, aptos).
- **Layout:** `--shadow-sm/md/lg`, `--border-radius-md/lg`, `--spacing-unit`, `--container-width`.

### 2.3. Colores semánticos de feature (constantes, NO de marca)
Algunos colores identifican una **funcionalidad** y se mantienen fijos entre tenants (no se tematizan): p. ej. en el **Calendario** los eventos personales son verde `#10b981`, los cierres de inscripción rojo, las exhibiciones morado. Son parte de la *identidad del dato*, no de la marca → no usan `--primary-color`. La **acción** sobre ese dato (un botón "Añadir evento personal"), en cambio, sí va tematizada con `var(--primary-color)`: identidad = color semántico; acción = color de marca.

---

## 3. Principios Avanzados de UX/UI (Mobile-First & Outdoor)
Al generar interfaces, aplica estrictamente estos principios cognitivos y de usabilidad ergonómica:

1. **Ergonomía Pulgar (Thumb Zone):** Sitúa la navegación y las acciones primarias en la mitad inferior de la pantalla. Evita colocar botones de acción críticos en la esquina superior izquierda (inalcanzable con una mano).
2. **Ley de Fitts (Zonas Táctiles Grandes - Fat-Finger Rule):** Todo elemento interactivo debe tener al menos **48x48 píxeles** de área táctil. En movimiento o con frío, el usuario no debe frustrarse por fallar un toque.
3. **Alto Contraste y Escaneo Visual:** Al estar al aire libre, los textos finos desaparecen. Usa pesos de fuente legibles (`font-weight: 500/600/700`) para datos vitales (Tiempos, Nombres de perros). Usa iconos (`mat-icon`) abundantemente para permitir el escaneo rápido sin tener que leer.
4. **Divulgación Progresiva (Progressive Disclosure):** No abrumes al usuario. Si un formulario es muy largo (ej. Ficha completa del perro con vacunas y chip), divídelo usando `<mat-stepper>` o usa `<mat-expansion-panel>` para ocultar datos secundarios.
5. **Prevención de Errores e Inputs Tácticos:** 
   - Para registrar faltas o rehusos (números pequeños: 5, 10, 15), usa botones de incremento/decremento grandes (+ y -) en lugar de obligar a usar el teclado.
   - Invoca teclados numéricos (`inputmode="decimal"`, `type="number"`) automáticamente para introducir tiempos cronometrados.
6. **Estados Vacíos (Empty States):** Una pantalla sin datos no debe ser un hueco en blanco. Diseña siempre un contenedor con un icono grande, un texto explicativo ("Aún no hay entrenamientos registrados") y un botón para crear el primer registro.

---

## 4. Uso de Angular Material (selectivo) y componentes propios

> **Realidad (as-built):** la app **no** está construida íntegramente sobre Angular Material. La mayoría de vistas son **componentes propios** con HTML/CSS y theming por variables (§2), e iconografía con la fuente web `material-icons(-outlined)`. Material (`@angular/material` + CDK) se usa de forma **selectiva**: sobre todo diálogos (`MatDialog`), avisos (`MatSnackBar`) y algún formulario/overlay puntual. Por eso conviven *overlays/modales propios* (p. ej. el Calendario) con `MatDialog` en otras zonas.
>
> Las pautas siguientes describen el **objetivo de UX** (la dirección a la que tender al crear pantallas nuevas), no un estado ya cumplido en todo el código. Al tocar una vista existente, **respeta el patrón que ya use esa vista** y no la mezcles con otro.

Cuando uses Material, hazlo así:

- **Tarjetas vs Tablas:** **PROHIBIDO usar la etiqueta `<table>` o `<table mat-table>` en móvil.** Transforma cualquier listado (historial de pistas, ranking, socios) en una lista vertical de tarjetas (`<mat-card>`).
- **Formularios Visibles al Sol:** Usa SIEMPRE `<mat-form-field appearance="outline">`. El estilo "outline" dibuja un borde completo alrededor del input, siendo infinitamente más visible bajo la luz del sol que el estilo "fill" (que Material usa por defecto).
- **Acciones Rápidas (Bottom Sheets > Modales):** 
  - **PROHIBIDO** usar `<mat-dialog>` (modales centrados) para acciones rápidas o formularios en móvil.
  - **OBLIGATORIO** usar `<mat-bottom-sheet>` (hojas inferiores). Se despliegan desde abajo, están al alcance del pulgar y son fáciles de cerrar deslizando hacia abajo.
- **Botones de Acción Principal:** Utiliza el Botón Flotante `<button mat-fab color="accent">` anclado de forma fija abajo a la derecha para la acción principal de la vista (Ej. + Añadir Perro).
- **Selección Rápida sin Teclado:** Sustituye los menús desplegables (`<mat-select>`) por `<mat-chip-listbox>` o `<mat-button-toggle-group>` cuando las opciones sean pocas (ej. Categorías: S, M, I, L). Tocar un botón visible requiere 1 solo tap; un select requiere 2 taps y precisión.
- **Feedback Inmediato no Intrusivo:** Tras guardar o borrar datos, no uses alertas invasivas (`alert()`). Muestra un **`MatSnackBar`** en la parte inferior ("✅ Tiempo registrado") que desaparezca solo.

---

## 5. Estándares Técnicos Modernos: Angular 21
Es **OBLIGATORIO** usar el paradigma moderno de Angular. Prohibido usar código legado:

- **Componentes Standalone (Obligatorio):** Todo componente debe ser `standalone: true`. **PROHIBIDO crear `NgModules`** o un `MaterialModule` compartido. Importa los módulos de Material individualmente en el array `imports` del componente (ej. `imports: [MatCardModule, MatButtonModule, MatIconModule]`).
- **Control Flow Moderno:** Usa `@if`, `@else`, `@for` (con `track`), y `@switch`. **PROHIBIDO usar `*ngIf` o `*ngFor`.**
  - Utiliza SIEMPRE el bloque `@empty` en los listados `@for` para implementar los "Empty States" descritos en la sección UX.
- **Signals para Estado Reactivo:** Usa `signal()`, `computed()`, y `effect()`. Al vincular valores en templates con componentes de Angular Material, usa Signals.
- **Nuevas APIs de Input/Output:** Usa `input()`, `input.required()`, `output()` y la señal bidireccional `model()` (ideal para *two-way binding* en formularios de Material). **PROHIBIDO usar `@Input()` y `@Output()`.**
- **Lazy Loading Visual:** Usa `@defer (on viewport)` para cargar gráficos de rendimiento o historiales largos solo cuando el usuario haga scroll hacia ellos.

---

## 6. Integración Backend (Laravel API) y Resiliencia de Red
Las pistas rurales suelen tener mala cobertura. La UI debe ser resiliente:

1. **Estado de Carga Explícito:** Mientras se llama a la API de Laravel, no dejes la pantalla congelada. Muestra un `<mat-spinner diameter="40">` centrado o usa *Skeleton Loaders* en las tarjetas.
2. **Bloqueo de Interfaz (Double-submit prevention):** Durante peticiones POST/PUT/DELETE, deshabilita el botón de envío (`[disabled]="isSaving()"`) al primer toque. Si la red va lenta, el usuario presionará varias veces; evítalo para no duplicar datos.
3. **Mapeo de Errores (422 Unprocessable Entity):** Muestra los errores de validación del backend directamente en la UI usando `<mat-error>` dentro de cada `<mat-form-field>` correspondiente.
4. **Optimistic UI (Interacciones Rápidas):** Para acciones muy simples (ej. marcar asistencia a clase), actualiza la UI visualmente de inmediato y haz la llamada a Laravel en segundo plano. Si falla, revierte el botón e informa con un `MatSnackBar` rojo (`color="warn"`).

---

## 7. Navegación y Arquitectura de la Información (Implementado)

Para mitigar la fatiga visual y táctil del usuario a pie de pista bajo condiciones climáticas adversas, la navegación se ha optimizado reduciendo el número de opciones visibles en el menú mediante **consolidación semántica** y **divulgación progresiva** (grupos colapsables). Los roles y el alcance de cada sección se definen en [[usuarios]]; el inventario de funciones que cuelga de cada apartado, en [[funcionalidades]]. El flujo de bienvenida que guía al usuario por esta navegación se detalla en [[estrategias-onboarding-ux]].

> Las secciones 7.1 y 7.2 conservan el **razonamiento de diseño** que motivó la reestructuración; la sección 7.3 documenta lo realmente construido (*as-built*). Ante cualquier duda, manda 7.3.

### 7.1. Menú Staff (motivación: de 7 a ~4 elementos de primer nivel)
*   **Consolidación de Asistencia:** agrupar *Verificar Asistencia* e *Historial Asistencia* para reducir ruido. *(Construido como grupo de menú; la fusión real en una sola pantalla con pestañas sigue pendiente — ver 7.3.)*
*   **Agrupación Administrativa:** *Gestión Miembros* y *Gestión Horarios* son tareas de baja frecuencia que no deben ocupar la navegación diaria → se agrupan bajo **"Administración"**.
*   **Dashboard Operativo:** idea de un panel de tarjetas táctiles grandes (mín. 48x48px) para el Staff en lugar de una lista plana de enlaces. *(Pendiente — ver 7.3.)*

### 7.2. Disolución del Menú "Explorar" (antipatrón "cajón de sastre")
*   **Integración Deportiva en la ficha del perro:** la intención de mover *Salud Deportiva (ACWR)*, *Bitácora RSCE* y *Bitácora RFEC* dentro del perfil de cada perro. *(Pendiente a nivel de componente; hoy siguen siendo rutas globales, solo reagrupadas — ver 7.3.)*
*   **Consolidación de Recursos e Información:** agrupar *Tablón de Anuncios* y *Recursos* bajo un bloque semántico **"Comunidad"**.
*   **Redefinición Semántica:** eliminar el apartado *"Explorar"* (cajón de sastre) repartiendo sus enlaces en grupos con significado propio.

### 7.3. Estructura construida (*as-built*)

> El menú tiene una **fuente única** (`NAV_SECTIONS` en `nav-menu.service.ts`), que rinde tanto en el navbar de escritorio como en el sidenav móvil. Para añadir o mover un enlace se edita solo ese array; ambos menús se mantienen sincronizados por construcción.

**Cambio de modelo (habilitador):** `NavItem` admite un campo `children?: NavItem[]`. Un item con `children` deja de ser un enlace y pasa a ser un **grupo colapsable** bajo un epígrafe semántico. Los grupos se ocultan solos si todos sus hijos quedan filtrados por rol/feature/flag. Esto sustituye al antiguo marcador `header`.

**Lo realizado:**
*   **Disolución de "Explorar":** la sección desaparece y se reparte dentro de **Miembros**. En primer nivel queda lo cotidiano (Reservas, Calendario, Salud Deportiva, Vídeos, Fotos) y el resto en grupos:
    *   **Competición** (Clasificación + Liga Norte): ambas son tablas de posiciones, por eso van juntas y no con las bitácoras personales.
    *   **Bitácoras** (RSCE + RFEC): registros oficiales por perro.
    *   **Comunidad** (Tablón de Anuncios + Recursos).
    *   *Vídeos y Fotos se mantienen sueltos por su alta frecuencia de uso (engagement diario), no se agrupan.*
*   **Staff:** las acciones diarias **Eventos** y **Verificar Asistencia** quedan en primer nivel; el resto se agrupa por eje **acción vs. consulta**: grupo **Seguimiento** (Historial Asistencia + Monitor Reservas, solo lectura) y grupo **Administración** (Gestión Miembros + Gestión Horarios, baja frecuencia).
*   **Puntos Extra fuera del nav:** se otorga de forma contextual desde la propia Clasificación (botón "Dar Puntos" para Staff en `ranking.component`), co-localizando la acción con su dato.
*   **Administrar:** el bloque de monitores y revisión se agrupa bajo **Revisar**.
*   **Renderizado:** en escritorio los grupos aparecen como subsecciones etiquetadas dentro del desplegable; en móvil como `<details>` colapsables (divulgación progresiva real, accesibles por teclado).

**Pendiente (cambios a nivel de componente, fuera del navbar):**
*   *Tabs* internos reales que fusionen Verificar/Historial de asistencia en una sola pantalla (hoy siguen siendo dos rutas, solo agrupadas en el menú).
*   Reubicar Salud Deportiva / Bitácoras dentro de la ficha de cada perro (hoy siguen siendo rutas globales, en primer nivel / agrupadas).
*   Dashboard operativo de tarjetas para Staff (si se hace, **derivarlo de `NAV_SECTIONS`** para no reintroducir desincronización).