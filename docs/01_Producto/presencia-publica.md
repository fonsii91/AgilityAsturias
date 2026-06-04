---
aliases: [Presencia Pública, Web Pública, Bienvenida, Galería, Videoteca, Contacto, Patrocinadores]
tags: [producto, publico, landing-page, galeria, videoteca, contacto, patrocinadores]
status: completo
---

# 🌐 Presencia Web Pública (Bienvenida, Galería, Videoteca, Contacto y Patrocinadores)

La **Presencia Web Pública** es la cara exterior y de acceso libre de cada club (tenant) en ClubAgility. Actúa como la landing page y carta de presentación de la asociación para visitantes, invitados o deportistas interesados, además de ser accesible para socios inactivos que no tienen permisos para el panel privado.

---

## 🚪 1. Acceso y Enrutamiento (Routing)

Las rutas públicas no requieren inicio de sesión y se configuran de la siguiente manera en [[app.routes]]:

*   **Ruta Raíz (`/`):** Carga `HomeComponent` (Bienvenida).
*   **Galería (`/galeria`):** Carga `GaleriaComponent`.
*   **Videoteca (`/videos-publicos`):** Carga `GaleriaVideosPublicaComponent`. Está protegida por `featureGuard('galeria-videos')` para habilitarse solo si el club tiene activo el módulo multimedia.
*   **Contacto (`/contacto`):** Carga `ContactoComponent`.
*   **Patrocinadores (`/patrocinadores`):** Carga el listado de patrocinadores asociados al club.

---

## 🏠 2. Bienvenida (Home)

La página de inicio utiliza un diseño moderno con un **Split Hero Layout** y secciones diferenciadas:

*   **Sección Hero:**
    *   Muestra el nombre del club, el lema y enlaces rápidos de acceso a las secciones de la web (`¡Ven a probar!`, `Ver Fotos`, `Ver Vídeos`).
    *   Muestra accesos a las redes sociales configuradas (Instagram y Facebook).
*   **Sección de Llamada a la Acción (CTA):**
    *   Sección inferior diseñada para incentivar la inscripción o el contacto del visitante.
*   **Carga de Configuración Dinámica:**
    *   Toda la información es reactiva y se alimenta de `TenantService`. Si el club (tenant) ha personalizado su información a través del panel de gestión (ver [[gestionar-club]]), la app mostrará su logotipo, eslogan, enlaces y colores.
    *   De forma alternativa, si no hay configuración cargada, hace un fallback automático a las propiedades por defecto especificadas en `environment.clubConfig`.
    *   Las imágenes de portada se resuelven dinámicamente mediante los getters `heroImage` y `ctaImage`.

---

## 📸 3. Galería de Fotos

La galería de fotos permite mostrar el día a día y eventos especiales organizados por el club.

*   **Visualizador y Lightbox:**
    *   Usa un grid responsive con animaciones de entrada escalonadas (`stagger`) al cargar las imágenes.
    *   Al pulsar sobre una foto, se abre un visor de pantalla completa (**Lightbox**) con navegación lateral interactiva (`nextImage()`, `prevImage()`) y bloqueo automático del scroll de fondo.
*   **Gestión por el Staff (Autenticado):**
    *   Si el usuario logueado cuenta con permisos de Staff (`isStaff`), la interfaz muestra controles para subir nuevas fotos.
    *   **Compresión Cliente-Side:** Antes de subir cualquier foto, la aplicación ejecuta una compresión automática mediante `ImageCompressorService` para minimizar el consumo de datos móviles a pie de pista.
    *   **Alt Text:** Un modal interactivo (`AddPhotoDialog`) solicita el texto alternativo para garantizar la accesibilidad web (SEO).
    *   **Eliminación:** El personal autorizado puede eliminar fotografías a través del botón de borrado, previa confirmación por medio de un `ConfirmDialog`.
    *   **Onboarding:** Las acciones exitosas de subida y borrado actualizan el checklist de configuración inicial mediante `OnboardingService.markStepCompleted('gestor_galeria')`.

---

## 📹 4. Videoteca Pública

La videoteca es una vitrina pública de los vídeos más destacados del club que el staff ha decidido compartir.

*   **Visualización Adaptativa:**
    *   Soporta vídeos con orientación vertical (grabados con móvil a pie de pista) u horizontal, adaptando las dimensiones de la tarjeta mediante directivas de clase CSS (`is-horizontal`).
    *   Los vídeos se reproducen a través del componente personalizado `SmartVideoPlayerComponent`, el cual es compatible con enlaces directos de reproducción y código incrustado de YouTube.
