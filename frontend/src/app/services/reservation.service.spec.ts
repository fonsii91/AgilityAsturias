import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ReservationService } from './reservation.service';
import { environment } from '../../environments/environment';

describe('ReservationService', () => {
    let service: ReservationService;
    let httpMock: HttpTestingController;

    const mockBackendReservations = [
        {
            id: 1,
            slot_id: 2,
            user_id: 3,
            date: '2026-03-01T00:00:00.000000Z',
            dog_id: 4,
            status: 'active',
            user: { name: 'Test User', email: 'test@example.com' },
            time_slot: { day: 'Lunes', start_time: '10:00:00' },
            dog: { name: 'Firulais' }
        }
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ReservationService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(ReservationService);
        httpMock = TestBed.inject(HttpTestingController);

        // Flushes initialization requests from constructor
        const reqsRes = httpMock.match(`${environment.apiUrl}/reservations`);
        if (reqsRes.length) reqsRes[0].flush([]);
        const reqsAv = httpMock.match(`${environment.apiUrl}/availability`);
        if (reqsAv.length) reqsAv[0].flush([]);
    });

    it('should map fetchReservations from backend format to frontend Reservation model', () => {
        service.fetchReservations();

        const req = httpMock.expectOne(`${environment.apiUrl}/reservations`);
        expect(req.request.method).toBe('GET');

        req.flush(mockBackendReservations);

        const reservations = service.getReservations()();
        expect(reservations.length).toBe(1);
        const res = reservations[0];

        // Assert mapped properties
        expect(res.id).toBe(1);
        expect(res.slotId).toBe(2);
        expect(res.userId).toBe(3);
        expect(res.date).toBe('2026-03-01'); // Stripped timestamp
        expect(res.dogId).toBe(4);
        expect(res.userName).toBe('Test User');
        expect(res.day).toBe('Lunes');
        expect(res.startTime).toBe('10:00:00');
        expect(res.dog?.name).toBe('Firulais');
    });

    it('should map addReservation payload cleanly and send to store endpoint', async () => {
        const payload = {
            slotId: 10,
            userId: 20,
            date: '2026-04-01',
            dogIds: [5, 6]
        };

        // We don't wait for the promise entirely yet, we trigger it then flush
        const promise = service.addReservation(payload);

        const req = httpMock.expectOne(`${environment.apiUrl}/reservations`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            slot_id: 10,
            user_id: 20,
            date: '2026-04-01',
            dog_ids: [5, 6]
        });

        // Backend will return an array of created reservations
        req.flush([
            { ...mockBackendReservations[0], id: 100, dog_id: 5 },
            { ...mockBackendReservations[0], id: 101, dog_id: 6 }
        ]);

        // Expect fetchAvailability to be called after addReservation
        const avReq = httpMock.expectOne(`${environment.apiUrl}/availability`);
        avReq.flush([]);

        const result = await promise;
        expect(result.length).toBe(2);
        expect(result[0].id).toBe(100);
        expect(result[1].id).toBe(101);
    });

    it('should delete blocks correctly with correct query params', async () => {
        const promise = service.deleteBlock(15, '2026-05-01');

        const req = httpMock.expectOne(`${environment.apiUrl}/reservations/block?slot_id=15&date=2026-05-01`);
        expect(req.request.method).toBe('DELETE');

        req.flush(null); // No content

        // It will trigger fetches again
        const resReq = httpMock.expectOne(`${environment.apiUrl}/reservations`);
        resReq.flush([]);
        const avReq = httpMock.expectOne(`${environment.apiUrl}/availability`);
        avReq.flush([]);

        await promise;
        // if no throw, we pass
        expect(true).toBe(true);
    });
});
