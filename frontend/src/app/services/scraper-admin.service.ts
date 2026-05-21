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

  getGlobalEvents(query?: string): Observable<any[]> {
    const params: { [key: string]: string } = {};
    if (query) {
      params['q'] = query;
    }
    return this.http.get<any[]>(`${this.apiUrl}/global-events`, { params });
  }

  detectEvent(url: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/detect-event`, { params: { url } });
  }

  runCalendarScraper(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/run-calendar`, {});
  }
}
