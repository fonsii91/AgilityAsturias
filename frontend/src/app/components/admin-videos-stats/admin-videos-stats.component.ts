import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { VideoService } from '../../services/video.service';
import { ToastService } from '../../services/toast.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-admin-videos-stats',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  templateUrl: './admin-videos-stats.component.html',
  styleUrls: ['./admin-videos-stats.component.scss']
})
export class AdminVideosStatsComponent implements OnInit {
  stats = signal<any>(null);
  loading = signal<boolean>(true);
  displayedColumns: string[] = ['title', 'dog_name', 'date', 'youtube_error', 'actions'];

  constructor(
    private videoService: VideoService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats() {
    this.loading.set(true);
    this.videoService.getAdminVideoStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading video stats', err);
        this.toastService.error('Error al cargar las estadísticas de los vídeos.');
        this.loading.set(false);
      }
    });
  }

  retryUpload(video: any) {
    if (confirm(`¿Estás seguro de reintentar la subida del vídeo "${video.title || video.dog?.name}"?`)) {
      this.videoService.retryVideoUpload(video.id).subscribe({
        next: (res) => {
          this.toastService.success('Vídeo encolado nuevamente para subir.');
          this.loadStats();
        },
        error: (err) => {
          console.error('Error al reintentar vídeo', err);
          this.toastService.error('Error al reintentar subir el vídeo.');
        }
      });
    }
  }
}
