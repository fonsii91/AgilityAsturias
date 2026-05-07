# Estrategias UX/UI: Onboarding y Estados Vacíos

Este documento detalla las estrategias de experiencia de usuario (UX) y diseño de interfaz (UI) para mitigar el problema del "Cold Start" o "Efecto Ciudad Fantasma" en Club Agility. Este efecto ocurre cuando un usuario accede por primera vez a la plataforma y se encuentra con módulos vacíos, lo que puede generar frustración y abandono.

Las estrategias adoptadas se centran en guiar al usuario desde el primer momento y transformar los espacios vacíos en oportunidades de interacción.

---

## Estrategia 1: Dashboard de Bienvenida (Setup Checklist)

En lugar de mostrar un panel de resumen genérico y vacío, el primer inicio de sesión de un usuario presentará un **Dashboard de Bienvenida con un Checklist de Configuración**. Este panel estará adaptado a los permisos y responsabilidades del rol del usuario, guiándolo mediante "pequeñas victorias" para que descubra el valor de la plataforma rápidamente.

### Progresión de los Tutoriales (Flujo en Cascada)
Para garantizar que los usuarios con mayores privilegios dominen todas las áreas de la aplicación, los checklists se encadenan de forma secuencial:
*   **Gestores:** Comienzan con el tutorial de *Gestor*. Al finalizarlo, se activará el de *Staff*, y tras este, completarán el de *Miembro*.
*   **Staff:** Comienzan con el tutorial de *Staff* y, al terminar, continúan con el de *Miembro*.
*   **Miembros:** Únicamente completan el tutorial de *Miembro*.

### A. Dashboard para Gestores (Directiva / Administrador del Club)
El Gestor es el responsable de inicializar el entorno del club. Su checklist debe centrarse en la configuración base y en abrir las puertas al resto del equipo.

*   **Paso 1: Personaliza tu Club.** (Desde configurar club sube el logotipo, el eslogan, las imagenes principales y define los colores corporativos).
*   **Paso 2: Configura el Horario Base.** (Desde Gestión de horarios, establece las franjas horarias de las clases semanales, crea al menos una clase de prueba para que los usuarios puedan inscribirse).
*   **Paso 3: Añade a tu Equipo.** (Desde Gestión de Miembros, genera enlaces de invitación y acepta a los nuevos miembros dandoles un rol de miembro o staff).
*   **Paso 4: Inaugura la Galería.** (Desde Galería sube una foto a la galería pública o elimina una de las que vienen por defecto).

### B. Dashboard para Staff (Entrenadores / Monitores)
El Staff se encarga de dinamizar la actividad diaria y deportiva del club. Su onboarding asume que el club ya está configurado estéticamente.

*   **Paso 1: Añade un perro a tu manada.** Desde "Mis perros" podrás gestionar la información cada uno tus perros.
*   **Paso 2: Crea o modifica una clase del horario base.** (Modifica la hora, el nombre o las plazas disponibles en la clase y mira como cambia desde el apartado de reservas).
*   **Paso 3: Crea tu primer evento.** (Crea una competición o evento de prueba, solo es obligatoria la federación, el nombre y la fecha de inicio).
*   **Paso 4: Crea tu primer anuncio.** (Desde el tablón de anuncios puedes publicar noticias o informaciones relevantes para los miembros del club, crea un saludo para darles la bienvenida, puedes decicir si quieres que les llegue una alerta de notificación)*   
**Paso 5: Sistema de puntos.** (Desde verificar asistencia te aparecerán la lista de miembros que han asistido a las clases o competiciones y podras asignar puntos por asistencia) (esos puntos se usarán para la clasificación del club) 
*   **Paso 6: Dar puntos extra.** (Puedes dar puntos desde Puntos Extra, estos puntos se sumarán a la clasificación del club)


### C. Dashboard para Miembros (Socios)
El Miembro busca gestionar su actividad personal y la de sus perros. Su checklist debe enfocarse en la creación de su perfil deportivo.

*   **Paso 1: Añade a tu Compañero.** (Registra el perfil de tu primer perro: nombre, raza, fecha de nacimiento).
*   **Paso 2: Apuntarte a una clase desde reservas.** (Apuntate a una clase que haya creada por el club desde el apartado de reservas).
*   **Paso 3: Apuntate a un evento o competición.** (Desde el calendario, abre un evento y apuntate en la pestaña de asistencia).
*   **Paso 4: Revisa el tablón de anuncios.** (Desde el tablón de anuncios podrás ver las noticias o informaciones relevantes para los miembros del club)
*   **Paso 5: Revisa la clasificación del club.** (Desde el apartado de clasificación podrás ver la clasificación del club, obtendrás puntos al asistir a entrenamientos y eventos, aunque también puedes conseguir puntos extra).
*   **Paso 6: Visita tu perfil y el de tus perros.** (Cuando vayas completando tu perfil y el de tus perros, irás desbloqueando nuevas funcionalidades).
*   **Paso 7: Consulta las instrucciones desde cualquier pantalla.** (En todas las secciones aparecerá un icono de instrucciones que puedes consultar para ver como funciona esa sección consulta un apartado de inestrucciones para finalizar)

