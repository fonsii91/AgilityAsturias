# Arquitectura Multi-Tenant (Multi-Club)

Este documento describe la arquitectura técnica implementada en **Club Agility** para soportar múltiples clubes en una única instancia de base de datos y servidor (arquitectura *Single Database, Multi-Tenant*).

## Concepto General

El sistema permite que distintos clubes deportivos utilicen la plataforma compartiendo el código fuente y la base de datos, pero garantizando el **aislamiento total de la información**. Un usuario de un club no puede ver ni interactuar con los datos (perros, reservas, socios) de otro club, salvo que sea un usuario con rol de Administrador Global (`admin`).

El acceso a cada club se determina mediante **subdominios** (ej. `clubnorte.clubagility.com`).

---

## 1. Identificación del Tenant (Frontend)

El aislamiento comienza en el navegador del usuario:

*   **Detección por URL:** Angular (`TenantService`) analiza el `window.location.hostname`. Si detecta un subdominio válido (por ejemplo, `patitas` en `patitas.localhost` o `patitas.clubagility.com`), lo establece como el "slug" del club activo.
*   **Solicitud Inicial:** Antes de arrancar la aplicación completa, el frontend envía una petición a `/api/tenant/info` con el slug detectado para obtener la configuración básica del club (nombre, logotipo, colores corporativos). Esta petición se hace con `fetch` nativo para evitar dependencias circulares con el sistema de autenticación de Angular.
*   **Theming Dinámico:** Los colores recibidos (`primary_color`, `accent_color`) se inyectan como variables CSS globales (`--primary-color`), personalizando la interfaz visual instantáneamente.
*   **Interceptor de Red:** Todas las peticiones HTTP subsiguientes realizadas desde Angular inyectan la cabecera `X-Club-Slug: {slug}` mediante el `AuthInterceptor`.

---

## 2. Arquitectura de Navegación y Landing Pages

Dentro de esta arquitectura, es crítico diferenciar entre los dos tipos de "Landing Pages" (páginas de inicio) que existen, ya que su contexto y finalidad varían drásticamente dependiendo de si hay o no un Tenant (club) detectado en la URL.

### A. Landing del Servicio Core (SaaS)
*   **Componente asociado:** `ClubagilityComponent` (inyectado en el `app.html` base).
*   **Contexto de Acceso:** Se muestra **únicamente** cuando se entra al dominio principal sin subdominio (ej. `clubagility.com`).
*   **Objetivo y Uso:** Es la página comercial que representa a nuestro servicio como creadores de la plataforma. Explica a qué nos dedicamos (desarrollo y gestión de apps para clubes de agility) y promueve nuestro producto "Gestiona tu Club como un profesional".
*   **Estado de la App:** En este punto, no hay colores de club cargados, no hay datos aislados y el menú lateral (`sidenav`) queda oculto o restringido.

### B. Landing de cada Club (Apartado de "Bienvenida" o Home)
*   **Componente asociado:** `HomeComponent` (mapeado a la ruta raíz `/` en `app.routes.ts` cuando hay un subdominio detectado).
*   **Contexto de Acceso:** Aparece tan pronto como un usuario entra a través de un subdominio válido (ej. `patitas.clubagility.com`) o su propio dominio en caso de que lo tengamos configurado (ej. `agilityasturias.com`).
*   **Objetivo y Uso:** Es la carta de presentación del club en sí. Muestra el nombre del club deportivo, su logotipo, colores corporativos (aplicados dinámicamente mediante variables CSS globales como `--primary-color`), su lema (`slogan`), fotos (hero image), y botones para interactuar directamente con ese club (ver galería, contacto, vídeos públicos).
*   **Estado de la App:** El Tenant está 100% instanciado. Cualquier inicio de sesión (Login) desde esta página aplicará el filtrado de base de datos para restringir todo el contenido (reservas, socios, perros) únicamente a ese club.

---

## 3. Aislamiento en la Base de Datos (Backend)

La base de datos se ha rediseñado para que prácticamente todas las tablas (`users`, `dogs`, `reservations`, `announcements`, etc.) contengan una columna `club_id` que actúa como la llave de aislamiento.

### Middleware de Entrada (`TenantMiddleware`)
1.  Intercepta cada petición API y lee la cabecera `X-Club-Slug`.
2.  Busca el club en la base de datos.
3.  Si existe, guarda su ID en el contenedor de dependencias de Laravel: `app()->instance('active_club_id', $club->id)`.
4.  **Barrera de Seguridad:** Si un usuario está autenticado (tiene token Sanctum) pero su `club_id` no coincide con el del subdominio actual (y no tiene rol `admin`), la petición es rechazada inmediatamente con un error **403 Forbidden**.

### Trait `HasClub`
Para evitar tener que añadir el filtro `WHERE club_id = ?` manualmente en cada consulta, se ha creado el trait `HasClub`. Este trait debe ser utilizado por **cualquier modelo Eloquent** que deba estar aislado.

Hace dos cosas fundamentales:
*   **Al crear un registro (`creating` event):** Si no se le pasa un `club_id` explícitamente, se lo asigna automáticamente tomando el `club_id` del usuario autenticado o, en su defecto, el `active_club_id` del subdominio.
*   **Al consultar registros (`TenantScope`):** Aplica un *Global Scope* a todas las consultas `SELECT`, `UPDATE` y `DELETE`.

### El Motor de Filtrado (`TenantScope`)
Este es el corazón de la arquitectura multi-tenant:

```php
public function apply(Builder $builder, Model $model): void
{
    if (auth()->hasUser()) {
        if (auth()->user()->role !== 'admin') {
            // Usuario normal: Solo ve los datos de SU propio club.
            $builder->where($model->getTable() . '.club_id', auth()->user()->club_id);
        } else {
            // Admin: Puede ver "a través" de los clubes.
            // Si está navegando en un subdominio específico, se le filtran solo esos datos.
            if (app()->bound('active_club_id')) {
                $builder->where($model->getTable() . '.club_id', app('active_club_id'));
            }
            // Si NO hay subdominio (ej. panel general), ve TODO.
        }
    } elseif (app()->bound('active_club_id')) {
        // Peticiones públicas (como Login o Galería Pública)
        // Se filtran los datos basándose exclusivamente en el subdominio desde el que se accede.
        $builder->where($model->getTable() . '.club_id', app('active_club_id'));
    }
}
```

---

## 4. Seguridad en el Inicio de Sesión

Gracias a que el modelo `User` también implementa el trait `HasClub`, el proceso de inicio de sesión es hermético.

Cuando un usuario intenta hacer login desde `patitas.localhost`, el sistema no busca su correo en toda la base de datos. El `TenantScope` intercepta la consulta y la transforma en:
`SELECT * FROM users WHERE email = ? AND club_id = 2`

Esto significa que es **imposible** que un usuario de "Agility Asturias" (ID 1) inicie sesión en "Club Patitas" (ID 2), garantizando una experiencia de usuario donde cada club percibe el software como si fuera una instalación totalmente independiente.

---

## 5. Gestión Global (Administrador)

Para gestionar la plataforma SaaS, el rol `admin` actúa de forma especial:
*   El Middleware de validación de roles (`RoleMiddleware`) ha sido adaptado para que los administradores pasen las validaciones de las distintas rutas, garantizando que un `admin` nunca se quede "encerrado" fuera de módulos operativos.
*   Existe un CRUD protegido (Accesible solo por `admin`) para la gestión, creación, modificación de slugs y colores de todos los clubes de la plataforma.
