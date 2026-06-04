---
name: datos despliegue
description: Datos para desplegar en producción el proyecto
---

# Servidor Contabo
- **Servidor**: Cloud VPS 30 en Contabo (Región: EU/Alemania).
- **Hardware**: 8 vCPU Cores, 24 GB RAM, 200 GB NVMe (Específicamente elegido por velocidad I/O).
- **Sistema Operativo**: Ubuntu 24.04 LTS (Noble Numbat).
- **Objetivo**: Entorno de producción para un club deportivo que usará Angular 21 como frontend, Laravel como backend y procesamiento de video intensivo con FFmpeg.

## Importante
- Cada operación que se realice en el servidor debe ser documentada en este archivo .md en el apartado estado actual.

## Datos de acceso
- **Usuario**: root
- **Acceso SSH**: Configurado con certificados/claves SSH.
  - **Comando principal (configurado localmente)**: `ssh agilityasturias` (Usando `~/.ssh/config` y `id_rsa`).
  - **Desde otros equipos (con certificado)**: `ssh -i <ruta_a_tu_clave> root@157.173.121.242`
  - **Desde otros equipos (solo contraseña)**: `ssh root@157.173.121.242`
- **Contraseña**: no documentar en el repositorio; usar gestor de secretos o variable de entorno local.
- **IP**: 157.173.121.242

