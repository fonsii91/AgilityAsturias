---
aliases: [Historial de Asistencia, Reporte de Asistencia, Estadísticas de Asistencia]
tags: [producto, asistencia, staff, boveda, funcional]
status: borrador
---

# ⏱️ Historial de Asistencia

El **Historial de Asistencia** es un módulo centralizado de análisis, auditoría y consulta deportiva dentro de ClubAgility. Permite a los usuarios con rol de **Staff** monitorear en tiempo real y con perspectiva histórica la asistencia de los socios a las clases ordinarias (entrenamientos) y a los eventos especiales (competiciones, seminarios, jornadas sociales).

Esta funcionalidad es clave para realizar el seguimiento del compromiso de los binomios, evaluar la carga de entrenamiento general y deportiva (vinculado con el [[arquitectura-multi-tenant|Monitor ACWR]]), y gestionar de forma transparente la regularidad de los miembros en la liga del club.

---

## 1. ⚙️ Reglas de Negocio y Flujo

1. **Tipos de Asistencia:** El sistema distingue estrictamente entre dos flujos de asistencia:
   * **Asistencia a Clases (Entrenamientos):** Registrada por el Staff al "pasar lista" en las sesiones de entrenamiento ordinarias programadas en las instalaciones.
   * **Asistencia a Eventos:** Registrada a partir de la confirmación o participación en competiciones oficiales u otros eventos especiales programados en el calendario general.
2. **Periodicidad y Filtros:** El panel permite consultar la información de manera acumulada (mensual, trimestral, anual o personalizada) y clasificada por tipo de actividad.
3. **Consistencia de Datos:** La asistencia histórica se genera a partir de la agregación reactiva de los registros oficiales de la tabla pivote de asistencia (`attendances` y `competition_user` / `competition_dog`).
4. **Relación con la Gamificación:** La regularidad registrada en el Historial de Asistencia alimenta de forma automática el sistema de puntuación para el [[gamificacion-ranking-perros|Ranking de Perros]].

---

## 👥 2. Permisos y Matriz de Control de Acceso (RBAC)

De acuerdo con la definición de roles del club en [[usuarios]], el control de acceso a esta vista y a sus recursos API se rige bajo la siguiente matriz:

| Rol | Nivel de Acceso | Descripción |
| :--- | :--- | :--- |
| **Visitante (`public` / `inactive`)** | *Sin Acceso* | Redirección automática al Login o Home pública. |
| **Socio / Miembro (`member`)** | *Sin Acceso* | No tiene visibilidad de las estadísticas colectivas ni del historial de otros socios. Cualquier petición a la API devuelve `403 Forbidden`. |
| **Staff / Entrenador (`staff`)** | **Acceso Total (Lectura)** | Permiso completo para visualizar el panel general del club y realizar búsquedas de asistencia detallada de cualquier socio. |
| **Gestor (`manager`)** | **Acceso Total (Lectura)** | Hereda todos los permisos del Staff. |
| **Administrador Global (`admin`)** | **Soporte y Auditoría** | Acceso completo de soporte técnico multi-tenant. |

---

## 🧭 3. Navegación y Puntos de Acceso

La sección de Historial de Asistencia es fácilmente accesible para el usuario Staff mediante:
* **Barra de Navegación Superior (Navbar - Escritorio):** Enlace directo dentro del menú desplegable o sección de *"Staff"* (`/staff/historial-asistencia`).
* **Menú Lateral Móvil (Sidenav):** Botón claramente identificado en el bloque inferior de herramientas Staff, optimizado para interacción ergonómica.

---

## 📊 4. Especificaciones del Modelo de Datos (API endpoints)

Las estadísticas de asistencia se computan a nivel de backend y frontend a partir de las siguientes estructuras relacionales:

### Vista de Asistencia General (Agregada)
Petición `GET /api/staff/attendance-stats` que retorna la información resumida del club activo:
* `total_members`: Total de miembros activos del club.
* `global_attendance_rate`: Porcentaje general de asistencia del club.
* `classes_attendance_count`: Total de asistencias validadas a clases.
* `events_attendance_count`: Total de asistencias confirmadas a eventos.
* `monthly_trend`: Serie temporal de asistencia (mes a mes) para alimentar los gráficos de rendimiento general.

### Detalle de Asistencia por Miembro
Petición `GET /api/staff/attendance-stats/member/{userId}` que retorna la información detallada del socio seleccionado:
* `member_info`: Nombre del socio, email, y lista de perros asociados.
* `summary`: 
  * `total_classes_attended`: Clases asistidas sobre el total programado en las que estaba inscrito.
  * `total_events_attended`: Eventos asistidos.
  * `attendance_rate_classes`: Porcentaje de asistencia a clases.
  * `attendance_rate_events`: Porcentaje de asistencia a eventos.
* `history_list`: Lista de registros detallados:
  * `date`: Fecha de la sesión.
  * `name`: Nombre de la clase o evento.
  * `type`: Enum `['clase', 'evento']`.
  * `status`: Enum `['asistido', 'ausente', 'justificado']`.

---

