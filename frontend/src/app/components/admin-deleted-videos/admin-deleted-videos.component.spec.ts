import { AdminDeletedVideosComponent } from './admin-deleted-videos.component';
import { VideoService } from '../../services/video.service';
import { of, throwError } from 'rxjs';
import { Injector, runInInjectionContext } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';

describe('AdminDeletedVideosComponent', () => {
  let component: AdminDeletedVideosComponent;
  let mockVideoService: any;

  beforeEach(() => {
    mockVideoService = {
      getDeletedVideosHistory: vi.fn().mockReturnValue(of({
        data: [{ id: 1, title: 'Deleted Video 1' }, { id: 2, title: 'Deleted Video 2' }],
        total: 2,
        per_page: 20,
        current_page: 1
      }))
    };

    const injector = Injector.create({
      providers: [
        { provide: VideoService, useValue: mockVideoService }
      ]
    });

    runInInjectionContext(injector, () => {
      component = new AdminDeletedVideosComponent(
        injector.get(VideoService)
      );
    });
  });

  it('should create and load history on init', () => {
    component.ngOnInit();
    
    expect(component).toBeTruthy();
    expect(mockVideoService.getDeletedVideosHistory).toHaveBeenCalledWith(1);
    expect(component.historyList()).toHaveLength(2);
    expect(component.totalItems()).toBe(2);
    expect(component.pageSize()).toBe(20);
    expect(component.currentPage()).toBe(1);
    expect(component.isLoading()).toBe(false);
  });

  it('should handle error when loading history', () => {
    mockVideoService.getDeletedVideosHistory.mockReturnValueOnce(throwError(() => new Error('Error')));
    
    component.ngOnInit();
    
    expect(mockVideoService.getDeletedVideosHistory).toHaveBeenCalledWith(1);
    expect(component.isLoading()).toBe(false);
  });

  it('should load history for the specified page on page change', () => {
    component.ngOnInit();
    
    // Clear calls from init
    mockVideoService.getDeletedVideosHistory.mockClear();

    const pageEvent: PageEvent = {
      pageIndex: 1, // Represents page 2
      pageSize: 20,
      length: 50
    };

    component.onPageChange(pageEvent);
    
    expect(mockVideoService.getDeletedVideosHistory).toHaveBeenCalledWith(2);
  });
});
