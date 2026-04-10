import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ResourceService, Resource, RESOURCE_CATEGORIES, RESOURCE_LEVELS } from '../../../services/resource.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-recursos-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
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
  isHelpModalOpen = signal(false);

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
      if (res.type === 'document' && res.file_path) {
          const baseUrl = environment.apiUrl.replace('/api', '');
          window.open(`${baseUrl}/storage/${res.file_path}`, '_blank');
      } else if (res.url) {
          window.open(res.url, '_blank');
      }
  }

  deleteResource(event: Event, res: Resource): void {
    event.stopPropagation();
    if (confirm(`¿Confirmas que deseas eliminar "${res.title}"?`)) {
      this.resourceService.deleteResource(res.id).subscribe(() => {
        this.loadResources();
      });
    }
  }

  openHelpModal(): void {
    this.isHelpModalOpen.set(true);
  }

  closeHelpModal(): void {
    this.isHelpModalOpen.set(false);
  }
}
