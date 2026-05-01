import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VideoListComponent } from './video-list.component';
import { VideoService } from '../../../services/video.service';
import { DogService } from '../../../services/dog.service';
import { CompetitionService } from '../../../services/competition.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { TenantService } from '../../../services/tenant.service';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal, ChangeDetectorRef } from '@angular/core';

describe('VideoListComponent', () => {
    let component: VideoListComponent;
    let fixture: ComponentFixture<VideoListComponent>;
    let videoServiceMock: any;
    let dogServiceMock: any;
    let authServiceMock: any;
    let toastServiceMock: any;

    beforeEach(async () => {
        videoServiceMock = {
            getVideos: vi.fn().mockReturnValue(of({ data: [], current_page: 1, last_page: 1, counts: { vertical: 0, horizontal: 0 } })),
            toggleLike: vi.fn().mockReturnValue(of({ liked: true })),
            deleteVideo: vi.fn().mockReturnValue(of({ message: 'Deleted' })),
            togglePublicGallery: vi.fn().mockReturnValue(of({ in_public_gallery: true }))
        };

        dogServiceMock = {
            loadAllDogs: vi.fn(),
            getAllDogs: vi.fn().mockReturnValue(signal([]))
        };

        authServiceMock = {
            currentUserSignal: vi.fn().mockReturnValue({ id: 1, name: 'Test User', role: 'member' })
        };

        toastServiceMock = {
            success: vi.fn(),
            error: vi.fn()
        };

        const compServiceMock = {
            fetchCompetitions: vi.fn(),
            getCompetitions: vi.fn().mockReturnValue(signal([]))
        };

        const tenantServiceMock = {
            tenantInfo: signal({ name: 'Club Test' })
        };

        await TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideRouter([]),
                { provide: VideoService, useValue: videoServiceMock },
                { provide: DogService, useValue: dogServiceMock },
                { provide: CompetitionService, useValue: compServiceMock },
                { provide: AuthService, useValue: authServiceMock },
                { provide: ToastService, useValue: toastServiceMock },
                { provide: TenantService, useValue: tenantServiceMock },
                { provide: ChangeDetectorRef, useValue: { detectChanges: vi.fn(), markForCheck: vi.fn() } }
            ]
        });

        TestBed.runInInjectionContext(() => {
            component = new VideoListComponent();
        });
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load videos on init', () => {
        component.ngOnInit();
        expect(videoServiceMock.getVideos).toHaveBeenCalledWith(1, { search: '', orientation: 'vertical' });
    });

    it('should toggle like optimistically and revert on error', () => {
        const dummyVideo: any = { id: 1, is_liked_by_user: false, likes_count: 0 };
        videoServiceMock.toggleLike.mockReturnValueOnce(throwError(() => new Error('error')));

        component.toggleLike(dummyVideo);
        
        expect(dummyVideo.is_liked_by_user).toBe(false);
        expect(dummyVideo.likes_count).toBe(0);
        expect(videoServiceMock.toggleLike).toHaveBeenCalledWith(1);
    });

    it('should open delete modal when owner', () => {
        const dummyVideo: any = { id: 1, user_id: 1, dog: null };
        const event = new Event('click');
        Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

        component.openDeleteModal(event, dummyVideo);
        expect(component.videoToDelete).toBe(dummyVideo);
    });

    it('should confirm delete video', () => {
        component.videos = [{ id: 1 } as any];
        component.videoToDelete = component.videos[0];
        
        component.confirmDelete();
        
        expect(videoServiceMock.deleteVideo).toHaveBeenCalledWith(1);
        expect(component.videos.length).toBe(0);
        expect(toastServiceMock.success).toHaveBeenCalled();
    });

    it('should toggle public gallery status and notify on success', () => {
        const dummyVideo: any = { id: 1, in_public_gallery: false };
        videoServiceMock.togglePublicGallery.mockReturnValueOnce(of({ in_public_gallery: true }));
        
        const event = new Event('click');
        Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

        component.togglePublicGallery(event, dummyVideo);
        
        expect(videoServiceMock.togglePublicGallery).toHaveBeenCalledWith(1);
        expect(dummyVideo.in_public_gallery).toBe(true);
        expect(toastServiceMock.success).toHaveBeenCalledWith('Vídeo añadido a la galería pública');
    });
});
