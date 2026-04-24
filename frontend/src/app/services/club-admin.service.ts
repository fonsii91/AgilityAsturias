import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface Club {
    id: number;
    name: string;
    slug: string;
    domain?: string | null;
    logo_url: string | null;
    settings: any;
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

    createClub(club: Partial<Club>): Observable<Club> {
        return this.http.post<Club>(`${this.apiUrl}/admin/clubs`, club);
    }

    updateClub(id: number, club: Partial<Club>): Observable<Club> {
        return this.http.put<Club>(`${this.apiUrl}/admin/clubs/${id}`, club);
    }

    deleteClub(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/admin/clubs/${id}`);
    }
}
