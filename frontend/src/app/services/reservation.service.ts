import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Reservation } from '../models/reservation.model';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ReservationService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/reservations`;

    // Maintain signal for reactivity
    private reservationsSignal = signal<Reservation[]>([]);

    // Availability Signal
    private availabilitySignal = signal<{ slot_id: number, date: string, count: number, attendees: any[] }[]>([]);

    constructor() {
        this.fetchReservations();
        this.fetchAvailability();
    }

    fetchReservations() {
        this.http.get<any[]>(this.apiUrl).subscribe({
            next: (data) => {
                const mapped = data.map(item => this.mapFromBackend(item));
                this.reservationsSignal.set(mapped);
            },
            error: (err) => console.error('Error fetching reservations', err)
        });
    }

    fetchAvailability() {
        this.http.get<any[]>(`${environment.apiUrl}/availability`).subscribe({
            next: (data) => {
                this.availabilitySignal.set(data);
            },
            error: (err) => console.error('Error fetching availability', err)
        });
    }

    getReservations() {
        return this.reservationsSignal;
    }

    getAvailability() {
        return this.availabilitySignal;
    }

    addReservation(res: Omit<Reservation, 'id'>) {
        const payload = this.mapToBackend(res);
        return new Promise<Reservation>((resolve, reject) => {
            this.http.post<any>(this.apiUrl, payload).subscribe({
                next: (newResData) => {
                    const newRes = this.mapFromBackend(newResData);
                    this.reservationsSignal.update(list => [...list, newRes]);
                    // Refresh availability after booking
                    this.fetchAvailability();
                    resolve(newRes);
                },
                error: (err) => reject(err)
            });
        });
    }

    deleteReservation(id: number) {
        return new Promise<void>((resolve, reject) => {
            this.http.delete(`${this.apiUrl}/${id}`).subscribe({
                next: () => {
                    this.reservationsSignal.update(list => list.filter(r => r.id !== id));
                    // Refresh availability after deletion
                    this.fetchAvailability();
                    resolve();
                },
                error: (err) => reject(err)
            });
        });
    }

    // Mapper methods
    private mapToBackend(res: Omit<Reservation, 'id'>): any {
        return {
            slot_id: res.slotId,
            user_id: res.userId,
            user_name: res.userName,
            user_email: res.userEmail,
            day: res.day,
            start_time: res.start_time,
            date: res.date,
            selected_dogs: res.selectedDogs
        };
    }

    private mapFromBackend(data: any): Reservation {
        // Ensure date is YYYY-MM-DD
        const dateStr = data.date && typeof data.date === 'string'
            ? data.date.substring(0, 10)
            : data.date;

        return {
            id: data.id,
            slotId: data.slot_id,
            userId: data.user_id,
            userName: data.user_name,
            userEmail: data.user_email,
            day: data.day,
            start_time: data.start_time,
            date: dateStr,
            selectedDogs: data.selected_dogs,
            createdAt: data.created_at
        };
    }
}
