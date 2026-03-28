---
name: datos producción
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
- **Contraseña**: z1jateU3PgSii3fB7
- **IP**: 157.173.121.242

## ESTADO ACTUAL:
- El servidor está activo y accesible por SSH como root.
- **[Completado]** Fase 1: Instalados Nginx, PHP 8.4, Node.js 20, MariaDB, Redis, FFmpeg y Supervisor.
- **[Completado]** Fase 2 y 3: Base de datos configurada, repositorio clonado, dependencias instaladas y Angular compilado en producción en `/var/www/agilityasturias`.
- **[Completado]** Fase 4: Configurado Nginx y Supervisor para mantener el backend y queues levantados.
- **[Completado]** Fase 5: Verificada la disponibilidad del sitio web y configurado el certificado SSL (HTTPS) con Certbot.
