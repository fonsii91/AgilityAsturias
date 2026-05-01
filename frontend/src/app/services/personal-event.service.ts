import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { PersonalEvent } from '../models/personal-event.model';
import { firstValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class PersonalEventService {
    private apiUrl = `${environment.apiUrl}/personal-events`;
    
    // State
    private eventsSignal = signal<PersonalEvent[]>([]);
    
    private http = inject(HttpClient);

    // Getters for computed signals
    getEvents() {
        return computed(() => this.eventsSignal());
    }

    async loadEvents(): Promise<void> {
        try {
            const data = await firstValueFrom(this.http.get<PersonalEvent[]>(this.apiUrl));
            this.eventsSignal.set(data);
        } catch (error) {
            console.error('Error loading personal events:', error);
            this.eventsSignal.set([]);
        }
    }

    async createEvent(event: PersonalEvent): Promise<PersonalEvent> {
        const newEvent = await firstValueFrom(this.http.post<PersonalEvent>(this.apiUrl, event));
        this.eventsSignal.update(events => [...events, newEvent]);
        return newEvent;
    }

    async updateEvent(id: number, event: Partial<PersonalEvent>): Promise<PersonalEvent> {
        const updatedEvent = await firstValueFrom(this.http.put<PersonalEvent>(`${this.apiUrl}/${id}`, event));
        this.eventsSignal.update(events => 
            events.map(e => e.id === id ? updatedEvent : e)
        );
        return updatedEvent;
    }

    async deleteEvent(id: number): Promise<void> {
        await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
        this.eventsSignal.update(events => events.filter(e => e.id !== id));
    }
}
