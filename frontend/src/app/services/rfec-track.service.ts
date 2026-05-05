import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RfecTrack } from '../models/rfec-track.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RfecTrackService {
  private apiUrl = environment.apiUrl + '/rfec-tracks';

  public tracks = signal<RfecTrack[]>([]);

  constructor(private http: HttpClient) { }

  loadTracks() {
    this.http.get<RfecTrack[]>(this.apiUrl).subscribe(data => {
      this.tracks.set(data);
    });
  }

  addTrack(track: RfecTrack) {
    return this.http.post<RfecTrack>(this.apiUrl, track).toPromise();
  }

  updateTrack(track: RfecTrack) {
    return this.http.post<RfecTrack>(`${this.apiUrl}/${track.id}`, track).toPromise();
  }

  deleteTrack(id: number) {
    return this.http.post(`${this.apiUrl}/${id}/delete`, {}).toPromise();
  }
}
