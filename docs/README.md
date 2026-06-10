---
aliases: [Inicio, Dashboard, Mapa de Documentación, Bóveda Principal]
tags: [inicio, index, mapa, documentación]
status: completo
---
# 🐾 Panel de Control y Mapa de Documentación: ClubAgility

¡Bienvenido a la bóveda de documentación oficial de **ClubAgility**! Este espacio está diseñado como una base de conocimiento viva para guiar el desarrollo técnico, las reglas de negocio, el diseño UX/UI y el control de calidad de la plataforma.

A continuación, se detalla el mapa de navegación interactivo del proyecto. Utiliza los enlaces rápidos de Obsidian (`[[Nombre de la Nota]]`) para saltar a cualquier sección:

---

## 🗺️ Mapa de la Bóveda

### 📦 01. Producto
Concepto de la aplicación, mapa de características y funcionalidades.
*   **[[funcionalidades]]**: Índice de funciones disponibles para Socios, Staff e Invitados/Inactivos.
*   **[[presencia-publica]]**: Detalle de la cara pública de la web (Bienvenida, Galería, Videoteca y Contacto).
*   **[[usuarios]]**: Roles de usuario (Visitante / Invitado / Inactivo, Socio, Staff, Responsable del Club y Administrador Global) y alcance de permisos.
*   **[[provision-fondos]]**: Especificación de la provisión de fondos de socios (saldo, ingresos, gastos y roles de acceso).
*   **[[historial-asistencia]]**: Análisis y consulta del histórico y estadísticas de asistencia de miembros (clases y eventos) para el perfil Staff.
*   **[[gestionar-club]]**: Panel de configuración de identidad visual, marca, contacto y activación de módulos por club.
*   **[[galeria-fotos]]**: Galería de fotos interna del club con subida en lote, compresión, etiquetado de perros/miembros y almacenamiento en Mega S4 por cuota de plan.
*   **[[lineas-futuras-roadmap]]**: Futuras líneas de desarrollo (Notificaciones Push, Mapas de pistas, etc.).

### 💼 02. Negocio
Modelos de monetización, suscripciones SaaS y estrategias comerciales.
*   **[[planes-suscripcion-saas]]**: Modelos de precios y características incluidas (Planes Básico, Pro y Élite).
*   **[[marketing-aislamiento]]**: Nota de valor sobre despliegue aislado y seguridad multi-tenant.
*   **[[normativa-rfec]]**: Reglas, clases, grados autonómicos y criterios de ascenso de la Real Federación Española de Caza (RFEC).

### 🏗️ 03. Arquitectura y Sistemas
Bases técnicas, seguridad, infraestructura y ciclo de vida de los datos.
*   **[[arquitectura-multi-tenant]]**: Aislamiento hermético de bases de datos por club mediante subdominios y `TenantScope`.
*   **[[backups-locales]]**: Programación de copias de seguridad de base de datos vía Cron sin dependencias externas.

### 🔌 04. Integraciones
Conexiones externas y analítica.
*   **[[suscripciones-stripe]]**: Gestión del ciclo de vida y facturación de clubes mediante Stripe y Laravel Cashier.
*   **[[integracion-flowagility]]**: Web scraping con Playwright para Phoenix LiveView e importación de competiciones y marcas.
*   **[[estrategia-analytics]]**: Plan de implantación de Google Analytics 4 (GA4) y cumplimiento estricto del GDPR (Consent Mode v2).
*   **[[gestion-videos]]**: Nueva especificación y flujo para la gestión de vídeos en la plataforma.
*   **[[antigua-gestion-videos]]**: Legacy de gestión de vídeos (subida local temporal y CRON diario a la API de YouTube).

### 🎨 05. Diseño y UX/UI
Reglas de interfaz orientadas al usuario final a pie de pista.
*   **[[sistema-diseno]]**: Directrices UX/UI para Angular 18+, colores corporativos, ergonomía de una mano (Thumb Zone) y accesos outdoor.
*   **[[estrategias-onboarding-ux]]**: Mitigación del efecto "Ciudad Fantasma" con tutoriales por rol y componentes inteligentes de estado vacío (Empty States).

### 🏆 06. Gamificación y Reglas Deportivas
Algoritmos y dinámicas recreativas para incentivar el uso de la aplicación.
*   **[[gamificaciones]]**: Filosofía del sistema de gamificación rotativo, temporadas y resumen de módulos.
*   **[[gamificacion-ranking-perros]]**: Clasificación competitiva del club basada en puntos acumulados por asistencia y competición (incluye extensión del Tablón de Cazarrecompensas).
*   **[[gamificacion-stickers]]**: Mecánica de cromos coleccionables (stickers), cofres, monedas anti-frustración e intercambios regulados.
*   **[[analisis-videos-insights]]**: Validación colaborativa gamificada (interfaz tipo Tinder) de errores en pistas de agility.
*   **[[analisis-sistema-temporadas]]**: Plan técnico y de arquitectura para migrar a un modelo de gamificación rotativo por temporadas.

### 🧪 07. Testing y Calidad
Bitácora de pruebas automatizadas y cobertura.
*   **[[funcionalidades-testing]]**: Roadmap de lotes funcionales probados y pendientes.
*   **[[registro-tests]]**: Registro exhaustivo de pruebas unitarias, de integración y E2E (Vitest, PHPUnit, Playwright).

---

## 💡 Consejos de Uso en Obsidian
1.  **Vista de Grafo**: Pulsa `Ctrl + G` (o `Cmd + G` en Mac) para ver la representación visual de cómo se relacionan los documentos de esta bóveda.
2.  **Enlaces Bidireccionales**: En la parte derecha de cada nota, puedes desplegar la pestaña de enlaces entrantes (*Backlinks*) para ver qué otras notas hacen referencia al documento actual.
3.  **Búsqueda Rápida**: Pulsa `Ctrl + O` (o `Cmd + O`) para abrir el buscador de archivos y saltar a cualquier nota al instante.