> **Nota UI:** El checklist debe contar con indicadores visuales de progreso (ej. barra de completado) y ofrecer refuerzo positivo (animaciones o mensajes de felicitación) al completar cada tarea.

### D. Patrón UI Recomendado: Widget Flotante Global (Global Popover)
El checklist de onboarding se implementará utilizando un patrón de **Widget Flotante Global**.

*   **Ubicación y Comportamiento:** Un botón flotante (FAB - Floating Action Button) fijado en la esquina inferior derecha de la pantalla, persistente en toda la aplicación.
*   **Estados del Widget:**
    *   *Minimizado:* Muestra un indicador circular de progreso discreto (ej. "1/4" tareas completadas o un gráfico de anillo).
    *   *Expandido:* Al hacer clic, despliega un *popover* o panel flotante inferior con la lista interactiva de tareas del checklist.
*   **Persistencia y Contexto:** La gran ventaja de este enfoque es que el widget acompaña al usuario durante su navegación. Si el gestor hace clic en "Personaliza tu Club" desde el checklist, será redirigido a la página de Ajustes, pero el widget flotante seguirá a la vista. Esto le permite completar la acción sin olvidar qué paso del tutorial estaba realizando.
*   **Finalización:** Una vez alcanzado el 100%, el widget mostrará una pequeña animación de celebración (ej. confeti) y se ocultará permanentemente, dando por concluido el proceso de onboarding.

---

## Estrategia 2: Diseño de "Empty States" (Estados Vacíos) Inteligentes

Ninguna sección de la aplicación debe mostrar tablas vacías, calendarios en blanco o mensajes crípticos como "No hay resultados". Cada módulo sin datos aplicará la regla del estado vacío inteligente: **Imagen + Explicación + Llamada a la Acción (CTA)**.

### Estructura de un Empty State
1.  **Visual:** Una ilustración amigable, limpia y alineada con los colores corporativos del club que represente la funcionalidad de esa sección (ej. un perro saltando, un calendario, un megáfono).
2.  **Mensaje Contextual:** Un texto breve que explique qué debería haber en ese espacio y el valor que aporta. El texto debe estar adaptado al rol (el Staff lee sobre *gestionar*, el Miembro sobre *participar*).
3.  **Llamada a la Acción (CTA):** Un botón primario, grande y claro que permita al usuario crear el primer registro directamente desde esa pantalla, sin tener que buscar en menús.

### Ejemplos Prácticos por Módulo

*   **Módulo de Competiciones (Vista Staff/Gestor):**
    *   *Ilustración:* Podio o escarapela.
    *   *Texto:* "Aún no hay eventos programados en el calendario. Planifica tu primera competición para abrir las inscripciones."
    *   *CTA:* `[ + Crear nueva Competición ]`

*   **Módulo de "Mis Perros" (Vista Miembro):**
    *   *Ilustración:* Silueta de un perro con su guía.
    *   *Texto:* "Tu manada está vacía. Registra a tu perro para empezar a llevar un seguimiento de sus entrenamientos y salud."
    *   *CTA:* `[ Añadir mi primer Perro ]`

*   **Tablón de Anuncios:**
    *   *Ilustración:* Megáfono o tablón de corcho limpio.
    *   *Texto (Staff):* "El tablón está en silencio. Publica una circular o aviso importante para informar a todos los socios."
    *   *CTA (Staff):* `[ Redactar Anuncio ]`
    *   *Texto (Miembro):* "El club no ha publicado avisos recientes. ¡Todo está en orden!" (Sin CTA de creación).

### Consideraciones Técnicas y de Diseño (Multi-Tenant)

*   **Componentización:** Se desarrollará un componente reutilizable en Angular (ej. `<app-empty-state>`) que reciba por `@Input` los textos, el icono o imagen a mostrar, y emita un evento para el botón de acción, estandarizando así la experiencia en toda la plataforma.
*   **Theming Dinámico (Paleta de Colores):** Para el diseño de todas estas estrategias (iconos de los Empty States, botones de CTA, barra de progreso del Widget Flotante, confeti de celebración, etc.), es **imperativo** utilizar las variables CSS globales inyectadas por el sistema (ej. `var(--primary-color)`). Los colores de la paleta de cada club se obtienen de la base de datos en tiempo de ejecución al iniciar el tenant, por lo que no se deben utilizar colores "hardcodeados" (fijos) en las hojas de estilo de estos componentes para garantizar que la UI se adapte instantáneamente a la identidad corporativa del club activo.
*   **Iconografía Consistente:** Para todos los elementos visuales interactivos (como los pasos del checklist) y representativos (como los *Empty States*), se debe priorizar el uso de iconos de **Angular Material** (`<mat-icon>`) o ilustraciones en formato SVG, evitando por completo el uso de emojis en la interfaz para mantener un acabado profesional y uniforme.
