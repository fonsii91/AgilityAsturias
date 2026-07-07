import { vi } from 'vitest';

// canvas-confetti pinta en un <canvas> real vía requestAnimationFrame; en el
// DOM de test (jsdom) getContext() devuelve null y revienta fuera de los tests.
vi.mock('canvas-confetti', () => ({ default: Object.assign(vi.fn(), { reset: vi.fn() }) }));

// El builder @angular/build:unit-test ya inicializa el TestBed y zone.js;
// aquí solo van los polyfills que faltan en el DOM de test.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
