import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Competition } from '../models/competition.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CompetitionService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/competitions`;
    private competitionsSignal = signal<Competition[]>([]);

    constructor() {
        this.fetchCompetitions();
    }

    fetchCompetitions() {
        this.http.get<any[]>(this.apiUrl).subscribe({
            next: (comps) => {
                const mapped = comps.map(c => this.mapFromBackend(c));
                this.competitionsSignal.set(mapped);
            },
            error: (err) => console.error('Error loading competitions:', err)
        });
    }

    getCompetitions() {
        return this.competitionsSignal;
    }

    addCompetition(comp: Omit<Competition, 'id'>) {
        const payload = this.mapToBackend(comp);
        return new Promise<Competition>((resolve, reject) => {
            this.http.post<any>(this.apiUrl, payload).subscribe({
                next: (newCompData) => {
                    const newComp = this.mapFromBackend(newCompData);
                    this.competitionsSignal.update(list => [...list, newComp]);
                    resolve(newComp);
                },
                error: (err) => reject(err)
            });
        });
    }

    updateCompetition(updatedComp: Competition) {
        const payload = this.mapToBackend(updatedComp);
        return new Promise<Competition>((resolve, reject) => {
            this.http.post<any>(`${this.apiUrl}/${updatedComp.id}`, { ...payload, _method: 'PUT' }).subscribe({
                next: (savedCompData) => {
                    const savedComp = this.mapFromBackend(savedCompData);
                    this.competitionsSignal.update(list => list.map(c => c.id === savedComp.id ? savedComp : c));
                    resolve(savedComp);
                },
                error: (err) => reject(err)
            });
        });
    }

    deleteCompetition(id: number) {
        return new Promise<void>((resolve, reject) => {
            this.http.post<void>(`${this.apiUrl}/${id}`, { _method: 'DELETE' }).subscribe({
                next: () => {
                    this.competitionsSignal.update(list => list.filter(c => c.id !== id));
                    resolve();
                },
                error: (err) => reject(err)
            });
        });
    }

    // Mapper methods
    private mapToBackend(comp: Partial<Competition>): any {
        return {
            nombre: comp.nombre,
            lugar: comp.lugar,
            fecha_evento: comp.fechaEvento,
            fecha_fin_evento: comp.fechaFinEvento,
            fecha_limite: comp.fechaLimite,
            forma_pago: comp.formaPago,
            enlace: comp.enlace,
            tipo: comp.tipo,
            cartel: comp.cartel
        };
    }

    private mapFromBackend(data: any): Competition {
        return {
            id: data.id,
            nombre: data.nombre,
            lugar: data.lugar,
            fechaEvento: data.fecha_evento,
            fechaFinEvento: data.fecha_fin_evento,
            fechaLimite: data.fecha_limite,
            formaPago: data.forma_pago,
            enlace: data.enlace,
            tipo: data.tipo,
            cartel: data.cartel
        };
    }
}
