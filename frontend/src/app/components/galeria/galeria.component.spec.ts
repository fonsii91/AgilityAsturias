import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GaleriaComponent } from './galeria.component';
import { GalleryService } from '../../services/gallery.service';
import { AuthService } from '../../services/auth.service';
import { ImageCompressorService } from '../../services/image-compressor.service';
import { MatDialogModule } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { signal } from '@angular/core';

describe('GaleriaComponent', () => {
  let component: GaleriaComponent;
  let fixture: ComponentFixture<GaleriaComponent>;
  let mockGalleryService: any;
  let mockAuthService: any;
  let mockImageCompressor: any;

  beforeEach(async () => {
    mockGalleryService = {
      getPhotos: vitest.fn().mockReturnValue(of([
        { id: 1, url: 'img1.jpg', alt: 'Test Image 1' },
        { id: 2, url: 'img2.jpg', alt: 'Test Image 2' }
      ])),
      uploadPhoto: vitest.fn(),
      deletePhoto: vitest.fn()
    };

    mockAuthService = {
      isStaff: signal(true)
    };

    mockImageCompressor = {
      compress: vitest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [GaleriaComponent, MatDialogModule, BrowserAnimationsModule],
      providers: [
        { provide: GalleryService, useValue: mockGalleryService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ImageCompressorService, useValue: mockImageCompressor }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GaleriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load photos', () => {
    expect(component).toBeTruthy();
    expect(mockGalleryService.getPhotos).toHaveBeenCalled();
    expect(component.images().length).toBe(2);
  });

  it('should display images on the grid', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const images = compiled.querySelectorAll('.gallery-item img');
    expect(images.length).toBe(2);
    expect(images[0].getAttribute('src')).toBe('img1.jpg');
    expect(images[0].getAttribute('alt')).toBe('Test Image 1');
  });

  it('should open lightbox on image click', () => {
    component.openLightbox(1);
    fixture.detectChanges();
    expect(component.lightboxOpen()).toBe(true);
    expect(component.currentImageIndex()).toBe(1);
  });
});
