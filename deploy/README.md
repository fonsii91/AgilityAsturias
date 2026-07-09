# Deploy — utilidades y configuración

## nginx/

`agilityasturias-sites-enabled.conf` es un snapshot de `/etc/nginx/sites-enabled/agilityasturias` del servidor de producción, tomado el 2026-07-09. **La fuente de verdad es el servidor** (SSH `agilityasturias`); antes de reutilizar este archivo, compáralo con el activo:

```sh
ssh agilityasturias "cat /etc/nginx/sites-enabled/agilityasturias" | diff - deploy/nginx/agilityasturias-sites-enabled.conf
```

Estructura: un server en :8000 que sirve el backend Laravel (`agility_back/public`, PHP-FPM 8.4) y bloques HTTPS (certificados gestionados por Certbot) para `agilityasturias.com`, `clubagility.com`, sus wildcards `*.dominio` y `admin.clubagility.com`, que hacen proxy al :8000 bajo `/backend` y sirven el frontend Angular.

## add_ssh_key.js

Script puntual (ya ejecutado) para instalar una clave pública SSH en el servidor mediante usuario/contraseña. Requiere las variables de entorno `SSH_HOST`, `SSH_USERNAME`, `SSH_PASSWORD` y `SSH_PUBLIC_KEY_PATH`. Para volver a usarlo: `npm i ssh2` y `node add_ssh_key.js`.

## deploy.sh (en la raíz del repo)

El script de despliegue vive en la raíz porque el servidor lo invoca ahí tras `git pull`: actualiza backend (composer, migrate, optimize, queue:restart) y compila el frontend Angular.
