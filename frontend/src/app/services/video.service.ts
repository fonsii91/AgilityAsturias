import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AnalyticsService } from './analytics.service';
import { Video } from '../models/video.model';

@Injectable({
    providedIn: 'root'
})
export class VideoService {
    private apiUrl = `${environment.apiUrl}/videos`;

    private http = inject(HttpClient);
    private analytics = inject(AnalyticsService);

    getVideos(page: number = 1, filters?: { search?: string, date?: string, category?: string, sort?: string, dateRange?: string, dog_id?: string, competition_id?: string, orientation?: string, per_page?: number }): Observable<any> {
        let params = new HttpParams().set('page', page.toString());
        if (filters?.per_page) {
            params = params.set('per_page', filters.per_page.toString());
        }
        if (filters?.search) {
            params = params.set('search', filters.search);
        }
        if (filters?.orientation) {
            params = params.set('orientation', filters.orientation);
        }
        if (filters?.date) {
            params = params.set('date', filters.date);
        }
        if (filters?.category) {
            params = params.set('category', filters.category);
        }
        if (filters?.sort) {
            params = params.set('sort', filters.sort);
        }
        if (filters?.dateRange) {
            params = params.set('dateRange', filters.dateRange);
        }
        if (filters?.dog_id) {
            params = params.set('dog_id', filters.dog_id);
        }
        if (filters?.competition_id) {
            params = params.set('competition_id', filters.competition_id);
        }
        return this.http.get<any>(this.apiUrl, { params });
    }

    uploadVideo(formData: FormData): Observable<Video> {
        return this.http.post<Video>(this.apiUrl, formData).pipe(
            tap(() => this.analytics.logVideoInteraction('uploaded'))
        );
    }

    deleteVideo(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/delete`, {}).pipe(
            tap(() => this.analytics.logVideoInteraction('deleted'))
        );
    }

    updateVideo(id: number, data: any): Observable<Video> {
        return this.http.post<Video>(`${this.apiUrl}/${id}`, data).pipe(
            tap(() => this.analytics.logVideoInteraction('edited'))
        );
    }

    toggleLike(id: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/${id}/toggle-like`, {}).pipe(
            // Asumimos interacción genérica de like/unlike, el endpoint hace toggle
            tap(() => this.analytics.logVideoInteraction('liked'))
        );
    }

    getAdminVideoStats(): Observable<any> {
        return this.http.get<any>(`${environment.apiUrl}/admin/videos/stats`);
    }

    getAdminDailyVideoStats(): Observable<any[]> {
        return this.http.get<any[]>(`${environment.apiUrl}/admin/videos/daily-history`);
    }

    getDeletedVideosHistory(page: number = 1): Observable<any> {
        return this.http.get<any>(`${environment.apiUrl}/admin/deleted-videos?page=${page}`);
    }

    retryVideoUpload(id: number): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/admin/videos/${id}/retry`, {});
    }

    getPublicVideos(page: number = 1): Observable<any> {
        return this.http.get<any>(`${environment.apiUrl}/public-videos?page=${page}`);
    }

    togglePublicGallery(id: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/${id}/toggle-public-gallery`, {}).pipe(
            tap(() => this.analytics.logVideoInteraction('approved'))
        );
    }
}
