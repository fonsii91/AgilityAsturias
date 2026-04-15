import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AnnouncementService, Announcement } from '../../services/announcement.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-tablon-anuncios',
  standalone: true,
  imports: [CommonModule, DatePipe, MatIconModule, RouterModule],
  templateUrl: './tablon-anuncios.component.html',
  styleUrls: ['./tablon-anuncios.component.css']
})
export class TablonAnunciosComponent implements OnInit {
  announcements = signal<Announcement[]>([]);
  isLoading = signal(true);
  
  // UX logic
  expandedAnnouncements = new Set<number>();
  
  authService = inject(AuthService);
  sanitizer = inject(DomSanitizer);

  // Allow admin and staff to create and delete messages
  canManage = this.authService.isAdmin() || this.authService.isStaff();

  constructor(
    private announcementService: AnnouncementService,
    private toastService: ToastService
  ) {
  }

  ngOnInit(): void {
    this.loadAnnouncements();
  }

  loadAnnouncements() {
    this.isLoading.set(true);
    this.announcementService.getAnnouncements().subscribe({
      next: (data) => {
        this.announcements.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching announcements', err);
        this.toastService.error('No se pudo cargar el tablón de anuncios');
        this.isLoading.set(false);
      }
    });
  }

  deleteAnnouncement(id: number) {
    if (!this.canManage) return;
    if (!confirm('¿Estás seguro de que quieres borrar este anuncio?')) return;

    this.announcementService.deleteAnnouncement(id).subscribe({
      next: () => {
        this.announcements.update(list => list.filter(a => a.id !== id));
        this.toastService.success('Anuncio eliminado');
      },
      error: (err) => {
        console.error('Error deleting announcement', err);
        this.toastService.error('Error al eliminar el anuncio');
      }
    });
  }

  // UX Methods
  isRecent(dateStr: string): boolean {
    const postDate = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - postDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays < 1;
  }

  toggleExpand(id: number) {
    if (this.expandedAnnouncements.has(id)) {
      this.expandedAnnouncements.delete(id);
    } else {
      this.expandedAnnouncements.add(id);
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedAnnouncements.has(id);
  }

  needsCollapse(content: string): boolean {
    // Roughly 300 characters or more than 4 lines
    return content.length > 300 || (content.match(/\n/g) || []).length > 3;
  }

  formatContent(content: string): SafeHtml {
    // Linkify URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let formatted = content.replace(urlRegex, (url) => {
      // Escape URL nicely for safety and rendering
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="linkified-url">${url}</a>`;
    });
    
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }
}
