import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RsceTrackService } from '../../services/rsce-track.service';
import { AdminRsceStats } from '../../models/rsce-track.model';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-rsce-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-rsce-monitor.html',
  styleUrl: './admin-rsce-monitor.css'
})
export class AdminRsceMonitorComponent implements OnInit {
  rsceService = inject(RsceTrackService);
  toast = inject(ToastService);

  stats = signal<AdminRsceStats[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading.set(true);
    this.rsceService.getAdminMonitorData().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading rsce monitor data', err);
        this.toast.error('Error al cargar las estadísticas del monitor RSCE.');
        this.isLoading.set(false);
      }
    });
  }
}