## 🎨 5. Especificaciones UX/UI (Responsive & Theming)

La interfaz se ha diseñado siguiendo estrictamente los principios del [[sistema-diseno]] (uso al aire libre, mobile-first, Thumb Zone y contraste extremo). Utiliza la paleta de colores inyectada dinámicamente (`primary` y `accent`) del club a través de variables CSS globales:

```css
/* Variables inyectadas por TenantService basándose en la configuración del Club */
--primary-color: var(--primary-blue);   /* Color principal corporativo */
--accent-color: var(--secondary-yellow); /* Color de acento corporativo */
```

### A. Vista de Escritorio (Desktop Dashboard)
Diseño de pantalla completa dividido en secciones lógicas utilizando grids CSS para un rápido escaneo visual:

1. **Bento Grid de KPIs Generales (Cabecera):**
   * Tarjetas destacadas con fondo blanco (`--surface-card`) y bordes suaves.
   * Métrica de Asistencia Colectiva destacada en grande (`font-weight: 700`, color `--primary-color`).
   * Comparativa visual de clases vs. eventos mediante mini gráficos circulares.
2. **Panel de Gráficos de Tendencias (Sección Intermedia):**
   * Gráfico de líneas (asistencia mensual) y gráfico de barras (comparativo clases vs eventos).
   * Los colores del gráfico utilizan `--primary-color` para representar clases y `--accent-color` para eventos.
3. **Selector y Buscador por Miembros (Split-View Lateral/Derecho):**
   * Buscador interactivo mediante un autocompletado (`<mat-autocomplete>`) con buscador tipo outline (`appearance="outline"`).
   * Al seleccionar un socio, el panel izquierdo cambia de la Vista General al Detalle del Miembro con una transición suave (`transition: all 0.3s ease`).
4. **Tabla de Historial Detallado:**
   * Tabla interactiva que lista las asistencias.
   * Filtros rápidos mediante una barra de herramientas con botones de opción (`<mat-button-toggle-group>`) para alternar entre `Todos`, `Clases` y `Eventos`.

---

### B. Vista Móvil (Mobile-First - Pista y Una Sola Mano)
Para resolver las limitaciones ergonómicas (uso con pulgar y fatiga visual al sol), se aplican las siguientes pautas restrictivas:

1. **Diseño de Pestañas (Tabs) Reactivas:**
   * Se prohíbe el scroll infinito. La pantalla móvil utiliza un `<mat-tab-group>` con dos pestañas fijadas en la parte superior:
     * **Pestaña 1: Vista General (Club):** Muestra el Bento Grid y los gráficos optimizados para pantallas pequeñas.
     * **Pestaña 2: Por Miembro:** Muestra la barra de búsqueda y las estadísticas detalladas del socio seleccionado.
2. **Buscador Ergonómico y Filtros (Bottom Sheet):**
   * En la pestaña **Por Miembro**, la búsqueda se realiza mediante una barra táctil grande (área de tap > 48px).
   * El filtrado avanzado (por rango de fechas o tipo de actividad) se despliega mediante una hoja inferior (`<mat-bottom-sheet>`), situando los controles al alcance cómodo del pulgar (Thumb Zone).
3. **Gráficos Táctiles Simplificados:**
   * Gráficos interactivos adaptados a pantallas móviles que responden al toque para revelar los porcentajes exactos, evitando textos pequeños difíciles de leer bajo el sol.
4. **PROHIBIDO el uso de Tablas (`<table>`):**
   * El historial detallado de asistencia por miembro en móvil se transforma en un listado vertical de tarjetas (`<mat-card>`).
   * Cada tarjeta de asistencia incluye:
     * **Izquierda (Icono Visual):** Icono grande de pizarra/entrenamiento (`mat-icon` para clases) o de trofeo/evento (`mat-icon` para eventos) que permite la identificación instantánea sin necesidad de leer.
     * **Centro:** Nombre del evento o clase y la fecha formateada en negrita media.
     * **Derecha (Estado):** Un badge con borde redondeado e indicador de estado:
       * Verde (`--success`) con texto "Asistido".
       * Rojo (`--danger`) con texto "Ausente".
       * Gris neutro con texto "Justificado".
5. **Estado Vacío (Empty State):**
   * Si al buscar un socio no se encuentran registros o no se ha seleccionado a nadie, se dibuja un contenedor centrado con un icono ilustrativo en color semitransparente, un mensaje explicativo y un botón destacado para reiniciar los filtros.

---

### C. Carga Progresiva y Resiliencia en Red Inestable
* **Lazy Loading Gráfico:** Se implementa el flujo moderno `@defer (on viewport)` en Angular 18+ para retrasar la carga y renderizado del script de gráficos hasta que la sección sea visible en pantalla, optimizando la batería y el rendimiento de red en exteriores.
* **Skeleton Loaders:** Durante la llamada a la API de Laravel, la interfaz muestra plantillas con siluetas grises animadas en lugar de una pantalla en blanco.
* **Double-Tap Prevention:** El botón de búsqueda o confirmación de filtros se bloquea temporalmente mientras la petición HTTP está en vuelo.
