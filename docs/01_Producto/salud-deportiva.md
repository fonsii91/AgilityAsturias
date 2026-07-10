---
aliases: [Salud Deportiva, Monitor ACWR, Carga de Trabajo]
tags: [producto, salud, acwr, reglas-negocio]
status: completo
---
# 🩺 Salud Deportiva (Monitor ACWR)

Módulo que estima el **riesgo de lesión** de cada perro comparando su carga de trabajo reciente con la que tiene asimilada. El motor de cálculo vive en `agility_back/app/Models/Dog.php` (`calculateAcwrData()`).

## Fórmula

**Carga de una sesión (sRPE)** = `minutos de alta intensidad × RPE (1–10)`

> ⚠️ Se cuenta **únicamente el tiempo de máxima intensidad**: 1 h de clase suele suponer entre 4 y 6 min reales en pista (consenso veterinario: micro-sesiones de 3–5 min son óptimas; más de 12 min puramente activos elevan el riesgo).

Multiplicadores de riesgo sobre la carga de la sesión:

| Factor | Competición | Entrenamiento |
|---|---|---|
| Salto a altura máxima | ×1.2 | ×1.2 |
| 3–5 mangas | ×1.3 | ×1.15 |
| 6+ mangas | ×1.6 | ×1.4 |

**ACWR** = carga aguda (últimos 7 días) ÷ carga crónica (media semanal de los últimos 28 días).

Durante el arranque en frío (perro con menos de 28 días de datos), la crónica se divide entre las semanas activas reales (`ceil(días/7)`, mínimo 1). Con menos de **14 días** de datos el estado es **gris (calibrando)** y no se emite semáforo.

## Semáforo de riesgo

| ACWR | Estado |
|---|---|
| < 0.8 | 🔵 Desentrenamiento |
| 0.8 – 1.30 | 🟢 Óptimo |
| 1.30 – 1.50 | 🟡 Precaución |
| ≥ 1.50 | 🔴 Peligro |

Con **historial de lesiones previas** los umbrales bajan a 1.15 (amarillo) y 1.35 (rojo).

> 📝 **Decisión (2026-07):** se eliminó la penalización por "sobrepeso" basada en el ratio `altura/peso < 2.5` porque no escala entre tamaños de perro (penalizaba razas grandes atléticas y no detectaba perros pequeños con sobrepeso real). Si se quiere reintroducir, debería basarse en condición corporal (BCS) declarada por el dueño, no en un ratio lineal.

## Cargas automáticas (valores por defecto, `pending_review`)

Se generan al verificar asistencia (clases, competiciones, exhibiciones) y **cuentan en el ACWR con estos valores hasta que el dueño las revisa**:

| Origen | Duración | RPE | Mangas | Carga |
|---|---|---|---|---|
| Clase (`auto_attendance`) | 5 min | 6 | — | 30 |
| Día de competición (`auto_competition`) | 4 min | 8 | 2 | 32 |
| Exhibición (`auto_competition`) | 2 min | 5 | — | 10 |
| Scraper FlowAgility (mangas reales) | 2 min × manga | 8 | reales | variable |

> 📝 **Decisión (2026-07):** los defaults de competición subieron de `2 min × RPE 8 = 16` a `4 min × RPE 8 = 32` (y exhibición de `1×3=3` a `2×5=10`) para que un día de compe pese al menos como una clase; antes una competición sin revisar computaba la mitad que una clase, invirtiendo la realidad fisiológica.

## Coherencia UI ↔ cálculo

- El `recent_history` que devuelve la API **incluye** las cargas `pending_review` (badge "Pendiente" en la UI), para que el historial visible cuadre con las cargas que alimentan el ACWR.
- Editar una carga pendiente desde el historial equivale a revisarla: pasa a `confirmed` y registra el `user_id` del revisor.

## Notas relacionadas

- [[funcionalidades]] — índice de funciones por rol
- [[integracion-flowagility]] — scraper que enriquece cargas de competición con mangas reales
- [[historial-asistencia]] — origen de las cargas automáticas de clase
