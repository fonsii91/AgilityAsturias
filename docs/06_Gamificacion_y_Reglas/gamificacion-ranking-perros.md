# 🏆 Ranking de Perros

El **Ranking de Perros** es la mecánica de gamificación activa por defecto en **ClubAgility**. Consiste en un sistema de puntuación acumulativo que premia tanto la constancia en los entrenamientos diarios como el desempeño deportivo en competiciones oficiales, además de permitir la asignación manual de puntos positivos o negativos por parte del staff.

---

## 📊 Funcionamiento del Ranking

El sistema calcula una tabla de clasificación (leaderboard) para los perros del club:
1. **Cálculo de Clasificación:** Los perros se ordenan de mayor a menor según sus puntos totales acumulados en el campo `points` de la tabla `dogs`.
2. **Umbral Mínimo:** Solo los perros con más de 0 puntos entran en el ranking visible.
3. **Límite de la Tabla:** El ranking principal en la aplicación muestra a todos los perros del club.
4. **Indicador de Tendencia (Position Change):** 
   - El sistema calcula diariamente la evolución de la posición de cada perro.
   - Compara la posición actual frente a la de hace 24 horas.
   - Muestra el cambio de posición en la interfaz (ej. `+1` para ascensos, `-1` para descensos) o `"NEW"` si el perro acaba de ingresar al ranking.

---

## 🎯 Reglas para la Obtención de Puntos

Existen tres vías principales por las que un perro puede sumar (o restar) puntos en el sistema:

### 1. Asistencia a Entrenamientos (Automatizado/Staff)
Cuando el staff del club pasa lista y confirma de forma oficial la asistencia de un binomio a una reserva programada:
* El perro recibe **+3 puntos**.
* Se registra automáticamente en el historial de puntos bajo la categoría `"Asistencia a entrenamiento"`.
* Se notifica a los guías del perro con la notificación: `DogPointNotification`.

### 2. Participación y Resultados en Competiciones
Ya sea mediante la importación automática de resultados desde **FlowAgility** (vía Playwright) o mediante la confirmación manual de asistencia por parte del staff en eventos creados en la plataforma, los perros reciben puntos según su posición final:
* **1.er Puesto (Victoria):** **+4 puntos** (categoría `"Primero en [Nombre Competición]"`).
* **2.º Puesto:** **+3 puntos** (categoría `"Segundo en [Nombre Competición]"`).
* **3.er Puesto:** **+2 puntos** (categoría `"Tercero en [Nombre Competición]"`).
* **Asistencia general (4.º puesto o inferior, no calificado o eliminado):** **+1 punto** (categoría `"Asistencia a competición [Nombre Competición]"`).
* En todos los casos se envía una notificación a los guías del perro.

### 3. Puntos Extra y Penalizaciones del Staff (Manual)
Los monitores y administradores del club pueden otorgar o restar puntos de forma manual desde el panel de gestión para incentivar buenas prácticas o regular el comportamiento en pista. 

* **Rango:** Entre **-3** y **+3** puntos (exceptuando el valor `0`).
* **Categorías comunes de puntos positivos:**
  * **Compañerismo:** Premiar el apoyo y buen comportamiento del guía o perro en las instalaciones.
  * **Puntualidad:** Llegar a tiempo a las sesiones y preparaciones.
  * **Motivación:** Gran actitud y esfuerzo durante el entrenamiento.
  * **Asistencia a Prueba + Podium:** Bonificación especial por mérito deportivo.
* **Categorías comunes de penalización (Puntos Negativos):**
  * **Pis (u otros percances biológicos):** Hacer pis o defecar en la pista de césped artificial o zona de obstáculos con desatención del guía (**-1 punto** habitualmente).
* En todos los casos manuales se registra la categoría personalizada en el historial y se envía una notificación `DogExtraPointNotification` a los guías con el motivo correspondiente.

---

## 🛠️ Estructura Técnica en Backend

* **Modelos Involucrados:**
  * `Dog`: Contiene el total de puntos acumulados (`points`).
  * `PointHistory`: Guarda el log individual de cada transacción de puntos (`dog_id`, `points`, `category`, `created_at`).
* **Controladores Clave:**
  * `RankingController`: Obtiene la lista de perros con puntos, calcula su posición actual y pasada para determinar la tendencia de subida/bajada y devuelve la lista de los mejores 50.
  * `AttendanceController`: Gestiona la confirmación de asistencia a entrenamientos (`confirm`) y competiciones (`confirmCompetition`) aplicando la lógica de reparto automático de puntos.
  * `DogController` (método `giveExtraPoints`): Expone el endpoint para que los administradores modifiquen manualmente la puntuación.

---

## 🛡️ Sistemas Anti-Frustración

Aunque el ranking tiene un fuerte carácter competitivo, se equilibra mediante:
* **Premios a la asistencia:** Un perro que asiste de forma regular a sus entrenamientos y ayuda a su club sumará puntos constantes (`+3` por sesión), permitiéndole competir en la tabla con perros que ganan competiciones oficiales pero asisten menos.
* **Reconocimiento no deportivo:** El staff puede equilibrar la tabla premiando valores actitudinales (puntualidad, motivación, compañerismo) con los puntos extra manuales.
