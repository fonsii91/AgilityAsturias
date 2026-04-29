import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService Profile Update', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [AuthService]
        });

        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should send FormData to updateProfile and refresh user', async () => {
        const mockUser = {
            id: 1,
            name: 'Updated Name',
            email: 'test@example.com',
            role: 'user',
            rfec_license: 'LIC-123',
            rfec_expiration_date: '2025-12-31'
        };

        const updatePromise = service.updateProfile('Updated Name', undefined, 'LIC-123', '2025-12-31');

        // First request is the POST to update profile
        const req = httpMock.expectOne(`${environment.apiUrl}/user/profile`);
        expect(req.request.method).toBe('POST');
        
        // Assert FormData contents
        const body = req.request.body as FormData;
        expect(body.get('name')).toBe('Updated Name');
        expect(body.get('rfec_license')).toBe('LIC-123');
        expect(body.get('rfec_expiration_date')).toBe('2025-12-31');
        
        req.flush({ message: 'Success' });
        await Promise.resolve(); // let microtasks run

        // Second request is the fetchUser() call inside updateProfile
        const fetchReq = httpMock.expectOne(`${environment.apiUrl}/user`);
        expect(fetchReq.request.method).toBe('GET');
        fetchReq.flush(mockUser);

        await updatePromise;

        // Check if signal was updated
        expect(service.currentUserSignal()?.name).toBe('Updated Name');
        expect(service.currentUserSignal()?.rfec_license).toBe('LIC-123');
    });

    it('should include photo in FormData when updating profile', async () => {
        const file = new File(['dummy content'], 'avatar.jpg', { type: 'image/jpeg' });
        
        const updatePromise = service.updateProfile('Name', file);

        const req = httpMock.expectOne(`${environment.apiUrl}/user/profile`);
        expect(req.request.method).toBe('POST');
        
        const body = req.request.body as FormData;
        expect(body.get('name')).toBe('Name');
        expect(body.get('photo')).toBe(file);
        
        req.flush({ message: 'Success' });
        await Promise.resolve();

        const fetchReq = httpMock.expectOne(`${environment.apiUrl}/user`);
        fetchReq.flush({ id: 1, name: 'Name', email: 'test@example.com', role: 'user' });

        await updatePromise;
    });
});
