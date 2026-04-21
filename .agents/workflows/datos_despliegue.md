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
- **Contraseña**: z1jateU3PgSii3fB7
- **IP**: 157.173.121.242

## ESTADO ACTUAL:
- El servidor está activo y accesible por SSH como root utilizando certificados SSH.
- **[Completado]** Fase 1: Instalados Nginx, PHP 8.4, Node.js 20, MariaDB, Redis, FFmpeg y Supervisor.
- **[Completado]** Fase 2 y 3: Base de datos configurada, repositorio clonado, dependencias instaladas y Angular compilado en producción en `/var/www/agilityasturias`.
- **[Completado]** Fase 4: Configurado Nginx y Supervisor para mantener el backend y queues levantados.
- **[Completado]** Fase 5: Verificada la disponibilidad del sitio web y configurado el certificado SSL (HTTPS) con Certbot.
- **[Completado]** Fase 6: Instalado y configurado Netdata para monitorización del servidor. Se permite tráfico por el puerto 19999 mediante UFW. Accesible en: http://157.173.121.242:19999
- **[Completado]** Fase 7: Instalado y configurado phpMyAdmin sobre Nginx. Se permite tráfico por el puerto 8080 mediante UFW. Accesible en: http://157.173.121.242:8080


---

## 🚀 Protocolo oficial de despliegue

Gracias al uso del script `deploy.sh` que se encuentra en la raíz del repositorio, subir los cambios a producción es muy directo. **Atención IA:** Es obligatorio seguir el paso 1 minuciosamente antes del despliegue.

1. **Actualizar el archivo de Novedades (Atención IA):**
   **ANTES** de hacer ningún `git add`, la IA debe editar obligatoriamente el archivo `frontend/public/novedades.json` para añadir una nueva entrada al principio del array (JSON) reflejando los desarrollos realizados en esta nueva versión (Incrementando la versión y poniendo la fecha actual). **Instrucción Crítica:** La redacción de las novedades (funcionalidades formadas, errores solventados y advertencias) debe estar orientada puramente a usuarios "finales" no técnicos del club. Utiliza un lenguaje cercano y fácil de entender, explicando los beneficios y evitando radicalmente utilizar jerga técnica, arquitecturas o nombres de código. **NUNCA debes incluir** en `novedades.json` desarrollos, cambios o monitores orientados exclusivamentes a los perfiles de **Administrador**, ya que el administrador está al corriente de estos y documentarlos ahí tan sólo genera ruido innecesario para los clientes finales. Si en una ronda de trabajo **solo** se han desarrollado funciones de administradores, puedes evitar incluir esas iteraciones como *features* intentando mencionar únicamente *bugfixes* generales de sistema si los hubo.

2. **Guardar y Subir (Desde tu entorno Local):**  
   Acumula tus cambios y envíalos habitualmente hacia `main`:
   ```bash
   git add .
   git commit -m "Descripción de tu mejora"
   git push origin main
   ```

3. **Ejecutar el Despliegue (En el Servidor de Producción):**  
   Simplemente ejecuta este comando desde cualquier terminal local que tenga permisos por SSH. El servidor se encargará de realizar el git pull, instalar dependencias para back/front, limpiar cachés, compilar en production y reiniciar las colas automáticamente:
   ```bash
   ssh agilityasturias "cd /var/www/agilityasturias && bash deploy.sh"
   ```

*(Nota: Si alguna vez tuvieras que usar un ordenador no configurado con la clave, en lugar de ese comando tendrías que entrar mediante `ssh root@157.173.121.242`, moverte al directorio con `cd /var/www/agilityasturias` y ejecutar manualmente `bash deploy.sh`)*
