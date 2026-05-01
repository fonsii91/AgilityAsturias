import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Suggestion } from '../models/suggestion.model';

@Injectable({
  providedIn: 'root'
})
export class SuggestionService {
  private apiUrl = `${environment.apiUrl}`;
  
  // Opcional, mantenerlo local
  public suggestionsSignal = signal<Suggestion[]>([]);

  private http = inject(HttpClient);

  /**
   * Obtener todas las sugerencias (Admin)
   */
  getSuggestions(): Observable<Suggestion[]> {
    return this.http.get<Suggestion[]>(`${this.apiUrl}/admin/suggestions`);
  }

  /**
   * Crear nueva sugerencia/bug
   */
  createSuggestion(data: { type: 'bug' | 'suggestion', content: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/suggestions`, data);
  }

  /**
   * Marcar reporte como resuelto (Admin)
   */
  resolveSuggestion(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/suggestions/${id}/resolve`, {});
  }

  /**
   * Marcar reporte como no resuelto (Admin)
   */
  unresolveSuggestion(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/suggestions/${id}/unresolve`, {});
  }
}
