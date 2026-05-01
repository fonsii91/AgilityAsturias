import { InfoReservasComponent } from './info-reservas.component';
import { ReservationService } from '../../services/reservation.service';
import { signal, Injector, runInInjectionContext } from '@angular/core';

describe('InfoReservasComponent', () => {
    let component: InfoReservasComponent;
    let mockReservationService: any;
    let mockInjector: Injector;

    beforeEach(() => {
        // Mock data
        const mockReservations = [
            {
                id: 1,
                userId: 1,
                userName: 'Juan Perez',
                date: new Date().toISOString().split('T')[0], // Today
                startTime: '10:00:00',
                dog: { name: 'Rex', acwr_color: 'green' }
            },
            {
                id: 2,
                userId: 2,
                userName: 'Maria Lopez',
                date: new Date().toISOString().split('T')[0], // Today
                startTime: '10:00:00',
                dog: { name: 'Luna', acwr_color: 'yellow' }
            },
            {
                id: 3,
                userId: 1,
                userName: 'Juan Perez',
                date: new Date(new Date().getTime() + 86400000).toISOString().split('T')[0], // Tomorrow
                startTime: '18:00:00',
                dog: { name: 'Rex', acwr_color: 'green' }
            }
        ];

        mockReservationService = {
            getReservations: vitest.fn().mockReturnValue(signal(mockReservations))
        };

        mockInjector = Injector.create({
            providers: [
                { provide: ReservationService, useValue: mockReservationService }
            ]
        });

        runInInjectionContext(mockInjector, () => {
            component = new InfoReservasComponent();
        });
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should compute today\'s reservations and group them by time', () => {
        const todaySlots = component.todayTimeSlots();
        expect(todaySlots.length).toBe(1);
        expect(todaySlots[0].time).toBe('10:00:00');
        expect(todaySlots[0].rawCount).toBe(2);
        
        // Check user grouping
        const user1 = todaySlots[0].reservations.find((r: any) => r.userName === 'Juan Perez');
        expect(user1).toBeDefined();
        expect(user1!.selectedDogs.length).toBe(1);
        expect(user1!.selectedDogs[0].name).toBe('Rex');
    });

    it('should compute future reservations and group them by date and time', () => {
        const futureSlots = component.futureReservationsGrouped();
        expect(futureSlots.length).toBe(1); // One future date
        
        const tomorrowDate = new Date(new Date().getTime() + 86400000).toISOString().split('T')[0];
        expect(futureSlots[0].date).toBe(tomorrowDate);
        expect(futureSlots[0].totalCount).toBe(1);
        
        // Time grouping
        expect(futureSlots[0].timeSlots.length).toBe(1);
        expect(futureSlots[0].timeSlots[0].time).toBe('18:00:00');
    });

    it('should compute correct statistics for today', () => {
        const stats = component.statsHoje();
        expect(stats.totalReservas).toBe(2); // Juan Perez and Maria Lopez (2 unique users)
        expect(stats.totalPerros).toBe(2); // Rex and Luna (2 dogs/reservations)
    });
});
