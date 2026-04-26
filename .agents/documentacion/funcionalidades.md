# Funcionalidades de la Aplicación

Este documento detalla todas las funcionalidades disponibles en la plataforma, clasificadas según el perfil de usuario que tiene acceso a ellas. Se excluyen de este documento las funcionalidades exclusivas del perfil de Administrador (gestión global, monitorización avanzada y configuración del sistema).

---

## 1. Funcionalidades Públicas (Presencia Web)

La plataforma cuenta con una cara pública orientada a visitantes y posibles nuevos socios. Actúa como la carta de presentación o landing page del club:
* **Bienvenida:** Página de inicio (Home) con información general del club, filosofía, quiénes somos y qué ofrecemos.
* **Galería:** Visor de las fotografías y momentos destacados seleccionados por el club de forma pública.
* **Videoteca (Vídeos Públicos):** Espacio para mostrar los vídeos de entrenamientos o competiciones que el Staff ha decidido compartir con el público.
* **Contacto:** Formulario y datos de contacto directo con la organización del club para consultas, información o solicitudes de inscripción.

---

## 2. Funcionalidades para Miembros

Las funcionalidades orientadas a los "Miembros" están diseñadas para permitir a los usuarios gestionar sus propios datos, los de sus perros y participar de forma activa en la vida del club (reservas, entrenamientos y competiciones).

### Gestión de Cuenta y Perfil
* **Actualización de Perfil:** Posibilidad de modificar los datos personales, de contacto y preferencias de usuario a través del apartado de perfil.
* **Seguridad:** Opción para solicitar la recuperación y cambio de contraseña.

### Gestión de Perros ("Mi Manada")
Módulo central para la gestión integral de cada perro que posee el miembro:
* **Creación y Edición:** Añadir nuevos perros al sistema con sus datos básicos (nombre, raza, fecha de nacimiento, etc.) y editar esta información en cualquier momento.
* **Dashboard Individual del Perro:** Cada perro tiene un perfil detallado dividido en diferentes áreas:
    * **Resumen:** Vista general de la información del perro, con opción de actualizar la foto de perfil.
    * **Entrenamiento:** Seguimiento del progreso y las áreas de mejora.
    * **Salud:** Registro médico y de bienestar.
    * **Documentación:** Espacio para gestionar los documentos importantes del perro (ej. cartilla de vacunación, licencias).
    * **Familia / Guías:** Gestión de con quién comparte entrenamientos el perro.
    * **Ajustes:** Configuraciones específicas y opción de eliminar el perfil del perro.
* **Compartir Perros:** Capacidad para "compartir" un perro con otros usuarios (por ejemplo, familiares u otros guías del club) y retirar este acceso cuando sea necesario.

### Salud Deportiva (Monitor ACWR)
Herramienta avanzada para la prevención de lesiones y monitorización del rendimiento:
* **Registro de Cargas:** Introducir datos sobre la carga de trabajo de los entrenamientos y competiciones (minutos de actividad, intensidad percibida, etc.).
* **Visualización de Carga (Ratio ACWR):** Consultar el estado físico y nivel de riesgo de lesión del perro basado en los algoritmos de carga aguda frente a la crónica.
* **Revisiones Pendientes:** Ver listado de registros de actividad a la espera de confirmación.

### Reservas y Calendario
* **Calendario Global:** Visualizar la disponibilidad de la pista, instalaciones y eventos del club en un formato de calendario.
* **Mis Reservas:** Realizar, visualizar y gestionar las reservas propias. Permite reservar franjas horarias concretas (si hay disponibilidad) y cancelar las reservas ya realizadas.
* **Eventos Personales:** Añadir recordatorios y eventos propios al calendario para organizar la asistencia y los entrenamientos.

### Galería de Vídeos y Recursos Multimedia
* **Visualización:** Acceder a la galería de vídeos comunitarios del club.
* **Subida de Vídeos:** Subir vídeos propios de entrenamientos o competiciones al servidor de la plataforma para su análisis o para compartirlos.
* **Interacción:** Dar y quitar "Me gusta" en los vídeos publicados, así como descargar vídeos.
* **Gestión Propia:** Editar o eliminar los vídeos propios subidos previamente.
* **Galería Pública:** Ver fotografías y vídeos seleccionados como públicos por el staff.

