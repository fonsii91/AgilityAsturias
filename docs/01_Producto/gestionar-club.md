---
aliases: [Gestionar Club, Configuración del Club, Panel del Gestor]
tags: [producto, configuracion, administracion]
status: completo
---

# ⚙️ Panel de Gestión del Club (Gestionar Club)

El panel de **Gestionar Club** es la interfaz central de administración y personalización de marca para cada tenant en ClubAgility. Permite a los administradores e identidades gestoras moldear el comportamiento visual, los datos de contacto y la activación de módulos opcionales del club.

---

## 🚪 1. Acceso y Seguridad

- **Ruta de Acceso:** `/admin/clubs/edit/:id` (donde `:id` es el identificador único del club/tenant actual).
- **Control de Acceso (RBAC):**
  - **Gestor (Responsable del Club):** Acceso completo para editar los datos de su propio club.
  - **Administrador Global:** Acceso completo a todos los clubes de la plataforma.
  - **Staff y Socios:** Acceso denegado (`403 Forbidden`). Las rutas están protegidas mediante `managerGuard` en el router de Angular.

---

## 📋 2. Secciones y Parámetros del Formulario

El formulario utiliza un diseño estructurado tipo *Bento Grid* optimizado para su uso en dispositivos móviles y de escritorio. Los campos están clasificados en las siguientes áreas de configuración:

### A. Identidad Visual
*   **Logo del Club:** Área de carga de imagen. Cuenta con previsualización inmediata y compresión automática de imágenes mediante `ImageCompressorService`.
    *   *Directriz UX:* Se recomienda una relación de aspecto 1:1 (cuadrada, ej. 512x512px) en formato PNG, ya que esta imagen será el icono principal cuando la aplicación se instale en dispositivos móviles (PWA).
*   **Nombre del Club:** Campo de texto obligatorio para el nombre oficial del club.
*   **Slogan / Lema:** Breve frase definitoria que se inyecta en la landing page del club.

### B. Imágenes de Portada (Advanced Branding)
*   **Imagen Cabecera (Hero):** Imagen principal que se muestra en la sección superior de la pantalla de bienvenida.
*   **Imagen Salto (Call to Action / Jump):** Imagen secundaria que ilustra la sección inferior o llamada a la acción en la página pública del club.

### C. Contacto y Redes Sociales
Campos destinados a la comunicación y visualización en la cara pública del club:
*   **Teléfono de Contacto**
*   **Email de Contacto**
*   **Dirección Línea 1** (Calle, número)
*   **Dirección Línea 2** (Ciudad, código postal, provincia)
*   **Instagram:** Nombre de usuario (mostrando un prefijo `@` en el formulario).
*   **Facebook:** Nombre de usuario del perfil/página.
*   **Google Maps Embed:** Enlace de inserción de Google Maps para mostrar la localización interactiva de las instalaciones.

### D. Enlaces y Acceso (Solo Administrador Global)
Estos campos se muestran deshabilitados (`disabled`) para los usuarios que no poseen el rol de Administrador Global (SaaS Admin), protegiendo la infraestructura del tenant:
*   **Subdominio de la Plataforma (Slug):** El identificador del club en la URL (ej. `mi-club` en `https://mi-club.clubagility.com`). Debe cumplir con el patrón `/^[a-z0-9-]+$/`.
*   **Dominio Personalizado:** Configuración avanzada para mapear un dominio externo mediante CNAME o registro A.

### E. Colores del Tema
La plataforma inyecta dinámicamente colores de marca en variables de estilo CSS en tiempo real tras guardar. Para simplificar esta tarea, se ofrecen dos formas de configuración:
1.  **Combinaciones Recomendadas (Preset Palettes):** Una cuadrícula de paletas preconcebidas que aseguran el cumplimiento de las directrices de alto contraste outdoor (ver [[sistema-diseno]]):
    *   *Agility Classic* (`#0073CF` / `#EAB308`)
    *   *Emerald Forest* (`#047857` / `#D97706`)
    *   *Midnight Purple* (`#4C1D95` / `#DB2777`)
    *   *Ocean Deep* (`#0F766E` / `#F43F5E`)
    *   *Slate & Amber* (`#334155` / `#F59E0B`)
    *   *Crimson Red* (`#BE123C` / `#1E3A8A`)
    *   *Sunset Energy* (`#EA580C` / `#4338CA`)
    *   *Obsidian Black* (`#0F172A` / `#10B981`)
    *   *Royal Amethyst* (`#6D28D9` / `#14B8A6`)
2.  **Selectores Personalizados:** Campos con selector de color nativo del navegador y entrada hexadecimal para el **Color Principal** y el **Color Secundario / Botones**.

### F. Control de Módulos (Switches)
Interruptores de activación rápida para los módulos de la aplicación:
*   **Sistema de Gamificación (`settings.gamification_enabled`):** Activa o desactiva de forma global el ranking interno, el álbum de stickers coleccionables y la extensión del tablón de cazarrecompensas (ver [[gamificaciones]]).
*   **Módulo de Provisión de Fondos (`settings.provision_fondos_enabled`):** Activa o desactiva la visualización del saldo e historial financiero para los socios, así como la consola de auditoría para los gestores (ver [[provision-fondos]]).

---

## 💾 3. Comportamiento de la Interfaz (UX)

- **Floating Save Bar (Barra de Guardado Flotante):** Para evitar la sobrecarga visual, la barra que contiene las acciones de *"Guardar Cambios"* y *"Descartar"* solo aparece de forma animada (`pop-in`) en la parte inferior cuando el formulario es modificado (`form.dirty`).
- **Prevención de Doble Envío:** Durante el proceso de guardado, el botón de guardado muestra un spinner de carga (`mat-spinner`) y se deshabilita para evitar peticiones concurrentes y duplicadas de red.
- **Carga de Datos Reactiva:** Al guardar los cambios, la aplicación invoca `tenantService.reload()` para refrescar de forma reactiva y en caliente la paleta de colores CSS, logotipos y estados de módulos en la barra de navegación del usuario sin necesidad de reiniciar sesión o refrescar manualmente la página.
