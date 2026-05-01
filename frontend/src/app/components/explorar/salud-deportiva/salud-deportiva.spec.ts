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

});
