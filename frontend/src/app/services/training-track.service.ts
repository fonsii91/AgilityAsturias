import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TrainingTrack, TrainingTrackSurface } from '../models/training-track.model';
import { environment } from '../../environments/environment';

export interface TrainingTrackPayload {
    name: string;
    surface: TrainingTrackSurface;
    photo?: File | null;
    remove_photo?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class TrainingTrackService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/training-tracks`;
    private tracksSignal = signal<TrainingTrack[]>([]);

    fetchTracks() {
        this.http.get<TrainingTrack[]>(this.apiUrl).subscribe({
            next: (tracks) => this.tracksSignal.set(tracks),
            error: (err) => console.error('Error loading training tracks:', err)
        });
    }

    getTracks() {
        return this.tracksSignal;
    }

    private buildFormData(data: TrainingTrackPayload): FormData {
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('surface', data.surface);
        if (data.photo) {
            formData.append('photo', data.photo);
        }
        if (data.remove_photo) {
            formData.append('remove_photo', '1');
        }
        return formData;
    }

    addTrack(data: TrainingTrackPayload) {
        return new Promise<TrainingTrack>((resolve, reject) => {
            this.http.post<TrainingTrack>(this.apiUrl, this.buildFormData(data)).subscribe({
                next: (newTrack) => {
                    this.tracksSignal.update(list => [...list, newTrack]);
                    resolve(newTrack);
                },
                error: (err) => reject(err)
            });
        });
    }

    updateTrack(id: number, data: TrainingTrackPayload) {
        return new Promise<TrainingTrack>((resolve, reject) => {
            this.http.post<TrainingTrack>(`${this.apiUrl}/${id}`, this.buildFormData(data)).subscribe({
                next: (updatedTrack) => {
                    this.tracksSignal.update(list => list.map(t => t.id === id ? updatedTrack : t));
                    resolve(updatedTrack);
                },
                error: (err) => reject(err)
            });
        });
    }

    deleteTrack(id: number) {
        return new Promise<void>((resolve, reject) => {
            this.http.post<void>(`${this.apiUrl}/${id}/delete`, {}).subscribe({
                next: () => {
                    this.tracksSignal.update(list => list.filter(t => t.id !== id));
                    resolve();
                },
                error: (err) => reject(err)
            });
        });
    }
}
