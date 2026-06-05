import { Component, Input, OnInit, OnDestroy, inject, ElementRef, input, viewChild, effect, computed, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';
import Hls from 'hls.js';

@Component({
  selector: 'app-smart-video-player',
  standalone: true,
  imports: [],
  styleUrl: './smart-video-player.component.css',
  template: `
    <div class="video-wrapper" [class.is-youtube]="youtubeUrl()" [class.is-active]="isVideoActive" [class.is-horizontal-wrapper]="isHorizontal">
    
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
    
      @if (youtubeUrl() && hasStarted) {
        <iframe #youtubeIframe [src]="autoplayYoutubeUrl()" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="video-iframe"></iframe>
      }
    
      @if (!youtubeUrl() && localUrl()) {
        <video #localVideo [src]="isNativeHls() ? localUrl() : null" class="video-local" playsinline webkit-playsinline loop preload="metadata" [muted]="isMuted"
        (playing)="isPlaying = true" (pause)="isPlaying = false" (timeupdate)="onTimeUpdate($event)" (click)="togglePlay()" (error)="onVideoError($event)"></video>
        
        @if (hasError()) {
          <div class="video-error-overlay">
            <span class="material-icons error-icon">error_outline</span>
            <p class="error-title">No se pudo reproducir el vídeo</p>
            <p class="error-desc">{{ errorMessage() }}</p>
          </div>
        }
        
        @if (!isPlaying && isVideoActive && !hasError()) {
          <div class="custom-play-overlay" (click)="togglePlay()">
            <span class="material-icons play-icon-large">play_arrow</span>
          </div>
        }
        @if (isVideoActive && !hasError()) {
          <div class="custom-progress-hitbox" (click)="seekVideo($event)">
            <div class="custom-progress-container">
              <div class="custom-progress-fill" [style.width.%]="progress"></div>
            </div>
          </div>
        }
        @if (isVideoActive && !hasError()) {
          <button class="mute-btn" (click)="toggleMute($event)" title="Silenciar/Activar sonido">
            <span class="material-icons">{{ isMuted ? 'volume_off' : 'volume_up' }}</span>
          </button>
          <button class="fullscreen-btn" (click)="toggleFullscreen($event)">
            <span class="material-icons">fullscreen</span>
          </button>
        }
      }
    
      @if (!youtubeUrl() && !localUrl()) {
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
export class SmartVideoPlayerComponent implements OnInit, OnDestroy {
  @Input() coverImageUrl?: string;
  readonly youtubeId = input<string>();
  readonly localPath = input<string>();
  readonly playbackUrl = input<string | null | undefined>();
  readonly localVideoRef = viewChild<ElementRef<HTMLVideoElement>>('localVideo');
  readonly youtubeIframeLocal = viewChild<ElementRef<HTMLIFrameElement>>('youtubeIframe');

  private sanitizer = inject(DomSanitizer);

  isPlaying = false;
  hasStarted = false; // Tracks if the video was ever started
  progress = 0;
  isMuted = false;
  hls?: Hls;

  hasError = signal<boolean>(false);
  errorMessage = signal<string>('');

  @Input() isHorizontal = false;

  get isVideoActive(): boolean {
    return this.hasStarted;
  }

  readonly isNativeHls = computed(() => {
    const playbackUrl = this.playbackUrl();
    const localPath = this.localPath();
    if (playbackUrl) {
      const userAgent = window.navigator.userAgent.toLowerCase();
      // Use native HLS only on Safari and iOS devices (which don't support MSE or require native)
      const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome') && !userAgent.includes('android');
      const isIOS = /ipad|iphone|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      return isSafari || isIOS;
    }
    if (localPath) {
      return true;
    }
    return false;
  });

  readonly localUrl = computed(() => {
    const playbackUrl = this.playbackUrl();
    const localPath = this.localPath();
    if (playbackUrl) {
      // Append cache-buster to prevent browser from reusing a cached 404/403 error response
      const separator = playbackUrl.includes('?') ? '&' : '?';
      return `${playbackUrl}${separator}cb=${Date.now()}`;
    }
    if (localPath) {
      return `${environment.apiUrl.replace('/api', '')}/storage/${localPath}`;
    }
    return undefined;
  });

  readonly youtubeUrl = computed(() => {
    const youtubeId = this.youtubeId();
    if (!youtubeId) return undefined;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${youtubeId}?playsinline=1&rel=0&modestbranding=1&enablejsapi=1`);
  });

  readonly autoplayYoutubeUrl = computed(() => {
    const youtubeId = this.youtubeId();
    if (!youtubeId) return undefined;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${youtubeId}?playsinline=1&rel=0&modestbranding=1&autoplay=1&enablejsapi=1`);
  });

  constructor() {
    effect(() => {
      const videoElRef = this.localVideoRef();
      const localUrl = this.localUrl();
      const isNative = this.isNativeHls();
      
      if (videoElRef && localUrl && !isNative) {
        const video = videoElRef.nativeElement;
        
        if (this.hls) {
          this.hls.destroy();
        }
        
        this.hls = new Hls();
        this.hls.loadSource(localUrl);
        this.hls.attachMedia(video);
        
        this.hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            this.hasError.set(true);
            if (data.details === 'manifestLoadError') {
              const status = (data.response as any)?.code;
              if (status === 403) {
                const currentHost = window.location.host;
                this.errorMessage.set(`Acceso denegado (403 Forbidden). Por favor, asegúrese de agregar "${currentHost}" a la lista de "Allowed Domains" en la configuración de seguridad de Bunny.net Stream.`);
              } else if (status === 404) {
                this.errorMessage.set('El vídeo no se encuentra en Bunny.net (404 Not Found). Puede que aún se esté procesando.');
              } else {
                this.errorMessage.set(`Error de red al cargar el vídeo (Código ${status || 'desconocido'}).`);
              }
            } else {
              this.errorMessage.set(`Fallo de reproducción: ${data.details}`);
            }
          }
        });
        
        if (this.isPlaying) {
          video.play().catch(() => {});
        }
      }
    });
  }

  ngOnInit() {}

  ngOnDestroy() {
    if (this.hls) {
      this.hls.destroy();
    }
  }

  onVideoError(event: Event) {
    const video = event.target as HTMLVideoElement;
    const error = video.error;
    this.hasError.set(true);
    if (error) {
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          this.errorMessage.set('La reproducción fue interrumpida.');
          break;
        case error.MEDIA_ERR_NETWORK:
          this.errorMessage.set('Fallo de red al descargar el vídeo.');
          break;
        case error.MEDIA_ERR_DECODE:
          this.errorMessage.set('Error al decodificar el vídeo. El archivo podría estar corrupto.');
          break;
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          if (this.playbackUrl()) {
            const currentHost = window.location.host;
            this.errorMessage.set(`No se admite el formato o el acceso fue denegado (403/404). Asegúrese de haber añadido "${currentHost}" a "Allowed Domains" en Bunny.net.`);
          } else {
            this.errorMessage.set('El archivo de vídeo local no existe en este equipo o el formato no es compatible.');
          }
          break;
        default:
          this.errorMessage.set('Ocurrió un error inesperado al reproducir el vídeo.');
          break;
      }
    } else {
      this.errorMessage.set('Fallo de reproducción en el reproductor nativo.');
    }
  }

  startPlayback() {
    this.hasError.set(false);
    this.errorMessage.set('');
    const isFirstTime = !this.hasStarted;
    this.hasStarted = true;
    this.isPlaying = true;

    if (this.youtubeId()) {
      if (!isFirstTime) {
         this.youtubeIframeLocal()?.nativeElement.contentWindow?.postMessage(
           '{"event":"command","func":"playVideo","args":""}', '*'
         );
      }
    } else {
      const localVideoRef = this.localVideoRef();
      if (localVideoRef) {
        const video = localVideoRef.nativeElement;
        video.play().catch(() => {});
      }
    }
  }

  returnToCover(event: Event) {
    event.stopPropagation();
    this.hasStarted = false;
    this.isPlaying = false;
    this.hasError.set(false);
    this.errorMessage.set('');
    
    if (this.youtubeUrl()) {
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
    if (this.youtubeUrl()) return;
    if (this.hasError()) return;

    const localVideoRef = this.localVideoRef();
    if (localVideoRef) {
      const video = localVideoRef.nativeElement;
      if (video.paused) {
        video.play().catch(() => {});
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
        videoNode.requestFullscreen().catch(() => {});
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


