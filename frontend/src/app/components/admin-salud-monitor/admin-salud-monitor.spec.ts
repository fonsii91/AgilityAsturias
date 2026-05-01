import { TestBed } from '@angular/core/testing';
import { AdminSaludMonitorComponent } from './admin-salud-monitor';
import { DogWorkloadService } from '../../services/dog-workload.service';
import { ToastService } from '../../services/toast.service';
import { of, throwError } from 'rxjs';
import { AdminWorkloadStats } from '../../models/dog-workload.model';
import { vi } from 'vitest';

describe('AdminSaludMonitorComponent', () => {
  let mockWorkloadService: any;
  let mockToastService: any;

  const mockStats: AdminWorkloadStats[] = [
    {
      user_id: 1,
      name: 'User 1',
      email: 'user1@test.com',
      total_workloads: 5,
      manual_workloads: 2,
      auto_workloads: 3,
      dogs_list: ['Fido', 'Rex']
    }
  ];

  beforeEach(() => {
    mockWorkloadService = {
      getAdminMonitorData: vi.fn().mockReturnValue(of(mockStats))
    };

    mockToastService = {
      error: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DogWorkloadService, useValue: mockWorkloadService },
        { provide: ToastService, useValue: mockToastService },
        AdminSaludMonitorComponent
      ]
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create and load stats on init', () => {
    TestBed.runInInjectionContext(() => {
      const component = new AdminSaludMonitorComponent();
      expect(component).toBeTruthy();
      
      component.ngOnInit();
      
      expect(mockWorkloadService.getAdminMonitorData).toHaveBeenCalled();
      expect(component.stats()).toEqual(mockStats);
      expect(component.isLoading()).toBe(false);
    });
  });

  it('should handle error when loading stats', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockWorkloadService.getAdminMonitorData.mockReturnValueOnce(throwError(() => new Error('Net Error')));

    TestBed.runInInjectionContext(() => {
      const component = new AdminSaludMonitorComponent();
      
      component.ngOnInit();

      expect(mockToastService.error).toHaveBeenCalledWith('Error al cargar las estadísticas del monitor de salud.');
      expect(component.isLoading()).toBe(false);
      expect(component.stats()).toEqual([]);
    });
    
    consoleSpy.mockRestore();
  });
});
