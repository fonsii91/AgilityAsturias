import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GaleriaVideosPublicaComponent } from './galeria-videos-publica.component';
import { VideoService } from '../../services/video.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { of } from 'rxjs';
import { signal } from '@angular/core';

describe('GaleriaVideosPublicaComponent', () => {
  let component: GaleriaVideosPublicaComponent;
  let fixture: ComponentFixture<GaleriaVideosPublicaComponent>;
  let mockVideoService: any;
  let mockAuthService: any;
  let mockToastService: any;

  beforeEach(async () => {
    mockVideoService = {
      getPublicVideos: vitest.fn().mockReturnValue(of({
        data: [
          { id: 1, title: 'Test Video 1', in_public_gallery: true },
          { id: 2, title: 'Test Video 2', in_public_gallery: true }
        ],
        current_page: 1,
        last_page: 2
      })),
      togglePublicGallery: vitest.fn()
    };

    mockAuthService = {
      isStaff: signal(false),
      isAdmin: signal(false)
    };

    mockToastService = {
      success: vitest.fn(),
      error: vitest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [GaleriaVideosPublicaComponent],
      providers: [
        { provide: VideoService, useValue: mockVideoService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastService, useValue: mockToastService }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GaleriaVideosPublicaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and fetch public videos', () => {
    expect(component).toBeTruthy();
    expect(mockVideoService.getPublicVideos).toHaveBeenCalledWith(1);
    expect(component.videos.length).toBe(2);
    expect(component.isLoading).toBe(false);
    expect(component.totalPages).toBe(2);
  });

  it('should change page when goToPage is called', () => {
    component.goToPage(2);
    expect(mockVideoService.getPublicVideos).toHaveBeenCalledWith(2);
  });
});
