import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Dog } from '../models/dog.model';
import { environment } from '../../environments/environment';
import { AnalyticsService } from './analytics.service';
import { OnboardingService } from './onboarding';

@Injectable({
    providedIn: 'root'
})
export class DogService {
    private http = inject(HttpClient);
    private analytics = inject(AnalyticsService);
    private onboardingService = inject(OnboardingService);
    private apiUrl = `${environment.apiUrl}/dogs`;
    private dogsSignal = signal<Dog[]>([]);
    private allDogsSignal = signal<Dog[]>([]);

    constructor() {
        // Initial load possibly? Or wait for explicit call?
        // Let's expose a method to load.
    }

    loadUserDogs(): Promise<Dog[]> {
        return new Promise((resolve, reject) => {
            this.http.get<any[]>(this.apiUrl).subscribe({
                next: (data) => {
                    const dogs = data.map(d => this.mapDog(d));
                    this.dogsSignal.set(dogs);
                    resolve(dogs);
                },
                error: (err) => {
                    if (err.status !== 403) {
                        console.error('Error loading dogs:', err);
                    }
                    resolve([]); // Don't reject to avoid breaking app startup, just resolve empty
                }
            });
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
            pointHistories: data.point_histories,
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
            this.http.post<any>(this.apiUrl, dog).subscribe({
                next: (data) => {
                    const newDog = this.mapDog(data);
                    this.dogsSignal.update(list => [...list, newDog]);
                    this.analytics.logDogInteraction('created');
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
                    this.analytics.logDogInteraction('deleted');
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

            this.http.post<any>(`${this.apiUrl}/${dogId}/photo`, formData).subscribe({
                next: (data) => {
                    const updatedDog = this.mapDog(data);
                    this.dogsSignal.update(list => list.map(d => d.id === dogId ? updatedDog : d));
                    this.allDogsSignal.update(list => list.map(d => d.id === dogId ? updatedDog : d));
                    this.analytics.logDogInteraction('photo_updated');
                    this.onboardingService.markStepCompleted('staff_perros');
                    this.onboardingService.markStepCompleted('miembro_perros');
                    resolve(updatedDog);
                },
                error: (err) => reject(err)
            });
        });
    }

    updateDog(id: number, dogData: Partial<Dog>) {
        return new Promise<Dog>((resolve, reject) => {
            this.http.post<any>(`${this.apiUrl}/${id}`, dogData).subscribe({
                next: (data) => {
                    const updatedDog = this.mapDog(data);
                    this.dogsSignal.update(list => list.map(d => d.id === id ? updatedDog : d));
                    this.allDogsSignal.update(list => list.map(d => d.id === id ? updatedDog : d));
                    this.analytics.logDogInteraction('config_changed');
                    this.onboardingService.markStepCompleted('staff_perros');
                    this.onboardingService.markStepCompleted('miembro_perros');
                    resolve(updatedDog);
                },
                error: (err) => reject(err)
            });
        });
    }

    giveExtraPoints(dogId: number, points: number, category: string) {
        return new Promise<Dog>((resolve, reject) => {
            this.http.post<{message: string; dog: any}>(`${this.apiUrl}/${dogId}/extra-points`, { points, category }).subscribe({
                next: (res) => {
                    const mappedDog = this.mapDog(res.dog);
                    this.dogsSignal.update(list => list.map(d => d.id === dogId ? mappedDog : d));
                    // Update allDogsSignal as well if it exists in the list
                    this.allDogsSignal.update(list => list.map(d => d.id === dogId ? mappedDog : d));
                    this.analytics.logStaffAction('manual_points_assigned');
                    resolve(mappedDog);
                },
                error: (err) => reject(err)
            });
        });
    }

    shareDog(dogId: number, email: string) {
        return new Promise<Dog>((resolve, reject) => {
            this.http.post<{message: string; dog: any}>(`${this.apiUrl}/${dogId}/share`, { email }).subscribe({
                next: (res) => {
                    const mappedDog = this.mapDog(res.dog);
                    this.dogsSignal.update(list => list.map(d => d.id === dogId ? mappedDog : d));
                    this.allDogsSignal.update(list => list.map(d => d.id === dogId ? mappedDog : d));
                    this.analytics.logDogInteraction('shared');
                    resolve(mappedDog);
                },
                error: (err) => reject(err)
            });
        });
    }

    removeShare(dogId: number, userId: number) {
        return new Promise<Dog>((resolve, reject) => {
            this.http.post<{message: string; dog: any}>(`${this.apiUrl}/${dogId}/unshare`, { user_id: userId }).subscribe({
                next: (res) => {
                    const mappedDog = this.mapDog(res.dog);
                    this.dogsSignal.update(list => list.map(d => d.id === dogId ? mappedDog : d));
                    this.allDogsSignal.update(list => list.map(d => d.id === dogId ? mappedDog : d));
                    this.analytics.logDogInteraction('unshared');
                    resolve(mappedDog);
                },
                error: (err) => reject(err)
            });
        });
    }

    updateAdminAvatars(dogId: number, formData: FormData) {
        return new Promise<Dog>((resolve, reject) => {
            this.http.post<{message: string; dog: any}>(`${environment.apiUrl}/admin/dogs/${dogId}/avatars`, formData).subscribe({
                next: (res) => {
                    const mappedDog = this.mapDog(res.dog);
                    this.dogsSignal.update(list => list.map(d => d.id === dogId ? mappedDog : d));
                    this.allDogsSignal.update(list => list.map(d => d.id === dogId ? mappedDog : d));
                    resolve(mappedDog);
                },
                error: (err) => reject(err)
            });
        });
    }

    generateAiAvatars(dogId: number, promptDetails?: string) {
        return new Promise<Dog>((resolve, reject) => {
            this.http.post<{message: string; dog: any}>(`${environment.apiUrl}/admin/dogs/${dogId}/generate-avatars`, {
                prompt_details: promptDetails
            }).subscribe({
                next: (res) => {
                    const mappedDog = this.mapDog(res.dog);
                    this.dogsSignal.update(list => list.map(d => d.id === dogId ? mappedDog : d));
                    this.allDogsSignal.update(list => list.map(d => d.id === dogId ? mappedDog : d));
                    resolve(mappedDog);
                },
                error: (err) => reject(err)
            });
        });
    }
}