## ESTADO ACTUAL:
- **[Completado 2026-06-05]** Desplegada versión 1.1.49. Implementa la sección de Patrocinadores (Sponsors) pública y su respectivo panel CRUD de gestión en la administración del club integrado con validaciones de formulario, subida y compresión de imágenes, y modales interactivos de borrado. El diseño se adaptó al sistema dinámico de theming multi-tenant, y los botones de edición/borrado se optimizaron con áreas táctiles ampliadas de 38px y alineaciones perfectamente centradas.
- **[Completado 2026-06-04]** Desplegada versión 1.1.48. Implementa la renovación integral del panel de Provisión de Fondos para los responsables del club, incluyendo un diseño Bento Grid de KPIs interactivos, visor Split-View (dos columnas) en escritorio, y navegación móvil optimizada mediante un selector de pestañas segmentado ("Resumen" y "Socios") para eliminar la fatiga por scroll vertical infinito. También añade la funcionalidad de Registro Múltiple (cargos en lote con transacción de base de datos), subida de recibos con soporte interactivo de arrastrar y soltar (Drag & Drop), botones de formulario sticky fijados en pantalla en móvil, y corrige la transparencia visual de las opciones del método de pago (MatSelect dropdown). Adicionalmente, introduce el nuevo panel del Historial y Estadísticas de Asistencia para el perfil Staff, integrando KPIs del club, series de tendencias en ECharts (clases vs eventos de los últimos 6 meses), expediente detallado por miembro con gráficos de progreso circular, listado unificado de actividades, filtros interactivos y la guía de instrucciones integrada, corrigiendo de manera global la opacidad en los paneles autocompletados.
- **[Completado 2026-06-03]** Desplegada versión 1.1.47. Unifica y optimiza el almacenamiento de las carreras en la base de datos bajo el patrón Single Table Inheritance (STI) (centralizando las bitácoras RFEC y RSCE en una sola tabla `tracks`). Además, corrige el problema de impresión/exportación de PDF vacíos en las bitácoras de RSCE y RFEC, e incluye el pie de página de marca.
- **[Completado 2026-06-02]** Desplegada versión 1.1.46. Implementa la subida de vídeos en segundo plano con cola global (`UploadService` y `UploadProgressPanelComponent`), solventa las restricciones de dominios de Bunny.net Stream (`localhost:4200`) con un overlay informativo en caso de fallo de red/dominio, e incorpora la organización automatizada de vídeos en Bunny CDN por colecciones/carpetas dinámicas basadas en el slug de cada club. Añade un indicador visual de espacio de almacenamiento consumido en Bunny.net en la galería de vídeos y el panel de configuración de límites de almacenamiento (cuotas de plan en GB) en la administración de suscripciones. También incorpora la migración automática de base de datos para trasladar y corregir los resultados scrapeados de la competición de Teverga de la bitácora RSCE a la de RFEC.
- **[Completado 2026-06-01]** Desplegada versión 1.1.45. Corrige el error en el seguimiento de ascensos (Grade 1 y Grade 2) y del Campeonato de España para que las pistas excelentes a cero importadas o scrapeadas se computen correctamente. Además, soluciona el error visual del indicador de Jumping en Grado 2 (que mostraba 4 slots en vez de 3) y corrige el bug de bloqueo en el recuento de jueces únicos evaluando todo el histórico de pistas válidas en vez de aplicar un recorte/slicing incorrecto.
- **[Completado 2026-06-01]** Desplegada versión 1.1.44. Corrige el scraper de FlowAgility para soportar nombres de meses multilenguaje (español, inglés y portugués) y añade una búsqueda de secuencia por fecha de inicio cuando se omite el mes en la cabecera del día (ej. "Sábado 30"). También se solucionaron los errores de compilación TS4111 de Angular index signature y se incrementó el presupuesto inicial de bundle a 3MB.
- **[Completado 2026-05-31]** Configurado servidor Nginx y Certbot SSL para soportar HTTPS en el nuevo subdominio `miperro10.clubagility.com` y `www.miperro10.clubagility.com`. Se expandió el certificado existente y se verificó el enrutamiento.
- **[Completado 2026-05-22]** Desplegada versión 1.1.42. Incluye el autocompletado en el formulario de competiciones por enlace/nombre, la asignación automática de asistencia y puntos al finalizar competiciones de FlowAgility, el monitor de scrapers para la administración, la digitalización y publicación de las clasificaciones de la Liga Norte desde capturas de Telegram con Gemini Vision, y la optimización de precisión OCR de Liga Norte (con inyección de contexto de clubes/perros/guías desde la BD y corrección automática del club del perro en la base de datos al emparejar binomios).
- **[Completado 2026-05-22]** Automatizado el scraper de FlowAgility para que se ejecute todas las madrugadas a las 4:00 AM sobre competiciones en curso o finalizadas con enlace a FlowAgility. Se ajustó la lógica para que no se marquen como completadas (`results_scraped = true`) hasta que comprobamos que se han importado resultados para cada uno de los días del evento, o cuando transcurre un periodo de gracia de 5 días tras su finalización (para evitar bucles diarios si no se subieron todos los datos o si ningún perro del club participó en algún día).
- **[Completado 2026-05-21]** Desplegada versión 1.1.41. Incluye el monitor de scrapers para la administración (últimos 100 registros), la sección temporal de "Seguimiento Provisional" para que los socios verifiquen los datos de FlowAgility de su club con el binomio perro-guía destacado en color verde, y las mejoras en el sistema de sincronización para corregir la vinculación automática de resultados cuando hay licencias cifradas o discrepancias de nombres (como fonsi/alfonso).
- **[Completado 2026-05-10]** Se solucionaron los errores 404 de los componentes de Livewire en producción publicando sus recursos estáticos (`php artisan livewire:publish --assets`), lo cual fue automatizado añadiéndolo al `deploy.sh`.
- **[Completado 2026-05-10]** Se arregló el error 500 (Class "Filament\Tables\Actions\ViewAction" not found) en el panel de administradores (`ClubLeadsTable`), actualizando los namespaces de acciones de tablas según la nueva versión de Filament v5.
- **[Completado 2026-05-10]** Configurado servidor Nginx y Certbot SSL para soportar HTTPS en el nuevo subdominio `admin.clubagility.com` y `www.admin.clubagility.com`. Se expandió el certificado existente y se verificó el enrutamiento.
- **[Completado]** Scheduler Laravel: el servidor tiene una unica crontab general para ejecutar todas las tareas programadas:
  ```bash
  * * * * * cd /var/www/agilityasturias/agility_back && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
  ```
  Esta crontab sustituye cualquier endpoint HTTP de scheduler. La subida diaria de videos a YouTube, el autocalibrado de cargas y los backups se definen en `agility_back/routes/console.php`.
