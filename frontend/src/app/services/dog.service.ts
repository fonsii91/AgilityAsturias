import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Dog } from '../models/dog.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class DogService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/dogs`;
    private dogsSignal = signal<Dog[]>([]);

    constructor() {
        // Initial load possibly? Or wait for explicit call?
        // Let's expose a method to load.
    }

    loadUserDogs() {
        this.http.get<Dog[]>(this.apiUrl).subscribe({
            next: (dogs) => this.dogsSignal.set(dogs),
            error: (err) => console.error('Error loading dogs:', err)
        });
    }

    getDogs() {
        return this.dogsSignal;
    }

    addDog(dog: Omit<Dog, 'id'>) {
        return new Promise<Dog>((resolve, reject) => {
            this.http.post<Dog>(this.apiUrl, dog).subscribe({
                next: (newDog) => {
                    this.dogsSignal.update(list => [...list, newDog]);
                    resolve(newDog);
                },
                error: (err) => reject(err)
            });
        });
    }

    deleteDog(id: number) {
        return new Promise<void>((resolve, reject) => {
            this.http.delete(`${this.apiUrl}/${id}`).subscribe({
                next: () => {
                    this.dogsSignal.update(list => list.filter(d => d.id !== id));
                    resolve();
                },
                error: (err) => reject(err)
            });
        });
    }
}
