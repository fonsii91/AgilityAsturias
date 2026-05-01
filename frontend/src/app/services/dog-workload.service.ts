import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DogWorkload, AcwrData, AdminWorkloadStats } from '../models/dog-workload.model';

@Injectable({
  providedIn: 'root'
})
export class DogWorkloadService {
  private apiUrl = environment.apiUrl;

  private http = inject(HttpClient);

  getAcwrData(dogId: number): Observable<AcwrData> {
    return this.http.get<AcwrData>(`${this.apiUrl}/dogs/${dogId}/workload`);
  }

  getPendingReviews(dogId: number): Observable<DogWorkload[]> {
    return this.http.get<DogWorkload[]>(`${this.apiUrl}/dogs/${dogId}/pending-reviews`);
  }

  confirmWorkload(workloadId: number, durationMin: number, intensityRpe: number, jumpedMaxHeight?: boolean, numberOfRuns?: number): Observable<DogWorkload> {
    return this.http.post<DogWorkload>(`${this.apiUrl}/workloads/${workloadId}/confirm`, {
      duration_min: durationMin,
      intensity_rpe: intensityRpe,
      jumped_max_height: jumpedMaxHeight,
      number_of_runs: numberOfRuns
    });
  }

  updateWorkload(workloadId: number, data: Partial<DogWorkload>): Observable<DogWorkload> {
    return this.http.put<DogWorkload>(`${this.apiUrl}/workloads/${workloadId}`, data);
  }

  storeManualWorkload(dogId: number, data: { date: string, duration_min: number, intensity_rpe: number, activity_type?: string, jumped_max_height?: boolean, number_of_runs?: number }): Observable<DogWorkload> {
    return this.http.post<DogWorkload>(`${this.apiUrl}/dogs/${dogId}/workloads`, data);
  }

  deleteWorkload(workloadId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/workloads/${workloadId}`);
  }

  getAdminMonitorData(): Observable<AdminWorkloadStats[]> {
    return this.http.get<AdminWorkloadStats[]>(`${this.apiUrl}/admin/salud/monitor`);
  }
}
