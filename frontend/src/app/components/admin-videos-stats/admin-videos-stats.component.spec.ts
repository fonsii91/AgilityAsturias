import { AdminVideosStatsComponent } from './admin-videos-stats.component';
import { VideoService } from '../../services/video.service';
import { ToastService } from '../../services/toast.service';
import { of, throwError } from 'rxjs';
import { Injector, runInInjectionContext } from '@angular/core';

describe('AdminVideosStatsComponent', () => {
  let component: AdminVideosStatsComponent;
  let mockVideoService: any;
  let mockToastService: any;

  beforeEach(() => {
    mockVideoService = {
      getAdminVideoStats: vi.fn().mockReturnValue(of({
        counts: { local: 10, in_queue: 2, on_youtube: 5, failed: 1, total: 18 },
        failed_videos: [{ id: 1, title: 'Video Fail', youtube_error: 'Error' }]
      })),
      getAdminDailyVideoStats: vi.fn().mockReturnValue(of([
        { date: '2023-10-01', local_count: 5, youtube_count: 5 }
      ])),
      retryVideoUpload: vi.fn().mockReturnValue(of({ message: 'Success' }))
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    const injector = Injector.create({
      providers: [
        { provide: VideoService, useValue: mockVideoService },
        { provide: ToastService, useValue: mockToastService }
      ]
    });

    runInInjectionContext(injector, () => {
      component = new AdminVideosStatsComponent(
        injector.get(VideoService),
        injector.get(ToastService)
      );
    });
  });

  it('should create and load stats on init', () => {
    component.ngOnInit();
    expect(component).toBeTruthy();
    expect(mockVideoService.getAdminVideoStats).toHaveBeenCalled();
    expect(mockVideoService.getAdminDailyVideoStats).toHaveBeenCalled();

    expect(component.stats()).toBeTruthy();
    expect(component.dailyHistory()).toHaveLength(1);
    expect(component.loading()).toBe(false);
  });

  it('should handle error when loading stats', () => {
    mockVideoService.getAdminVideoStats.mockReturnValueOnce(throwError(() => new Error('Error')));
    
    component.ngOnInit();
    
    expect(mockToastService.error).toHaveBeenCalledWith('Error al cargar las estadísticas de los vídeos.');
    expect(component.loading()).toBe(false);
  });

  it('should call retryUpload and reload stats on success', () => {
    component.ngOnInit();
    
    // Clear calls from init
    mockVideoService.getAdminVideoStats.mockClear();

    component.retryUpload({ id: 1 });
    
    expect(mockVideoService.retryVideoUpload).toHaveBeenCalledWith(1);
    expect(mockToastService.success).toHaveBeenCalledWith('Vídeo encolado nuevamente para subir.');
    expect(mockVideoService.getAdminVideoStats).toHaveBeenCalled();
  });

  it('should show error toast if retryUpload fails', () => {
    component.ngOnInit();
    
    mockVideoService.retryVideoUpload.mockReturnValueOnce(throwError(() => new Error('Error')));
    
    component.retryUpload({ id: 1 });
    
    expect(mockVideoService.retryVideoUpload).toHaveBeenCalledWith(1);
    expect(mockToastService.error).toHaveBeenCalledWith('Error al reintentar subir el vídeo.');
  });
});
