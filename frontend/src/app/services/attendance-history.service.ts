import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface AttendanceMonthlyTrend {
  month: string;
  classes: number;
  events: number;
}

export interface AttendanceGeneralStats {
  total_members: number;
  global_attendance_rate: number;
  classes_attendance_count: number;
  events_attendance_count: number;
  monthly_trend: AttendanceMonthlyTrend[];
}

export interface MemberInfo {
  id: number;
  name: string;
  email: string;
  dogs: { id: number; name: string }[];
}

export interface MemberAttendanceSummary {
  total_classes_attended: number;
  total_classes_possible: number;
  attendance_rate_classes: number;
  total_events_attended: number;
  total_events_possible: number;
  attendance_rate_events: number;
}

export interface MemberAttendanceRecord {
  date: string;
  name: string;
  type: 'clase' | 'evento';
  status: 'asistido' | 'ausente' | 'justificado';
}

export interface MemberAttendanceStats {
  member_info: MemberInfo;
  summary: MemberAttendanceSummary;
  history_list: MemberAttendanceRecord[];
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceHistoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/staff/attendance-stats`;

  // Signals for state management
  public generalStats = signal<AttendanceGeneralStats | null>(null);
  public selectedMemberStats = signal<MemberAttendanceStats | null>(null);
  public loading = signal<boolean>(false);

  /**
   * Fetch club general attendance stats
   */
  fetchGeneralStats(): Observable<AttendanceGeneralStats> {
    this.loading.set(true);
    const obs = this.http.get<AttendanceGeneralStats>(this.apiUrl);
    obs.subscribe({
      next: (stats) => {
        this.generalStats.set(stats);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching general attendance stats:', err);
        this.loading.set(false);
      }
    });
    return obs;
  }

  /**
   * Fetch specific member attendance stats and list
   */
  fetchMemberStats(userId: number): Observable<MemberAttendanceStats> {
    this.loading.set(true);
    const obs = this.http.get<MemberAttendanceStats>(`${this.apiUrl}/member/${userId}`);
    obs.subscribe({
      next: (stats) => {
        this.selectedMemberStats.set(stats);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(`Error fetching member stats for user ${userId}:`, err);
        this.loading.set(false);
      }
    });
    return obs;
  }

  /**
   * Clear the selected member stats state
   */
  clearSelectedMember() {
    this.selectedMemberStats.set(null);
  }
}
