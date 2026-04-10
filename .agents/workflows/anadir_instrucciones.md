---
name: añadir instrucciones
description: Crea un botón y modal de Instrucciones para cualquier sección de la app, precedido de una explicación accesible.
---

# 📖 Workflow: Añadir Instrucciones a una Sección

Este workflow sirve para estandarizar la creación de tutoriales o guías de uso ("Instrucciones") integradas directamente dentro de la interfaz de la aplicación, garantizando que el diseño y la experiencia de usuario sean uniformes en todas partes.

## 🎯 Objetivo General
Cuando el usuario (USER) invoque esta skill y pase por parámetro una sección (ej. `@/añadir_instrucciones "Sección X"`), deberás seguir obligatoriamente este proceso en dos pautas principales:

---

## FASE 1: Formular la Explicación (Sin programar)
1. **Analiza la sección indicada:** Revisa el código actual del Componente, los Controladores (Backend) y los Servicios de esa característica.
2. **Identifica todas las reglas:** Extrae las restricciones, permisos, limitaciones de horario, capacidades de edición y detalles lógicos.
3. **Crea un mensaje al USER:** NO programes nada en este punto. Simplemente respóndele al usuario explicándole con todo detalle cómo funciona la sección.
   * **REGLA ESTRICTA:** Explícalo orientándote a un **usuario final no técnico**. Emplea un lenguaje cercano y amigable.
   * Evita totalmente usar nombres de código (ej. "el boolean `isAdmin`" o "el Error 404"). Habla de "Miembros", "Staff" o "Error al guardar".
   * Divide mentalmente el contenido en: *Reglas para Miembros* y *Reglas para Staff*.
   * Si haces referencias a iconos asegurate de que los iconos que referencias son los correctos.
---

## FASE 2: Programar la Interfaz (El Modal)
Una vez hayas comprendido bien las reglas gracias al paso anterior, procede a programar la ayuda en la interfaz web de la sección.

### 1. El Botón
Añade cerca del título o en el área de cabecera de la sección un botón identificativo idéntico al estándar de la app. Utiliza un estilo en forma de píldora (o similar si se adapta mejor a esa cabecera específica), que incluya el texto **Instrucciones** junto al icono Material Icon de la interrogación (`help_outline`).

Ejemplo de estructura de botón base:
```html
<button class="help-btn" (click)="openHelpModal()" title="Instrucciones" style="background: transparent; border: 1px solid var(--border-color, #e2e8f0); border-radius: 40px; padding: 10px 16px; display: flex; align-items: center; gap: 6px; justify-content: center; color: var(--text-color, #64748b); font-weight: 600; cursor: pointer; transition: all 0.2s;">
  <span class="material-icons" style="font-size: 18px;">help_outline</span> Instrucciones
</button>
```

### 2. El Modal de Instrucciones (UX/UI Meticulosa)
Crea una estructura de modal reactivo (`@if (isHelpModalOpen) { ... }`) al fondo del archivo `.html` de la sección.
Debes prestar vital atención a cargar y respetar la UX/UI de la siguiente manera:
*   Emplea cabeceras de modal claras y botones de cierre (`&times;`) en la esquina superior derecha.
*   **Alineación y legibilidad:** El texto del modal NUNCA debe estar centrado; fórcebo a la alineación izquierda (`text-align: left;`) para asegurar una lectura fluida. Deja "aire" usando `gap` o un buen espaciado.
*   **Listas e Iconografía cruzada:** Si vas a listar normas o botones que estén en la UI, no uses los típicos 'puntos negros'. Usa la etiqueta `<ul>` y convierte cada `<li>` en un bloque *flex* (`display: flex; gap: 10px; align-items: flex-start;`). A la izquierda de cada ítem, incrusta el **Mismo Icono Exacto** (Material Icon) coloreado que usa la aplicación original. Así el usuario asociará el icono con la acción de inmediato.
*   **Condicional de Roles (Importante):**
    *   Cualquier rol debe poder ver la primera mitad del Modal, es decir, el bloque principal de "Reglas para Miembros".
    *   En la segunda mitad, bajo un nuevo título y separados, debes usar `@if (['admin', 'staff'].includes(rol_actual)) { ... }` para ocultar opciones confidenciales o atajos administrativos.

### 3. Código Lógico (.ts)
Reconoce la forma en que se maneja el estado actual (usando *Signals* de Angular 17+) e implementa el estado `isHelpModalOpen = false`.
Proporciona la apertura y el cerrado mediante click en el botón de cerrar (`x`) y en el `backdrop` gris oscuro de fondo.

---
**Nota para la IA:** No es necesario mostrar este texto de la skill al usuario, simplemente asúmelo e inicia la Fase 1 inmediatamente al ser llamado.
