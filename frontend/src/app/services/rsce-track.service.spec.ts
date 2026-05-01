import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RsceTrackService } from './rsce-track.service';
import { environment } from '../../environments/environment';
import { RsceTrack, AdminRsceStats } from '../models/rsce-track.model';

describe('RsceTrackService', () => {
  let service: RsceTrackService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RsceTrackService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(RsceTrackService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get tracks via GET', () => {
    const dummyTracks: RsceTrack[] = [
      { id: 1, dog_id: 1, date: '2023-01-01', manga_type: 'Agility', qualification: 'EXC' },
      { id: 2, dog_id: 1, date: '2023-01-02', manga_type: 'Jumping', qualification: 'MB' }
    ];

    service.getTracks().subscribe(tracks => {
      expect(tracks.length).toBe(2);
      expect(tracks).toEqual(dummyTracks);
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/rsce-tracks`);
    expect(request.request.method).toBe('GET');
    request.flush(dummyTracks);
  });

  it('should add track via POST', () => {
    const newTrack: RsceTrack = { dog_id: 1, date: '2023-01-01', manga_type: 'Agility', qualification: 'EXC' };
    const returnedTrack: RsceTrack = { id: 3, ...newTrack };

    service.addTrack(newTrack).subscribe(track => {
      expect(track).toEqual(returnedTrack);
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/rsce-tracks`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(newTrack);
    request.flush(returnedTrack);
  });

  it('should update track via POST', () => {
    const updateData: Partial<RsceTrack> = { qualification: 'MB' };
    const returnedTrack: RsceTrack = { id: 1, dog_id: 1, date: '2023-01-01', manga_type: 'Agility', qualification: 'MB' };

    service.updateTrack(1, updateData).subscribe(track => {
      expect(track).toEqual(returnedTrack);
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/rsce-tracks/1`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(updateData);
    request.flush(returnedTrack);
  });

  it('should delete track via POST', () => {
    service.deleteTrack(1).subscribe(res => {
      expect(res).toBeNull();
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/rsce-tracks/1/delete`);
    expect(request.request.method).toBe('POST');
    request.flush(null);
  });

  it('should get admin monitor data via GET', () => {
    const dummyStats: AdminRsceStats[] = [
      { user_id: 1, name: 'John', email: 'john@example.com', total_tracks: 5, dogs_list: ['Fido'] }
    ];

    service.getAdminMonitorData().subscribe(stats => {
      expect(stats).toEqual(dummyStats);
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/admin/rsce/monitor`);
    expect(request.request.method).toBe('GET');
    request.flush(dummyStats);
  });
});
