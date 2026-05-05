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

    it('should correctly filter and limit pastAndCurrentCompetitions to 10 events', () => {
        const today = new Date();
        
        // Generate 12 past dates
        const comps = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(today);
            date.setDate(today.getDate() - (i + 1));
            return { id: i + 1, nombre: `Past Comp ${i + 1}`, fechaEvento: date.toISOString().replace('Z', '.000000Z') };
        });

        // Add 1 future date
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + 5);
        comps.push({ id: 13, nombre: 'Future Comp', fechaEvento: futureDate.toISOString().replace('Z', '.000000Z') });

        compServiceMock.getCompetitions.mockReturnValue(signal(comps));

        const filtered = component.pastAndCurrentCompetitions;
        
        // Should not include the future date, and should be limited to 10
        expect(filtered.length).toBe(10);
        expect(filtered.some(c => c.nombre === 'Future Comp')).toBe(false);
    });

    it('should correctly sort dogs into two blocks: attending first (alphabetical) then rest (alphabetical)', () => {
        // Setup dogs
        dogServiceMock.getAllDogs.mockReturnValue(signal([
            { id: 1, name: 'Zebra' },
            { id: 2, name: 'Alpha' },
            { id: 3, name: 'Beta' },
            { id: 4, name: 'Charlie' }
        ]));

        // Setup a competition with Alpha and Zebra attending
        compServiceMock.getCompetitions.mockReturnValue(signal([
            { id: 99, allAttendingDogIds: [1, 2] }
        ]));

        component.uploadForm.patchValue({ competition_id: 99 });

        const sorted = component.sortedDogs;

        expect(sorted.length).toBe(4);
        // First block: Attending dogs (Alpha, Zebra), alphabetically sorted
        expect(sorted[0].name).toBe('Alpha');
        expect(sorted[1].name).toBe('Zebra');
        // Second block: Non-attending dogs (Beta, Charlie), alphabetically sorted
        expect(sorted[2].name).toBe('Beta');
        expect(sorted[3].name).toBe('Charlie');
    });
});
