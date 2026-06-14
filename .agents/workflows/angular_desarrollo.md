---
description: pautas para el desarrollo de componentes en Angular Moderno (v17/v18/v21) usando Signals y Control Flow
---

# Pautas de Desarrollo en Angular Moderno (Zoneless)

Este proyecto ha sido migrado íntegramente a los estándares de **Angular 17+ / 21**. Para mantener un alto rendimiento y compatibilidad con interfaces sin Zonas (*Zoneless*), es **OBLIGATORIO** adherirse a los siguientes patrones al crear nuevas funcionalidades o refactorizar código existente:

## 1. Plantillas HTML (Control Flow Block Syntax)
**NO DEBES USAR** las antiguas directivas de `CommonModule` (`*ngIf`, `*ngFor`, `[ngSwitch]`, `*ngSwitchCase`). Usa exclusivamente la nueva sintaxis de control de flujo integrada en el motor de Angular:

### ❌ Incorrecto (Código Legacy)
```html
<div *ngIf="isLoggedIn">...</div>

<div *ngFor="let item of items; let i = index">
  {{ i }} - {{ item.name }}
</div>

<div [ngSwitch]="status">
  <div *ngSwitchCase="'A'">A</div>
  <div *ngSwitchDefault>B</div>
</div>
```

### ✅ Correcto (Angular Moderno)
```html
@if (isLoggedIn) {
  <div>...</div>
} @else {
  <div>...</div>
}

@for (item of items(); track item.id; let i = $index) {
  <div>{{ i }} - {{ item.name }}</div>
} @empty {
  <div>No hay elementos</div>
}

@switch (status()) {
  @case ('A') { <div>A</div> }
  @default { <div>B</div> }
}
```

## 2. Reactividad y Gestión de Estado (Signals)
**NO DEBES USAR** los antiguos decoradores `@Input()`, `@Output()` ni referencias variables crudas para colecciones de datos asíncronos si se necesita repintado dinámico. Todo el estado atómico del componente debe depender de la API reactiva de `Signals` de `@angular/core`.

### ✅ Declaración de Variables de Estado
- Usa `signal<T>(initialValue)` para estados mutables.
```typescript
import { signal, computed } from '@angular/core';

// En lugar de: items: Item[] = [];
items = signal<Item[]>([]);
isLoading = signal<boolean>(false);

// Propiedades derivadas
totalItems = computed(() => this.items().length);
```

### ✅ Inputs, Outputs y Variables del DOM
```typescript
import { input, output, viewChild } from '@angular/core';

// En lugar de: @Input() title!: string;
title = input.required<string>();

// En lugar de: @Output() saved = new EventEmitter<void>();
saved = output<void>();

// En lugar de: @ViewChild('miCanvas') canvas!: ElementRef;
canvas = viewChild<ElementRef>('miCanvas');
```

## 3. Consideraciones de Red y Renderizado
Dado que hemos purgado `zone.js`, las llamadas a `HttpClient` u otros asincronismos no forzarán una recarga mágica de la pantalla.  
Al recibir los datos en un `subscribe`, simplemente inyéctalo a tu signal invocando su mutación, y Angular sabrá exactamente qué repintar:
```typescript
this.http.get<Item[]>('/api/items').subscribe({
    next: (data) => this.items.set(data)
});
```

**Si no sigues estas pautas, Angular fallará en repintar la vista tras resoluciones asíncronas.** ¡Piensa siempre en "Zoneless"!

## 4. Arquitectura White-Label (Multi-tenant)
El proyecto ha sido preparado para servir a múltiples clubes cambiando únicamente el archivo de entorno. **NUNCA HARDCODEES** detalles de identidad visual en los componentes de Angular recién creados o al modificar los existentes.

### Reglas para Estilos y Textos (Branding):
1.  **Textos e Imágenes**: Importa y utiliza `environment.clubConfig` para inyectar dinámicamente nombres de clubes (`clubConfig.name`), logos (`clubConfig.logoPath`), y redes sociales. No escribas explícitamente "Agility Asturias" en el HTML.
2.  **Lógica de Estilos**: Usa las variables nativas CSS inyectadas globalmente (`var(--primary-blue)`, `var(--accent-orange)`) introducidas por el `app.component`. **No utilices estilos inline con colores fijos** ni intentes reimplementar colores fuera de estas variables, ya que el theme cambiará según el entorno del club montado.
