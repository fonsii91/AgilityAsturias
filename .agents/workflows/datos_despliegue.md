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
- **[Completado 2026-05-03]** Desplegado el acceso seguro de administracion entre clubes mediante codigos temporales de un solo uso. El servidor quedo en el commit `b2bb075` y las rutas `api/club-handoff` y `api/admin/clubs/{club}/handoff` estan registradas en produccion.
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
