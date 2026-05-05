# Plan de Implementación: Seguimiento RFEC

El objetivo es crear un módulo "Seguimiento RFEC" análogo al actual "Seguimiento RSCE", pero adaptado a las normativas, categorías y criterios de ascenso/clasificación de la Real Federación Española de Caza (RFEC).

## 1. Modificaciones en Base de Datos y Backend (Laravel)

Dado que las reglas, estructura y requisitos de RFEC son diferentes a RSCE, la aproximación más limpia y segura es crear entidades separadas para evitar inflar el modelo actual con excesivos condicionales.

*   **Modelo `Dog` (y su tabla o tabla pivote)**:
    *   Añadir `rfec_license` (Licencia RFEC).
    *   Añadir `rfec_grade` (Grado actual en RFEC).
    *   Añadir `rfec_category` (Categoría de altura en RFEC).
    *   *Acción:* Crear una migración `add_rfec_fields_to_dogs_table`.

*   **Nuevo Modelo `RfecTrack` (y tabla `rfec_tracks`)**:
    *   Crear tabla con campos: `id`, `dog_id`, `date`, `manga_type`, `qualification`, `speed`, `judge_name`, `location`, `notes` (similar a `rsce_tracks` pero independiente).
    *   *Acción:* Crear migración, modelo, factory y tests.

*   **Controladores y Rutas API**:
    *   `RfecTrackController` con métodos CRUD (`index`, `store`, `update`, `destroy`).
    *   Rutas protegidas en `api.php`.

## 2. Modificaciones en Frontend (Angular)

*   **Modelos y Servicios**:
    *   Añadir los campos `rfec_license`, `rfec_grade`, `rfec_category` a la interfaz `Dog`.
    *   Crear interfaz `RfecTrack` y servicio `RfecTrackService` para comunicarse con la nueva API.

*   **Gestión de Perros (Perfil del Perro)**:
    *   Modificar el componente donde se introduce la documentación/licencias para permitir registrar la Licencia RFEC, Categoría RFEC y Grado RFEC actual.

*   **Nuevo Componente `RfecTrackerComponent`**:
    *   Crear un componente completo para el seguimiento.
    *   Filtrar en el formulario de competiciones para que **sólo aparezcan competiciones con `federacion === 'RFEC'`** y la opción de "Otros" (aprovechando la característica que acabamos de implementar).
    *   Implementar el "Video Bridge" reutilizando la lógica actual pero cruzando con las mangas RFEC.
    *   Añadir las visualizaciones de progreso (Widgets) basadas estrictamente en la normativa RFEC.

*   **Navegación**:
    *   Añadir la ruta `/rfec-tracker` en `app.routes.ts`.
    *   Añadir un nuevo enlace en el `navbar.component.html` para acceder al Seguimiento RFEC, al lado del de RSCE.

## 3. Definición de Reglas de Negocio (REQUISITOS A ESPECIFICAR POR EL USUARIO)

Dado que la RFEC tiene una normativa distinta, **necesitamos definir juntos los siguientes puntos** antes de programar la lógica del `RfecTrackerComponent`:

1.  **Categorías de Altura (Categorías)**:
    *   En RSCE tenemos S, M, I, L.
    *   *¿Cuáles son las categorías exactas en RFEC?* (Ej: 20, 30, 40, 50, 60... o Toy, Mini, Midi, Maxi).
2.  **Grados**:
    *   En RSCE hay Grado 0 (Iniciación), Grado 1, Grado 2, Grado 3.
    *   *¿Cómo se llaman y cuántos grados hay en RFEC?* (Ej: Iniciación, Promoción, Competición, Master...).
3.  **Criterios de Ascenso de Grado**:
    *   *¿Qué se necesita para pasar del primer grado al segundo?* (Ej: X mangas a cero, velocidades mínimas, jueces distintos...).
    *   *¿Qué se necesita para pasar del segundo al tercero (si lo hay)?*
4.  **Criterios del Campeonato de España RFEC**:
    *   *¿Cuántos puntos/mangas se exigen para clasificar al CE RFEC?*
    *   *¿Hay diferencias en las exigencias de velocidad por categorías?*
5.  **Tipos de Manga y Calificaciones**:
    *   *¿Las mangas se llaman igual (Agility / Jumping)?*
    *   *¿Las calificaciones son las mismas (Excelente a 0, Excelente, Muy Bueno, etc.)?*

---

**Siguiente paso:** Por favor, revisa este plan. Si te parece correcto el enfoque técnico, descríbeme las reglas de la RFEC (Punto 3) para que podamos empezar a implementarlo.
