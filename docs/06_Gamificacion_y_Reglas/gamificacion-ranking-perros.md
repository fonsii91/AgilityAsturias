---
aliases: [Ranking de Perros, Bounty Board, Tablón de Cazarrecompensas]
tags: [gamificación, ranking, cazarrecompensas, clubagility]
status: completo
---
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
Cuando el [[usuarios|staff]] del club pasa lista y confirma de forma oficial la asistencia de un binomio a una reserva programada:
* El perro recibe **+3 puntos**.
* Se registra automáticamente en el historial de puntos bajo la categoría `"Asistencia a entrenamiento"`.
* Se notifica a los guías del perro con la notificación: `DogPointNotification`.

### 2. Participación y Resultados en Competiciones
Ya sea mediante la importación automática de resultados desde [[integracion-flowagility|FlowAgility]] (vía Playwright) o mediante la confirmación manual de asistencia por parte del [[usuarios|staff]] en eventos creados en la plataforma, los perros reciben puntos según su posición final:
* **1.er Puesto (Victoria):** **+4 puntos** (categoría `"Primero en [Nombre Competición]"`).
* **2.º Puesto:** **+3 puntos** (categoría `"Segundo en [Nombre Competición]"`).
* **3.er Puesto:** **+2 puntos** (categoría `"Tercero en [Nombre Competición]"`).
* **Asistencia general (4.º puesto o inferior, no calificado o eliminado):** **+1 punto** (categoría `"Asistencia a competición [Nombre Competición]"`).
* En todos los casos se envía una notificación a los guías del perro.

### 3. Puntos Extra y Penalizaciones del Staff (Manual)
Los monitores y [[usuarios|administradores del club]] pueden otorgar o restar puntos de forma manual desde el panel de gestión para incentivar buenas prácticas o regular el comportamiento en pista. 

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

---

## 🏴‍☠️ Extensión Opcional: El Tablón de Cazarrecompensas (Bounty Board)

El **Tablón de Cazarrecompensas** es un sub-módulo de [[gamificaciones|gamificación activa]] opcional que se acopla directamente sobre el **Ranking de Perros**. Utiliza los puntos acumulados en la clasificación del ranking como "moneda" de juego, permitiendo a los usuarios "atacar" (retar) de forma anónima a otros miembros mediante misiones en la vida real.

> [!IMPORTANT]
> Esta extensión puede ser **activada o desactivada** en cualquier momento por los usuarios con rol de **[[usuarios|Gestor o Administrador del Club]]** desde el panel de configuración de la gamificación (`settings_ranking.bounty_board_enabled = true/false`). Si se desactiva, los contratos en curso se cancelan y se oculta la pestaña en el frontend.

### 👥 Core Loop del Tablón
1. **Gastar Puntos del Ranking:** El cazador compra el "Cartel de Se Busca" de un rival. Los puntos se restan directamente de la puntuación activa de su perro.
2. **Misión Secreta:** El sistema genera una acción cotidiana para ejecutar a pie de pista (ej. que el perro del rival dé 3 giros).
3. **Validación Cruzada por Comunidad:** Un algoritmo selecciona 3 testigos reales basados en la asistencia reciente. Uno de ellos debe validar la acción en su App tras recibir una notificación push.
4. **Traspaso o Pérdida de Puntos:** Si se confirma, el botín se resta a la víctima y se suma al cazador. Si falla, el cazador pierde los puntos gastados en el contrato.

### 💰 1. Economía Dinámica (Coste vs. Botín)
El precio del cartel y el botín no son fijos; se calculan en función de los puntos actuales de la víctima para que el juego se equilibre solo:
* 🥉 **Cartel de Guante Blanco (Robo del 10%):** Te cuesta el 2% de los puntos de la víctima.
* 🥈 **Cartel de Asalto (Robo del 20%):** Te cuesta el 8% de los puntos de la víctima.
* 🥇 **Cartel de Hachazo Máximo (Robo del 30%):** Te cuesta el 16% de los puntos de la víctima (Alto riesgo/Alta recompensa).

### 🛡️ 2. Reglas de Control (Antitrampas y Viabilidad)
* **Suelo de Protección:** Los usuarios con menos de un mínimo de 20 puntos están blindados. Sus carteles no aparecen en el tablón.
* **Redondeo Limpio:** Para no arrastrar decimales en el ranking general:
  - El coste del cartel siempre redondea hacia arriba (`Math.ceil`).
  - El botín robado siempre redondea hacia abajo (`Math.floor`).
* **Recompensa por Supervivencia (La Fianza):** Si el cazador falla la misión, el contrato expira a los 7 días o el testigo dictamina que es falso (pulsa NO), el **20% de los puntos** que costó el cartel se le ingresan automáticamente a la víctima. Esquivar la bala tiene premio.
* **Control de Privacidad (Opt-In / Opt-Out)**:
  * Cada miembro puede activar o desactivar libremente su participación en el Tablón.
  * **Cancelación de Contratos Activos**: Si un usuario se desactiva (`opt_in = false`), cualquier contrato activo en curso donde sus perros figuren como **víctimas** o **cazadores** se cancela de inmediato (estado `cancelled`).
  * **Reembolso por Baja**: Para evitar perjuicios a terceros, al cancelarse un contrato por la desactivación de la víctima, se le reembolsa el **100% de los puntos del coste** del cartel al cazador, registrándose en el historial de puntos.
  * **Regla de Cooldown (Bloqueo por 7 días)**: Para impedir que un usuario use la desactivación como "escudo temporal" reactivo (ej. darse de baja al sospechar que está siendo cazado y volver a darse de alta enseguida), el sistema impone un **periodo de espera obligatorio de 7 días** a partir de cualquier cambio en el estado de participación. Durante este cooldown, no se permiten nuevas modificaciones.


### ⚙️ Algoritmo de Selección de Testigos
Para evitar trampas e intervención del [[usuarios|Staff]], el backend selecciona automáticamente a **tres testigos obligatorios** para cada contrato:
1. **Exclusión:** Excluye al Comprador (cazador) y a la Víctima (objetivo).
2. **Historial de Asistencia:** Consulta la [[funcionalidades|tabla de asistencias]] (`attendances`) de los últimos 14 días en el club.
3. **Composición de la Terna:**
   - **Hot Pool (2 usuarios):** Miembros con asistencia perfecta o muy alta. Esto garantiza que estén físicamente en el club.
   - **Cold/Random Pool (1 usuario):** Un miembro aleatorio activo del club para rotar la participación.

### 🛡️ Flujo de Validación (Anti-Trampas)
* **Confirmar Caza:** El cazador ejecuta la acción y pulsa "Confirmar Caza" en su App, seleccionando cuál de los 3 testigos lo vio.
* **Respuesta del Testigo:** El testigo seleccionado recibe una notificación push instantánea:
  - **SÍ:** Se completa el contrato. El botín se transfiere en el ranking general y se publica en el feed.
  - **NO:** El contrato se quema, el cazador es penalizado perdiendo la fianza (el 20% va a la víctima como fianza de supervivencia y el resto se quema) y se notifica del fallo en el feed.
* **Límite de abusos:** Si se detectan disputas o validaciones falsas recurrentes, el sistema bloquea al cazador de comprar contratos durante 48h.
