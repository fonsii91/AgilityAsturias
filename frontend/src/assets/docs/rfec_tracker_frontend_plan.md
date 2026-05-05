# Plan de Implementación Frontend: Seguimiento RFEC

Este documento detalla exhaustivamente los pasos que seguiremos en Angular para construir el módulo del Seguimiento RFEC, asegurando que aplicamos las reglas exactas que hemos documentado.

## 1. Actualización de Modelos y Servicios
Antes de tocar la interfaz visual, prepararemos los datos:
*   **Modelo `Dog`**: Actualizar la interfaz `dog.model.ts` para que acepte las propiedades opcionales `rfec_grade` y `rfec_category`.
*   **Modelo `RfecTrack`**: Crear la interfaz `rfec-track.model.ts` con todos los campos de la tabla de mangas (fecha, juez, tipo, calificación, etc).
*   **Servicio `RfecTrackService`**: Crear un servicio que maneje el CRUD comunicándose con los endpoints de la API (`/api/rfec-tracks`).

## 2. Formulario de Perfiles (Datos del Perro)
Necesitamos que los usuarios puedan definir la categoría y el nivel de sus perros:
*   **Componente `CrudDog` (o equivalente)**: Añadir dos nuevos desplegables en la edición del perro:
    *   **Grado RFEC**: Opciones (`Iniciación`, `Promoción`, `Competición`).
    *   **Clase RFEC**: Opciones (`20`, `30`, `40`, `50`, `60`).

## 3. El Componente Principal: `RfecTrackerComponent`
Será el corazón del módulo. Tendrá la siguiente estructura funcional:

### A. Selector de Perro Activo
*   Un desplegable en la cabecera para elegir el perro sobre el que queremos registrar o visualizar mangas.
*   Al seleccionar un perro, la aplicación leerá su `rfec_grade` para saber qué widgets de progreso dibujar.

### B. Widgets de Progreso Dinámicos (El "Cerebro")
La cabecera mostrará unos gráficos/barras de progreso que cambiarán mágicamente dependiendo del grado del perro:
1.  **Si el perro está en Iniciación**: 
    *   No hay barras de puntos. Se mostrará un banner informativo indicando que es un nivel no competitivo y recordando los requisitos para subir a Promoción (18 meses, Test de Sociabilidad).
2.  **Si el perro está en Promoción**: 
    *   **Meta**: Ascenso a Competición.
    *   **Barra 1 (Puntos Totales)**: XX / 30 pts.
    *   **Barra 2 (Puntos Agility)**: YY / 15 pts.
    *   **Check de Jueces**: Icono verde si hay ≥2 jueces distintos que hayan dado puntos.
3.  **Si el perro está en Competición**:
    *   **Meta**: Campeonato de España (CE Absoluto) por Vía Directa.
    *   **Barra 1 (Puntos Totales)**: XX / 80 pts.
    *   **Barra 2 (Puntos Agility)**: YY / 40 pts.

*El componente calculará estos puntos leyendo el historial de mangas del perro. Dará 10 pts a los "Excelentes a 0" (0 penalizaciones) y 5 pts a los "Excelentes con < 6 penalizaciones".*

### C. Formulario de Mangas (Añadir/Editar)
*   **Desplegable de Competición**: Reutilizaremos la lógica que creamos previamente. Aquí **solo** saldrán las competiciones marcadas como `federacion === 'RFEC'` o la opción "Otro".
*   **Calificación**: El select tendrá exactamente las que dicta el reglamento (`Excelente`, `Muy Bueno`, `Bueno`, `No Clasificado`, `Eliminado`).
*   **Penalizaciones**: Campo clave para saber si la manga es "a cero" (da 10 pts) o "hasta 5.99" (da 5 pts).

### D. Histórico y Video Bridge
*   Tabla o listado con todas las mangas registradas para el perro activo, ordenadas por fecha.
*   Enlazar la lógica del **Video Bridge** (si el usuario ha subido un vídeo en la sección Videoteca que coincida en fecha y perro con una manga RFEC, aparecerá un botón directo para visualizar el vídeo desde el propio tracker).

## 4. Navegación (Rutas)
*   Registrar el componente en `app.routes.ts` bajo el path `/rfec-tracker`.
*   Añadir un botón/enlace en el menú lateral o de navegación superior (`navbar.component.html`) para acceder fácilmente a este nuevo módulo.

---
**¿Qué te parece la estructura?** Si el enfoque es exactamente como te lo imaginas y no se nos escapa ningún detalle de UX/UI, empezaremos ejecutando el Paso 1 (Modelos y Servicios).
