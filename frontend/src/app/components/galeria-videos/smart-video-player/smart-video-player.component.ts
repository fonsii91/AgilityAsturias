import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-smart-video-player',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './smart-video-player.component.css',
  template: `
    <div class="video-wrapper">
      <iframe *ngIf="youtubeUrl" [src]="youtubeUrl" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="video-iframe"></iframe>
      
      <video *ngIf="!youtubeUrl && localUrl" [src]="localUrl" controls class="video-local"></video>
      
      <div *ngIf="!youtubeUrl && !localUrl" class="video-unavailable">
        Vídeo no disponible
      </div>
    </div>
  `
})
export class SmartVideoPlayerComponent implements OnInit {
  @Input() youtubeId?: string;
  @Input() localPath?: string;

  private sanitizer = inject(DomSanitizer);

  youtubeUrl?: SafeResourceUrl;
  localUrl?: string;

  ngOnInit() {
    if (this.youtubeId) {
      this.youtubeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${this.youtubeId}`);
    } else if (this.localPath) {
      // Assuming public storage access config via generic server url
      this.localUrl = `${environment.apiUrl.replace('/api', '')}/storage/${this.localPath}`;
    }
  }
}
