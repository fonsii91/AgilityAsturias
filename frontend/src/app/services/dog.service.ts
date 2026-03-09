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
    private allDogsSignal = signal<Dog[]>([]);

    constructor() {
        // Initial load possibly? Or wait for explicit call?
        // Let's expose a method to load.
    }

    loadUserDogs() {
        this.http.get<any[]>(this.apiUrl).subscribe({
            next: (data) => {
                const dogs = data.map(d => this.mapDog(d));
                this.dogsSignal.set(dogs);
            },
            error: (err) => {
                if (err.status !== 403) {
                    console.error('Error loading dogs:', err);
                }
            }
        });
    }

    loadAllDogs() {
        this.http.get<any[]>(`${this.apiUrl}/all`).subscribe({
            next: (data) => {
                const dogs = data.map(d => this.mapDog(d));
                this.allDogsSignal.set(dogs);
            },
            error: (err) => {
                if (err.status !== 403) {
                    console.error('Error loading all dogs:', err);
                }
            }
        });
    }

    private mapDog(data: any): Dog {
        return {
            ...data,
            userId: data.user_id,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    getDogs() {
        return this.dogsSignal;
    }

    getAllDogs() {
        return this.allDogsSignal;
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
            this.http.post<void>(`${this.apiUrl}/${id}/delete`, {}).subscribe({
                next: () => {
                    this.dogsSignal.update(list => list.filter(d => d.id !== id));
                    resolve();
                },
                error: (err) => reject(err)
            });
        });
    }

    updateDogPhoto(dogId: number, photo: File) {
        return new Promise<Dog>((resolve, reject) => {
            const formData = new FormData();
            formData.append('photo', photo);

            this.http.post<Dog>(`${this.apiUrl}/${dogId}/photo`, formData).subscribe({
                next: (updatedDog) => {
                    this.dogsSignal.update(list => list.map(d => d.id === dogId ? updatedDog : d));
                    resolve(updatedDog);
                },
                error: (err) => reject(err)
            });
        });
    }
}
