---
name: testing workflow
description: Workflow para testing de funcionalidades de la app.
---


# Workflow de Testing Premium (Full-Stack)

Este workflow define el proceso estándar y automatizado para crear pruebas unitarias, funcionales y End-to-End (E2E) para el ecosistema ClubAgility.

## 🎯 Objetivo
El usuario proporcionará el nombre de una **funcionalidad** (ej. "Gestión de Reservas"). El objetivo de la IA es generar pruebas robustas, que validen el comportamiento de negocio y no detalles de implementación, utilizando herramientas modernas (Pest, Vitest/Testing Library, Playwright).

---

## 🛠️ Stack y Herramientas a Utilizar

1. **Backend (Laravel 12)**: `Pest PHP` para Feature Tests y Unit Tests.
2. **Frontend (Angular 21)**: `Vitest` + `Angular TestBed` (nativo) para componentes y servicios (especialmente aquellos con Signals).
3. **E2E (Global)**: `Playwright` para flujos críticos en el navegador.

---

## 📋 Pasos del Flujo de Trabajo

### Fase 1: Análisis de la Funcionalidad
1. Comprender qué archivos están involucrados en la funcionalidad solicitada (Controladores, Modelos, Componentes de UI, Servicios).
2. Trazar mentalmente el "Happy Path" (flujo ideal) y 1-2 casos de error principales (ej. Validación fallida, sin permisos).

### Fase 2: Pruebas de Backend (Pest PHP)
1. **Ubicación**: Crea o modifica archivos en `agility_back/tests/Feature/...` o `agility_back/tests/Unit/...`.
2. **Convenciones**:
   - Usa la sintaxis de Pest con formato de historia: `it('permite a un administrador crear un horario', function () { ... });`
   - Para tests de base de datos, asegúrate de importar `uses(RefreshDatabase::class);`.
   - Prioriza hacer peticiones HTTP (`$this->postJson(...)`, `$this->getJson(...)`) y verificar la respuesta y la base de datos (`$this->assertDatabaseHas(...)`).
   - Usa los *Factories* del sistema para generar la data necesaria.

### Fase 3: Pruebas de Frontend (Angular + Vitest + TestBed)
1. **Ubicación**: Crea archivos `.spec.ts` junto al componente o servicio en `frontend/src/...`.
2. **Convenciones de Servicios**: 
   - Usa `HttpTestingController` para mockear peticiones al backend.
   - Verifica que los `Signals` se actualicen correctamente con las respuestas.
3. **Convenciones de Componentes**:
   - Usa preferentemente **`TestBed` nativo de Angular** si el componente depende fuertemente de `Signals` o `effect()`, ya que ofrece mejor control del ciclo de vida y previene conflictos con `zone.js`.
   - Interactúa con el DOM inyectando servicios mockeados (`vitest.fn()`).
   - Evita probar métodos privados o inyecciones de dependencias internas; prueba lo que se renderiza.

### Fase 4: Pruebas End-to-End (Playwright) - *Solo si la funcionalidad es crítica*
1. **Ubicación**: Dentro del directorio `frontend/e2e/tests/` y usando `frontend/e2e/pages/` para el patrón Page Object Model.
2. **Convenciones**:
   - Ejecuta las pruebas **contra el entorno local de Laravel Herd** (o el servidor de desarrollo activo) para mantener la agilidad.
   - **¡CUIDADO CON LOS DATOS!**: Al usar el entorno de desarrollo, NO utilices `migrate:fresh` ni resets de base de datos masivos en Playwright. Crea usuarios/entidades de prueba específicos y límpialos al terminar.
   - Escribe un script de Playwright que navegue por la app y realice todo el flujo. Usa selectores resilientes (por rol o texto).

### Fase 5: Reporte Final
1. Finalizar entregando un resumen de los archivos creados.
2. Proporcionar al usuario el comando exacto para ejecutar las pruebas en su consola (ej. `php artisan test` o `npm run test`).

### Fase 6: Actualización del Registro (¡CRÍTICO!)
1. Una vez que las pruebas estén escritas y funcionales, **abre el archivo `testing_registry.md`**.
2. Añade una nueva entrada detallando la funcionalidad que acabas de probar, marcando las capas cubiertas (Backend/Frontend/E2E) y los archivos creados.
3. Finalmente, abre el archivo `funcionalidades_testing.md` (o la ruta donde se encuentre) y marca con una `[x]` la casilla correspondiente a la funcionalidad que acabas de terminar.

---

## 🚨 Reglas de Oro (Premium SaaS)
1. **No pruebes el framework**: No pruebes si Laravel guarda en base de datos correctamente, prueba si *nuestra lógica* le pide a Laravel que lo haga en el contexto adecuado.
2. **Mocks Estrictos para APIs Externas**: NUNCA llames a servicios reales de terceros en las pruebas (AWS S3, Stripe, Emails). Utiliza siempre `Http::fake()` en Laravel o simuladores en Angular.
3. **Estado Limpio (Zero Leakage)**: Asegúrate de que una prueba no contamine a la siguiente. Usa `RefreshDatabase` en backend, y en frontend limpia variables locales (ej. `localStorage.clear()`) si interactúas con ellas.
4. **Resiliencia en Selectores UI**: En el frontend, no selecciones elementos por clases CSS rígidas. Busca por texto visible para el usuario o roles ARIA.
5. **Multitenant Awareness**: Recuerda que estamos en un entorno SaaS (`ClubAgility`). Muchos tests requerirán simular un Tenant (Club) específico. Asegúrate de configurar ese contexto en tus tests antes de la ejecución.
