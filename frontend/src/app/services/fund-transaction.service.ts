import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface FundTransaction {
  id: number;
  club_id: number;
  user_id: number;
  fecha: string;
  concept: string;
  amount: string;
  type: 'ingreso' | 'gasto';
  payment_method: 'transferencia' | 'bizum' | 'efectivo' | 'tarjeta' | 'otro';
  attachment_path?: string;
  created_by: number;
  creator?: any;
  created_at: string;
  updated_at: string;
}

export interface FundInfoResponse {
  transactions: FundTransaction[];
  balance: number;
  user: any;
}

@Injectable({
  providedIn: 'root'
})
export class FundTransactionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/fund-transactions`;

  getTransactions(userId?: number): Promise<FundInfoResponse> {
    return new Promise((resolve, reject) => {
      const url = userId ? `${this.apiUrl}?user_id=${userId}` : this.apiUrl;
      this.http.get<FundInfoResponse>(url).subscribe({
        next: (data) => resolve(data),
        error: (err) => reject(err)
      });
    });
  }

  storeTransaction(formData: FormData): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.post<any>(this.apiUrl, formData).subscribe({
        next: (data) => resolve(data),
        error: (err) => reject(err)
      });
    });
  }

  deleteTransaction(id: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.post<any>(`${this.apiUrl}/${id}/delete`, {}).subscribe({
        next: (data) => resolve(data),
        error: (err) => reject(err)
      });
    });
  }

  getDashboard(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.get<any>(`${this.apiUrl}/dashboard`).subscribe({
        next: (data) => resolve(data),
        error: (err) => reject(err)
      });
    });
  }
}
