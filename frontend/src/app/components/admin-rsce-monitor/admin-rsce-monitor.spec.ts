import { AdminRsceMonitorComponent } from './admin-rsce-monitor';
import { RsceTrackService } from '../../services/rsce-track.service';
import { ToastService } from '../../services/toast.service';
import { of, throwError } from 'rxjs';
import { AdminRsceStats } from '../../models/rsce-track.model';
import { runInInjectionContext, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

describe('AdminRsceMonitorComponent', () => {
  let component: AdminRsceMonitorComponent;
  let mockRsceService: any;
  let mockToastService: any;

  beforeEach(() => {
    mockRsceService = {
      getAdminMonitorData: vi.fn()
    };

    mockToastService = {
      error: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: RsceTrackService, useValue: mockRsceService },
        { provide: ToastService, useValue: mockToastService }
      ]
    });
  });

  it('should create and load data on init', () => {
    const mockData: AdminRsceStats[] = [
      {
        user_id: 1,
        name: 'User One',
        email: 'user@test.com',
        total_tracks: 5,
        dogs_list: ['Dog A', 'Dog B']
      }
    ];

    mockRsceService.getAdminMonitorData.mockReturnValue(of(mockData));

    runInInjectionContext(TestBed.inject(Injector), () => {
      component = new AdminRsceMonitorComponent();
      component.ngOnInit();
    });

    expect(component).toBeTruthy();
    expect(mockRsceService.getAdminMonitorData).toHaveBeenCalled();
    expect(component.stats()).toEqual(mockData);
    expect(component.isLoading()).toBe(false);
  });

  it('should handle error when loading data fails', () => {
    mockRsceService.getAdminMonitorData.mockReturnValue(throwError(() => new Error('API Error')));

    runInInjectionContext(TestBed.inject(Injector), () => {
      component = new AdminRsceMonitorComponent();
      component.ngOnInit();
    });

    expect(mockRsceService.getAdminMonitorData).toHaveBeenCalled();
    expect(mockToastService.error).toHaveBeenCalledWith('Error al cargar las estadísticas del monitor RSCE.');
    expect(component.stats()).toEqual([]);
    expect(component.isLoading()).toBe(false);
  });
});

