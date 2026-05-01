import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { GestionarReservasComponent } from './gestionar-reservas.component';
import { AuthService } from '../../services/auth.service';
import { ReservationService } from '../../services/reservation.service';
import { DogService } from '../../services/dog.service';
import { TimeSlotService } from '../../services/time-slot.service';
import { ToastService } from '../../services/toast.service';

describe('GestionarReservasComponent (Exceptions)', () => {
    let mockAuthService: any;
    let mockReservationService: any;
    let mockDogService: any;
    let mockTimeSlotService: any;
    let mockToastService: any;

    beforeEach(() => {
        let mockExceptionsSignal = signal<any[]>([]);
        let mockReservationsSignal = signal<any[]>([]);
        let mockAvailabilitySignal = signal<any[]>([]);

        mockAuthService = {
            currentUserSignal: signal({ id: 1, role: 'staff', name: 'Admin' }),
            getMinimalUsers: vi.fn().mockResolvedValue([])
        };

        mockReservationService = {
            getReservations: () => mockReservationsSignal,
            getAvailability: () => mockAvailabilitySignal,
            getExceptions: () => mockExceptionsSignal,
            addException: vi.fn().mockResolvedValue({}),
            deleteException: vi.fn().mockResolvedValue({}),
            _mockExceptionsSignal: mockExceptionsSignal
        };

        let mockDogsSignal = signal<any[]>([]);
        let mockAllDogsSignal = signal<any[]>([]);

        mockDogService = {
            getDogs: () => mockDogsSignal,
            getAllDogs: () => mockAllDogsSignal,
            loadUserDogs: vi.fn(),
            loadAllDogs: vi.fn()
        };

        let mockTimeSlotsSignal = signal<any[]>([]);
        
        mockTimeSlotService = {
            getTimeSlots: () => mockTimeSlotsSignal,
            _mockTimeSlotsSignal: mockTimeSlotsSignal
        };

        mockToastService = {
            success: vi.fn(),
            error: vi.fn(),
            warning: vi.fn(),
            info: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: mockAuthService },
                { provide: ReservationService, useValue: mockReservationService },
                { provide: DogService, useValue: mockDogService },
                { provide: TimeSlotService, useValue: mockTimeSlotService },
                { provide: ToastService, useValue: mockToastService }
            ]
        });
    });

    it('should correctly identify a cancelled slot based on exceptions', () => {
        TestBed.runInInjectionContext(() => {
            // Set up a time slot for today
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const todayStr = `${yyyy}-${mm}-${dd}`;
            
            const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const todayName = daysMap[now.getDay()];

            mockTimeSlotService._mockTimeSlotsSignal.set([
                { id: 10, start_time: '10:00', end_time: '11:00', day: todayName, max_bookings: 10 }
            ]);

            // Add an exception for this slot
            mockReservationService._mockExceptionsSignal.set([
                { slot_id: 10, date: todayStr + ' 00:00:00', reason: 'Holiday' }
            ]);

            const component = new GestionarReservasComponent();
            const computedSlots = component.slots();

            expect(computedSlots.length).toBeGreaterThan(0);
            expect(computedSlots[0].isCancelled).toBe(true);
        });
    });

    it('should call addException when confirming a toggle on an uncancelled slot', async () => {
        await TestBed.runInInjectionContext(async () => {
            const component = new GestionarReservasComponent();
            
            // Mock slot to toggle
            component.slotToToggle = { id: 10, date: '2026-10-10', start_time: '10:00', end_time: '11:00', day: 'Lunes', max_bookings: 10, currentBookings: 0, isBookedByCurrentUser: false, isCancelled: false };
            
            await component.confirmStaffToggle();

            expect(mockReservationService.addException).toHaveBeenCalledWith(10, '2026-10-10', 'Cancelada por el staff');
            expect(mockToastService.success).toHaveBeenCalledWith('Clase cancelada con éxito.');
            expect(component.isStaffCancelModalOpen).toBe(false);
        });
    });

    it('should call deleteException when confirming a toggle on a cancelled slot', async () => {
        await TestBed.runInInjectionContext(async () => {
            const component = new GestionarReservasComponent();
            
            // Mock slot to toggle as cancelled
            component.slotToToggle = { id: 10, date: '2026-10-10', start_time: '10:00', end_time: '11:00', day: 'Lunes', max_bookings: 10, currentBookings: 0, isBookedByCurrentUser: false, isCancelled: true };
            
            await component.confirmStaffToggle();

            expect(mockReservationService.deleteException).toHaveBeenCalledWith(10, '2026-10-10');
            expect(mockToastService.success).toHaveBeenCalledWith('Clase restaurada con éxito.');
            expect(component.isStaffCancelModalOpen).toBe(false);
        });
    });
});
