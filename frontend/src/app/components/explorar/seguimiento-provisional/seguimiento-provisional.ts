import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScraperService } from '../../../services/scraper.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-seguimiento-provisional',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seguimiento-provisional.html',
  styleUrl: './seguimiento-provisional.css'
})
export class SeguimientoProvisionalComponent implements OnInit {
  private scraperService = inject(ScraperService);
  private toast = inject(ToastService);

  lastTracks = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadTracks();
  }

  loadTracks(): void {
    this.isLoading.set(true);
    this.scraperService.getLastTracks().subscribe({
      next: (data) => {
        this.lastTracks.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading provisional tracks', err);
        this.toast.error('Error al cargar el seguimiento provisional.');
        this.isLoading.set(false);
      }
    });
  }
}
