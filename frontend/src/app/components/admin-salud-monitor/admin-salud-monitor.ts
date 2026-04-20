import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DogWorkloadService } from '../../services/dog-workload.service';
import { AdminWorkloadStats } from '../../models/dog-workload.model';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-salud-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-salud-monitor.html',
  styleUrl: './admin-salud-monitor.css'
})
export class AdminSaludMonitorComponent implements OnInit {
  workloadService = inject(DogWorkloadService);
  toast = inject(ToastService);

  stats = signal<AdminWorkloadStats[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading.set(true);
    this.workloadService.getAdminMonitorData().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading monitor data', err);
        this.toast.error('Error al cargar las estadísticas del monitor de salud.');
        this.isLoading.set(false);
      }
    });
  }
}
