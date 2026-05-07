import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AnalyticsService } from './analytics.service';

export interface Announcement {
  id: number;
  user_id: number;
  title: string;
  content: string;
  is_pinned?: boolean;
  category?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    role?: string;
  };
  reads_count?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {
  private apiUrl = `${environment.apiUrl}`;
  
  private http = inject(HttpClient);
  private analytics = inject(AnalyticsService);

  getAnnouncements(): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${this.apiUrl}/announcements`);
  }

  createAnnouncement(data: { title: string, content: string, is_pinned?: boolean, category: string, notify_all?: boolean, notify_users?: number[] }): Observable<Announcement> {
    return this.http.post<Announcement>(`${this.apiUrl}/announcements`, data).pipe(
      tap(() => this.analytics.logStaffAction('announcement_created'))
    );
  }

  markAsRead(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/announcements/${id}/read`, {}).pipe(
      tap(() => this.analytics.logCommunication('announcement_read'))
    );
  }

  deleteAnnouncement(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/announcements/${id}`).pipe(
      tap(() => this.analytics.logStaffAction('announcement_deleted'))
    );
  }
}
