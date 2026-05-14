# Gamificación de stickers para aplicación de clubs de agility
## Contexto: las gamificaciones
- Las gamificaciones se alternan por temporadas de seis meses, para no saturar al usuario. 
- Solo hay una gamificación activa por temporada.
- En este documento se recoge la información de la gamificación de stickers

## Objetivo del sistema de stickers

- La aplicación incorpora una mecánica de gamificación basada en **stickers coleccionables de los perros del club**. 
- El objetivo es aumentar la participación de los socios en la aplicación y en la vida del club mediante recompensas visuales, colección e intercambios regulados.
- La mecánica debe ser sencilla, divertida, social y segura, evitando que se vuelva demasiado compleja o frustrante.

## Concepto principal
Cada club tendrá una colección principal llamada: Album del club

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


Esta clasificación se elige porque es estable y emocional. Es mejor que agrupar por edad, ya que la edad cambia cada año, mientras que el año de entrada al club no cambia.

La idea es que el usuario no solo coleccione perros, sino también parte de la historia del club.

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
    - Sistir a eventos.
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

---

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

- Precio fijo por rareza.
- Rango de precio permitido.
- Comisión en monedas.
- Mercado no público, solo solicitudes directas.

### 6. Activación por club

El club debería poder activar o desactivar los intercambios.

Ejemplo:

