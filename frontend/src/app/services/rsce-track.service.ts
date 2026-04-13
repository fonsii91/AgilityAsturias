import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RsceTrack } from '../models/rsce-track.model';

@Injectable({
  providedIn: 'root'
})
export class RsceTrackService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/rsce-tracks`;

  getTracks(): Observable<RsceTrack[]> {
    return this.http.get<RsceTrack[]>(this.apiUrl);
  }

  addTrack(track: RsceTrack): Observable<RsceTrack> {
    return this.http.post<RsceTrack>(this.apiUrl, track);
  }

  updateTrack(id: number, track: Partial<RsceTrack>): Observable<RsceTrack> {
    return this.http.post<RsceTrack>(`${this.apiUrl}/${id}`, track);
  }

  deleteTrack(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/delete`, {});
  }
}
