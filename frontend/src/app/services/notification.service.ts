import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, tap } from 'rxjs';

export interface AppNotification {
    id: string;
    type: string;
    notifiable_type: string;
    notifiable_id: number;
    data: {
        message: string;
        competition_id?: number;
        dog_id?: number;
        nombre?: string;
        type?: string;
        action_url?: string;
    };
    read_at: string | null;
    created_at: string;
    updated_at: string;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/notifications`;

    notificationsSignal = signal<AppNotification[]>([]);
    unreadCountSignal = signal<number>(0);

    loadNotifications() {
        this.http.get<AppNotification[]>(this.apiUrl).subscribe({
            next: (data) => {
                this.notificationsSignal.set(data);
                this.unreadCountSignal.set(data.length);
            },
            error: (err) => {
                // If it's a 403 Forbidden, it just means the user doesn't have permissions (e.g. they are a basic rule 'user')
                // We shouldn't show a console error for this, we just ignore it.
                if (err.status !== 403) {
                    console.error('Error fetching notifications:', err);
                }
            }
        });
    }

    markAsRead(id: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/read`, { _method: 'PUT' }).pipe(
            tap(() => {
                const currentList = this.notificationsSignal().filter(n => n.id !== id);
                this.notificationsSignal.set(currentList);
                this.unreadCountSignal.set(currentList.length);
            })
        );
    }

    markAllAsRead(): Observable<any> {
        return this.http.post(`${this.apiUrl}/mark-all-read`, { _method: 'PUT' }).pipe(
            tap(() => {
                this.notificationsSignal.set([]);
                this.unreadCountSignal.set(0);
            })
        );
    }
}
