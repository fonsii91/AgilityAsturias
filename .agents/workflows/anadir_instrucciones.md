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
Una vez hayas comprendido bien las reglas gracias al paso anterior, procede a programar la ayuda en la interfaz web usando el componente reutilizable `<app-instrucciones>`.

### 1. Importar el Componente (.ts)
Asegúrate de importar `InstruccionesComponent` en el archivo `.ts` del componente de la sección.
```typescript
import { InstruccionesComponent } from '../../components/shared/instrucciones/instrucciones.component';

@Component({
  ...
  imports: [..., InstruccionesComponent],
})
```

### 2. Insertar en la Interfaz (.html)
Añade el componente `<app-instrucciones>` cerca del título o en el área de cabecera de la sección. Deberás inyectar dentro todo el contenido del modal utilizando las mismas reglas de listados e iconos.

Ejemplo de estructura:
```html
<app-instrucciones titulo="Guía de Sección">
  <h4 style="color: #0f172a; margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Reglas para los Socios</h4>
  <ul style="padding-left: 0; list-style: none; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 16px;">
    <li style="display: flex; gap: 10px; align-items: flex-start;">
      <span class="material-icons" style="color: #3b82f6; flex-shrink: 0; margin-top: 2px;">info</span>
      <span><strong>Explicación:</strong> ...</span>
    </li>
  </ul>

  @if (authService.isStaff()) {
    <h4 style="color: #0f172a; margin-top: 1.5rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Staff</h4>
    ...
  }
</app-instrucciones>
```

### 3. UX/UI Meticulosa del Contenido Inyectado
*   **Listas e Iconografía cruzada:** Usa la etiqueta `<ul>` y convierte cada `<li>` en un bloque *flex* (`display: flex; gap: 10px; align-items: flex-start;`). A la izquierda de cada ítem, incrusta el **Mismo Icono Exacto** (Material Icon) coloreado que usa la aplicación original.
*   **Condicional de Roles:** Usa `@if (authService.isStaff()) { ... }` (o similar) en la segunda mitad del contenido para ocultar opciones confidenciales o atajos administrativos a los miembros normales.

---
**Nota para la IA:** No es necesario mostrar este texto de la skill al usuario, simplemente asúmelo e inicia la Fase 1 inmediatamente al ser llamado. No hace falta que programes los estados de apertura del modal, ya que el componente `<app-instrucciones>` lo gestiona todo internamente.
