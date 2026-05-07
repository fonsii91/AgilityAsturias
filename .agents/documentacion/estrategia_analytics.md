# Estrategia de Implementación de Google Analytics 4 (GA4)

## 1. Objetivo
Implementar Google Analytics 4 en la plataforma de manera progresiva y estructurada, empezando por un nivel básico y escalable. El objetivo principal es medir el uso de la aplicación, distinguir entre plataformas (PWA vs Web) y analizar el tráfico de los diferentes clubes (arquitectura multi-tenant) sin sobrecomplicar el código actual.

## 2. Fase 1: Configuración Base y Vistas de Página (Pageviews)

Al ser una aplicación Single Page Application (SPA) desarrollada en Angular, los cambios de vista no recargan la página HTML completa, por lo que debemos avisar a GA4 manualmente.

### 2.1. Instalación del Script
- Insertar el fragmento de código global de GA4 (`gtag.js`) en el `<head>` del archivo `frontend/src/index.html`.

### 2.2. Tracking de Navegación en Angular
- Crear un servicio `AnalyticsService` o integrar la lógica directamente en `app.component.ts`.
- Suscribirse a los eventos del enrutador de Angular (`Router`).
- Al detectar un evento de tipo `NavigationEnd`, enviar un evento de vista de página (`page_view`) a GA4 con la nueva URL.

## 3. Fase 2: Segmentación de Usuarios (PWA y Multi-tenant)

Para aprovechar la analítica, es clave categorizar a los usuarios mediante **Propiedades de Usuario (User Properties)** en GA4.

### 3.1. Detección de Plataforma (PWA vs Navegador)
- En la inicialización de la app, verificar si se está ejecutando como PWA usando JavaScript: 
  `window.matchMedia('(display-mode: standalone)').matches`
- Enviar a GA4 una propiedad de usuario llamada `platform_mode` con el valor `pwa` o `browser`.
- GA4 ya detectará automáticamente por su cuenta si el dispositivo es móvil (`mobile`) o de escritorio (`desktop`).

### 3.2. Seguimiento del Club (Multi-tenant)
- Una vez el usuario inicia sesión (o el sistema determina el tenant actual mediante el servicio `TenantService`), enviar a GA4 una propiedad llamada `club_id` o `club_name`.
- Esto permitirá filtrar cualquier informe en Google Analytics para ver estadísticas exclusivas de un club en concreto.

## 4. Fase 3: Eventos Básicos de Comportamiento

En esta fase inicial, no se trackearán todos los botones, sino las acciones clave que aportan valor al negocio:

*   **`login`**: Cuando un usuario accede a la plataforma.
*   **`sign_up`**: Cuando un usuario se registra.
*   **`module_access`**: Cuando un usuario interactúa con los módulos principales de la aplicación. Se enviará un parámetro adicional con el nombre del módulo:
    *   `module_name`: 'reservas', 'caza', 'canina', 'salud_deportiva', 'videos'.

## 5. Resumen de Impacto Técnico
*   **Riesgo**: Muy bajo. La adición de scripts de analytics no afecta la lógica de negocio ni la interfaz de usuario.
*   **Carga de trabajo**: Baja. La Fase 1 y 2 se pueden implementar en pocas horas.
*   **Costo**: 0€ (GA4 es gratuito).

## 6. Próximos Pasos Sugeridos
1. Crear la propiedad de GA4 en la consola de Google Analytics para obtener el `MEASUREMENT_ID` (ej: `G-XXXXXXXXXX`).
2. Configurar en GA4 las dimensiones personalizadas (`platform_mode`, `club_id`, `module_name`) para que los reportes las reconozcan.
3. Ejecutar la implementación de la Fase 1 en el código y probar en entorno local/desarrollo.
