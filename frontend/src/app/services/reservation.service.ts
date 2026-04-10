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

    // Exceptions Signal
    private exceptionsSignal = signal<{ id: number, slot_id: number, date: string, reason: string | null }[]>([]);

    constructor() {
        this.fetchReservations();
        this.fetchAvailability();
        this.fetchExceptions();
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

    fetchExceptions() {
        this.http.get<any[]>(`${environment.apiUrl}/time-slot-exceptions`).subscribe({
            next: (data) => {
                this.exceptionsSignal.set(data);
            },
            error: (err) => console.error('Error fetching exceptions', err)
        });
    }

    getReservations() {
        return this.reservationsSignal;
    }

    getAvailability() {
        return this.availabilitySignal;
    }

    getExceptions() {
        return this.exceptionsSignal;
    }

    addReservation(payload: { slotId: number, userId: number, date: string, dogIds: number[] }) {
        const backendPayload = {
            slot_id: payload.slotId,
            user_id: payload.userId,
            date: payload.date,
            dog_ids: payload.dogIds
        };
        return new Promise<Reservation[]>((resolve, reject) => {
            this.http.post<any[]>(this.apiUrl, backendPayload).subscribe({
                next: (newResDataArray) => {
                    const newReservations = newResDataArray.map(item => this.mapFromBackend(item));
                    this.reservationsSignal.update(list => [...list, ...newReservations]);
                    // Refresh availability after booking
                    this.fetchAvailability();
                    resolve(newReservations);
                },
                error: (err) => reject(err)
            });
        });
    }

    deleteReservation(id: number) {
        return new Promise<void>((resolve, reject) => {
            this.http.post<void>(`${this.apiUrl}/${id}/delete`, {}).subscribe({
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

    deleteBlock(slotId: number, date: string, targetUserId?: number) {
        return new Promise<void>((resolve, reject) => {
            let url = `${this.apiUrl}/block/delete?slot_id=${slotId}&date=${date}`;
            if (targetUserId) {
                url += `&user_id=${targetUserId}`;
            }
            this.http.post<void>(url, {}).subscribe({
                next: () => {
                    this.fetchReservations();
                    this.fetchAvailability();
                    resolve();
                },
                error: (err) => reject(err)
            });
        });
    }

    addException(slotId: number, date: string, reason?: string) {
        return new Promise<void>((resolve, reject) => {
            this.http.post<void>(`${environment.apiUrl}/time-slot-exceptions`, { slot_id: slotId, date, reason }).subscribe({
                next: () => {
                    this.fetchExceptions();
                    resolve();
                },
                error: (err) => reject(err)
            });
        });
    }

    deleteException(slotId: number, date: string) {
        return new Promise<void>((resolve, reject) => {
            this.http.post<void>(`${environment.apiUrl}/time-slot-exceptions/delete`, { slot_id: slotId, date }).subscribe({
                next: () => {
                    this.fetchExceptions();
                    resolve();
                },
                error: (err) => reject(err)
            });
        });
    }

    // Attendance Verification (Admin/Staff)
    getPendingAttendance() {
        return this.http.get<any[]>(`${environment.apiUrl}/admin/attendance/pending`);
    }

    confirmAttendance(data: { date: string, slot_id: number, attended_ids: number[] }) {
        return this.http.post(`${environment.apiUrl}/admin/attendance/confirm`, data);
    }

    getPendingCompetitions() {
        return this.http.get<any[]>(`${environment.apiUrl}/admin/attendance/pending-competitions`);
    }

    confirmCompetitionAttendance(data: {
        competition_id: number,
        attended_dogs: { id: number, position: string }[],
        new_attendees: { user_id: number, dog_id: number, position: string }[]
    }) {
        return this.http.post(`${environment.apiUrl}/admin/attendance/confirm-competition`, data);
    }

    // Ranking
    getRanking() {
        return this.http.get<any[]>(`${environment.apiUrl}/ranking`);
    }

    // Mapper methods
    private mapToBackend(res: Omit<Reservation, 'id'>): any {
        return {
            slot_id: res.slotId,
            user_id: res.userId,
            date: res.date
            // dogIds handled separately in addReservation
        };
    }

    private mapFromBackend(data: any): Reservation {
        const dateStr = data.date && typeof data.date === 'string'
            ? data.date.substring(0, 10)
            : data.date;

        return {
            id: data.id,
            slotId: data.slot_id,
            userId: data.user_id,
            date: dateStr,
            dogId: data.dog_id,
            dog: data.dog,
            status: data.status,
            createdAt: data.created_at,

            // Map relationships
            user: data.user,
            timeSlot: data.time_slot || data.timeSlot, // Handle camelCase if converted or snake_case

            // Flatten for compatibility with existing component logic
            userName: data.user?.name || 'Usuario',
            day: data.time_slot?.day || '',
            startTime: data.time_slot?.start_time || ''
        };
    }
}
