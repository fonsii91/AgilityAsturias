import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BountyService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getBountyPosters(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/bounty/posters`);
  }

  buyBountyContract(payload: { victim_dog_id: number, cartel_type: string, hunter_dog_id?: number }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bounty/contracts`, payload);
  }

  getMyBountyContracts(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/bounty/my-contracts`);
  }

  confirmBountyCaza(contractId: number, witnessId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bounty/contracts/${contractId}/confirm`, { witness_id: witnessId });
  }

  rerollBountyContract(contractId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bounty/contracts/${contractId}/reroll`, {});
  }

  validateBountyCaza(contractId: number, approved: boolean): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bounty/contracts/${contractId}/validate`, { approved });
  }

  getBountyFeed(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/bounty/feed`);
  }

  updateBountySettings(optIn: boolean): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bounty/settings`, { opt_in: optIn });
  }

  toggleBountyBoard(enabled: boolean): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/bounty/toggle`, { enabled });
  }
}
