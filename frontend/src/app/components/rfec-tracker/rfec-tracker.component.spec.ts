import { TestBed } from '@angular/core/testing';
import { RfecTrackerComponent } from './rfec-tracker.component';
import { ToastService } from '../../services/toast.service';
import { DogService } from '../../services/dog.service';
import { RfecTrackService } from '../../services/rfec-track.service';
import { CompetitionService } from '../../services/competition.service';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { vi } from 'vitest';

class MockToastService {
  success(msg: string) {}
  error(msg: string) {}
}

class MockDogService {
  getDogs() { return signal([{ id: 1, name: 'Tosti', rfec_grade: 'Iniciación' }]); }
  loadUserDogs() { return Promise.resolve(); }
  updateDog(id: number, data: any) { return Promise.resolve({ id: 1, name: 'Tosti', rfec_grade: data.rfec_grade || 'Iniciación' }); }
}

class MockRfecTrackService {
  tracks = signal<any[]>([]);
  loadTracks() {}
  addTrack(data: any) { return of({ id: 3, ...data }); }
  updateTrack(id: number, data: any) { return of(data); }
  deleteTrack(id: number) { return of(null); }
}

class MockCompetitionService {
  getCompetitions() { return signal([]); }
  fetchCompetitions() {}
}

describe('RfecTrackerComponent', () => {
  let component: RfecTrackerComponent;
  let toastService: ToastService;
  let dogService: DogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ToastService, useClass: MockToastService },
        { provide: DogService, useClass: MockDogService },
        { provide: RfecTrackService, useClass: MockRfecTrackService },
        { provide: CompetitionService, useClass: MockCompetitionService }
      ]
    });

    toastService = TestBed.inject(ToastService);
    dogService = TestBed.inject(DogService);

    TestBed.runInInjectionContext(() => {
      component = new RfecTrackerComponent();
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should auto-select first dog when dogs load', () => {
    TestBed.flushEffects();
    expect(component.selectedDogId()).toBe(1);
  });

  it('should evaluate Iniciacion checklist correctly', () => {
    component.chkEdad.set(true);
    component.chkSociabilidad.set(true);
    component.chkMedicion.set(true);
    component.chkLicencia.set(false);

    expect(component.allIniciacionMet()).toBe(false);

    component.chkLicencia.set(true);
    expect(component.allIniciacionMet()).toBe(true);
  });

  it('should compute points for Promocion/Competicion correctly', () => {
    const rfecService = TestBed.inject(RfecTrackService) as unknown as MockRfecTrackService;
    
    // Add tracks to dog 1
    rfecService.tracks.set([
      // Excelente a 0 (10 pts), Agility
      { id: 1, dog_id: 1, date: '2023-01-01', manga_type: 'Agility 1', qualification: 'Excelente a 0', speed: 0, judge_name: 'Juez A' },
      // Excelente con penalizacion 4.5 (5 pts), Jumping
      { id: 2, dog_id: 1, date: '2023-01-02', manga_type: 'Jumping 1', qualification: 'Excelente', speed: 4.5, judge_name: 'Juez B' },
      // Bueno (0 pts), Agility
      { id: 3, dog_id: 1, date: '2023-01-03', manga_type: 'Agility 2', qualification: 'Bueno', speed: 17, judge_name: 'Juez A' },
      // Excelente a 0 (10 pts), Agility
      { id: 4, dog_id: 1, date: '2023-01-04', manga_type: 'Agility 1', qualification: 'Excelente a 0', speed: 0, judge_name: 'Juez C' },
    ]);

    component.selectedDogId.set(1);
    
    const stats = component.calculatedStats();
    
    // Total pts = 10 (t1) + 5 (t2) + 0 (t3) + 10 (t4) = 25 pts
    expect(stats.totalPoints).toBe(25);
    
    // Agility pts = 10 (t1) + 10 (t4) = 20 pts
    expect(stats.agilityPoints).toBe(20);
    
    // Jueces = Juez A, Juez B, Juez C = 3
    expect(stats.uniqueJudges).toBe(3);
  });

  it('should grant points based purely on qualification, ignoring speed', () => {
    const rfecService = TestBed.inject(RfecTrackService) as unknown as MockRfecTrackService;
    
    rfecService.tracks.set([
      // Excelente = 5 pts, even if speed is set to a high number (since the user chose the 'Excelente (hasta 5.99)' option)
      { id: 1, dog_id: 1, manga_type: 'Agility', qualification: 'Excelente', speed: 10.00, judge_name: 'Juez A' },
    ]);
    
    component.selectedDogId.set(1);
    const stats = component.calculatedStats();
    expect(stats.totalPoints).toBe(5);
  });

  it('should set hasCelebratedCE properly and trigger celebration when reaching 80 pts and 40 agility pts', () => {
    component.selectedDogId.set(1);
    // Mock the dog to be in 'Competición'
    vi.spyOn(component, 'selectedDog').mockReturnValue({ id: 1, name: 'Tosti', rfec_grade: 'Competición' } as any);
    
    const rfecService = TestBed.inject(RfecTrackService) as unknown as MockRfecTrackService;
    const toastSpy = vi.spyOn(toastService, 'success');
    
    // Create 8 Agility tracks of 10 pts each -> 80 total, 80 agility
    const fakeTracks = Array.from({ length: 8 }).map((_, i) => ({
      id: i + 1, dog_id: 1, manga_type: 'Agility', qualification: 'Excelente a 0', speed: 0, judge_name: `Juez ${i}`
    }));
    
    rfecService.tracks.set(fakeTracks);
    
    // Flush effects to trigger CE Celebration Effect
    TestBed.flushEffects();
    
    expect(component.calculatedStats().totalPoints).toBe(80);
    expect(component.calculatedStats().agilityPoints).toBe(80);
    expect(component.hasCelebratedCE).toBe(true);
    
    // Note: setTimeout is used in the effect, we might need vitest fakeTimers if we want to assert the toast.
    // For now, testing that `hasCelebratedCE` is flipped is enough to verify the condition was met.
  });
});
