import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { VideoService } from './video.service';
import { ToastService } from './toast.service';
import { Subscription } from 'rxjs';

export interface UploadTask {
  id: string;
  title: string;
  fileName: string;
  progress: number;
  status: 'queued' | 'uploading' | 'notifying' | 'completed' | 'failed';
  error?: string;
  file: File;
  videoData: any;
  driver: string;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private http = inject(HttpClient);
  private videoService = inject(VideoService);
  private toastService = inject(ToastService);

  readonly uploads = signal<UploadTask[]>([]);
  private activeSubscription?: Subscription;

  // Compute if any task is actively uploading or queued
  readonly hasActiveUploads = computed(() => {
    return this.uploads().some(
      task => task.status === 'queued' || task.status === 'uploading' || task.status === 'notifying'
    );
  });

  constructor() {
    // Add beforeunload event to prevent accidental tab closing during uploads
    window.addEventListener('beforeunload', (event) => {
      if (this.hasActiveUploads()) {
        event.preventDefault();
        event.returnValue = 'Hay subidas de vídeo en curso. Si cierras la pestaña, se cancelará la subida.';
      }
    });
  }

  addToQueue(file: File, videoData: any, driver: string) {
    const taskId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newTask: UploadTask = {
      id: taskId,
      title: videoData.title || file.name,
      fileName: file.name,
      progress: 0,
      status: 'queued',
      file,
      videoData,
      driver
    };

    this.uploads.update(tasks => [...tasks, newTask]);
    this.processQueue();
  }

  retryTask(taskId: string) {
    this.uploads.update(tasks => tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, status: 'queued', progress: 0, error: undefined };
      }
      return task;
    }));
    this.processQueue();
  }

  removeTask(taskId: string) {
    const activeTask = this.getCurrentActiveTask();
    if (activeTask && activeTask.id === taskId) {
      if (this.activeSubscription) {
        this.activeSubscription.unsubscribe();
        this.activeSubscription = undefined;
      }
    }

    this.uploads.update(tasks => tasks.filter(task => task.id !== taskId));
    this.processQueue();
  }

  clearCompletedTasks() {
    this.uploads.update(tasks => tasks.filter(
      task => task.status !== 'completed' && task.status !== 'failed'
    ));
  }

  private getCurrentActiveTask(): UploadTask | undefined {
    return this.uploads().find(task => task.status === 'uploading' || task.status === 'notifying');
  }

  private processQueue() {
    if (this.getCurrentActiveTask()) {
      return;
    }

    const nextTask = this.uploads().find(task => task.status === 'queued');
    if (!nextTask) {
      return;
    }

    this.startUpload(nextTask);
  }

  private updateTaskStatus(taskId: string, updates: Partial<UploadTask>) {
    this.uploads.update(tasks => tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, ...updates };
      }
      return task;
    }));
  }

  private handleError(taskId: string, message: string, errorObj?: any) {
    console.error(`[UploadService] Error in task ${taskId}:`, message, errorObj);
    this.updateTaskStatus(taskId, { status: 'failed', error: message });
    this.toastService.error(`Error al subir: ${message}`);
    this.activeSubscription = undefined;
    this.processQueue();
  }

  private startUpload(task: UploadTask) {
    this.updateTaskStatus(task.id, { status: 'uploading', progress: 0 });

    if (task.driver === 'bunny' || task.driver === 'bitmovin') {
      this.activeSubscription = this.videoService.createDirectUploadVideo(task.videoData).subscribe({
        next: (res: any) => {
          const uploadUrl = res.uploadUrl;
          const videoId = res.video.id;
          const accessKey = res.accessKey;

          if (!uploadUrl || !videoId) {
            this.handleError(task.id, 'Respuesta de subida directa inválida desde el servidor.');
            return;
          }

          const headers: any = {};
          if (task.driver === 'bunny' && accessKey) {
            headers['AccessKey'] = accessKey;
            headers['Content-Type'] = 'application/octet-stream';
          }

          this.activeSubscription = this.videoService.uploadToUrl(uploadUrl, task.file, headers).subscribe({
            next: (event: any) => {
              if (event.type === HttpEventType.UploadProgress) {
                const percentDone = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
                this.updateTaskStatus(task.id, { progress: Math.min(percentDone, 99) });
              } else if (event.type === HttpEventType.Response) {
                this.updateTaskStatus(task.id, { status: 'notifying' });
                this.activeSubscription = this.videoService.notifyVideoUploaded(videoId).subscribe({
                  next: () => {
                    this.updateTaskStatus(task.id, { status: 'completed', progress: 100 });
                    this.toastService.success(`Vídeo "${task.title}" subido correctamente.`);
                    this.activeSubscription = undefined;
                    this.processQueue();
                  },
                  error: (err) => {
                    const errorMsg = err.error?.message || 'Error al registrar la subida en el servidor principal.';
                    this.handleError(task.id, errorMsg, err);
                  }
                });
              }
            },
            error: (err) => {
              const errorMsg = err.error?.message || `Fallo en la transferencia de datos a ${task.driver}.`;
              this.handleError(task.id, errorMsg, err);
            }
          });
        },
        error: (err) => {
          const errorMsg = err.error?.message || 'Error al registrar la subida con la base de datos.';
          this.handleError(task.id, errorMsg, err);
        }
      });
    } else {
      // Legacy flow with progress reporting
      const formData = new FormData();
      formData.append('dog_id', task.videoData.dog_id);
      if (task.videoData.competition_id) {
        formData.append('competition_id', task.videoData.competition_id);
      }
      formData.append('date', task.videoData.date);
      formData.append('title', task.videoData.title);
      formData.append('manga_type', task.videoData.manga_type);
      formData.append('orientation', task.videoData.orientation);
      formData.append('video', task.file);

      // We read the endpoint URL directly from videoService apiPath
      const targetUrl = (this.videoService as any).apiUrl;

      this.activeSubscription = this.http.post(targetUrl, formData, {
        reportProgress: true,
        observe: 'events'
      }).subscribe({
        next: (event: any) => {
          if (event.type === HttpEventType.UploadProgress) {
            const percentDone = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
            this.updateTaskStatus(task.id, { progress: percentDone });
          } else if (event.type === HttpEventType.Response) {
            this.updateTaskStatus(task.id, { status: 'completed', progress: 100 });
            this.toastService.success(`Vídeo "${task.title}" subido correctamente.`);
            this.activeSubscription = undefined;
            this.processQueue();
          }
        },
        error: (err) => {
          let errorMsg = 'Error al transferir el archivo al servidor.';
          if (err.status === 413) {
            errorMsg = 'El vídeo es demasiado pesado para el servidor (Máximo 500MB).';
          } else if (err.status === 422) {
            errorMsg = err.error?.message || 'Datos del formulario incorrectos.';
          }
          this.handleError(task.id, errorMsg, err);
        }
      });
    }
  }
}
