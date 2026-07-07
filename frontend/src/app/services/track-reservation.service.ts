import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { TrainingTrackSurface } from '../models/training-track.model';

export type TrackSlotStatus = 'free' | 'class' | 'booked' | 'mine';

export interface TrackSlotAvailability {
    start_time: string;
    end_time: string;
    status: TrackSlotStatus;
    class_name?: string | null;
    reservation_id?: number;
    reserved_by?: string | null;
}

export interface TrackAvailability {
    id: number;
    name: string;
    surface: TrainingTrackSurface;
    photo_url?: string | null;
    slots: TrackSlotAvailability[];
}

export interface TrackBookingAvailabilityResponse {
    date: string;
    tracks: TrackAvailability[];
}

export interface MyTrackReservation {
    id: number;
    date: string;
    start_time: string;
    end_time: string;
    training_track?: { id: number; name: string; surface: string; photo_url?: string | null } | null;
}

/**
 * Reserva individual de pistas para entrenamientos libres (módulo opt-in del
 * club). La disponibilidad se calcula por pista y fecha en el backend.
 */
@Injectable({
    providedIn: 'root'
})
export class TrackReservationService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/track-bookings`;

    getAvailability(date: string) {
        return new Promise<TrackBookingAvailabilityResponse>((resolve, reject) => {
            this.http.get<TrackBookingAvailabilityResponse>(`${this.apiUrl}/availability`, { params: { date } }).subscribe({
                next: (res) => resolve(res),
                error: (err) => reject(err)
            });
        });
    }

    getMyReservations() {
        return new Promise<MyTrackReservation[]>((resolve, reject) => {
            this.http.get<MyTrackReservation[]>(`${this.apiUrl}/my`).subscribe({
                next: (res) => resolve(res),
                error: (err) => reject(err)
            });
        });
    }

    reserve(trainingTrackId: number, date: string, startTime: string) {
        return new Promise<MyTrackReservation>((resolve, reject) => {
            this.http.post<MyTrackReservation>(this.apiUrl, {
                training_track_id: trainingTrackId,
                date,
                start_time: startTime
            }).subscribe({
                next: (res) => resolve(res),
                error: (err) => reject(err)
            });
        });
    }

    cancel(id: number) {
        return new Promise<void>((resolve, reject) => {
            this.http.post<void>(`${this.apiUrl}/${id}/delete`, {}).subscribe({
                next: () => resolve(),
                error: (err) => reject(err)
            });
        });
    }
}
