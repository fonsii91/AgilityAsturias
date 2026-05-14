# Gamificación de stickers para aplicación de clubs de agility

## 1. Contexto y Objetivos

El presente documento detalla la mecánica de gamificación basada en **stickers (cromos coleccionables) de los perros del club**. Esta gamificación está pensada para alternarse por temporadas de seis meses, asegurando que los usuarios no se saturen (solo habrá una mecánica activa por temporada).

El objetivo principal es aumentar la participación de los socios tanto en la aplicación como en la vida del club, a través de recompensas visuales, afán de colección e intercambios regulados. La experiencia debe ser en todo momento sencilla, divertida, eminentemente social y segura, evitando dinámicas que puedan resultar frustrantes o excesivamente complejas.

## 2. Concepto principal
Cada club tendrá una colección principal llamada **Álbum del club**.

### Álbum del club

- En este álbum aparecen todos los perros del club como stickers coleccionables.

- Cada miembro del club tendrá su propio progreso dentro del álbum. Es decir, todos ven la misma colección base de perros, pero cada usuario tendrá desbloqueados o mejorados unos stickers distintos según su actividad.

- Ejemplo de progreso general:

```text
Álbum del club
18 / 42 stickers completados
```
Además del álbum general, existirá una subcolección llamada:

#### Promociones del club

Esta subcolección agrupa los perros según su **año de entrada al club**.

Ejemplos:

- Promoción 2026
- Promoción 2025
- Promoción 2024
- Promoción 2023
- Promoción 2022
- Promoción 2021
- Promoción 2020


Se opta por agrupar a los perros por su año de ingreso al club debido a que es un dato inmutable, a diferencia de la edad. Esta estructura aporta un fuerte componente emocional e histórico, logrando que el usuario no solo coleccione cromos, sino que recorra y descubra la historia cronológica de su club.

Ejemplo:

```text
Promoción 2025
7 / 12 stickers completados
Recompensa al completar: cofre de plata
```

## Fecha de entrada al club

Para clasificar un perro dentro de una promoción se usará preferentemente:
club_entry_year
que tendrá que registrarla el dueño desde el perfil del perro, en el apartado Resumen. Por defecto será la fecha de creación del perro.

El staff del club debería poder editar manualmente el año de entrada al club para corregir perros antiguos que ya estaban en el club antes de usar la aplicación.

## Estructura de navegación recomendada

La pantalla de colección tendrá al menos dos pestañas principales:

### 1. Todos los perros

Muestra la colección principal del club con todos los perros.

- Ver todos los stickers.
- Ver progreso individual (cantidad de stickers completados).
- Filtrar por el estado del sticker (por ejemplo no descubierto, pixelado, nítido).
- Acceder al detalle de cada sticker.
- Para cada sticker se mostrará:
    - nombre del perro
    - imagen
    - estado actual del sticker
    - Progreso del sticker (por ejemplo 0/3)
    - botón de intercambio (solo si el miembro ya ha completado el sticker y tiene duplicados)

### 2. Promociones

Muestra subcolecciones agrupadas por año de entrada al club.

Ejemplo:

```text
Promoción 2026
4 / 9 stickers completados

Promoción 2025
7 / 12 stickers completados

Promoción 2024
10 / 15 stickers completados
```

---

## Regla para clubes pequeños

- Para evitar que la pantalla de promociones quede pobre en clubes pequeños, se recomienda aplicar una regla automática:

- Si una promoción tiene muy pocos perros, menos de 5 por ejemplo, puede agruparse dentro de una sección más amplia que abarque varios años.

## Progresión visual de los stickers

- Los stickers no se desbloquean de golpe en su versión final.

- Cada sticker progresa visualmente desde un estado oculto o pixelado hasta una versión nítida.

- La progresión recomendada es:

```text
No descubierto → Pixelado fuerte → Pixelado suave → Nítido completo
```


## Estados del sticker

### Estado 0: no descubierto

- El usuario todavía no ha conseguido ese perro.
- No se muestra la foto real del perro.
- Se muestra una tarjeta genérica con elementos como:
    - Interrogación.
    - Texto: "¿Quién será?"

### Estado 1: pixelado fuerte en color

- Primera vez que el usuario obtiene ese perro.
- La imagen aparece muy pixelada, pero en color.
- Debe insinuar que se ha descubierto algo, pero todavía no debe verse con claridad.
- Se muestra una tarjeta genérica con elementos como:
    - Exclamación
    - Texto: "¡Has descubierto un nuevo sticker!"


### Estado 2: pixelado suave en color

- Segunda vez que el usuario obtiene ese mismo perro.
- La imagen mejora, se ve menos pixelada y empieza a reconocerse mejor.
- Se muestra una tarjeta genérica con elementos como:
    - Bombilla
    - Texto: "¡La imagen se ve cada vez mejor!"