```text
club.sticker_trades_enabled = true
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

Por eso se recomienda empezar con una versión simple y regulada.

---

## Objetos especiales

En el futuro se pueden añadir objetos especiales, aunque no son necesarios para el MVP.

Uno de los objetos planteados es el "imán".

---

## Imán

El imán originalmente se planteó como un objeto para "robar" un sticker a una persona con más colección.

Se recomienda no usar la palabra "robar", porque puede generar sensación negativa dentro de un club pequeño.

La versión recomendada es:

```text
El imán atrae una copia de un sticker duplicado de otro usuario con más colección.
```

La otra persona no pierde su sticker.

Esto mantiene la fantasía de equilibrar la colección sin crear conflicto.

Posible texto:

```text
El imán ha encontrado una copia inspirada en la colección de otro socio.
```

---

## Otros objetos posibles

### Chuche

Mejora un sticker aleatorio que todavía no esté completo.

### Silbato

Aumenta la probabilidad de conseguir un sticker nuevo en el próximo cofre.

### Cepillo

Reduce el pixelado de un sticker y lo mejora una fase.

### Pelota

Permite repetir una recompensa de cofre una vez.

### Cámara

Desbloquea una variante visual o una foto alternativa del perro.

### Medalla

Aplica un marco especial a un sticker completado.

Estos objetos son opcionales y deberían añadirse en fases futuras si el sistema base funciona bien.

---

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

- Cofre de oro.
- Gran cantidad de monedas.
- Insignia de coleccionista.
- Marco especial exclusivo.
- Título visible en el perfil.
- Reconocimiento en el ranking del club.

---

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

Antes de convertir un perro en sticker coleccionable, debe existir control por parte del club o del propietario.

Recomendaciones:

- El administrador del club puede decidir qué perros aparecen en la colección.
- El propietario del perro puede permitir o no que su perro aparezca como sticker.
- Si un perro se desactiva, debe decidirse si desaparece del álbum o pasa a una sección histórica.
- Evitar mostrar datos sensibles del perro o del propietario en la colección.

---

## Perros activos, inactivos y antiguos

El álbum principal debería priorizar perros activos del club.

Para perros que ya no están en el club, existen varias opciones:

### Opción A: mantenerlos como históricos

El perro sigue apareciendo en el álbum, quizá en una categoría especial.

Ejemplo:

```text
Leyendas del club
```

### Opción B: ocultarlos para nuevos usuarios

Los usuarios antiguos conservan sus stickers, pero los nuevos ya no pueden conseguirlos.

### Opción C: eliminarlos del sistema de colección

No recomendado salvo que haya motivos de privacidad o petición explícita.

La opción más interesante suele ser mantener una sección histórica si el club quiere conservar memoria.

---

## Implementación técnica recomendada

No es necesario generar manualmente varias imágenes si se puede procesar la foto original.

No obstante, por rendimiento, se recomienda generar variantes al subir la foto del perro.

Ejemplo de archivos generados:

```text
dog_original.jpg
dog_pixelated_strong.jpg
dog_pixelated_soft.jpg
dog_thumbnail.jpg
```

La versión nítida usa la imagen original o una versión optimizada.

---

## Aplicación de pixelado

El pixelado puede hacerse de dos formas:

### Opción A: frontend

Aplicar CSS o canvas en Angular.

Ventajas:

- Menos almacenamiento.
- Menos procesamiento en backend.
- Fácil de probar.

Inconvenientes:

- Puede afectar rendimiento si hay muchos stickers en pantalla.
- El resultado puede variar según navegador.
- Puede exponer la imagen original si no se controla bien.

### Opción B: backend

Generar las variantes en Laravel al subir la foto.

Ventajas:

- Mejor rendimiento en el álbum.
- Resultado consistente.
- Se evita cargar y procesar muchas imágenes en el navegador.
- Mejor control sobre qué versión ve el usuario.

Inconvenientes:

- Requiere procesamiento en servidor.
- Ocupa algo más de almacenamiento.

Recomendación: para producción, generar variantes en backend o en un worker.

---

## Modelo de datos orientativo

### Tabla: dogs

Campos relevantes:

```text
id
club_id
name
photo_url
club_entry_date
club_entry_year
is_active
is_collectible
created_at
updated_at
```

### Tabla: sticker_collections

Representa el progreso de un usuario sobre un perro concreto.

```text
id
club_id
user_id
dog_id
level
duplicates_count
is_completed
created_at
updated_at
```

Niveles sugeridos:

```text
0 = no descubierto
1 = pixelado fuerte
2 = pixelado suave
3 = nítido completo
```

### Tabla: sticker_transactions

Registra obtenciones, mejoras, conversiones e intercambios.

```text
id
club_id
user_id
dog_id
type
level_before
level_after
coins_delta
source
created_at
```

Tipos posibles:

```text
chest_reward
duplicate_to_coins
trade_sent
trade_received
manual_adjustment
shop_purchase
```

### Tabla: sticker_trade_requests

Registra solicitudes de intercambio.

```text
id
club_id
sender_user_id
receiver_user_id
offered_dog_id
requested_dog_id
offered_coins
requested_coins
status
created_at
updated_at
```

Estados posibles:

```text
pending
accepted
rejected
cancelled
expired
```

### Tabla: sticker_chests

Opcional si se quiere guardar cofres pendientes de abrir.

```text
id
club_id
user_id
type
status
source
created_at
opened_at
```

Tipos:

```text
wood
silver
gold
```

Estados:

```text
pending
opened
expired
```

---

## Flujo de obtención de sticker

Cuando un usuario abre un cofre:

1. El sistema calcula recompensa.
2. Puede salir monedas, sticker, mejora u objeto.
3. Si sale un perro que el usuario no tiene:
   - Se crea o actualiza el progreso a nivel 1.
4. Si sale un perro que ya tiene pero no está completo:
   - Se incrementa el nivel.
5. Si sale un perro ya completado:
   - Se incrementa `duplicates_count`.
6. Se muestra animación o mensaje de recompensa.

---

## Flujo de intercambio

1. Usuario A ve sus duplicados.
2. Usuario A selecciona un duplicado para ofrecer.
3. Usuario A elige qué sticker quiere recibir.
4. Usuario B recibe la solicitud.
5. Usuario B acepta o rechaza.
6. Si acepta:
   - Se valida que ambos siguen teniendo los duplicados requeridos.
   - Se descuentan duplicados.
   - Se añaden los stickers o duplicados correspondientes.
   - Se registra la transacción.
7. Si rechaza o caduca:
   - No cambia nada.

---

## Reglas anti-abuso

Recomendaciones:

- Límite semanal de intercambios.
- Solo duplicados.
- Confirmación por ambas partes.
- Caducidad de solicitudes.
- Registro completo de transacciones.
- Posibilidad de desactivar intercambios por club.
- Posibilidad de que administradores reviertan o auditen actividad sospechosa.

---

## MVP recomendado

Para la primera versión, implementar solo lo esencial:

1. Álbum principal del club.
2. Subcolección por promoción del club.
3. Stickers con 3 niveles reales:
   - Pixelado fuerte
   - Pixelado suave
   - Nítido completo
4. Estado no descubierto con tarjeta genérica.
5. Cofres de madera, plata y oro.
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
- Siluetas reales del perro.
- Segmentación de imagen.

---

## Decisiones cerradas

Estas son las decisiones principales tomadas:

- Habrá una colección principal llamada **Álbum del club**.
- Habrá una subcolección llamada **Promociones del club**.
- Las promociones se basan en el **año de entrada del perro al club**.
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
- El club podrá activar o desactivar intercambios.
- Las monedas actuarán como sistema anti-frustración.
- El sistema debe mantenerse simple en el MVP.

---

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