- El servidor está activo y accesible por SSH como root utilizando certificados SSH.
- **[Completado]** Fase 1: Instalados Nginx, PHP 8.4, Node.js 20, MariaDB, Redis, FFmpeg y Supervisor.
- **[Completado]** Fase 2 y 3: Base de datos configurada, repositorio clonado, dependencias instaladas y Angular compilado en producción en `/var/www/agilityasturias`.
- **[Completado]** Fase 4: Configurado Nginx y Supervisor para mantener el backend y queues levantados.
- **[Completado]** Fase 5: Verificada la disponibilidad del sitio web y configurado el certificado SSL (HTTPS) con Certbot.
- **[Completado]** Fase 6: Instalado y configurado Netdata para monitorización del servidor. Se permite tráfico por el puerto 19999 mediante UFW. Accesible en: http://157.173.121.242:19999
- **[Completado]** Fase 7: Instalado y configurado phpMyAdmin sobre Nginx. Se permite tráfico por el puerto 8080 mediante UFW. Accesible en: http://157.173.121.242:8080
- **[Completado]** Fase 8: Configurado sistema de backups locales automáticos diarios de la base de datos con rotación.
- **[Completado]** Fase 9: Configurado servidor Nginx y Certbot SSL para que la aplicación multi-tenant soporte correctamente HTTPS en el nuevo subdominio `patitas.clubagility.com` y `www.patitas.clubagility.com`.



---

## 🚀 Protocolo oficial de despliegue

Gracias al uso del script `deploy.sh` que se encuentra en la raíz del repositorio, subir los cambios a producción es muy directo. **Atención IA:** Es obligatorio seguir el paso 1 minuciosamente antes del despliegue.

1. **Comprobar los Tests (Atención IA):**
   **ANTES** de hacer el commit o actualizar novedades, es obligatorio comprobar que el código es estable ejecutando la batería completa de tests en local. Si algún test falla, abortar el despliegue e informar al usuario.
   - Para backend: ejecutar `cd agility_back && ./vendor/bin/pest` (o el comando configurado).
   - Para frontend: ejecutar `cd frontend && npx vitest run` (o el comando configurado).

2. **Actualizar el archivo de Novedades (Atención IA):**
   Una vez los tests pasen, la IA debe editar obligatoriamente el archivo `frontend/public/novedades.json` para reflejar los desarrollos realizados en la nueva versión. **Instrucción Crítica:** Si ya existe una versión con la fecha del día actual, **NO crees una entrada nueva**; en su lugar, actualiza esa misma versión añadiendo los nuevos cambios. Si no existe, añade una nueva entrada al principio del array (Incrementando la versión y poniendo la fecha actual). La redacción de las novedades (funcionalidades, errores solventados y advertencias) debe estar orientada puramente a usuarios "finales" no técnicos del club. Utiliza un lenguaje cercano y fácil de entender, explicando los beneficios y evitando radicalmente utilizar jerga técnica, arquitecturas o nombres de código. **NUNCA debes incluir** en `novedades.json` desarrollos, cambios o monitores orientados exclusivamentes a los perfiles de **Administrador**, ya que el administrador está al corriente de estos y documentarlos ahí tan sólo genera ruido innecesario para los clientes finales. Si en una ronda de trabajo **solo** se han desarrollado funciones de administradores, puedes evitar incluir esas iteraciones como *features* intentando mencionar únicamente *bugfixes* generales de sistema si los hubo.

3. **Guardar y Subir (Desde tu entorno Local):**  
   Acumula tus cambios y envíalos habitualmente hacia `main`:
   ```bash
   git add .
   git commit -m "Descripción de tu mejora"
   git push origin main
   ```

4. **Ejecutar el Despliegue (En el Servidor de Producción):**  
   Simplemente ejecuta este comando desde cualquier terminal local que tenga permisos por SSH. El servidor se encargará de realizar el git pull, instalar dependencias para back/front, limpiar cachés, compilar en production y reiniciar las colas automáticamente:
   ```bash
   ssh agilityasturias "cd /var/www/agilityasturias && bash deploy.sh"
   ```

*(Nota: Si alguna vez tuvieras que usar un ordenador no configurado con la clave, en lugar de ese comando tendrías que entrar mediante `ssh root@157.173.121.242`, moverte al directorio con `cd /var/www/agilityasturias` y ejecutar manualmente `bash deploy.sh`)*