### Estado 3: nítido completo en color

- Tercera vez que el usuario obtiene ese mismo perro.
- El sticker queda completado y se muestra con la foto nítida a color.
- Se muestra una tarjeta genérica con elementos como:
    - Estrella
    - Texto: Nombre del perro + " ¡Completado!"

- Para clubs con muy pocos perros se podría añadir añadir un estado extra:
- Nítido completo + Marco especial


## Obtención de stickers

- Los usuarios pueden conseguir stickers principalmente mediante cofres.
- Los cofres se ganan por acciones positivas dentro del club o de la aplicación.
- Importante: se consiguen solo cuando la gamificación de stickers está activa
- Ejemplos de acciones que pueden dar cofres:
    - Asistir a clase.
    - Asistir a eventos.
    - Recibir puntos extra del staff.
    - Usar funcionalidades importantes de la app, como subir vídeos o registrar entrenamientos.

## Tipos de cofres

Se recomienda usar tres tipos principales de cofres:

### Cofre de madera

Recompensa básica.

Puede contener:

- Monedas.
- Alta probabilidad de sticker repetido.
- Media probabilidad de sticker en progreso
- Baja probabilidad de sticker nuevo.

### Cofre de plata

Recompensa intermedia.

Puede contener:

- Más monedas.
- Media probabilidad de sticker repetido.
- Media probabilidad de sticker en progreso
- Media probabilidad de sticker nuevo.

### Cofre de oro

Recompensa superior.

Puede contener:

- Más monedas.
- Baja probabilidad de sticker repetido.
- Media probabilidad de sticker en progreso
- Alta probabilidad de sticker nuevo.

## Monedas

- Las monedas funcionan como sistema anti-frustración.
- Cuando un usuario no consigue el sticker que quiere, puede acumular monedas y usarlas para comprar stickers.

Objetivo de las monedas:

- Reducir la frustración del azar.
- Evitar que el usuario se quede bloqueado cuando le falta un sticker concreto.
- Dar valor a las recompensas aunque no salga un sticker nuevo.

Ejemplos de uso de monedas:

- Comprar sticker aleatorio.
- Comprar un sticker concreto en tienda.
- Participar en intercambios.

## Gestión de duplicados

- Los duplicados son fundamentales para que la mecánica no resulte frustrante.
- Cuando a un usuario le toca un perro que ya tiene, el sistema debe actuar según el estado actual del sticker.

### Si el sticker no está completo

- El duplicado mejora el estado del sticker.

Ejemplo:

```text
Pixelado fuerte → Pixelado suave
Pixelado suave → Nítido completo
```

### Si el sticker ya está completo

El nuevo duplicado se convierte en un recurso utilizable.

Opciones posibles:

- Guardarlo como duplicado intercambiable.
- Convertirlo en monedas.

## Intercambios regulados

El sistema incluirá intercambios entre usuarios, pero deben estar regulados para evitar abusos, confusión o desigualdad excesiva.

La idea es que los intercambios sean sociales y divertidos, no caóticos.


## Reglas recomendadas para intercambios

### 1. Solo se pueden intercambiar duplicados

Un usuario nunca debe perder su única copia de un sticker.

Solo se pueden intercambiar stickers que el usuario ya tenga completados y repetidos.

### 2. Ambos usuarios deben aceptar

No hay intercambios automáticos ni forzados.

Debe existir una solicitud de intercambio y una aceptación explícita.

### 3. Límite semanal

Para evitar abuso o completado demasiado rápido, se recomienda limitar los intercambios.

Ejemplo:

```text
3 intercambios por semana
```

Este número puede ser configurable por el club o ajustarse posteriormente.

### 4. Intercambio sticker por sticker

La opción base debe ser intercambiar un duplicado por otro duplicado.

Ejemplo:

```text
Usuario A ofrece duplicado de Luna
Usuario B ofrece duplicado de Thor
```

### 5. Intercambio sticker por monedas

Opcionalmente se puede permitir intercambiar un duplicado por monedas.

Esto debe regularse para evitar precios abusivos.

Opciones:

- Rango de precio permitido.
- Comisión en monedas.
- Mercado no público, solo solicitudes directas.

### 6. Activación por club

El club debería poder activar o desactivar los intercambios.

Ejemplo:

```text
club.settings_stickers.sticker_trades_enabled = true
```

---

## Riesgos de los intercambios

Los intercambios tienen ventajas, pero también riesgos.

### Ventajas

- Aumentan la interacción social.
- Hacen que los usuarios hablen entre ellos.
- Reducen la frustración.
- Dan valor a los duplicados.
- Hacen que la colección tenga más vida.

### Inconvenientes

