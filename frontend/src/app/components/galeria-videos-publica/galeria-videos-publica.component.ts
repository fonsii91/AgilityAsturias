import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoService } from '../../services/video.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Video } from '../../models/video.model';
import { SmartVideoPlayerComponent } from '../galeria-videos/smart-video-player/smart-video-player.component';

@Component({
  selector: 'app-galeria-videos-publica',
  standalone: true,
  imports: [CommonModule, SmartVideoPlayerComponent],
  templateUrl: './galeria-videos-publica.component.html',
  styleUrl: './galeria-videos-publica.component.css'
})
export class GaleriaVideosPublicaComponent implements OnInit {
  private videoService = inject(VideoService);
  public authService = inject(AuthService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  videos: Video[] = [];
  isLoading = true;
  currentPage = 1;
  totalPages = 1;

  ngOnInit() {
    this.loadVideos();
  }

  loadVideos(page: number = 1) {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.videoService.getPublicVideos(page).subscribe({
      next: (res: any) => {
        this.videos = res.data;
        this.currentPage = res.current_page;
        this.totalPages = res.last_page;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error loading public videos', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get pageNumbers(): (number|string)[] {
    const pages: (number|string)[] = [];
    const maxPagesToShow = 5;
    if (this.totalPages <= maxPagesToShow) {
        for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
        if (this.currentPage <= 3) {
            pages.push(1, 2, 3, 4, '...', this.totalPages);
        } else if (this.currentPage > this.totalPages - 3) {
            pages.push(1, '...', this.totalPages - 3, this.totalPages - 2, this.totalPages - 1, this.totalPages);
        } else {
            pages.push(1, '...', this.currentPage - 1, this.currentPage, this.currentPage + 1, '...', this.totalPages);
        }
    }
    return pages;
  }

  goToPage(page: number | string) {
      if (typeof page === 'number' && page >= 1 && page <= this.totalPages && page !== this.currentPage) {
          this.loadVideos(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  }

  removeFromPublic(event: Event, video: Video) {
    event.stopPropagation();
    if (!video.id) return;

    this.videoService.togglePublicGallery(video.id).subscribe({
      next: (res: any) => {
        if (!res.in_public_gallery) {
           this.videos = this.videos.filter(v => v.id !== video.id);
           this.toastService.success('Vídeo ocultado con éxito de la galería pública.');
           this.cdr.detectChanges();
        }
      },
      error: (err: any) => {
        console.error('Error toggling public gallery', err);
        this.toastService.error('Error al retirar el vídeo de la galería pública.');
      }
    });
  }
}