*   **Capa de Metadatos (Overlay):**
    *   Mientras el vídeo no está activo, se muestra una portada que incluye el nombre del perro, la fecha del evento, el título de la pista y una insignia decorativa de la competición (icono de copa de trofeo) o del entrenamiento.
*   **Paginación:**
    *   Los vídeos públicos se cargan paginados desde el backend. Cuenta con controles de paginación numérica que desplazan de forma suave la pantalla hacia arriba (`window.scrollTo`) al cambiar de página.
*   **Gestión Rápida (Staff):**
    *   Los entrenadores y administradores ven un panel flotante de **Instrucciones** sobre cómo funciona la moderación.
    *   Sobre cada tarjeta de vídeo, el staff cuenta con un botón de acción rápida flotante (`public_off`) que permite retirar instantáneamente el vídeo de la galería pública con confirmación visual a través de `ToastService`.

---

## ✉️ 5. Formulario y Datos de Contacto

El módulo de contacto proporciona los canales directos para comunicarse con los responsables del club.

*   **Diseño Bento Grid:**
    *   **Columna de Información:** Muestra bloques específicos para Teléfono/WhatsApp (generando un enlace directo limpio de chat en WhatsApp `wa.me` eliminando caracteres no numéricos del número), Correo Electrónico (`mailto:`) y la Dirección física (Líneas 1 y 2).
    *   **Columna de Mapa:** Integra un mapa interactivo embebido en un iframe. La URL del mapa de Google Maps se recupera de la base de datos y se sanitiza a través del componente mediante `DomSanitizer.bypassSecurityTrustResourceUrl` para prevenir ataques XSS.

---

## 🤝 6. Patrocinadores (Sponsors) y su Gestión

La sección de **Patrocinadores** sirve para visibilizar a las marcas colaboradoras del club. Su presencia es completamente configurable.

*   **Visualización Pública (`/patrocinadores`):**
    *   Muestra un listado en formato de tarjetas o cuadrícula donde se incluye:
        *   **Imagen/Logotipo:** Logotipo oficial del patrocinador.
        *   **Nombre:** Nombre de la empresa o marca.
        *   **Enlace:** Botón/enlace que redirige a su sitio web externo en una nueva pestaña (`target="_blank"`).
        *   **Descripción:** Un breve texto sobre la colaboración o la actividad del patrocinador.
    *   **Visibilidad Condicional:** Esta sección pública se habilita o deshabilita dinámicamente según el estado del switch `settings.sponsors_enabled` configurado por el Responsable del Club.
*   **Panel CRUD de Administración (Gestión):**
    *   Si el módulo de patrocinadores está activo, en la pantalla de "Configurar Club" se expone un botón que redirige al componente CRUD de gestión de patrocinadores.
    *   Este componente permite al Staff y al Responsable del club realizar las operaciones básicas de mantenimiento.
    *   **Inspiración de Diseño (Basado en `gestionar-competiciones`):**
        *   **Visualización en Tarjetas:** Lista los patrocinadores en tarjetas verticales limpias, facilitando la visualización en teléfonos a pie de pista.
        *   **Formulario Integrado/Flotante:** Panel colapsable/desplegable para añadir o editar registros mediante un formulario reactivo con validaciones básicas.
        *   **Carga de Imagen con Compresión:** Permite subir el logo del patrocinador, comprimiéndolo en el cliente usando `ImageCompressorService` y convirtiéndolo a Base64 para almacenarlo en la base de datos (con control de peso para evitar sobrecarga en redes lentas).
        *   **Seguridad en Borrado:** Implementa un diálogo de confirmación para evitar la eliminación accidental de patrocinadores y envía alertas no intrusivas mediante `ToastService` al guardar o eliminar.

---

## 🎨 7. Adaptabilidad y UX Outdoor (Mobile-First)

Al igual que el resto de la plataforma, la zona pública responde a las directrices críticas del entorno a pie de pista:

1.  **Sincronización Dinámica de Colores:** Los colores corporativos configurados por el gestor se inyectan en variables CSS (`--primary-blue`, `--accent-orange`) cambiando en caliente en la landing page pública del club.
2.  **Resiliencia ante Conexiones Inestables:** Mientras se cargan los vídeos públicos o las fotos, la interfaz muestra **Skeleton Loaders** (estructuras de tarjetas animadas simuladas) para evitar la sensación de cuelgue en zonas con baja cobertura (4G/5G).
3.  **Tamaño Táctil:** Los botones de navegación, iconos sociales y cards cumplen con la regla táctil mínima de 48x48px para evitar fallos de interacción outdoor.
