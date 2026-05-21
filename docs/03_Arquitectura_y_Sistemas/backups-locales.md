# Sistema de Backups Locales (Spatie Laravel Backup)

Este documento describe la configuración y funcionamiento del sistema de copias de seguridad de la base de datos de Agility Asturias, configurado para ejecutarse localmente sin depender de servicios externos de terceros (como AWS S3).

## 🛠️ Herramienta Utilizada
Se ha integrado el paquete estándar de la industria [spatie/laravel-backup](https://spatie.be/docs/laravel-backup/v8/introduction).

## ⚙️ Configuración Actual

- **Alcance:** Solo se realizan backups de la **Base de Datos**. Los archivos estáticos no se incluyen para no saturar el almacenamiento.
- **Destino:** Disco local del servidor.
- **Ruta de guardado:** `agility_back/storage/app/Laravel/` (o el nombre de la app definido en `.env`).
- **Notificaciones:** Desactivadas (las notificaciones por email han sido retiradas de `config/backup.php` para evitar fallos si el servidor de correo no está configurado).

## 📅 Programación Automática (Cron)

Los comandos se ejecutan automáticamente cada madrugada gracias al sistema de tareas programadas de Laravel (`routes/console.php`):

1. **`04:30 AM` - Limpieza de backups antiguos (`backup:clean`)**
   Rotación automática para evitar que el disco duro se llene. Reglas por defecto:
   - Se guardan todos los backups de los últimos 7 días.
   - De los últimos 16 días, se guarda un backup diario.
   - De las últimas 8 semanas, se guarda un backup semanal.
   - Se borra todo lo que supere los 5GB de almacenamiento total.

2. **`05:00 AM` - Creación de la copia de seguridad (`backup:run --only-db`)**
   Ejecuta `mysqldump`, comprime la base de datos en un archivo `.zip` de alta compresión y la guarda en la carpeta local.

> [!IMPORTANT]
> **Requisito en Producción:**
> Para que esto funcione, el servidor (Linux) **debe** tener configurado un único Cronjob general que llame al planificador de Laravel cada minuto:
> ```bash
> * * * * * cd /ruta/al/proyecto/agility_back && php artisan schedule:run >> /dev/null 2>&1
> ```

## 🛡️ Riesgos a tener en cuenta y Recomendaciones

Al tener las copias de seguridad alojadas en la **misma máquina** que la base de datos de producción, existe el riesgo de un punto único de fallo (SPOF). Si el servidor sufre daños irreparables (fallo catastrófico del disco duro) o es hackeado y borrado, **se perderán tanto los datos vivos como las copias de seguridad**.

**Recomendación de Mitigación:**
Descargar el archivo `.zip` más reciente periódicamente a un dispositivo externo (ordenador personal, disco duro físico local) mediante SFTP, u organizar una pequeña tarea mensual manual para llevarse esa copia fuera del servidor.
