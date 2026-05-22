import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LigaNorteService {
  private http = inject(HttpClient);
  private adminApiUrl = `${environment.apiUrl}/admin/liga-norte`;
  private publicApiUrl = `${environment.apiUrl}/liga-norte`;

  getImports(): Observable<any[]> {
    return this.http.get<any[]>(`${this.adminApiUrl}/imports`);
  }

  processImport(id: number): Observable<any> {
    return this.http.post<any>(`${this.adminApiUrl}/imports/${id}/process`, {});
  }

  approveImport(id: number, rows: any[]): Observable<any> {
    return this.http.post<any>(`${this.adminApiUrl}/imports/${id}/approve`, { rows });
  }

  deleteImport(id: number): Observable<any> {
    return this.http.post<any>(`${this.adminApiUrl}/imports/${id}/delete`, {});
  }

  getStandings(clase?: number, tipo?: string): Observable<any[]> {
    const params: { [key: string]: string } = {};
    if (clase) {
      params['clase'] = clase.toString();
    }
    if (tipo) {
      params['tipo'] = tipo;
    }
    return this.http.get<any[]>(`${this.publicApiUrl}/standings`, { params });
  }
}
