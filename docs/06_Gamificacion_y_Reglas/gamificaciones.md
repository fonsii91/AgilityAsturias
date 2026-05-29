---
aliases: [Sistema de Gamificación, Gamificación]
tags: [gamificación, index, clubagility]
status: completo
---
# 🏆 Sistema de Gamificación (ClubAgility)

El sistema de gamificación de **ClubAgility** está diseñado para incentivar la participación de los socios en la vida diaria del club y en el uso de la aplicación, promoviendo el compañerismo, el aprendizaje colaborativo y el reconocimiento positivo.

## 🎯 Filosofía del Diseño

Nuestra aproximación a la gamificación huye de mecánicas agresivas o puramente competitivas. Los pilares fundamentales son:
* **Sentido de Comunidad:** Las dinámicas deben conectar a los miembros, favoreciendo las interacciones offline y online (como los intercambios de cromos o la validación de vídeos).
* **Orientación Deportiva y Educativa:** Premiar el esfuerzo, la constancia, la asistencia y la mejora técnica en lugar de centrarse únicamente en los resultados de competición.
* **Control de la Frustración:** Implementar sistemas anti-frustración (como las monedas del club o validación por consenso) para asegurar que la experiencia sea siempre divertida y gratificante.
* **Privacidad y Consentimiento:** Respetar la privacidad de los binomios (guía-perro) permitiendo excluir datos o perros específicos del sistema si el usuario o la directiva así lo deciden.

## 📅 Estrategia de Rotación por Temporadas

Para evitar la saturación de los usuarios y mantener el interés a largo plazo, distinguimos entre mecánicas competitivas/recreativas rotativas y herramientas formativas permanentes:

1. **Dinámicas Principales Rotativas (Estacionales):**
   * Funcionan por **temporadas**.
   * **Solo habrá una dinámica principal de esta categoría activa por temporada** (ej. se activa el Ranking o se activa el Álbum de Stickers, pero no ambos simultáneamente).
   * El progreso se aísla técnicamente mediante `season_id` para permitir reinicios limpios entre ciclos.

2. **Funcionalidades Gamificadas Permanentes:**
   * Son herramientas pedagógicas o de utilidad continua que **permanecen siempre activas** independientemente de la temporada. Su mecánica lúdica (como el deslizamiento gestual) es un medio para facilitar un servicio constante al club (ej. la revisión de pistas en Agility Insights).

---

## 🛠️ Módulos de Gamificación e Interacción

### 🔄 Dinámicas Rotativas por Temporada

#### 1. Ranking de perros
* **Descripción:** Tabla de clasificación competitiva que posiciona a los perros según los puntos acumulados por asistencia y mérito deportivo. Incluye la extensión opcional del **Tablón de Cazarrecompensas** (Bounty Board), la cual puede ser activada/desactivada por los gestores.
* **Mecánica:** Los perros suman puntos de forma automática por asistencia (+3 puntos) y competiciones (+1 a +4 puntos). Si el Tablón de Cazarrecompensas está activo, los guías pueden gastar estos puntos para comprar contratos anónimos sobre sus rivales y realizar misiones divertidas a pie de pista validadas por testigos cruzados.
* **Sistemas Anti-Frustración:** Equilibrio en la obtención de puntos que premia la constancia en asistencia y comportamiento. En el Tablón, se emplean periodos de inmunidad (cooldown) y validaciones comunitarias descentralizadas para evitar discusiones y trampas.
* **Detalle completo:** Ver especificación detallada en [[gamificacion-ranking-perros]].

#### 2. Álbum de Stickers del Club (Cromos Coleccionables)
* **Descripción:** Los perros del club se convierten en cromos coleccionables en un álbum digital común.
* **Mecánica:** Los miembros obtienen cofres con stickers realizando actividades (asistir a clase, subir vídeos, registrar entrenamientos). Los stickers tienen un progreso visual dinámico (de pixelado a nítido) en el cliente.
* **Sistemas Anti-Frustración:** Uso de monedas del club para adquirir cromos específicos y sistema de intercambios regulados entre socios para fomentar la interacción cara a cara en las pistas.
* **Detalle completo:** Ver especificación detallada en [[gamificacion-stickers]].

---

### ♾️ Funcionalidades Gamificadas Permanentes

#### 3. Agility Insights (Validación Colaborativa de Errores)
* **Descripción:** Transforma la biblioteca de vídeos de competición del club en una herramienta educativa gamificada permanente para la mejora técnica.
* **Mecánica:** Los miembros experimentados actúan como validadores, revisando y clasificando errores de clips cortos (5 segundos) mediante una interfaz de deslizamiento gestual (tipo "Tinder").
* **Sistemas Anti-Frustración:** Validación democrática por consenso (múltiples expertos) que reduce la subjetividad individual y un sistema de reputación para los revisores.
* **Detalle completo:** Ver especificación detallada en [[analisis-videos-insights]].
