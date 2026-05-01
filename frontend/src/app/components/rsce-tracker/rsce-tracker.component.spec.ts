import { TestBed } from '@angular/core/testing';
import { RsceTrackerComponent } from './rsce-tracker.component';
import { ToastService } from '../../services/toast.service';
import { DogService } from '../../services/dog.service';
import { RsceTrackService } from '../../services/rsce-track.service';
import { CompetitionService } from '../../services/competition.service';
import { VideoService } from '../../services/video.service';
import { TenantService } from '../../services/tenant.service';
import { DatePipe } from '@angular/common';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { vi } from 'vitest';

class MockToastService {
  success(msg: string) {}
  error(msg: string) {}
}

class MockDogService {
  getDogs() { return signal([{ id: 1, name: 'Fido', rsce_category: 'M', pivot: { rsce_grade: '1' } }]); }
  updateDog(id: number, data: any) { return Promise.resolve({ id: 1, name: 'Fido', pivot: { rsce_grade: data.rsce_grade || '1' } }); }
}

class MockRsceTrackService {
  getTracks() { return of([
    { id: 1, dog_id: 1, date: '2023-01-01', manga_type: 'Agility 1', qualification: 'Excelente a 0', speed: 4.8, judge_name: 'Judge A' },
    { id: 2, dog_id: 1, date: '2023-01-02', manga_type: 'Jumping 1', qualification: 'Excelente a 0', speed: 5.0, judge_name: 'Judge B' }
  ]); }
  addTrack(data: any) { return of({ id: 3, ...data }); }
  updateTrack(id: number, data: any) { return of(data); }
  deleteTrack(id: number) { return of(null); }
}

class MockCompetitionService {
  getCompetitions() { return signal([]); }
}

class MockVideoService {
  getVideos() { return of({ data: [] }); }
}

class MockTenantService {
  tenantInfo = signal({ name: 'Test Club' });
}

describe('RsceTrackerComponent', () => {
  let component: RsceTrackerComponent;
  let toastService: ToastService;
  let trackService: RsceTrackService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ToastService, useClass: MockToastService },
        { provide: DogService, useClass: MockDogService },
        { provide: RsceTrackService, useClass: MockRsceTrackService },
        { provide: CompetitionService, useClass: MockCompetitionService },
        { provide: VideoService, useClass: MockVideoService },
        { provide: TenantService, useClass: MockTenantService },
        DatePipe
      ]
    });

    toastService = TestBed.inject(ToastService);
    trackService = TestBed.inject(RsceTrackService);

    TestBed.runInInjectionContext(() => {
      component = new RsceTrackerComponent();
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load and filter tracks on init', () => {
    component.ngOnInit(); // triggers loadTracks
    
    // Set dog directly instead of toggling to avoid null state
    component.selectedDogId.set(1);
    component.filterTracks();
    
    expect(component.selectedDogId()).toBe(1);
    expect(component.tracks().length).toBe(2);
    expect(component.filteredTracks().length).toBe(2);
  });

  it('should calculate grade 1 progress correctly', () => {
    component.ngOnInit();
    component.selectedDog.set(component.dogs()[0]);
    component.selectedDogId.set(1);
    component.filterTracks();
    
    expect(component.progressTitleB()).toContain('Opción B: Mix de Mangas');
    expect(component.progressMet()).toBe(false); // Not met yet
  });

  it('should open and close add form', () => {
    component.selectedDog.set(component.dogs()[0]);
    component.selectedDogId.set(1);
    component.filterTracks();
    
    component.openAddForm();
    expect(component.isFormOpen()).toBe(true);
    expect(component.isEditing()).toBe(false);
    expect(component.formData().dog_id).toBe(1);

    component.closeForm();
    expect(component.isFormOpen()).toBe(false);
    expect(component.formData()).toEqual({});
  });

  it('should call trackService.addTrack on save new track', () => {
    vi.spyOn(trackService, 'addTrack');
    vi.spyOn(toastService, 'success');

    component.selectedDog.set(component.dogs()[0]);
    component.selectedDogId.set(1);
    component.filterTracks();
    component.openAddForm();
    component.formData.set({
      dog_id: 1,
      date: '2023-10-10',
      manga_type: 'Agility 1',
      qualification: 'EXCELENTE'
    });
    
    component.saveTrack();

    expect(trackService.addTrack).toHaveBeenCalled();
    expect(toastService.success).toHaveBeenCalledWith('Manga registrada correctamente');
    expect(component.isFormOpen()).toBe(false);
  });

  it('should calculate grade 2 progress for next grade correctly', () => {
    component.ngOnInit();
    // manually change grade to 2
    component.selectedDog.set({ id: 1, name: 'Fido', pivot: { rsce_grade: '2' }, rsce_category: 'M' } as any);
    component.selectedDogId.set(1);
    component.filterTracks();
    component.calculateProgress();

    // Grade 2 logic requires speed thresholds
    expect(component.progressTitleA()).toContain('Agility');
    expect(component.progressTitleB()).toContain('Jumping');
  });
});
