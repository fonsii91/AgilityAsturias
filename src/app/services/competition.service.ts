import { Injectable, signal } from '@angular/core';

export interface Competition {
    id: number;
    lugar: string;
    fechaEvento: string;
    fechaLimite: string;
    formaPago: string;
    cartel: string | File | null; // simplified for now
    enlace: string;
}

@Injectable({
    providedIn: 'root'
})
export class CompetitionService {
    private STORAGE_KEY = 'agility_competitions';
    private competitions = signal<Competition[]>(this.loadCompetitions());

    constructor() { }

    private loadCompetitions(): Competition[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return [
            {
                id: 1,
                lugar: 'Polideportivo Gijón',
                fechaEvento: '2026-06-15',
                fechaLimite: '2026-06-01',
                formaPago: 'Transferencia',
                cartel: null,
                enlace: 'https://example.com'
            }
        ];
    }

    private saveCompetitions(comps: Competition[]) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(comps));
        } catch (e) {
            console.error('Error saving competitions', e);
            alert('Error al guardar datos. Es posible que la imagen sea demasiado grande o el almacenamiento esté lleno.');
        }
    }

    getCompetitions() {
        return this.competitions;
    }

    addCompetition(comp: Omit<Competition, 'id'>) {
        const newComp = { ...comp, id: Date.now() };
        this.competitions.update(comps => {
            const newComps = [...comps, newComp];
            this.saveCompetitions(newComps);
            return newComps;
        });
    }

    updateCompetition(updatedComp: Competition) {
        this.competitions.update(comps => {
            const newComps = comps.map(c => c.id === updatedComp.id ? updatedComp : c);
            this.saveCompetitions(newComps);
            return newComps;
        });
    }

    deleteCompetition(id: number) {
        this.competitions.update(comps => {
            const newComps = comps.filter(c => c.id !== id);
            this.saveCompetitions(newComps);
            return newComps;
        });
    }
}
