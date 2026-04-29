import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { WorkloadGaugeComponent } from './workload-gauge';
import { AcwrData } from '../../../../models/dog-workload.model';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { ComponentRef } from '@angular/core';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';

(window as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('WorkloadGaugeComponent', () => {
  beforeAll(() => {
    if (!getTestBed().platform) {
      getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
    }
  });

  let component: WorkloadGaugeComponent;
  let fixture: ComponentFixture<WorkloadGaugeComponent>;
  let componentRef: ComponentRef<WorkloadGaugeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkloadGaugeComponent],
      providers: [
        { provide: NGX_ECHARTS_CONFIG, useValue: { echarts: { init: () => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), on: vi.fn() }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkloadGaugeComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    
    // Default valid state
    componentRef.setInput('acwrData', {
      acwr: 1.0,
      acute_load: 100,
      chronic_load: 100,
      calibration_days: 30, // Phase 3 (Gold)
      yellow_threshold: 1.3,
      red_threshold: 1.5,
      is_calibrating: false,
      status_color: 'green'
    } as AcwrData);
    
    fixture.detectChanges();
  });

  it('debe calcular el estado óptimo correctamente en Fase 3', () => {
    expect(component.statusText).toBe('✅ ZONA ÓPTIMA (SWEET SPOT)');
    expect(component.confidenceText).toBe('Fiabilidad: Alta (Gold Standard)');
  });

  it('debe advertir sobre sobrecarga aguda (Zona de Fatiga)', () => {
    componentRef.setInput('acwrData', {
      acwr: 1.4,
      calibration_days: 30,
      yellow_threshold: 1.3,
      red_threshold: 1.5
    } as AcwrData);
    fixture.detectChanges();
    expect(component.statusText).toBe('⚠️ ZONA DE FATIGA');
  });

  it('debe mostrar la fase de calibración si faltan datos', () => {
    componentRef.setInput('acwrData', {
      acwr: 0,
      calibration_days: 5, // Phase 1
      yellow_threshold: 1.3,
      red_threshold: 1.5
    } as AcwrData);
    fixture.detectChanges();
    expect(component.statusText).toBe('🔬 FASE DE CALIBRACIÓN');
    expect(component.confidenceText).toBe('Fiabilidad: Baja (Calibrando)');
  });
});
