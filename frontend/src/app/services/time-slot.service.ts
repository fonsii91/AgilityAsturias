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

    private sortSlots(slots: TimeSlot[]): TimeSlot[] {
        const dayOrder: Record<string, number> = { 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6, 'Domingo': 7 };
        
        const timeToMins = (t: string) => {
            if (!t) return 0;
            const parts = t.split(':').map(Number);
            return (parts[0] || 0) * 60 + (parts[1] || 0);
        };

        return slots.sort((a, b) => {
            const diff = (dayOrder[a.day] || 8) - (dayOrder[b.day] || 8);
            if (diff !== 0) return diff;
            return timeToMins(a.start_time) - timeToMins(b.start_time);
        });
    }

    fetchTimeSlots() {
        this.http.get<TimeSlot[]>(this.apiUrl).subscribe({
            next: (slots) => this.timeSlotsSignal.set(this.sortSlots(slots)),
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
                    this.timeSlotsSignal.update(list => this.sortSlots([...list, newSlot]));
                    resolve(newSlot);
                },
                error: (err) => reject(err)
            });
        });
    }

    updateTimeSlot(id: number, slot: Partial<TimeSlot>) {
        return new Promise<TimeSlot>((resolve, reject) => {
            this.http.post<TimeSlot>(`${this.apiUrl}/${id}`, slot).subscribe({
                next: (updatedSlot) => {
                    this.timeSlotsSignal.update(list => this.sortSlots(list.map(s => s.id === id ? updatedSlot : s)));
                    resolve(updatedSlot);
                },
                error: (err) => reject(err)
            });
        });
    }

    deleteTimeSlot(id: number) {
        return new Promise<void>((resolve, reject) => {
            this.http.post<void>(`${this.apiUrl}/${id}/delete`, {}).subscribe({
                next: () => {
                    this.timeSlotsSignal.update(list => list.filter(s => s.id !== id));
                    resolve();
                },
                error: (err) => reject(err)
            });
        });
    }
}
