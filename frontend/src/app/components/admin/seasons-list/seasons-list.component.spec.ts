import { TestBed } from '@angular/core/testing';
import { SeasonsListComponent } from './seasons-list.component';
import { ReservationService } from '../../../services/reservation.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

class MockReservationService {
  getSeasons() { return of([{ id: 1, name: 'T1', status: 'active', gamification_type: 'ranking' }]); }
  updateSeason(id: number, payload: any) { return of({ message: 'Success' }); }
  reopenSeason(id: number) { return of({ message: 'Success' }); }
  deleteSeason(id: number) { return of({ message: 'Success' }); }
}

class MockAuthService {
  isManager() { return true; }
}

class MockToastService {
  success(msg: string) {}
  error(msg: string) {}
}

class MockRouter {
  navigate(commands: any[]) { return Promise.resolve(true); }
}

describe('SeasonsListComponent', () => {
  let component: SeasonsListComponent;
  let reservationService: ReservationService;
  let toastService: ToastService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ReservationService, useClass: MockReservationService },
        { provide: AuthService, useClass: MockAuthService },
        { provide: ToastService, useClass: MockToastService },
        { provide: Router, useClass: MockRouter }
      ]
    });

    reservationService = TestBed.inject(ReservationService);
    toastService = TestBed.inject(ToastService);
    router = TestBed.inject(Router);

    TestBed.runInInjectionContext(() => {
      component = new SeasonsListComponent();
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load seasons on init', () => {
    const getSpy = vi.spyOn(reservationService, 'getSeasons').mockReturnValue(of([
      { id: 1, name: 'T1', status: 'active', gamification_type: 'ranking' }
    ]));

    component.ngOnInit();

    expect(getSpy).toHaveBeenCalled();
    expect(component.seasons().length).toBe(1);
    expect(component.seasons()[0].name).toBe('T1');
  });

  it('should start inline editing of a season', () => {
    const season = { id: 2, name: 'T2', start_date: '2026-01-01', end_date: '2026-03-31' };
    
    component.startEdit(season);

    expect(component.editingSeasonId).toBe(2);
    expect(component.editForm.name).toBe('T2');
    expect(component.editForm.start_date).toBe('2026-01-01');
    expect(component.editForm.end_date).toBe('2026-03-31');
  });

  it('should save inline edit successfully', () => {
    component.editingSeasonId = 2;
    component.editForm = {
      name: 'T2 Modificada',
      start_date: '2026-01-05',
      end_date: '2026-04-01'
    };

    const updateSpy = vi.spyOn(reservationService, 'updateSeason').mockReturnValue(of({ message: 'Temporada actualizada' }));
    const successSpy = vi.spyOn(toastService, 'success');
    const loadSpy = vi.spyOn(component, 'loadSeasons');

    component.saveEdit(2);

    expect(updateSpy).toHaveBeenCalledWith(2, {
      name: 'T2 Modificada',
      start_date: '2026-01-05',
      end_date: '2026-04-01'
    });
    expect(component.editingSeasonId).toBeNull();
    expect(successSpy).toHaveBeenCalledWith('Temporada actualizada');
    expect(loadSpy).toHaveBeenCalled();
  });

  it('should reopen season successfully', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const reopenSpy = vi.spyOn(reservationService, 'reopenSeason').mockReturnValue(of({ message: 'Temporada reabierta' }));
    const successSpy = vi.spyOn(toastService, 'success');
    const loadSpy = vi.spyOn(component, 'loadSeasons');

    component.reopenSeason({ id: 3, name: 'T3' });

    expect(reopenSpy).toHaveBeenCalledWith(3);
    expect(successSpy).toHaveBeenCalledWith('Temporada reabierta');
    expect(loadSpy).toHaveBeenCalled();
  });

  it('should confirm delete and call API successfully', () => {
    component.deletingSeasonId = 4;
    const deleteSpy = vi.spyOn(reservationService, 'deleteSeason').mockReturnValue(of({ message: 'Temporada eliminada' }));
    const successSpy = vi.spyOn(toastService, 'success');
    const loadSpy = vi.spyOn(component, 'loadSeasons');

    component.confirmDelete(4);

    expect(deleteSpy).toHaveBeenCalledWith(4);
    expect(component.deletingSeasonId).toBeNull();
    expect(successSpy).toHaveBeenCalledWith('Temporada eliminada');
    expect(loadSpy).toHaveBeenCalled();
  });
});
