import { TestBed } from '@angular/core/testing';
import { SeasonsManagerComponent } from './seasons-manager.component';
import { ReservationService } from '../../../services/reservation.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { BountyService } from '../../../services/bounty.service';
import { TenantService } from '../../../services/tenant.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

class MockReservationService {
  endSeason() { return of({ message: 'Success' }); }
}

class MockAuthService {
  isManager() { return true; }
}

class MockToastService {
  success(msg: string) {}
  error(msg: string) {}
}

class MockBountyService {
  toggleBountyBoard(enabled: boolean) { return of({ message: 'Success' }); }
}

class MockTenantService {
  reload() {}
}

class MockRouter {
  navigate(commands: any[]) { return Promise.resolve(true); }
}

describe('SeasonsManagerComponent', () => {
  let component: SeasonsManagerComponent;
  let reservationService: ReservationService;
  let toastService: ToastService;
  let bountyService: BountyService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ReservationService, useClass: MockReservationService },
        { provide: AuthService, useClass: MockAuthService },
        { provide: ToastService, useClass: MockToastService },
        { provide: BountyService, useClass: MockBountyService },
        { provide: TenantService, useClass: MockTenantService },
        { provide: Router, useClass: MockRouter }
      ]
    });

    reservationService = TestBed.inject(ReservationService);
    toastService = TestBed.inject(ToastService);
    bountyService = TestBed.inject(BountyService);
    router = TestBed.inject(Router);

    TestBed.runInInjectionContext(() => {
      component = new SeasonsManagerComponent();
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should end current season successfully', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const endSpy = vi.spyOn(reservationService, 'endSeason').mockReturnValue(of({ message: 'Temporada finalizada' }));
    const successSpy = vi.spyOn(toastService, 'success');
    const emitSpy = vi.spyOn(component.seasonChanged, 'emit');

    component.endCurrentSeason();

    expect(endSpy).toHaveBeenCalled();
    expect(successSpy).toHaveBeenCalledWith('Temporada finalizada');
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should toggle bounty board successfully', () => {
    const event = { target: { checked: true } };
    const toggleSpy = vi.spyOn(bountyService, 'toggleBountyBoard').mockReturnValue(of({ message: 'Ajuste de recompensas guardado' }));
    const successSpy = vi.spyOn(toastService, 'success');

    component.toggleBountyBoardState(event);

    expect(toggleSpy).toHaveBeenCalledWith(true);
    expect(successSpy).toHaveBeenCalledWith('Ajuste de recompensas guardado');
  });

  it('should navigate to manage seasons', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const emitSpy = vi.spyOn(component.close, 'emit');

    component.manageSeasons();

    expect(emitSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/temporadas']);
  });
});