- Pueden acelerar demasiado la finalización del álbum.
- Pueden generar presión social.
- Pueden producir abusos si no se limitan.
- Pueden hacer que usuarios muy activos dominen la economía.
- Pueden complicar la interfaz si se diseñan mal.

## Recompensas por completar promociones

Completar una subcolección de promoción debe dar una recompensa.

Ejemplos:

```text
Completar Promoción 2026 → Cofre de plata
Completar Promoción 2025 → 200 monedas
Completar Fundadores del club → Marco especial "Fundador"
```

Estas recompensas aumentan la motivación y dan sentido a las subcolecciones.

---

## Recompensas por completar el álbum

Completar el álbum principal del club debería dar una recompensa especial.

Ejemplos:

- Medalla/Insignia especial que se ve en el perfil de usuario. Ligada para siempre al usuario.


## Rankings

Los rankings pueden añadirse, pero deben diseñarse con cuidado.

No conviene que todo dependa solo de quién tiene más stickers, porque eso puede favorecer a quienes pueden asistir a más clases.

Rankings recomendados:

- Álbum más completo.
- Más stickers completados.
- Más promociones completadas.
- Más intercambios realizados.
- Usuario que más ha ayudado mediante intercambios.
- Coleccionista de la semana.

Los rankings deben tener tono divertido y no excesivamente competitivo.

---

## Privacidad y consentimiento

Es imperativo habilitar controles de privacidad dentro del sistema de gamificación. Los administradores del club (y opcionalmente los propietarios) tendrán la capacidad de excluir perros específicos de la colección general si así lo deciden. 

Si un perro se marca como inactivo o se oculta, desaparecerá inmediatamente del álbum y dejará de contabilizar para el número total de stickers de la colección.

## Perros activos, inactivos y antiguos

El álbum principal debería priorizar perros activos del club.

Para perros que ya no están en el club, existen varias opciones:
- Mantenerlos como históricos
- El perro sigue apareciendo en el álbum, en una categoría especial.

Ejemplo:

```text
Leyendas del club
```

## Implementación técnica recomendada

Para optimizar el rendimiento y reducir los costes de infraestructura, no se generarán ni almacenarán múltiples versiones (pixeladas) de la misma foto original. El efecto de revelado progresivo (de pixelado a nitidez total) se aplicará de forma dinámica en el cliente (Angular) utilizando filtros CSS o transformaciones en Canvas de HTML5.

**Ventajas de este enfoque:**
- Reducción drástica del almacenamiento requerido en el servidor.
- Menor tiempo de procesamiento en el backend (no hay que redimensionar ni aplicar filtros con PHP).
- Facilidad para realizar pruebas y ajustes visuales del pixelado directamente en el frontend.


## Modelo de datos orientativo

Para integrar el sistema de stickers en la base de datos actual de Laravel, se proponen las siguientes modificaciones y nuevas tablas:

### 1. Modificaciones a tablas existentes

*(Se descarta añadir campos directamente a la tabla `users` para no ensuciarla, ya que las gamificaciones son rotativas).*

**Tabla `dogs`:**
- `club_entry_year` (integer, nullable): Año en el que el perro entró al club. Servirá para agrupar las "Promociones".

**Tabla `clubs`:**
- Se añadirá una nueva columna JSON `settings_stickers` para almacenar configuraciones específicas de esta gamificación. Dentro de este JSON, se incluirá al menos la clave `sticker_trades_enabled` (boolean, default: true) para que el club pueda activar o desactivar los intercambios.

### 2. Nuevas tablas

**Tabla `user_sticker_profiles` (Modelo `UserStickerProfile`):**
Aísla el progreso general del usuario en esta gamificación específica. Al haber gamificaciones rotativas de 6 meses, esto evita tener campos como "monedas_stickers", "monedas_carreras", etc., en la tabla principal de `users`.
- `id` (primary key)
- `user_id` (foreign key a `users`)
- `coins` (integer, default: 0): Monedas anti-frustración.
- `unopened_chests` (json, nullable): Inventario de cofres ganados pero sin abrir (ej. `{"wood": 2, "silver": 1}`).
- `claimed_promotions` (json, nullable): Array de promociones ya cobradas (ej. `[2024, 2025]`).
- `season_id` (string/integer, nullable): Opcional. Útil si cuando la gamificación vuelva otro año queréis que los usuarios empiecen un álbum nuevo desde cero (vinculando el perfil a la temporada actual). Si queréis que mantengan su álbum histórico, este campo puede omitirse.
- `created_at`, `updated_at`

**Tabla `user_stickers` (Modelo `UserSticker`):**
Registra el progreso de cada usuario con cada perro (sticker).
- `id` (primary key)
- `user_id` (foreign key a `users`)
- `dog_id` (foreign key a `dogs`)
- `level` (integer, default: 1): Nivel de progreso visual (1 = Pixelado fuerte, 2 = Pixelado suave, 3 = Nítido completo). El estado 0 (no descubierto) implica que no existe registro en esta tabla.
- `duplicates_count` (integer, default: 0): Contador de cuántas veces ha salido este perro en cofres *después* de haber alcanzado el nivel 3.
- `created_at`, `updated_at`

