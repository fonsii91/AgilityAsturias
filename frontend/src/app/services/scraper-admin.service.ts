import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScraperAdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/scraper`;

  getPastCompetitions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/status`);
  }

  runScraper(competitionId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/run`, { competition_id: competitionId });
  }

  getLastScrapedTracks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/last-tracks`);
  }
}
