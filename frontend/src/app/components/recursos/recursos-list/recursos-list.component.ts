import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ResourceService, Resource, RESOURCE_CATEGORIES } from '../../../services/resource.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-recursos-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './recursos-list.component.html',
  styleUrls: ['./recursos-list.component.scss']
})
export class RecursosListComponent implements OnInit {
  resources: Resource[] = [];
  categories = RESOURCE_CATEGORIES;
  selectedCategory: string = '';
  isLoading = true;
  userRole: string = '';

  constructor(
    private resourceService: ResourceService
  ) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.userRole = user.role;
      } catch(e) {}
    }
    this.loadResources();
  }

  loadResources(): void {
    this.isLoading = true;
    this.resourceService.getResources(this.selectedCategory).subscribe({
      next: (data: Resource[]) => {
        this.resources = data;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading resources', err);
        this.isLoading = false;
      }
    });
  }

  onCategoryChange(): void {
    this.loadResources();
  }

  canManage(): boolean {
    return this.userRole === 'staff' || this.userRole === 'admin';
  }

  getCategoryLabel(val: string): string {
    return this.categories.find((c: any) => c.value === val)?.label || val;
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
}
