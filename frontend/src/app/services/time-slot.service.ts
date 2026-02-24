import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TimeSlot } from '../models/time-slot.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class TimeSlotService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/time-slots`;
    private timeSlotsSignal = signal<TimeSlot[]>([]);

    constructor() {
        this.fetchTimeSlots();
    }

    fetchTimeSlots() {
        this.http.get<TimeSlot[]>(this.apiUrl).subscribe({
            next: (slots) => this.timeSlotsSignal.set(slots),
            error: (err) => console.error('Error loading time slots:', err)
        });
    }

    getTimeSlots() {
        return this.timeSlotsSignal;
    }

    addTimeSlot(slot: Omit<TimeSlot, 'id'>) {
        return new Promise<TimeSlot>((resolve, reject) => {
            this.http.post<TimeSlot>(this.apiUrl, slot).subscribe({
                next: (newSlot) => {
                    this.timeSlotsSignal.update(list => [...list, newSlot]);
                    resolve(newSlot);
                },
                error: (err) => reject(err)
            });
        });
    }

    updateTimeSlot(id: number, slot: Partial<TimeSlot>) {
        return new Promise<TimeSlot>((resolve, reject) => {
            this.http.post<TimeSlot>(`${this.apiUrl}/${id}`, { ...slot, _method: 'PUT' }).subscribe({
                next: (updatedSlot) => {
                    this.timeSlotsSignal.update(list => list.map(s => s.id === id ? updatedSlot : s));
                    resolve(updatedSlot);
                },
                error: (err) => reject(err)
            });
        });
    }

    deleteTimeSlot(id: number) {
        return new Promise<void>((resolve, reject) => {
            this.http.post<void>(`${this.apiUrl}/${id}`, { _method: 'DELETE' }).subscribe({
                next: () => {
                    this.timeSlotsSignal.update(list => list.filter(s => s.id !== id));
                    resolve();
                },
                error: (err) => reject(err)
            });
        });
    }
}
