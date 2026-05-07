---
name: dar_certificados
description: Configura Nginx y Certbot SSL para un nuevo club (requiere pasarle el slug)
---

# Workflow: Dar Certificados SSL para Nuevo Club

Este workflow automatiza la configuración de Nginx y la generación/expansión de certificados SSL de Let's Encrypt para un nuevo club (subdominio) en el servidor de producción.

## Parámetros Requeridos
- **Slug del club**: El subdominio que se va a configurar (ej. `elnorte`). Si el usuario no lo proporciona al invocar el workflow, debes pedírselo antes de continuar.

## Pasos a seguir por la IA:

### 1. Obtener la Configuración Actual de Nginx
Utiliza la herramienta `run_command` para obtener el archivo actual desde el servidor de producción:
```bash
// turbo
ssh agilityasturias "cat /etc/nginx/sites-available/agilityasturias" > remote_nginx_config.conf
```

### 2. Actualizar la Configuración Localmente
Edita el archivo descargado `remote_nginx_config.conf` (usa la herramienta adecuada para editar o reescribir el contenido).
Debes buscar las directivas `server_name` existentes y **añadir al final** de la lista los nuevos dominios correspondientes al slug:
` <slug>.clubagility.com www.<slug>.clubagility.com`

*(Asegúrate de añadir los dominios justo antes del punto y coma `;` en todas las ocurrencias relevantes del archivo).*

### 3. Subir la Configuración al Servidor
Una vez modificado localmente, sube el archivo al servidor usando `scp`:
```bash
// turbo
scp remote_nginx_config.conf agilityasturias:/root/agilityasturias_nginx.conf
```

Aplica la configuración reemplazando la antigua y comprueba que sea correcta:
```bash
// turbo
ssh agilityasturias "mv /root/agilityasturias_nginx.conf /etc/nginx/sites-available/agilityasturias && nginx -t && systemctl reload nginx"
```

### 4. Extraer la Lista de Dominios y Expandir el Certificado SSL
Certbot requiere que se le pasen **todos** los dominios (tanto los antiguos como los nuevos) cuando se utiliza el flag `--expand`.
Extrae la lista completa de dominios de la directiva `server_name`.
A continuación, ejecuta el comando de certbot en el servidor de producción, construyendo la lista dinámicamente con múltiples flags `-d`:
```bash
// turbo
ssh agilityasturias "certbot --nginx -d dominio1.com -d www.dominio1.com ... -d <slug>.clubagility.com -d www.<slug>.clubagility.com --expand --non-interactive"
```
> **Atención IA**: Reemplaza el comando anterior por la lista real completa de dominios. Ejecuta este comando en segundo plano (`WaitMsBeforeAsync: 10000`) ya que la verificación ACME para múltiples dominios puede tardar entre 1 y 2 minutos. Utiliza `command_status` iterativamente para esperar a que termine.

### 5. Documentar el Despliegue
Modifica el archivo `.agents/workflows/datos_despliegue.md` (ubicado en `c:\Users\Usuario\Desktop\AgilityAsturiass\.agents\workflows\datos_despliegue.md`). Añade en la parte superior del listado `## ESTADO ACTUAL:` un nuevo punto que documente la acción con la fecha del día en que se realice:
`- **[Completado YYYY-MM-DD]** Configurado servidor Nginx y Certbot SSL para soportar HTTPS en el nuevo subdominio \`<slug>.clubagility.com\` y \`www.<slug>.clubagility.com\`. Se expandió el certificado existente y se verificó el enrutamiento.`

### 6. Verificar el Funcionamiento
Utiliza la herramienta `read_url_content` para comprobar que la web carga correctamente con el nuevo certificado:
`https://<slug>.clubagility.com/`

Finalmente, informa al usuario detallando el éxito de la operación.
