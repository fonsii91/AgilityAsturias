import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UploadVideoComponent } from './upload-video.component';
import { VideoService } from '../../../services/video.service';
import { DogService } from '../../../services/dog.service';
import { CompetitionService } from '../../../services/competition.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal, ChangeDetectorRef, DestroyRef } from '@angular/core';

vi.mock('@ffmpeg/ffmpeg', () => {
    return {
        FFmpeg: class {
            load = vi.fn();
            on = vi.fn();
            writeFile = vi.fn();
            exec = vi.fn();
            readFile = vi.fn();
            deleteFile = vi.fn();
        }
    };
});

describe('UploadVideoComponent', () => {
    let component: UploadVideoComponent;
    let fixture: ComponentFixture<UploadVideoComponent>;
    let videoServiceMock: any;
    let dogServiceMock: any;
    let compServiceMock: any;
    let authServiceMock: any;
    let toastServiceMock: any;

    beforeEach(async () => {
        videoServiceMock = {
            uploadVideo: vi.fn().mockReturnValue(of({ id: 1, title: 'Uploaded' }))
        };

        dogServiceMock = {
            loadAllDogs: vi.fn(),
            getAllDogs: vi.fn().mockReturnValue(signal([]))
        };

        compServiceMock = {
            getCompetitions: vi.fn().mockReturnValue(signal([]))
        };

        authServiceMock = {
            currentUserSignal: vi.fn().mockReturnValue({ id: 1 })
        };

        toastServiceMock = {
            success: vi.fn(),
            error: vi.fn()
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
                { provide: ChangeDetectorRef, useValue: { detectChanges: vi.fn(), markForCheck: vi.fn() } },
                { provide: DestroyRef, useValue: { onDestroy: vi.fn() } }
            ]
        });

        TestBed.runInInjectionContext(() => {
            component = new UploadVideoComponent();
        });
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should show error if form is invalid on submit', async () => {
        component.uploadForm.controls['dog_id'].setValue('');
        await component.onSubmit();
        expect(toastServiceMock.error).toHaveBeenCalledWith('Por favor completa todos los campos requeridos y selecciona un vídeo.');
    });

    it('should upload video if form is valid and file is selected', async () => {
        component.uploadForm.controls['dog_id'].setValue('1');
        component.uploadForm.controls['date'].setValue('2023-01-01');
        
        // Mock a small file
        const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });
        component.selectedFile = file;

        await component.onSubmit();

        expect(videoServiceMock.uploadVideo).toHaveBeenCalled();
        expect(toastServiceMock.success).toHaveBeenCalledWith('Vídeo subido exitosamente.');
    });
});