**Tabla `sticker_trades` (Modelo `StickerTrade`):**
Gestiona las solicitudes de intercambio entre usuarios.
- `id` (primary key)
- `sender_id` (foreign key a `users`): Usuario que propone el intercambio.
- `receiver_id` (foreign key a `users`): Usuario que recibe la solicitud.
- `offered_dog_id` (foreign key a `dogs`): El sticker duplicado que el emisor de la solicitud ofrece dar.
- `requested_dog_id` (foreign key a `dogs`): El sticker duplicado que el emisor de la solicitud pide a cambio al receptor.
- `status` (string/enum): Estado de la solicitud (ej. `pending`, `accepted`, `rejected`, `cancelled`, `expired`).
- `created_at`, `updated_at`

## Flujo de obtención de sticker

Cuando un usuario abre un cofre:

1. El sistema calcula recompensa.
2. Puede salir monedas, sticker repetido o sticker nuevo.
    - Se considera sticker nuevo si su nivel es menor que 3.
    - Se considera sticker repetido si su nivel es 3 o mayor.
3. Si sale un perro que el usuario no tiene:
   - Se crea y actualiza el progreso a nivel 1.
4. Si sale un perro que ya tiene pero no está completo:
   - Se incrementa el nivel.
5. Si sale un perro ya completado:
   - Se incrementa `duplicates_count`.
6. Se muestra animación y mensaje de recompensa.

---

## Flujo de intercambio

1. Usuario A ve sus duplicados.
2. Usuario A selecciona un duplicado para ofrecer.
3. Usuario A elige qué sticker de los duplicados de Usuario B quiere recibir.
4. Usuario B recibe la solicitud.
5. Usuario B acepta o rechaza.
6. Si acepta:
   - Se valida que ambos siguen teniendo los duplicados requeridos.
   - Se descuentan duplicados.
   - Se añaden los stickers o duplicados correspondientes.
   - Se registra la transacción.
7. Si rechaza o caduca:
   - No cambia nada.

## Reglas anti-abuso

Recomendaciones:

- Límite semanal de 3 intercambios.
- Solo duplicados.
- Confirmación por ambas partes.
- Caducidad de solicitudes.
- Registro completo de transacciones.
- Posibilidad de desactivar intercambios por club.
- Posibilidad de que gestores y staff reviertan o auditen actividad sospechosa.

## MVP recomendado

Para la primera versión, implementar solo lo esencial:

1. Álbum principal del club.
2. Subcolección por promoción del club.
3. Stickers con 3 niveles reales:
   - Pixelado fuerte
   - Pixelado suave
   - Nítido completo
4. Estado no descubierto con tarjeta genérica.
5. Cofres.
6. Monedas.
7. Duplicados.
8. Intercambios regulados solo con duplicados.
9. Recompensas por completar promociones.

No incluir inicialmente:

- Marcos especiales complejos.
- Objetos avanzados.
- Mercado abierto.
- Muchas rarezas.
- Ranking competitivo agresivo.

## Decisiones cerradas

Estas son las decisiones principales tomadas:

- Habrá una colección principal llamada **Álbum del club**.
- Habrá una subcolección llamada **Promociones del club**.
- Las promociones se basan en el **año de entrada del perro al club**. Que introducirá el usuario en el perfil del perro. El staff tendrá un panel en el que podrán modificar el año de entrada del perro.
- No se organizará la colección por edad actual, porque cambia con el tiempo.
- No se usará silueta real del perro, porque normalmente solo se dispone de fotos JPEG.
- Los stickers progresarán de pixelado a nítido.
- El pixelado será en color.
- La progresión base será:
  - No descubierto
  - Pixelado fuerte
  - Pixelado suave
  - Nítido completo
- Los duplicados mejorarán stickers incompletos.
- Los duplicados de stickers completos podrán usarse para intercambios o monedas.
- Los intercambios existirán, pero estarán regulados.
- Los intercambios solo permitirán duplicados.
- El staff podrá activar o desactivar intercambios.
- Las monedas actuarán como sistema anti-frustración.
- El sistema debe mantenerse simple en el MVP.

## Filosofía del diseño

La gamificación debe sentirse como una extensión natural del club, no como un casino ni como un videojuego excesivamente complejo.

Debe transmitir:

- Comunidad.
- Historia del club.
- Participación.
- Humor.
- Progreso.
- Colección.
- Recompensa.
- Interacción social controlada.

La idea central es:

```text
No solo coleccionas perros. Coleccionas la historia del club.
```
