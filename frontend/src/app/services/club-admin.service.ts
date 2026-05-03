import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, map } from 'rxjs';

export interface Club {
    id: number;
    name: string;
    slug: string;
    domain?: string | null;
    logo_url: string | null;
    settings: any;
}

export interface ClubHandoff {
    handoff: string;
    expires_in: number;
}

@Injectable({
    providedIn: 'root'
})
export class ClubAdminService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    getClubs(): Observable<Club[]> {
        return this.http.get<Club[]>(`${this.apiUrl}/admin/clubs`);
    }

    getClub(id: number): Observable<Club> {
        return this.http.get<Club>(`${this.apiUrl}/admin/clubs/${id}`);
    }

    createClub(club: Partial<Club>): Observable<Club> {
        return this.http.post<Club>(`${this.apiUrl}/admin/clubs`, club);
    }

    updateClub(id: number, club: Partial<Club>): Observable<Club> {
        return this.http.put<Club>(`${this.apiUrl}/admin/clubs/${id}`, club);
    }

    updateClubWithFormData(id: number, formData: FormData): Observable<Club> {
        formData.append('_method', 'PUT');
        return this.http.post<Club>(`${this.apiUrl}/admin/clubs/${id}`, formData);
    }

    createClubWithFormData(formData: FormData): Observable<Club> {
        return this.http.post<Club>(`${this.apiUrl}/admin/clubs`, formData);
    }

    deleteClub(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/admin/clubs/${id}`);
    }

    createClubHandoff(id: number): Observable<ClubHandoff> {
        return this.http.post<ClubHandoff>(`${this.apiUrl}/admin/clubs/${id}/handoff`, {});
    }
}
