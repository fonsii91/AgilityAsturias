import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface GalleryPhoto {
    id: number;
    url: string;
    alt: string;
    created_at?: string;
}

@Injectable({
    providedIn: 'root'
})
export class GalleryService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    getPhotos(): Observable<GalleryPhoto[]> {
        return this.http.get<GalleryPhoto[]>(`${this.apiUrl}/gallery`);
    }

    uploadPhoto(photo: File, alt?: string): Observable<GalleryPhoto> {
        const formData = new FormData();
        formData.append('photo', photo);
        if (alt) {
            formData.append('alt', alt);
        }

        return this.http.post<GalleryPhoto>(`${this.apiUrl}/gallery`, formData);
    }

    deletePhoto(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/gallery/${id}`);
    }
}
