import { TestBed } from '@angular/core/testing';
import { SeasonsManagerComponent } from './seasons-manager.component';
import { ReservationService } from '../../../services/reservation.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { BountyService } from '../../../services/bounty.service';
import { TenantService } from '../../../services/tenant.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { signal } from '@angular/core';

class MockReservationService {
  startSeason(payload: any) { return of({ message: 'Success' }); }
  endSeason() { return of({ message: 'Success' }); }
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

class MockBountyService {
  toggleBountyBoard(enabled: boolean) { return of({ message: 'Success' }); }
}

class MockTenantService {
  reload() {}
}

describe('SeasonsManagerComponent', () => {
  let component: SeasonsManagerComponent;
  let reservationService: ReservationService;
  let toastService: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ReservationService, useClass: MockReservationService },
        { provide: AuthService, useClass: MockAuthService },
        { provide: ToastService, useClass: MockToastService },
        { provide: BountyService, useClass: MockBountyService },
        { provide: TenantService, useClass: MockTenantService }
      ]
    });

    reservationService = TestBed.inject(ReservationService);
    toastService = TestBed.inject(ToastService);

    TestBed.runInInjectionContext(() => {
      component = new SeasonsManagerComponent();
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start new season successfully', () => {
    component.newSeasonName = 'Nueva Temporada Test';
    component.newSeasonType = 'ranking';
    component.newSeasonStartDate = '2026-06-01';

    const startSpy = vi.spyOn(reservationService, 'startSeason').mockReturnValue(of({ message: 'Temporada creada' }));
    const successSpy = vi.spyOn(toastService, 'success');
    const emitSpy = vi.spyOn(component.seasonChanged, 'emit');

    component.startNewSeason();

    expect(startSpy).toHaveBeenCalledWith({
      name: 'Nueva Temporada Test',
      gamification_type: 'ranking',
      start_date: '2026-06-01'
    });
    expect(component.newSeasonName).toBe('');
    expect(successSpy).toHaveBeenCalledWith('Temporada creada');
    expect(emitSpy).toHaveBeenCalled();
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

  it('should start inline editing of a season', () => {
    const season = { id: 5, name: 'Temporada Antigua', start_date: '2026-01-01', end_date: '2026-03-31' };
    
    component.startEdit(season);

    expect(component.editingSeasonId).toBe(5);
    expect(component.editForm.name).toBe('Temporada Antigua');
    expect(component.editForm.start_date).toBe('2026-01-01');
    expect(component.editForm.end_date).toBe('2026-03-31');
  });

  it('should save inline edit successfully', () => {
    component.editingSeasonId = 5;
    component.editForm = {
      name: 'Nombre Modificado',
      start_date: '2026-01-10',
      end_date: '2026-04-05'
    };

    const updateSpy = vi.spyOn(reservationService, 'updateSeason').mockReturnValue(of({ message: 'Temporada actualizada' }));
    const successSpy = vi.spyOn(toastService, 'success');
    const emitSpy = vi.spyOn(component.seasonChanged, 'emit');

    component.saveEdit(5);

    expect(updateSpy).toHaveBeenCalledWith(5, {
      name: 'Nombre Modificado',
      start_date: '2026-01-10',
      end_date: '2026-04-05'
    });
    expect(component.editingSeasonId).toBeNull();
    expect(successSpy).toHaveBeenCalledWith('Temporada actualizada');
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should request delete and cancel correctly', () => {
    component.requestDelete(8);
    expect(component.deletingSeasonId).toBe(8);

    component.cancelDelete();
    expect(component.deletingSeasonId).toBeNull();
  });

  it('should confirm delete and call API successfully', () => {
    component.deletingSeasonId = 8;
    const deleteSpy = vi.spyOn(reservationService, 'deleteSeason').mockReturnValue(of({ message: 'Temporada eliminada' }));
    const successSpy = vi.spyOn(toastService, 'success');
    const emitSpy = vi.spyOn(component.seasonChanged, 'emit');

    component.confirmDelete(8);

    expect(deleteSpy).toHaveBeenCalledWith(8);
    expect(component.deletingSeasonId).toBeNull();
    expect(successSpy).toHaveBeenCalledWith('Temporada eliminada');
    expect(emitSpy).toHaveBeenCalled();
  });
});
