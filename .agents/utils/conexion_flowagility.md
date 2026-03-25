---
name: conexion_flowagility
description: Documentación e investigación sobre la API de Streaming de FlowAgility
---

# 📡 Conexión con FlowAgility Streaming

Este documento recopila toda la investigación realizada sobre cómo conectar la aplicación de **Agility Asturias** con el servicio de resultados en directo de **FlowAgility**.

## 1. El Sistema (Phoenix Channels)
Tras analizar el código fuente público, hemos descubierto que FlowAgility utiliza **Phoenix Channels / LiveView** (Elixir) para su sistema de WebSockets. 
* **Implicación Técnica:** Para conectarnos de forma fiable desde nuestro frontend (Angular) o backend (Laravel), no deberíamos abrir un WebSocket "puro", sino utilizar una librería cliente compatible con Phoenix Channels (ej. `phoenix-channels` en npm). Esto nos resolverá automáticamente los *heartbeats* (pings), reconexiones y el formateo de los mensajes.

## 2. Los Datos JSON
El WebSocket devuelve un JSON muy completo cada vez que hay una actualización en pista.
El nodo más importante es el `playset` (el binomio perro-guía que está en pista o a punto de salir).

**Campos clave que nos interesan del JSON:**
* `"status_string"`: Puede ser `"ready"`, `"running"` o `"calculated"`. Nos avisa de en qué estado está el perro.
* `"time"`: Tiempo de pista (ej. `"28.78"`).
* `"faults"`: Faltas en pista (ej. `"1"`).
* `"refusals"`: Rehusos (ej. `"0"`).
* `"speed"`: Velocidad (ej. `"6.95 m/s"`).
* `"total_penalization"`: Penalización total.
* `"disqualification"`: Si el perro ha sido eliminado.
* `results_best`: (Dentro del objeto `run`). Array con el Top 10 actual de la manga.

## 3. Casos de Uso para Agility Asturias
Gracias a estos datos, podemos construir:
1. **Live Scoring (Panel en Directo):** Actualizar las faltas, tiempos y clasificación en tiempo real en nuestra app cuando haya una competición organizada por el club.
2. **Métricas y Perfiles:** Guardar en nuestra base de datos (Laravel) el `speed`, `faults` y `time` de los socios del club para generar gráficas de evolución a lo largo de la temporada.
3. **Gamificación y Logros:** Otorgar insignias automáticas (ej. "Pistón Oficial") si detectamos un JSON con `"status_string": "calculated"`, `"faults": "0"` y `"refusals": "0"`.

## 4. ¿Cómo obtener la URL (La Llave) de conexión?
Las URLs de conexión al WebSocket *NO* son un directorio público. Son únicas por evento y pista.
Existen dos formas de conseguir la URL que empieza por `wss://...`:

### Vía Oficial (Staff)
Cuando el club organiza una prueba desde su panel de FlowAgility, la propia plataforma les facilita un "Enlace de Streaming" pensado para integrarse en programas como OBS.

### Vía "Hacker" (Inspección Web)
La forma ideal para hacer nuestras primeras pruebas en desarrollo con eventos reales que no organizamos nosotros (ej. Campeonato en Rinconeda Abril 3-5).
1. Entrar en la web de FlowAgility del evento, en la pestaña **Live / Resultados en Directo**.
2. Abrir herramientas de desarrollador (`F12`).
3. Ir a la pestaña **Red (Network)**.
4. Filtrar por **WS (WebSockets)**.
5. Recargar la página (`F5`).
6. Pinchar en la conexión que aparece. La "URL de solicitud" (Request URL) que empieza por `wss://` es nuestra llave. En la subpestaña "Mensajes" podremos ver todo el JSON cayendo en tiempo real para confirmar el formato.

## 5. ¿Por qué NO usar Web Scraping?
Aunque extraer la información del HTML (Web Scraping) pueda parecer la alternativa obvia al principio, en el caso de FlowAgility es altamente desaconsejable por los siguientes motivos:
* **Aplicación SPA (Single Page Application):** FlowAgility se renderiza mediante JavaScript, no con puro HTML plano. Un scraper tradicional en PHP (con curl o Guzzle) no vería los datos en directo. Necesitarías un navegador en versión "Headless" (como Puppeteer o Selenium) corriendo en tu servidor, lo cual es inviable en entornos de hosting compartido como tu plan de Hostalia debido a su altísimo consumo de RAM y CPU.
* **Fragilidad Estructural:** Si los desarrolladores de FlowAgility deciden cambiar la etiqueta `div class="dog-score"` por `p class="r-12_score"`, el scraper colapsaría de inmediato y se rompería toda tu app.
* **Falta de Inmediatez (No es Tiempo Real):** El web scraping se basa en recargar la página cada X segundos para ver qué ha cambiado. Esto consume muchísimos recursos, corre el riesgo de que el servidor remoto te bloquee la IP por considerarte un bot malicioso (DDoS), y jamás te daría la precisión del "Live", donde queremos reaccionar al instante que se pulsa el botón en la pista.
* **Teniendo la puerta abierta (JSON puro):** Los WebSockets nos están entregando un archivo de datos formateado perfecto, sin florituras de diseño. Ignorar esto y optar por leer la pantalla para adivinar el número donde pone "Faltas: 1" complicaría infinitamente el código backend.

## 6. Patrones Ocultos (Buscando el Santo Grial)
Una de las enormes ventajas de saber que FlowAgility funciona con **Phoenix Channels** es que esta tecnología se basa en **"Topics" (Canales/Temáticas)**.
Esto significa que la URL de conexión base siempre suele ser la misma para todo el mundo (por ejemplo, `wss://api.flowagility.com/socket`). 

Lo que realmente cambia NO es la URL, sino **el nombre del Canal (Topic)** al que te suscribes una vez abres esa conexión.
En Phoenix Channels, el patrón suele ser `<modulo>:<id_del_elemento>`.
Por ejemplo, para escuchar los resultados de la "Pista 1" del "Evento 450", el canal en el código se llamaría algo así como `ring:450:1` o `event:450:live`.

**¿Por qué es esto una gran noticia?**
Porque si echamos un vistazo a las URLs habituales cuando navegas por FlowAgility (ej: `https://flowagility.com/events/850/live`), **¡los IDs de los eventos son públicos!**.
Si conseguimos descifrar cuál es el patrón de nombres de canal que usan para el streaming (lo cual descubriremos fácilmente inspeccionando el campeonato del 3 de abril), es muy probable que **NUNCA necesitemos que un organizador nos dé su enlace privado**. 

Solo con saber el ID público de la competición en FlowAgility (que todo el mundo puede ver buscando en su calendario), nuestra app generaría el patrón de conexión automáticamente y se engancharía a la competición sin interactuar con los jueces.
