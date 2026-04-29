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
- [ ] **Vistas Comunes:** Calendario Global y Eventos Personales.

### Comunidad y Multimedia (Lado Miembro)
- [ ] **Videoteca:** Galería de Vídeos (Subir, Visualizar, dar Likes y Descargas).
- [ ] **Lectura Comunal:** Listado de Recursos (Descargas), Tablón de Anuncios y Notificaciones.
- [ ] **Feedback:** Sistema de Sugerencias / Tickets.

### Competiciones y Ranking (Lado Miembro)
- [ ] **Asistencia:** Visualización de Competiciones y flujo de Apuntarse/Desapuntarse.
- [ ] **Métricas:** Ranking Comunitario y Bitácora de pistas RSCE.

---

## 3. Funcionalidades para Staff

### Gestión de Reservas e Instalaciones
- [ ] **Configuración Base:** Gestión de Horarios / Time Slots regulares.
- [ ] **Excepciones:** Configuración de Bloqueos de Horario y días festivos.
- [ ] **Monitorización:** Info de Reservas Global (Vista del listado de asistentes del día).

### Gestión de Eventos y Competiciones
- [ ] **CRUD de Eventos:** Creación, modificación y cancelación de Competiciones.
- [ ] **Asistencia Staff:** Verificación de Asistencia (Pasar lista en entrenamientos/eventos).

### Gestión de Comunidad y Comunicación
- [ ] **Directorio:** Gestión de Miembros y generación de Enlaces de Reseteo.
- [ ] **Redacción:** Panel de control del Tablón de Anuncios (Crear/Editar comunicados).
- [ ] **Permisos:** Solicitudes y actualización de Roles.

### Gestión de Recursos y Multimedia
- [ ] **Archivos:** Administración de Recursos PDF/Documentos del club.
- [ ] **Moderación:** Administración de la Galería y Aprobación/Rechazo de Vídeos Públicos.

### Gestión Deportiva
- [ ] **Puntuación Extra:** Asignación de Puntos manuales para el Ranking y supervisión de Salud Deportiva.
