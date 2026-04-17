import { Component, OnInit, signal, computed, inject, AfterViewInit, ElementRef, ViewChildren, QueryList, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AnnouncementService, Announcement } from '../../services/announcement.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-tablon-anuncios',
  standalone: true,
  imports: [CommonModule, DatePipe, MatIconModule, RouterModule, FormsModule],
  templateUrl: './tablon-anuncios.component.html',
  styleUrls: ['./tablon-anuncios.component.css']
})
export class TablonAnunciosComponent implements OnInit {
  announcements = signal<Announcement[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  selectedCategory = signal('Todos');
  categories = ['Todos', 'Importante', 'Competición', 'Entrenamientos', 'Organización', 'Social'];

  displayedAnnouncements = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const currentCategory = this.selectedCategory();
    
    let filtered = this.announcements();

    if (currentCategory !== 'Todos') {
      filtered = filtered.filter(a => a.category === currentCategory);
    }

    if (query) {
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(query) || 
        a.content.toLowerCase().includes(query)
      );
    }
    return filtered;
  });
  
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

  getCategoryIcon(cat: string | undefined): string {
    if (!cat) return 'campaign';
    switch (cat) {
      case 'Importante': return 'warning';
      case 'Competición': return 'emoji_events';
      case 'Entrenamientos': return 'sports_tennis';
      case 'Organización': return 'build';
      case 'Social': return 'groups';
      default: return 'campaign';
    }
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

  setCategory(cat: string) {
    this.selectedCategory.set(cat);
  }

  // INTERSECTION OBSERVER LOGIC - "Invisible Read Tracking"
  @ViewChildren('announcementCard') cardElements!: QueryList<ElementRef>;
  private observer: IntersectionObserver | null = null;
  private readTimers = new Map<number, any>();
  private alreadyRead = new Set<number>();

  ngAfterViewInit() {
    this.setupObserver();
    this.cardElements.changes.subscribe(() => {
      this.setupObserver();
    });
  }

  setupObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Configurar el vigía: la tarjeta debe estar 60% visible
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = Number(entry.target.getAttribute('data-id'));
        if (this.alreadyRead.has(id)) return;

        if (entry.isIntersecting) {
          // Si está en pantalla, iniciar cuenta atrás de 2.5s
          const timer = setTimeout(() => {
             this.alreadyRead.add(id);
             this.triggerMarkAsRead(id);
          }, 2500);
          this.readTimers.set(id, timer);
        } else {
          // Si hace scroll y se esconde, cancelar la lectura
          if (this.readTimers.has(id)) {
            clearTimeout(this.readTimers.get(id));
            this.readTimers.delete(id);
          }
        }
      });
    }, { threshold: 0.6 });

    this.cardElements.forEach(el => {
      const id = Number(el.nativeElement.getAttribute('data-id'));
      if (!this.alreadyRead.has(id)) {
        this.observer?.observe(el.nativeElement);
      }
    });
  }

  triggerMarkAsRead(id: number) {
    this.announcementService.markAsRead(id).subscribe({
      next: () => { /* Logged read successfully */ },
      error: () => { /* Silently fail to not interrupt UX */ }
    });
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.readTimers.forEach(timer => clearTimeout(timer));
  }
}
