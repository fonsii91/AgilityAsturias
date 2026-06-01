import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadService, UploadTask } from '../../../services/upload.service';

@Component({
  selector: 'app-upload-progress-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-progress-panel.component.html',
  styleUrl: './upload-progress-panel.component.css'
})
export class UploadProgressPanelComponent {
  public uploadService = inject(UploadService);
  
  isMinimized = signal<boolean>(true);

  // Compute tasks to display
  readonly tasks = computed(() => this.uploadService.uploads());

  // Compute aggregated stats
  readonly totalTasks = computed(() => this.tasks().length);
  
  readonly activeTasksCount = computed(() => {
    return this.tasks().filter(
      t => t.status === 'queued' || t.status === 'uploading' || t.status === 'notifying'
    ).length;
  });

  readonly failedTasksCount = computed(() => {
    return this.tasks().filter(t => t.status === 'failed').length;
  });

  readonly completedTasksCount = computed(() => {
    return this.tasks().filter(t => t.status === 'completed').length;
  });

  readonly globalProgress = computed(() => {
    const activeTasks = this.tasks().filter(
      t => t.status === 'uploading' || t.status === 'queued' || t.status === 'notifying'
    );
    if (activeTasks.length === 0) return 100;
    
    const sum = activeTasks.reduce((acc, t) => acc + t.progress, 0);
    return Math.round(sum / activeTasks.length);
  });

  toggleMinimize() {
    this.isMinimized.update(val => !val);
  }

  retryTask(taskId: string, event: Event) {
    event.stopPropagation();
    this.uploadService.retryTask(taskId);
  }

  removeTask(taskId: string, event: Event) {
    event.stopPropagation();
    this.uploadService.removeTask(taskId);
  }

  clearCompleted(event: Event) {
    event.stopPropagation();
    this.uploadService.clearCompletedTasks();
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'queued': return 'schedule';
      case 'uploading': return 'cloud_upload';
      case 'notifying': return 'hourglass_empty';
      case 'completed': return 'check_circle';
      case 'failed': return 'error';
      default: return 'help_outline';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'queued': return 'En cola';
      case 'uploading': return 'Subiendo';
      case 'notifying': return 'Procesando subida';
      case 'completed': return 'Completado';
      case 'failed': return 'Error';
      default: return '';
    }
  }
}
