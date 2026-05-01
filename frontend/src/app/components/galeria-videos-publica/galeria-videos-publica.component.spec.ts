import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GaleriaVideosPublicaComponent } from './galeria-videos-publica.component';
import { VideoService } from '../../services/video.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { of } from 'rxjs';
import { signal, ChangeDetectorRef } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('GaleriaVideosPublicaComponent', () => {
  let component: GaleriaVideosPublicaComponent;
  let mockVideoService: any;
  let mockAuthService: any;
  let mockToastService: any;
  let mockCdr: any;

  beforeEach(async () => {
    mockVideoService = {
      getPublicVideos: vi.fn().mockReturnValue(of({
        data: [
          { id: 1, title: 'Test Video 1', in_public_gallery: true },
          { id: 2, title: 'Test Video 2', in_public_gallery: true }
        ],
        current_page: 1,
        last_page: 2
      })),
      togglePublicGallery: vi.fn().mockReturnValue(of({ in_public_gallery: false }))
    };

    mockAuthService = {
      isStaff: signal(false),
      isAdmin: signal(false)
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    mockCdr = {
      detectChanges: vi.fn(),
      markForCheck: vi.fn()
    };

    await TestBed.configureTestingModule({
      providers: [
        { provide: VideoService, useValue: mockVideoService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastService, useValue: mockToastService },
        { provide: ChangeDetectorRef, useValue: mockCdr }
      ]
    });
    
    TestBed.runInInjectionContext(() => {
        component = new GaleriaVideosPublicaComponent();
    });
  });

  it('should create and fetch public videos', () => {
    component.ngOnInit();
    expect(component).toBeTruthy();
    expect(mockVideoService.getPublicVideos).toHaveBeenCalledWith(1);
    expect(component.videos.length).toBe(2);
    expect(component.isLoading).toBe(false);
    expect(component.totalPages).toBe(2);
  });

  it('should change page when goToPage is called', () => {
    component.totalPages = 2; // Setup condition to allow goto
    component.currentPage = 1;
    component.goToPage(2);
    expect(mockVideoService.getPublicVideos).toHaveBeenCalledWith(2);
  });

  it('should remove video from public gallery', () => {
    component.videos = [
        { id: 1, title: 'Test Video 1', in_public_gallery: true } as any,
        { id: 2, title: 'Test Video 2', in_public_gallery: true } as any
    ];
    
    const event = new Event('click');
    Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

    component.removeFromPublic(event, component.videos[0]);

    expect(mockVideoService.togglePublicGallery).toHaveBeenCalledWith(1);
    expect(component.videos.length).toBe(1);
    expect(component.videos[0].id).toBe(2);
    expect(mockToastService.success).toHaveBeenCalledWith('Vídeo ocultado con éxito de la galería pública.');
  });
});