### Recursos Comunitarios y Educativos
* **Listado de Recursos:** Acceso a documentos, normativas, y material formativo o de entrenamiento subido por el club o el staff.

### Comunicación y Tablones
* **Tablón de Anuncios:** Consultar los anuncios, avisos importantes y circulares enviados por la directiva o el staff del club. Opción de marcar los anuncios como "leídos".
* **Sugerencias:** Enviar tickets, reportes o ideas de mejora de forma privada al Staff y Administración del club.
* **Notificaciones:** Sistema de alertas para avisos (ej. cambios en las reservas, nuevas funciones). Permite marcar individualmente o globalmente las notificaciones como leídas.
* **Novedades:** Pantalla para descubrir las últimas actualizaciones incorporadas al propio software de la plataforma.

### Competiciones y Ranking
* **Visualización de Competiciones:** Ver las próximas competiciones y eventos oficiales en los que el club va a participar.
* **Asistencia a Competiciones:** Confirmar la inscripción o asistencia a una competición determinada ("apuntarse") o cancelar dicha inscripción ("desapuntarse"). Ver la lista de otros miembros que también van a asistir.
* **Ranking Comunitario:** Consultar la clasificación de la liga interna o ranking del club para ver la posición de los perros en las diferentes categorías.
* **Bitácora RSCE:** Herramienta para realizar un seguimiento personal de las pistas RSCE realizadas, guardar resultados, registrar puntos y llevar un control del grado de competición.

---

## 3. Funcionalidades para Staff

Los miembros con el rol de "Staff" (monitores, entrenadores, directiva) tienen acceso a todas las funcionalidades de un Miembro regular, sumado a permisos especiales para la administración y gestión diaria del club.

### Gestión de Reservas e Instalaciones
* **Gestión de Horarios (Time Slots):** Configurar y gestionar las franjas horarias generales en las que la pista o las instalaciones están disponibles para reservar.
* **Excepciones de Horario:** Crear excepciones para bloquear días o tramos horarios concretos por festivos, mantenimientos o cierre.
* **Info de Reservas Global:** Vista para monitorizar y consultar todas las reservas realizadas por los miembros en un día u horario determinado.

### Gestión de Eventos y Competiciones
* **CRUD de Competiciones:** Crear nuevas competiciones en el sistema, modificar sus datos (fecha, lugar, grado) y eliminarlas si se cancelan o introducen por error.
* **Verificación de Asistencia (Entrenamientos/Competiciones):** Panel para visualizar quiénes están apuntados a eventos y confirmar o validar su asistencia de forma oficial (pasar lista).

### Gestión de Comunidad y Comunicación
* **Gestión de Miembros:** Ver el listado completo de usuarios registrados en el club y sus datos de contacto básicos.
* **Generar Enlaces de Reseteo:** Capacidad para enviar o generar un enlace para restablecer la contraseña en caso de que un miembro no pueda acceder.
* **Actualización de Roles:** (Sujeto a confirmación por el admin) Posibilidad de asignar, cambiar o revocar roles (ej. pasar a un usuario de Miembro a Staff).
* **Redacción de Anuncios:** Crear, editar y publicar nuevas comunicaciones en el Tablón de Anuncios que serán visibles para todos los miembros. Eliminar anuncios antiguos.

### Gestión de Recursos y Multimedia
* **Administración de Recursos:** Subir nuevos archivos PDF, documentos o enlaces útiles a la sección de "Recursos" para que los miembros puedan descargarlos o consultarlos. Modificar o eliminar estos recursos.
* **Administración de la Galería:** Subir nuevas imágenes a la galería del club y borrar fotografías.
* **Aprobación de Vídeos Públicos:** Alternar la visibilidad de los vídeos subidos por los usuarios para decidir si deben o no mostrarse en la galería pública.

### Gestión Deportiva
* **Asignación de Puntos Extra:** Otorgar puntos adicionales de forma manual a los perros en el sistema de Ranking para premiar acciones, méritos especiales o resultados en ligas externas.
* **Gestión de Salud Deportiva (Si aplica):** Supervisar los registros introducidos por los usuarios si requieren confirmación adicional.
