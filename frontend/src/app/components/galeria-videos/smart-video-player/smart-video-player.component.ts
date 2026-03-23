import { Component, Input, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-smart-video-player',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './smart-video-player.component.css',
  template: `
    <div class="video-wrapper" [class.is-youtube]="youtubeUrl" [class.is-active]="isVideoActive">

      <!-- Video Cover / Poster -->
      <div class="poster-cover" *ngIf="!isVideoActive" (click)="startPlayback()">
         <img *ngIf="coverImageUrl" [src]="coverImageUrl" class="poster-image" alt="Video cover">
         <div *ngIf="!coverImageUrl" class="poster-placeholder">
            <span class="material-icons">pets</span>
         </div>
         <div class="poster-overlay-gradient"></div>
         <span class="material-icons play-icon-massive">play_circle_outline</span>
      </div>

      <iframe *ngIf="youtubeUrl && hasStarted" [src]="autoplayYoutubeUrl" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="video-iframe"></iframe>

      <ng-container *ngIf="!youtubeUrl && localUrl">
        <video #localVideo [src]="localUrl" class="video-local" playsinline webkit-playsinline loop preload="metadata" 
               (playing)="isPlaying = true" (pause)="isPlaying = false" (timeupdate)="onTimeUpdate($event)" (click)="togglePlay()"></video>
        
        <div class="custom-play-overlay" *ngIf="!isPlaying && isVideoActive" (click)="togglePlay()">
          <span class="material-icons play-icon-large">play_arrow</span>
        </div>

        <div class="custom-progress-hitbox" *ngIf="isVideoActive" (click)="seekVideo($event)">
          <div class="custom-progress-container">
            <div class="custom-progress-fill" [style.width.%]="progress"></div>
          </div>
        </div>

        <button class="fullscreen-btn" *ngIf="isVideoActive" (click)="toggleFullscreen($event)">
          <span class="material-icons">fullscreen</span>
        </button>
      </ng-container>

      <div *ngIf="!youtubeUrl && !localUrl" class="video-unavailable">
        Vídeo no disponible
      </div>
    </div>
  `
})
export class SmartVideoPlayerComponent implements OnInit {
  @Input() coverImageUrl?: string;
  @Input() youtubeId?: string;
  @Input() localPath?: string;
  @ViewChild('localVideo') localVideoRef?: ElementRef<HTMLVideoElement>;

  private sanitizer = inject(DomSanitizer);

  youtubeUrl?: SafeResourceUrl;
  autoplayYoutubeUrl?: SafeResourceUrl;
  localUrl?: string;
  isPlaying = false;
  hasStarted = false; // Tracks if the video was ever started
  progress = 0;

  get isVideoActive(): boolean {
    return this.hasStarted;
  }

  ngOnInit() {
    if (this.youtubeId) {
      this.youtubeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${this.youtubeId}?playsinline=1&rel=0&modestbranding=1`);
      this.autoplayYoutubeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${this.youtubeId}?playsinline=1&rel=0&modestbranding=1&autoplay=1`);
    } else if (this.localPath) {
      this.localUrl = `${environment.apiUrl.replace('/api', '')}/storage/${this.localPath}`;
    }
  }

  startPlayback() {
    this.hasStarted = true;
    if (this.youtubeId) {
      // YouTube iframe will start rendering and autoplay
    } else if (this.localVideoRef) {
      const video = this.localVideoRef.nativeElement;
      video.play().catch(e => console.error('Play error:', e));
    }
  }

  togglePlay() {
    if (this.youtubeUrl) return;

    if (this.localVideoRef) {
      const video = this.localVideoRef.nativeElement;
      if (video.paused) {
        video.play().catch(e => console.error('Auto-play prevented:', e));
      } else {
        video.pause();
      }
    }
  }

  onTimeUpdate(event: Event) {
    const video = event.target as HTMLVideoElement;
    if (video.duration) {
      this.progress = (video.currentTime / video.duration) * 100;
    }
  }

  seekVideo(event: MouseEvent) {
    event.stopPropagation();
    if (!this.localVideoRef) return;
    const video = this.localVideoRef.nativeElement;
    if (!video.duration) return;

    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    
    const percentage = clickX / width;
    video.currentTime = percentage * video.duration;
    this.progress = percentage * 100;
  }

  toggleFullscreen(event: Event) {
    event.stopPropagation();
    if (!this.localVideoRef) return;
    const videoNode = this.localVideoRef.nativeElement;

    if (!document.fullscreenElement) {
      if (videoNode.requestFullscreen) {
        videoNode.requestFullscreen().catch(err => console.error(err));
      } else if ((videoNode as any).webkitRequestFullscreen) {
        (videoNode as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  }
}


