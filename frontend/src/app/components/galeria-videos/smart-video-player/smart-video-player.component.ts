import { Component, Input, OnInit, inject, ElementRef, input, viewChild } from '@angular/core';

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-smart-video-player',
  standalone: true,
  imports: [],
  styleUrl: './smart-video-player.component.css',
  template: `
    <div class="video-wrapper" [class.is-youtube]="youtubeUrl" [class.is-active]="isVideoActive" [class.is-horizontal-wrapper]="isHorizontal">
    
      <!-- Video Cover / Poster -->
      @if (!isVideoActive) {
        <div class="poster-cover" (click)="startPlayback()">
          @if (coverImageUrl) {
            <img [src]="coverImageUrl" class="poster-image" alt="Video cover">
          }
          @if (!coverImageUrl) {
            <div class="poster-placeholder">
              <span class="material-icons">pets</span>
            </div>
          }
          <div class="poster-overlay-gradient"></div>
          <span class="material-icons play-icon-massive">play_circle_outline</span>
        </div>
      }
    
      @if (youtubeUrl && hasStarted) {
        <iframe #youtubeIframe [src]="autoplayYoutubeUrl" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="video-iframe"></iframe>
      }
    
      @if (!youtubeUrl && localUrl) {
        <video #localVideo [src]="localUrl" class="video-local" playsinline webkit-playsinline loop preload="metadata" [muted]="isMuted"
        (playing)="isPlaying = true" (pause)="isPlaying = false" (timeupdate)="onTimeUpdate($event)" (click)="togglePlay()"></video>
        @if (!isPlaying && isVideoActive) {
          <div class="custom-play-overlay" (click)="togglePlay()">
            <span class="material-icons play-icon-large">play_arrow</span>
          </div>
        }
        @if (isVideoActive) {
          <div class="custom-progress-hitbox" (click)="seekVideo($event)">
            <div class="custom-progress-container">
              <div class="custom-progress-fill" [style.width.%]="progress"></div>
            </div>
          </div>
        }
        @if (isVideoActive) {
          <button class="mute-btn" (click)="toggleMute($event)" title="Silenciar/Activar sonido">
            <span class="material-icons">{{ isMuted ? 'volume_off' : 'volume_up' }}</span>
          </button>
          <button class="fullscreen-btn" (click)="toggleFullscreen($event)">
            <span class="material-icons">fullscreen</span>
          </button>
        }
      }
    
      @if (!youtubeUrl && !localUrl) {
        <div class="video-unavailable">
          Vídeo no disponible
        </div>
      }
    
      @if (isVideoActive) {
        <button class="return-cover-btn" (click)="returnToCover($event)" title="Volver a la portada">
          <span class="material-icons">arrow_back</span>
        </button>
      }
    </div>
    `
})
export class SmartVideoPlayerComponent implements OnInit {
  @Input() coverImageUrl?: string;
  readonly youtubeId = input<string>();
  readonly localPath = input<string>();
  readonly localVideoRef = viewChild<ElementRef<HTMLVideoElement>>('localVideo');
  readonly youtubeIframeLocal = viewChild<ElementRef<HTMLIFrameElement>>('youtubeIframe');

  private sanitizer = inject(DomSanitizer);

  youtubeUrl?: SafeResourceUrl;
  autoplayYoutubeUrl?: SafeResourceUrl;
  localUrl?: string;
  isPlaying = false;
  hasStarted = false; // Tracks if the video was ever started
  progress = 0;
  isMuted = false;

  @Input() isHorizontal = false;

  get isVideoActive(): boolean {
    return this.hasStarted;
  }

  ngOnInit() {
    const youtubeId = this.youtubeId();
    const localPath = this.localPath();
    if (youtubeId) {
      this.youtubeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${youtubeId}?playsinline=1&rel=0&modestbranding=1&enablejsapi=1`);
      this.autoplayYoutubeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${youtubeId}?playsinline=1&rel=0&modestbranding=1&autoplay=1&enablejsapi=1`);
    } else if (localPath) {
      this.localUrl = `${environment.apiUrl.replace('/api', '')}/storage/${localPath}`;
    }
  }

  startPlayback() {
    const isFirstTime = !this.hasStarted;
    this.hasStarted = true;
    this.isPlaying = true;

    if (this.youtubeId()) {
      // If it was paused, resume it via YouTube API
      if (!isFirstTime) {
         this.youtubeIframeLocal()?.nativeElement.contentWindow?.postMessage(
           '{"event":"command","func":"playVideo","args":""}', '*'
         );
      }
    } else {
      const localVideoRef = this.localVideoRef();
      if (localVideoRef) {
        const video = localVideoRef.nativeElement;
        video.play().catch(e => console.error('Play error:', e));
      }
    }
  }

  returnToCover(event: Event) {
    event.stopPropagation();
    this.hasStarted = false;
    this.isPlaying = false;
    
    if (this.youtubeUrl) {
      this.youtubeIframeLocal()?.nativeElement.contentWindow?.postMessage(
         '{"event":"command","func":"pauseVideo","args":""}', '*'
      );
    } else {
      const localVideoRef = this.localVideoRef();
      if (localVideoRef) {
        localVideoRef.nativeElement.pause();
      }
    }
  }

  togglePlay() {
    if (this.youtubeUrl) return;

    const localVideoRef = this.localVideoRef();
    if (localVideoRef) {
      const video = localVideoRef.nativeElement;
      if (video.paused) {
        video.play().catch(e => console.error('Auto-play prevented:', e));
      } else {
        video.pause();
      }
    }
  }

  toggleMute(event: Event) {
    event.stopPropagation();
    this.isMuted = !this.isMuted;
    const localVideoRef = this.localVideoRef();
    if (localVideoRef) {
      localVideoRef.nativeElement.muted = this.isMuted;
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
    const localVideoRef = this.localVideoRef();
    if (!localVideoRef) return;
    const video = localVideoRef.nativeElement;
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
    const localVideoRef = this.localVideoRef();
    if (!localVideoRef) return;
    const videoNode = localVideoRef.nativeElement;

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


