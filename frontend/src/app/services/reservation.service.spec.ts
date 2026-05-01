import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReservationService } from './reservation.service';
import { environment } from '../../environments/environment';

describe('ReservationService (Exceptions)', () => {
    let service: ReservationService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [ReservationService]
        });
        service = TestBed.inject(ReservationService);
        httpMock = TestBed.inject(HttpTestingController);

        // Ensure we flush the initial calls in the constructor
        const reqExceptions = httpMock.expectOne(`${environment.apiUrl}/time-slot-exceptions`);
        reqExceptions.flush([]);

        const reqReservations = httpMock.expectOne(`${environment.apiUrl}/reservations`);
        reqReservations.flush([]);

        const reqAvailability = httpMock.expectOne(`${environment.apiUrl}/availability`);
        reqAvailability.flush([]);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should fetch exceptions and update the signal', () => {
        const mockExceptions = [
            { id: 1, slot_id: 2, date: '2026-05-04', reason: 'Festivo' }
        ];

        service.fetchExceptions();
        const req = httpMock.expectOne(`${environment.apiUrl}/time-slot-exceptions`);
        expect(req.request.method).toBe('GET');
        req.flush(mockExceptions);

        expect(service.getExceptions()()).toEqual(mockExceptions);
    });

    it('should add an exception and refresh the list', () => {
        const slotId = 5;
        const date = '2026-10-10';
        const reason = 'Mantenimiento';

        service.addException(slotId, date, reason);

        const postReq = httpMock.expectOne(`${environment.apiUrl}/time-slot-exceptions`);
        expect(postReq.request.method).toBe('POST');
        expect(postReq.request.body).toEqual({ slot_id: slotId, date, reason });
        postReq.flush({});

        // Expect fetchExceptions to be called automatically after adding
        const fetchReq = httpMock.expectOne(`${environment.apiUrl}/time-slot-exceptions`);
        expect(fetchReq.request.method).toBe('GET');
        fetchReq.flush([{ id: 1, slot_id: 5, date: '2026-10-10', reason: 'Mantenimiento' }]);

        expect(service.getExceptions()()[0].reason).toBe('Mantenimiento');
    });

    it('should delete an exception and refresh the list', () => {
        const slotId = 5;
        const date = '2026-10-10';

        service.deleteException(slotId, date);

        const postReq = httpMock.expectOne(`${environment.apiUrl}/time-slot-exceptions/delete`);
        expect(postReq.request.method).toBe('POST');
        expect(postReq.request.body).toEqual({ slot_id: slotId, date });
        postReq.flush({});

        // Expect fetchExceptions to be called automatically after deleting
        const fetchReq = httpMock.expectOne(`${environment.apiUrl}/time-slot-exceptions`);
        expect(fetchReq.request.method).toBe('GET');
        fetchReq.flush([]);

        expect(service.getExceptions()().length).toBe(0);
    });
});
