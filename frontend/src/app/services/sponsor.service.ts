import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Sponsor } from '../models/sponsor.model';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SponsorService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/sponsors`;
    private sponsorsSignal = signal<Sponsor[]>([]);

    constructor() {
        this.fetchSponsors();
    }

    fetchSponsors() {
        this.http.get<Sponsor[]>(this.apiUrl).subscribe({
            next: (sponsors) => {
                this.sponsorsSignal.set(sponsors);
            },
            error: (err) => console.error('Error loading sponsors:', err)
        });
    }

    getSponsors() {
        return this.sponsorsSignal;
    }

    addSponsor(sponsor: Omit<Sponsor, 'id'>) {
        return new Promise<Sponsor>((resolve, reject) => {
            this.http.post<Sponsor>(this.apiUrl, sponsor).subscribe({
                next: (newSponsor) => {
                    this.sponsorsSignal.update(list => [newSponsor, ...list]);
                    resolve(newSponsor);
                },
                error: (err) => reject(err)
            });
        });
    }

    updateSponsor(id: number, sponsor: Sponsor) {
        return new Promise<Sponsor>((resolve, reject) => {
            this.http.post<Sponsor>(`${this.apiUrl}/${id}`, sponsor).subscribe({
                next: (savedSponsor) => {
                    this.sponsorsSignal.update(list => list.map(s => s.id === savedSponsor.id ? savedSponsor : s));
                    resolve(savedSponsor);
                },
                error: (err) => reject(err)
            });
        });
    }

    deleteSponsor(id: number) {
        return new Promise<void>((resolve, reject) => {
            this.http.post<void>(`${this.apiUrl}/${id}/delete`, {}).subscribe({
                next: () => {
                    this.sponsorsSignal.update(list => list.filter(s => s.id !== id));
                    resolve();
                },
                error: (err) => reject(err)
            });
        });
    }
}
