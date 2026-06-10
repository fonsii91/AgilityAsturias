import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Photo, PhotoStorageStats } from '../models/photo.model';

export interface PhotoFilters {
    category?: string;
    photo_type?: string;
    competition_id?: string | number;
    dog_id?: string | number;
    tagged_user_id?: string | number;
    search?: string;
    per_page?: number;
}

export interface PhotoUploadMetadata {
    category: string;
    competition_id?: number | null;
    taken_at: string;
    photo_type?: string | null;
    title?: string | null;
    dog_ids?: number[];
    user_ids?: number[];
}

@Injectable({
    providedIn: 'root'
})
export class PhotoService {
    private apiUrl = `${environment.apiUrl}/photos`;

    private http = inject(HttpClient);

    getPhotos(page: number = 1, filters?: PhotoFilters): Observable<any> {
        let params = new HttpParams().set('page', page.toString());
        if (filters) {
            for (const [key, value] of Object.entries(filters)) {
                if (value !== undefined && value !== null && value !== '') {
                    params = params.set(key, String(value));
                }
            }
        }
        return this.http.get<any>(this.apiUrl, { params });
    }

    uploadPhoto(displayFile: File, thumbFile: File, metadata: PhotoUploadMetadata): Observable<Photo> {
        const formData = new FormData();
        formData.append('photo', displayFile);
        formData.append('thumb', thumbFile);
        formData.append('category', metadata.category);
        formData.append('taken_at', metadata.taken_at);
        if (metadata.competition_id) {
            formData.append('competition_id', String(metadata.competition_id));
        }
        if (metadata.photo_type) {
            formData.append('photo_type', metadata.photo_type);
        }
        if (metadata.title) {
            formData.append('title', metadata.title);
        }
        (metadata.dog_ids ?? []).forEach(id => formData.append('dog_ids[]', String(id)));
        (metadata.user_ids ?? []).forEach(id => formData.append('user_ids[]', String(id)));

        return this.http.post<Photo>(this.apiUrl, formData);
    }

    updatePhoto(id: number, data: Partial<PhotoUploadMetadata>): Observable<Photo> {
        return this.http.post<Photo>(`${this.apiUrl}/${id}`, data);
    }

    deletePhoto(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/delete`, {});
    }

    untagSelf(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/untag-self`, {});
    }

    getStorageStats(): Observable<PhotoStorageStats> {
        return this.http.get<PhotoStorageStats>(`${this.apiUrl}/storage-stats`);
    }
}
