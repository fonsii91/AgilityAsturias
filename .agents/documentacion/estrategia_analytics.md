# Estrategia de Implementación de Google Analytics 4 (GA4)

## 1. Objetivo
Implementar Google Analytics 4 en la plataforma de manera progresiva y estructurada, empezando por un nivel básico y escalable. El objetivo principal es medir el uso de la aplicación, distinguir entre plataformas (PWA vs Web) y analizar el tráfico de los diferentes clubes (arquitectura multi-tenant) cumpliendo estrictamente con las normativas de privacidad (GDPR).

## 2. Fase 1: Configuración Base, Consentimiento y Vistas de Página

Al ser una aplicación Single Page Application (SPA) desarrollada en Angular, los cambios de vista no recargan la página HTML completa, por lo que debemos gestionar el tracking manualmente.

### 2.1. Instalación del Script y Consent Mode v2 (GDPR)
- Insertar el fragmento de código global de GA4 (`gtag.js`) en el `<head>` del archivo `frontend/src/index.html`.
- **Crítico para GDPR:** Implementar un **Banner de Cookies**. Inicializar los parámetros de Google Consent Mode v2 (`ad_storage` y `analytics_storage`) en estado `denied` por defecto. Solo deben cambiar a `granted` tras la aceptación explícita del usuario.

### 2.2. Tracking de Navegación en Angular
- Crear un servicio `AnalyticsService` (o utilizar una librería ligera como `ngx-gtag`) para suscribirse a los eventos del enrutador de Angular (`Router`).
- Al detectar un evento de tipo `NavigationEnd`, enviar un evento de vista de página (`page_view`) a GA4 con la nueva URL.

## 3. Fase 2: Segmentación de Usuarios (PWA y Multi-tenant)

Para aprovechar la analítica, es clave categorizar a los usuarios mediante **Propiedades de Usuario (User Properties)** en GA4.

### 3.1. Detección de Plataforma (PWA vs Navegador)
- En la inicialización de la app, verificar si se está ejecutando como PWA usando JavaScript: 
  `window.matchMedia('(display-mode: standalone)').matches`
- Enviar a GA4 una propiedad de usuario llamada `platform_mode` con el valor `pwa` o `browser`.
- GA4 ya detectará automáticamente por su cuenta si el dispositivo es móvil (`mobile`) o de escritorio (`desktop`).

### 3.2. Seguimiento del Club (Multi-tenant)
- Desde la primera carga de la aplicación (incluso para visitantes anónimos en la landing pública), aprovechar la detección por URL del `TenantService` (`window.location.hostname`).
- Enviar a GA4 una propiedad llamada `club_slug` o `club_id`.
- Esto permitirá filtrar cualquier informe en Google Analytics para ver estadísticas exclusivas del tráfico público y privado de un club en concreto.

## 4. Fase 3: Eventos de Comportamiento y Conversión

En esta fase se trackearán las acciones clave que aportan valor de negocio y nos ayudan a entender el uso de la plataforma:

*   **`login` / `sign_up`**: Acceso y registro en la plataforma.
*   **`module_access`**: Interacción con los módulos principales. Parámetro adicional: `module_name` ('reservas', 'caza', 'canina', 'salud_deportiva', 'videos').
*   **`reservation_made` / `reservation_cancelled`**: Monitorizar el flujo principal de reservas de pistas.
*   **`workload_logged`**: Cuando un usuario registra una carga en el monitor de Salud Deportiva (ACWR).
*   **`pwa_installed`**: Escuchar el evento nativo `appinstalled` del navegador para trackear con éxito la instalación de la aplicación móvil.

### 4.1. Consideración a futuro (Offline Tracking)
- Dado que la PWA puede utilizarse en entornos sin conexión (ej. pistas de entrenamiento), se evaluará más adelante integrar **Workbox Google Analytics** en el Service Worker para encolar eventos offline y enviarlos cuando se recupere la conexión.

## 5. Resumen de Impacto Técnico
*   **Riesgo**: Bajo. La mayor complejidad radica en la correcta gestión del Consent Mode v2 para cumplir con la ley.
*   **Carga de trabajo**: Media-Baja. 
*   **Costo**: 0€ (GA4 es gratuito).

## 6. Próximos Pasos Sugeridos
1. Crear la propiedad de GA4 en la consola de Google Analytics para obtener el `MEASUREMENT_ID` (ej: `G-XXXXXXXXXX`).
2. Implementar el Banner de Cookies compatible con Consent Mode v2.
3. Configurar en GA4 las dimensiones personalizadas (`platform_mode`, `club_slug`, `module_name`) para que los reportes las reconozcan.
4. Ejecutar la implementación de la Fase 1 en el código y probar en entorno local/desarrollo.
