# Documentación: Arquitectura y Gestión de Vídeos

Esta documentación describe a fondo el ciclo de vida, arquitectura y la lógica de gestión de los vídeos en la plataforma Agility Asturias.

## 1. Subida y Almacenamiento Local (El Inicio)
Cuando un usuario sube un vídeo desde la plataforma (`upload-video`), ocurre lo siguiente:
- **Restricciones:** El backend (`VideoController@store`) valida que sea un formato de vídeo válido (MP4, MOV, AVI, etc.) y no exceda los **500MB**.
- **Guardado Local:** El vídeo siempre se guarda de forma local en el servidor dentro de la ruta `/storage/app/public/videos`.
- **Registro en BBDD:** Se crea el registro del vídeo asociándolo a un perro (`dog_id`) de manera obligatoria y, opcionalmente, a una competición (`competition_id`). En la base de datos se le asigna el estado **`status = 'local'`**.

## 2. Proceso en Segundo Plano: Ahorro de espacio (YouTube CRON)
Para evitar que el disco del servidor se llene, el sistema implementa una delegación de los recursos multimedia:
- Existe un **comando diario de Laravel Scheduler** (`youtube:upload-videos`, implementado por `UploadVideosToYouTube`) configurado en `routes/console.php`.
- En producción no debe existir ningún endpoint HTTP para disparar este proceso. El servidor debe ejecutar `php artisan schedule:run` cada minuto mediante crontab, y Laravel decide cuándo toca lanzar la tarea diaria.
- La tarea de subida a YouTube se ejecuta todos los días a las **03:10** en la zona horaria `Europe/Madrid`.
- Este proceso busca en la base de datos vídeos que tengan un **`status = 'local'`** o **`'in_queue'`** y que hayan sido subidos hace más de **3 días**.
- Toma los vídeos por lotes (procesa un máximo de 5 a la vez para no sobrepasar la estricta cuota diaria de la API de YouTube).
- **Proceso de subida:** Utilizando la API oficial de Google, se suben a YouTube como un vídeo _No listado_ ("unlisted"). Estos vídeos no aparecen en el canal público de YouTube.
- **Liberación de espacio:** Una vez la subida tiene éxito, se registra el identificador de YouTube (`youtube_id`), el `status` pasa a **`'on_youtube'`**, y **se elimina el archivo físico** del servidor local.
- **Manejo de Errores e Interrupciones:** Si hay un error al subir (ej. si llegamos al límite de cuota diaria de YouTube), el estado vuelve inteligentemente a `'local'` para reintentar al día siguiente sin perder el vídeo. Si el error es otro, pasa a estado `'failed'`.

## 3. Reproducción Inteligente (SmartVideoPlayer)
A nivel de frontend en Angular, los vídeos se abstraen detrás de **`SmartVideoPlayerComponent`**:
- Este componente inspecciona los datos del vídeo de la API. 
- Si detecta que ese vídeo cuenta con un **`youtubeId`**, automáticamente renderiza un `<iframe>` de YouTube optimizado.
- Si el vídeo no cuenta con un ID de Youtube y tiene un **`localPath`** (es decir, fue subido hace menos de 3 días o por algún motivo técnico sigue en el servidor local), renderiza un `<video>` nativo en HTML5 cargándolo desde el backend. Ocurre de forma transparente para el usuario final.

## 4. Permisos, Privacidad y Galería Pública
Hay un estricto control de acceso respecto a la visualización de los recursos:
- **Privacidad Base (`is_public`):** Al subirlo se define la privacidad. A nivel de API, si un vídeo no es público y **no soy** administrador ni el dueño del perro etiquetado, el backend me bloquea la visualización automáticamente.
- **Galería Pública (`in_public_gallery`):** Existe una galería para difusión al exterior de la comunidad. Solamente los vídeos que tengan marcado el valor "Aparecer en galería pública" y simultáneamente sean de privacidad pública aparecerán aquí de cara a la web pública.
- **Permisos de Staff:** Cualquier empleado/administrador que tenga rol `staff` o `admin` tiene controles sobre cualquier vídeo y cuenta con accesos directos (`video-list`) para meterlos/sacarlos rápidamente de la galería pública.

## 5. Descargas y Administración (Video Stats)
- **Descargas:** Los dueños o el personal pueden descargar los vídeos con el botón de descarga, que sirve el archivo `.mp4` (esto sólo funciona mientras el vídeo esté local, lo que es correcto al cabo que a futuro desaparece del servidor y se sirve solo vía streaming de Google).
- **Gestión de fallos:** Existe un apartado de métricas (`admin-videos-stats`), donde los administradores consultan cómo fluye el proceso (cuántos vídeos en YouTube, Locales, en Cola o Fallidos). Los roles de staff tienen la posibilidad de re-encolar manualmente los vídeos reseteando el estado de `'failed'` a `'local'` para que el Cron vuelva a disparar su subida esta noche.
- **Interactividad:** Los usuarios pueden utilizar la integración social (`VideoLike`), permitiendo reaccionar a los vídeos, cuyo conteo luego se emplea para su ordenación por 'popularidad' (Trending).
