import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { SaludDeportivaComponent } from './salud-deportiva';
import { DogWorkloadService } from '../../../services/dog-workload.service';
import { DogService } from '../../../services/dog.service';
import { ToastService } from '../../../services/toast.service';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';

(window as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('SaludDeportivaComponent', () => {
  beforeAll(() => {
    if (!getTestBed().platform) {
      getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
    }
  });
  let component: SaludDeportivaComponent;
  let fixture: ComponentFixture<SaludDeportivaComponent>;
  let mockDogService: any;
  let mockWorkloadService: any;
  let mockToastService: any;

  beforeEach(async () => {
    mockDogService = {
      loadUserDogs: vi.fn().mockResolvedValue([{ id: 1, name: 'Fido' }])
    };

    mockWorkloadService = {
      getAcwrData: vi.fn().mockReturnValue(of({
        chronic_load: 100,
        acute_load: 50,
        acwr_ratio: 0.5,
        status_color: 'green'
      })),
      getPendingReviews: vi.fn().mockReturnValue(of([])),
      storeManualWorkload: vi.fn().mockReturnValue(of({})),
      updateWorkload: vi.fn().mockReturnValue(of({}))
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [SaludDeportivaComponent],
      providers: [
        { provide: DogService, useValue: mockDogService },
        { provide: DogWorkloadService, useValue: mockWorkloadService },
        { provide: ToastService, useValue: mockToastService },
        { provide: NGX_ECHARTS_CONFIG, useValue: { echarts: { init: () => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), on: vi.fn() }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SaludDeportivaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe cargar los perros del usuario al inicializar', async () => {
    // wait for promises in ngOnInit to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockDogService.loadUserDogs).toHaveBeenCalled();
    expect(component.dogs().length).toBe(1);
    expect(component.selectedDogId()).toBe(1);
    expect(mockWorkloadService.getAcwrData).toHaveBeenCalledWith(1);
  });

  it('debe enviar la carga manual y mostrar un mensaje de éxito', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
    
    component.isManualFormOpen.set(true);
    component.selectedDogId.set(1);
    component.manualDate.set('2023-10-10');
    component.manualDuration.set(45);
    component.manualIntensity.set(7);
    component.manualJumpedMaxHeight.set(false);
    component.manualNumberOfRuns.set(2);
    
    component.submitManualWorkload();

    expect(mockWorkloadService.storeManualWorkload).toHaveBeenCalledWith(1, {
      date: '2023-10-10',
      duration_min: 45,
      intensity_rpe: 7,
      activity_type: 'agility',
      jumped_max_height: false,
      number_of_runs: 2
    });
    
    expect(mockToastService.success).toHaveBeenCalledWith('Registro añadido correctamente');
    expect(component.isManualFormOpen()).toBe(false);
  });

  it('debe evitar enviar si faltan datos requeridos', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
    
    component.manualDuration.set(0); // Invalid duration -> is evaluated as falsey
    component.submitManualWorkload();

    expect(mockWorkloadService.storeManualWorkload).not.toHaveBeenCalled();
  });

  it('debe confirmar una revisión pendiente correctamente', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
    
    mockWorkloadService.confirmWorkload = vi.fn().mockReturnValue(of({}));
    component.selectedDogId.set(1);
    
    const pendingWorkload = {
      id: 10,
      dog_id: 1,
      date: '2023-10-10',
      duration_min: 15,
      intensity_rpe: 8,
      status: 'pending_review',
      jumped_max_height: false,
      number_of_runs: 1
    };
    
    component.confirmPending(pendingWorkload as any);
    
    expect(mockWorkloadService.confirmWorkload).toHaveBeenCalledWith(10, 15, 8, false, 1);
    expect(mockToastService.success).toHaveBeenCalledWith('Entrenamiento validado con éxito');
    expect(mockWorkloadService.getAcwrData).toHaveBeenCalled();
  });
});
