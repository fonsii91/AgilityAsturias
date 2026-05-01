import { TestBed } from '@angular/core/testing';
import { RankingComponent } from './ranking.component';
import { ReservationService } from '../../services/reservation.service';
import { AuthService } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';
import { ToastService } from '../../services/toast.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

class MockReservationService {
  getRanking() { return of([]); }
}
class MockAuthService { currentUser = { id: 1, name: 'Test User' }; }
class MockDogService { updateDog(id: number, data: any) { return Promise.resolve(data); } }
class MockToastService { success(msg: string) {} error(msg: string) {} }

describe('RankingComponent', () => {
  let component: RankingComponent;
  let reservationService: ReservationService;
  let toastService: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ReservationService, useClass: MockReservationService },
        { provide: AuthService, useClass: MockAuthService },
        { provide: DogService, useClass: MockDogService },
        { provide: ToastService, useClass: MockToastService }
      ]
    });

    reservationService = TestBed.inject(ReservationService);
    toastService = TestBed.inject(ToastService);

    TestBed.runInInjectionContext(() => {
      component = new RankingComponent();
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load ranking on init', () => {
    const mockRankingData = [
      { id: 1, name: 'Fido', points: 100, position_change: 1, point_histories: [] },
      { id: 2, name: 'Rex', points: 50, position_change: 'NEW', point_histories: [] }
    ];
    vi.spyOn(reservationService, 'getRanking').mockReturnValue(of(mockRankingData));

    component.loadRanking();

    expect(component.ranking().length).toBe(2);
    expect(component.ranking()[0].name).toBe('Fido');
    expect(component.isLoading()).toBe(false);
  });

  it('should calculate medals correctly', () => {
    expect(component.getMedal(0)).toBe('🥇');
    expect(component.getMedal(1)).toBe('🥈');
    expect(component.getMedal(2)).toBe('🥉');
    expect(component.getMedal(3)).toBe('');
  });

  it('should verify hasDogUser correctly', () => {
    const dog = { users: [{ id: 1 }, { id: 2 }] };
    expect(component.hasDogUser(dog, 1)).toBe(true);
    expect(component.hasDogUser(dog, 3)).toBe(false);
    expect(component.hasDogUser(null, 1)).toBe(false);
  });

  it('should get owner names', () => {
    const dog = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
    expect(component.getOwnerNames(dog)).toBe('Alice & Bob');
  });

  it('should handle API errors gracefully', () => {
    vi.spyOn(reservationService, 'getRanking').mockReturnValue(throwError(() => new Error('API Error')));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    component.loadRanking();

    expect(console.error).toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);
  });

  it('should open and close modal manually', () => {
    const dog = { id: 1, name: 'Buddy' };
    
    // Mock the body to not throw when changing styles
    Object.defineProperty(document, 'body', { value: { style: { overflow: '' } } });

    component.openFicha(dog);

    expect(component.selectedDogModal()).toEqual(dog);
    expect(component.fichaModalOpen()).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    component.closeFicha();

    expect(component.selectedDogModal()).toBeNull();
    expect(component.fichaModalOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('auto');
  });
});
