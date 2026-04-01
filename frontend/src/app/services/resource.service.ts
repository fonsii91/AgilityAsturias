import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Resource {
  id: number;
  title: string;
  description: string;
  type: 'document' | 'video' | 'link';
  category: string;
  level: string;
  url: string | null;
  file_path: string | null;
  user_id: number;
  created_at: string;
  updated_at: string;
  uploader?: {
    id: number;
    name: string;
    role: string;
  };
}

export const RESOURCE_CATEGORIES = [
  { value: 'dietas', label: 'Dietas' },
  { value: 'entrenamientos', label: 'Entrenamientos' },
  { value: 'consejos', label: 'Consejos' },
  { value: 'documentos_oficiales', label: 'Documentos Oficiales' },
  { value: 'otros', label: 'Otros' }
];

export const RESOURCE_LEVELS = [
  { value: 'all', label: 'Todos los niveles' },
  { value: 'iniciacion', label: 'Iniciación' },
  { value: 'grado1', label: 'Grado 1' },
  { value: 'grado2', label: 'Grado 2' },
  { value: 'grado3', label: 'Grado 3' }
];

@Injectable({
  providedIn: 'root'
})
export class ResourceService {
  private apiUrl = environment.apiUrl + '/resources';
  private cache = new Map<string, Observable<Resource[]>>();

  constructor(private http: HttpClient) {}

  getResources(category?: string, level?: string): Observable<Resource[]> {
    let url = this.apiUrl;
    const params: string[] = [];
    if (category) params.push(`category=${category}`);
    if (level) params.push(`level=${level}`);

    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    
    if (!this.cache.has(url)) {
      this.cache.set(url, this.http.get<Resource[]>(url).pipe(
          shareReplay(1)
      ));
    }
    return this.cache.get(url)!;
  }

  clearCache(): void {
      this.cache.clear();
  }

  createResource(data: FormData): Observable<Resource> {
    this.clearCache();
    return this.http.post<Resource>(this.apiUrl, data);
  }

  updateResource(id: number, data: FormData): Observable<Resource> {
    this.clearCache();
    return this.http.post<Resource>(`${this.apiUrl}/${id}`, data);
  }

  deleteResource(id: number): Observable<any> {
    this.clearCache();
    return this.http.post(`${this.apiUrl}/${id}/delete`, {});
  }
}
