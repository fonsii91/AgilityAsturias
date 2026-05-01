# Hoja de Ruta de Pruebas (Testing Roadmap)

Este documento desglosa las funcionalidades descritas en `funcionalidades.md` en "lotes" de trabajo con el tamaño y alcance ideal para ser solicitados a la IA mediante el workflow `testing_premium.md`.

Puedes ir marcando las casillas (`[x]`) a medida que completemos las pruebas de cada bloque y las registremos en `testing_registry.md`.

---

## 1. Funcionalidades Públicas (Presencia Web)
- [x] **Vistas Públicas:** Páginas informativas (Bienvenida, Galería Pública, Videoteca Pública).
- [x] **Contacto:** Información de Contacto (Visualización de datos del Tenant).

---

## 2. Funcionalidades para Miembros

### Gestión de Cuenta y Perfil
- [x] **Perfil Base:** Actualización de Perfil (Datos de usuario y preferencias).
- [x] **Seguridad:** Recuperación y cambio de contraseña.

### Gestión de Perros ("Mi Manada")
- [x] **CRUD Base:** Creación, Edición y Eliminación del perfil del perro.
- [x] **Dashboard (Pestañas Básicas):** Resumen, Foto de Perfil y Ajustes.
- [x] **Dashboard (Métricas):** Pestañas de Entrenamiento y Salud.
- [x] **Dashboard (Archivos):** Pestaña de Documentación (Subida de cartillas/licencias).
- [x] **Accesos:** Funcionalidad de "Compartir Perros" con la Familia/Guías.

### Salud Deportiva (Monitor ACWR)
- [x] **Ingreso de Datos:** Registro de Cargas (Entrada de minutos e intensidad).
- [x] **Motor ACWR:** Visualización del Ratio de Carga y Revisiones Pendientes.

### Reservas y Calendario (Lado Miembro)
- [x] **Gestión Propia:** Mis Reservas (Visualización de disponibilidad, reserva y cancelación).
- [x] **Vistas Comunes:** Calendario Global y Eventos Personales.

### Comunidad y Multimedia (Lado Miembro)
- [x] **Videoteca:** Galería de Vídeos (Subir, Visualizar, dar Likes y Descargas).
- [x] **Lectura Comunal:** Listado de Recursos (Descargas), Tablón de Anuncios y Notificaciones.
- [x] **Feedback:** Sistema de Sugerencias / Tickets.
- [x] **Novedades:** Pantalla para descubrir las últimas actualizaciones incorporadas al propio software de la plataforma.

### Competiciones y Ranking (Lado Miembro)
- [x] **Asistencia:** Visualización de Competiciones y flujo de Apuntarse/Desapuntarse.
- [x] **Métricas:** Ranking Comunitario y Bitácora de pistas RSCE.

---

## 3. Funcionalidades para Staff

### Gestión de Reservas e Instalaciones
- [x] **Configuración Base:** Gestión de Horarios / Time Slots regulares.
- [x] **Excepciones:** Configuración de Bloqueos de Horario y días festivos.
- [x] **Monitorización:** Info de Reservas Global (Vista del listado de asistentes del día).

### Gestión de Eventos y Competiciones
- [x] **CRUD de Eventos:** Creación, modificación y cancelación de Competiciones.
- [x] **Asistencia Staff:** Verificación de Asistencia (Pasar lista en entrenamientos/eventos).

### Gestión de Comunidad y Comunicación
- [x] **Directorio:** Gestión de Miembros y generación de Enlaces de Reseteo.
- [x] **Redacción:** Panel de control del Tablón de Anuncios (Crear/Editar comunicados).
- [x] **Permisos:** Solicitudes y actualización de Roles.

### Gestión de Recursos y Multimedia
- [x] **Archivos:** Administración de Recursos PDF/Documentos del club.
- [x] **Moderación:** Administración de la Galería y Aprobación/Rechazo de Vídeos Públicos.

### Gestión Deportiva
- [x] **Puntuación Extra:** Asignación de Puntos manuales para el Ranking y supervisión de Salud Deportiva.

---

## 4. Funcionalidades para Administrador

### Gestión Global y Monitorización Avanzada
- [x] **Panel de Usuarios:** Control total sobre las cuentas y roles de la plataforma.
- [x] **Gestión Avanzada de Sugerencias:** Administración global de los tickets y sugerencias de la plataforma.
- [x] **Monitorización RSCE:** Control avanzado de licencias y pistas de la comunidad.
- [x] **Monitorización Salud:** Vista global de la salud y el ACWR de todos los perros.
- [x] **Revisar Vídeos:** Monitorización de sincronización con YouTube (estadísticas) y visualización del historial global de vídeos borrados.
