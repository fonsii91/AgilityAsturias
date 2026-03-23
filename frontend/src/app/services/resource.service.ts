import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Resource {
  id: number;
  title: string;
  description?: string;
  type: 'document' | 'video' | 'link';
  url?: string;
  file_path?: string;
  category: string;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
  uploader?: {
    id: number;
    name: string;
    last_name: string;
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

@Injectable({
  providedIn: 'root'
})
export class ResourceService {
  private apiUrl = environment.apiUrl + '/resources';

  constructor(private http: HttpClient) {}

  getResources(category?: string): Observable<Resource[]> {
    let url = this.apiUrl;
    if (category) {
      url += `?category=${category}`;
    }
    return this.http.get<Resource[]>(url);
  }

  createResource(data: FormData): Observable<Resource> {
    return this.http.post<Resource>(this.apiUrl, data);
  }

  updateResource(id: number, data: FormData): Observable<Resource> {
    return this.http.post<Resource>(`${this.apiUrl}/${id}`, data);
  }

  deleteResource(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/delete`, {});
  }
}
