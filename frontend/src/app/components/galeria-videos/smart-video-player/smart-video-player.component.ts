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
    <div class="video-wrapper" [class.is-youtube]="youtubeUrl">
      <iframe *ngIf="youtubeUrl" [src]="youtubeUrl" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="video-iframe"></iframe>

      <ng-container *ngIf="!youtubeUrl && localUrl">
        <video #localVideo [src]="localUrl" class="video-local" playsinline webkit-playsinline loop preload="metadata" 
               (playing)="isPlaying = true" (pause)="isPlaying = false" (timeupdate)="onTimeUpdate($event)" (click)="togglePlay()"></video>
        
        <div class="custom-play-overlay" *ngIf="!isPlaying" (click)="togglePlay()">
          <span class="material-icons play-icon-large">play_arrow</span>
        </div>

        <div class="custom-progress-hitbox" (click)="seekVideo($event)">
          <div class="custom-progress-container">
            <div class="custom-progress-fill" [style.width.%]="progress"></div>
          </div>
        </div>

        <button class="fullscreen-btn" (click)="toggleFullscreen($event)">
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
  @Input() youtubeId?: string;
  @Input() localPath?: string;
  @ViewChild('localVideo') localVideoRef?: ElementRef<HTMLVideoElement>;

  private sanitizer = inject(DomSanitizer);

  youtubeUrl?: SafeResourceUrl;
  localUrl?: string;
  isPlaying = false;
  progress = 0;

  ngOnInit() {
    if (this.youtubeId) {
      this.youtubeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${this.youtubeId}?playsinline=1&rel=0&modestbranding=1`);
    } else if (this.localPath) {
      this.localUrl = `${environment.apiUrl.replace('/api', '')}/storage/${this.localPath}`;
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


