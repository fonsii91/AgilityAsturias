import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Video } from '../models/video.model';

@Injectable({
    providedIn: 'root'
})
export class VideoService {
    private apiUrl = `${environment.apiUrl}/videos`;

    constructor(private http: HttpClient) { }

    getVideos(page: number = 1, filters?: { search?: string, date?: string, category?: string, sort?: string, dateRange?: string, dog_id?: string, competition_id?: string, orientation?: string }): Observable<any> {
        let params = new HttpParams().set('page', page.toString());
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
        return this.http.post<Video>(this.apiUrl, formData);
    }

    deleteVideo(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/delete`, {});
    }

    updateVideo(id: number, data: any): Observable<Video> {
        return this.http.post<Video>(`${this.apiUrl}/${id}`, data);
    }

    toggleLike(id: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/${id}/toggle-like`, {});
    }

    getAdminVideoStats(): Observable<any> {
        return this.http.get<any>(`${environment.apiUrl}/admin/videos/stats`);
    }

    retryVideoUpload(id: number): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/admin/videos/${id}/retry`, {});
    }

    getPublicVideos(page: number = 1): Observable<any> {
        return this.http.get<any>(`${environment.apiUrl}/public-videos?page=${page}`);
    }

    togglePublicGallery(id: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/${id}/toggle-public-gallery`, {});
    }
}
