import { TestBed } from '@angular/core/testing';
import { SeasonFormComponent } from './season-form.component';
import { ReservationService } from '../../../services/reservation.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

class MockReservationService {
  getSeasons() { return of([{ id: 1, name: 'Active Season', status: 'active', gamification_type: 'ranking' }]); }
  startSeason(payload: any) { return of({ message: 'Success' }); }
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

describe('SeasonFormComponent', () => {
  let component: SeasonFormComponent;
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
      component = new SeasonFormComponent();
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load active season on init', () => {
    const getSpy = vi.spyOn(reservationService, 'getSeasons').mockReturnValue(of([
      { id: 1, name: 'Active Season', status: 'active', gamification_type: 'ranking' },
      { id: 2, name: 'Past Season', status: 'archived', gamification_type: 'stickers' }
    ]));

    component.ngOnInit();

    expect(getSpy).toHaveBeenCalled();
    expect(component.activeSeason).toBeTruthy();
    expect(component.activeSeason.name).toBe('Active Season');
  });

  it('should start new season successfully', () => {
    component.newSeasonName = 'Nueva Temporada Test';
    component.newSeasonType = 'stickers';
    component.newSeasonStartDate = '2026-06-01';

    const startSpy = vi.spyOn(reservationService, 'startSeason').mockReturnValue(of({ message: 'Temporada creada' }));
    const successSpy = vi.spyOn(toastService, 'success');
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.startNewSeason();

    expect(startSpy).toHaveBeenCalledWith({
      name: 'Nueva Temporada Test',
      gamification_type: 'stickers',
      start_date: '2026-06-01'
    });
    expect(successSpy).toHaveBeenCalledWith('Temporada creada');
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/temporadas']);
  });
});
