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
                const mapped = comps.map((c: any) => this.mapFromBackend(c));
                // Ordenar de más recientes a más antiguos (fechaEvento puede ser null/vacio)
                mapped.sort((a, b) => {
                    const parseDateStr = (dateStr: string) => {
                        if (!dateStr) return 0;
                        const parts = dateStr.substring(0, 10).split('-');
                        if (parts.length === 3) {
                           return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
                        }
                        return 0;
                    };
                    const dateA = parseDateStr(a.fechaEvento);
                    const dateB = parseDateStr(b.fechaEvento);
                    return dateB - dateA;
                });
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
            this.http.post<any>(`${this.apiUrl}/${updatedComp.id}`, payload).subscribe({
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
            this.http.post<void>(`${this.apiUrl}/${id}/delete`, {}).subscribe({
                next: () => {
                    this.competitionsSignal.update(list => list.filter(c => c.id !== id));
                    resolve();
                },
                error: (err) => reject(err)
            });
        });
    }

    attendCompetition(id: number, dogIds: number[] = [], diasAsistencia: string[] = [], dogsAttendance?: {dog_id: number, dias_asistencia: string[]}[]) {
        return new Promise<any>((resolve, reject) => {
            const payload: any = { dog_ids: dogIds, dias_asistencia: diasAsistencia };
            if (dogsAttendance) {
                payload.dogs_attendance = dogsAttendance;
            }
            this.http.post<any>(`${this.apiUrl}/${id}/attend`, payload).subscribe({
                next: (res) => resolve(res),
                error: (err) => reject(err)
            });
        });
    }

    unattendCompetition(id: number) {
        return new Promise<any>((resolve, reject) => {
            this.http.post<any>(`${this.apiUrl}/${id}/unattend`, {}).subscribe({
                next: (res) => resolve(res),
                error: (err) => reject(err)
            });
        });
    }

    getAttendees(id: number) {
        return new Promise<any[]>((resolve, reject) => {
            this.http.get<any[]>(`${this.apiUrl}/${id}/attendees`).subscribe({
                next: (res) => resolve(res),
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
            federacion: comp.federacion,
            cartel: comp.cartel,
            judge_name: comp.judge_name
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
            federacion: data.federacion,
            cartel: data.cartel,
            judge_name: data.judge_name,
            isAttending: !!data.is_attending,
            attendingDogIds: data.attending_dog_ids || [],
            attendingDogsDetails: data.attending_dogs_details || [],
            allAttendingDogIds: data.all_attending_dog_ids || [],
            diasAsistencia: data.dias_asistencia || []
        };
    }
}
