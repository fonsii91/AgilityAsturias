import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ResourceService, Resource, RESOURCE_CATEGORIES, RESOURCE_LEVELS } from '../../../services/resource.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { InstruccionesComponent } from '../../shared/instrucciones/instrucciones.component';

@Component({
  selector: 'app-recursos-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, InstruccionesComponent],
  templateUrl: './recursos-list.component.html',
  styleUrls: ['./recursos-list.component.scss']
})
export class RecursosListComponent implements OnInit {
  resources = signal<Resource[]>([]);
  categories = RESOURCE_CATEGORIES;
  levels = RESOURCE_LEVELS;
  
  selectedCategory = signal<string>('');
  selectedLevel = signal<string>('all');
  isLoading = signal(true);

  constructor(
    private resourceService: ResourceService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadResources();
  }

  loadResources(): void {
    this.isLoading.set(true);
    this.resourceService.getResources(this.selectedCategory(), this.selectedLevel()).subscribe({
      next: (data: Resource[]) => {
        this.resources.set(data);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading resources', err);
        this.isLoading.set(false);
      }
    });
  }

  onCategoryChange(): void {
    this.loadResources();
  }

  onLevelChange(): void {
    this.loadResources();
  }

  canManage(): boolean {
    return this.authService.isStaff();
  }

  getCategoryLabel(val: string): string {
    return this.categories.find((c: any) => c.value === val)?.label || val;
  }

  getLevelLabel(val: string): string {
    return this.levels.find((l: any) => l.value === val)?.label || val;
  }

  getIconForType(type: string): string {
    switch(type) {
      case 'document': return 'description';
      case 'video': return 'play_circle';
      case 'link': return 'link';
      default: return 'insert_drive_file';
    }
  }

  openResource(res: Resource): void {
      if (res.file_path) {
          const baseUrl = environment.apiUrl.replace('/api', '');
          window.open(`${baseUrl}/storage/${res.file_path}`, '_blank');
      } else if (res.url) {
          window.open(res.url, '_blank');
      }
  }

  async downloadResource(res: Resource): Promise<void> {
      if (res.file_path) {
          try {
              const baseUrl = environment.apiUrl.replace('/api', '');
              const url = `${baseUrl}/storage/${res.file_path}`;
              
              const response = await fetch(url);
              if (!response.ok) throw new Error('Network response was not ok');
              
              const blob = await response.blob();
              const objectUrl = window.URL.createObjectURL(blob);
              
              const a = document.createElement('a');
              a.href = objectUrl;
              const ext = res.file_path.split('.').pop() || 'file';
              // Sanitizar nombre para el archivo
              const safeTitle = res.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
              a.download = `${safeTitle}.${ext}`;
              
              document.body.appendChild(a);
              a.click();
              
              window.URL.revokeObjectURL(objectUrl);
              document.body.removeChild(a);
          } catch (e) {
              console.error('Error al forzar la descarga, abriendo en nueva pestaña fallback:', e);
              this.openResource(res);
          }
      } else if (res.url) {
          window.open(res.url, '_blank');
      }
  }

  deleteResource(event: Event, resource: Resource): void {
    event.stopPropagation();
    if (confirm(`¿Estás seguro de que quieres eliminar "${resource.title}"?`)) {
      this.resourceService.deleteResource(resource.id!).subscribe({
        next: () => {
          this.loadResources();
        },
        error: (error) => {
          console.error('Error eliminando recurso:', error);
          alert('Hubo un error al eliminar el recurso.');
        }
      });
    }
  }
}
