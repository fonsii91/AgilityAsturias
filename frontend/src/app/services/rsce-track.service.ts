import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AnalyticsService } from './analytics.service';
import { RsceTrack, AdminRsceStats } from '../models/rsce-track.model';

@Injectable({
  providedIn: 'root'
})
export class RsceTrackService {
  private http = inject(HttpClient);
  private analytics = inject(AnalyticsService);
  private apiUrl = `${environment.apiUrl}/rsce-tracks`;

  getTracks(): Observable<RsceTrack[]> {
    return this.http.get<RsceTrack[]>(this.apiUrl);
  }

  addTrack(track: RsceTrack): Observable<RsceTrack> {
    return this.http.post<RsceTrack>(this.apiUrl, track).pipe(
      tap(() => this.analytics.logRSCE('log_added'))
    );
  }

  updateTrack(id: number, track: Partial<RsceTrack>): Observable<RsceTrack> {
    return this.http.post<RsceTrack>(`${this.apiUrl}/${id}`, track).pipe(
      tap(() => this.analytics.logRSCE('log_edited'))
    );
  }

  deleteTrack(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/delete`, {}).pipe(
      tap(() => this.analytics.logRSCE('log_deleted'))
    );
  }

  getAdminMonitorData(): Observable<AdminRsceStats[]> {
    return this.http.get<AdminRsceStats[]>(`${environment.apiUrl}/admin/rsce/monitor`);
  }
}
