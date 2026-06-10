# Planes SaaS ClubAgility

Este documento detalla los distintos planes de suscripción (SaaS) ofrecidos para la plataforma ClubAgility, diseñados para adaptarse a diferentes tamaños y necesidades de los clubes.

## 1. Plan Básico
**Ideal para clubes pequeños que están empezando.**

- **Precio:** 29€ / mes 
- **Características Incluidas:**
  - Subdominio propio de la plataforma (ej: `tuclub.clubagility.com`)
  - Página web pública (Bienvenida, galería y contacto).
  - Gestión de reservas.
  - Calendario y asistencia a eventos.
  - Clasificación interna del club.
  - Registro y documentación del perro.
  - Alertas de renovación de documentación.
  - Tablón de anuncios.
- **Limitaciones:**
  - *No incluye* Módulo de Salud Deportiva (ACWR).

## 2. Plan Pro (Más Popular)
**Todo lo que necesitas para digitalizar tu club al 100%.**

- **Precio:** 19€ / mes (Oferta de lanzamiento durante los primeros 2 meses, después 49€ / mes).
- **Características Incluidas:**
  - **Todo lo incluido en el Plan Básico**
  - Página de bienvenida personalizada
  - Módulo de Salud Deportiva.
  - Módulo de Seguimiento Canina (RSCE).
  - Módulo de Seguimiento Caza (RFEC).
  - Acceso a recursos.
  - **Galería de vídeos: 200GB** (incluye 100GB extra como regalo de bienvenida).

## 3. Plan Élite
**Para clubes de alto rendimiento y organizadores de grandes eventos.**

- **Precio:** 79€ / mes 
- **Características Incluidas:**
  - **Todo lo incluido en el Plan Pro.**
  - Dominio web propio y personalizado (ej: `tuclub.com` en lugar de `tuclub.clubagility.com`).
  - Galería de vídeos (con capacidad de almacenamiento de 1TB).

---

> [!NOTE] Cuota de la Galería de Fotos (implementada)
> La galería de fotos interna (ver [[galeria-fotos]]) añade una cuota de almacenamiento de fotos por plan, ya implementada en el campo `photo_storage_limit_gb` de la tabla `plans`: **Básico 5 GB · Pro 25 GB · Élite 100 GB**.

---
*Garantía: Todos los planes incluyen una garantía de devolución del dinero de 30 días, pudiendo cancelar en cualquier momento.*

## Control de Suscripción Automatizado
El estado del plan contratado por cada club se sincroniza y valida en tiempo real mediante nuestra integración de pasarela de pagos con **Stripe**. 

*   **Pago Obligatorio:** No se ofrecen periodos de prueba gratuitos. Para activar la cuenta del club en la plataforma, se requiere la contratación del plan y el registro de la tarjeta de pago de forma inmediata.
*   **Gestión de Planes:** La actualización, modificación o cancelación de los planes se realiza a través de la sección de Facturación de la aplicación (que delega de forma segura en el Stripe Customer Portal).
*   **Control de Acceso:** En caso de impago o cancelación definitiva de la suscripción, se suspende automáticamente el acceso a la plataforma según la lógica técnica detallada en [[suscripciones-stripe]].

