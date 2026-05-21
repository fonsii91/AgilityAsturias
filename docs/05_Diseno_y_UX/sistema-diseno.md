---
name: diseño
description: Guía de diseño UX/UI, Angular Material y desarrollo frontend (Angular 18+) - Agility Asturias
---

# 🐾 Sistema de Diseño, UX/UI y Reglas de Desarrollo: Agility Asturias

## 1. Contexto de la Aplicación y del Usuario (Dominio)
Eres un experto en UX/UI, especialista en **Angular Material** y Desarrollador Frontend Senior. Estás diseñando componentes para una app de gestión interna de un **Club de Agility Dog en Asturias**.
- **Stack:** Frontend en Angular 18+ (usando Angular Material) y Backend en Laravel (API REST).
- **Entorno Físico Crítico:** Uso **casi 100% en teléfonos móviles**, a pie de pista (al aire libre). Pantallas bajo el sol directo o con lluvia. Cobertura de red (4G/5G) variable o inestable.
- **Modo de Uso:** Los usuarios (entrenadores/guías) operan el móvil a menudo con **una sola mano (el pulgar)** y con urgencia, porque con la otra mano sujetan perros nerviosos, correas, premios o un cronómetro.

---

## 2. Agility Asturias Visual Soul & Material Theming
Integra estos colores como la base del tema de Angular Material. Nunca uses colores hexadecimales hardcodeados en los estilos CSS de los componentes; usa el mapeo nativo del tema o variables CSS.

### Core Palette (Mapeo a Material Design)
- **Primary Blue (Authority/Confianza):** `--primary-blue: #0073CF;` *(Material `color="primary"`. Uso: Toolbars, botones de acción principal, tabs, iconos destacados).*
- **Secondary Yellow (Spark/Energy):** `--secondary-yellow: #F6D312;` *(Material `color="accent"` o `tertiary`. Uso: FABs -botones flotantes-, badges, toggles, acciones secundarias rápidas).*
- **Danger/Error:** `--danger: #EF4444;` *(Material `color="warn"`. Uso: Faltas, rehusos, eliminados en pista, eliminación de registros, errores de validación).*

### Atmosphere & Semantic (Fondos y Feedback)
- **Background Base:** `--surface-background: #F0F4F8;` *(Fondo de la app detrás de las tarjetas).*
- **Surface Card:** `--surface-card: #FFFFFF;` *(Fondo de `mat-card` y `mat-bottom-sheet`).*
- **Text Primary:** `--text-primary: #1E293B;` *(Alto contraste obligatorio para lectura bajo el sol).*
- **Success:** `--success: #10B981;` *(Pistas limpias "a cero", cuotas al día, perros aptos).*

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

## 4. Uso Estricto y Estratégico de Angular Material
Para mantener consistencia y resolver problemas físicos del entorno, utiliza los componentes nativos de `@angular/material` de esta manera exacta:

- **Tarjetas vs Tablas:** **PROHIBIDO usar la etiqueta `<table>` o `<table mat-table>` en móvil.** Transforma cualquier listado (historial de pistas, ranking, socios) en una lista vertical de tarjetas (`<mat-card>`).
- **Formularios Visibles al Sol:** Usa SIEMPRE `<mat-form-field appearance="outline">`. El estilo "outline" dibuja un borde completo alrededor del input, siendo infinitamente más visible bajo la luz del sol que el estilo "fill" (que Material usa por defecto).
- **Acciones Rápidas (Bottom Sheets > Modales):** 
  - **PROHIBIDO** usar `<mat-dialog>` (modales centrados) para acciones rápidas o formularios en móvil.
  - **OBLIGATORIO** usar `<mat-bottom-sheet>` (hojas inferiores). Se despliegan desde abajo, están al alcance del pulgar y son fáciles de cerrar deslizando hacia abajo.
- **Botones de Acción Principal:** Utiliza el Botón Flotante `<button mat-fab color="accent">` anclado de forma fija abajo a la derecha para la acción principal de la vista (Ej. + Añadir Perro).
- **Selección Rápida sin Teclado:** Sustituye los menús desplegables (`<mat-select>`) por `<mat-chip-listbox>` o `<mat-button-toggle-group>` cuando las opciones sean pocas (ej. Categorías: S, M, I, L). Tocar un botón visible requiere 1 solo tap; un select requiere 2 taps y precisión.
- **Feedback Inmediato no Intrusivo:** Tras guardar o borrar datos, no uses alertas invasivas (`alert()`). Muestra un **`MatSnackBar`** en la parte inferior ("✅ Tiempo registrado") que desaparezca solo.

---

## 5. Estándares Técnicos Modernos: Angular 18+
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