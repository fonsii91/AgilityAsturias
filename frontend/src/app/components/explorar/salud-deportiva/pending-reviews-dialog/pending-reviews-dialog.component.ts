import { Component, Inject, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DogWorkload } from '../../../../models/dog-workload.model';
import { DogWorkloadService } from '../../../../services/dog-workload.service';
import { ToastService } from '../../../../services/toast.service';

import { Dog } from '../../../../models/dog.model';

export interface PendingReviewsData {
  pendingReviews: DogWorkload[];
  dogId: number;
  dog?: Dog | null;
}

@Component({
  selector: 'app-pending-reviews-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './pending-reviews-dialog.component.html',
  styleUrls: ['./pending-reviews-dialog.component.css']
})
export class PendingReviewsDialogComponent {
  dialogRef = inject(MatDialogRef<PendingReviewsDialogComponent>);
  workloadService = inject(DogWorkloadService);
  toast = inject(ToastService);
  
  pendingReviews = signal<DogWorkload[]>([]);
  dogId: number;
  dog = signal<Dog | null>(null);
  confirmingIds = signal<number[]>([]);

  currentPending = computed(() => this.pendingReviews().length > 0 ? this.pendingReviews()[0] : null);
  totalPending = computed(() => this.data.pendingReviews.length);
  currentIndex = computed(() => this.totalPending() - this.pendingReviews().length + 1);

  currentRpe = signal<number>(5);

  getSafeAvatarUrl(level: number): string {
    const d = this.dog();
    if (!d) return `/Images/Salud/collie-cansancio-${level}.png`;

    let url = null;
    if (level === 1) url = d.avatar_cansancio_1_url;
    else if (level === 2) url = d.avatar_cansancio_2_url;
    else if (level === 3) url = d.avatar_cansancio_3_url;
    else if (level === 4) url = d.avatar_cansancio_4_url;
    else if (level === 5) url = d.avatar_cansancio_5_url;

    if (!url || url === "null" || url === "undefined" || url.trim() === "" || !url.includes('/')) {
      return `/Images/Salud/collie-cansancio-${level}.png`;
    }
    return url;
  }

  constructor(@Inject(MAT_DIALOG_DATA) public data: PendingReviewsData) {
    this.pendingReviews.set([...data.pendingReviews]);
    this.dogId = data.dogId;
    if (data.dog) {
      this.dog.set(data.dog);
    }
    
    const current = this.currentPending();
    if (current) {
        this.currentRpe.set(current.intensity_rpe || 5);
    }
  }

  updateRpe(pending: DogWorkload, value: number) {
    pending.intensity_rpe = value;
    this.currentRpe.set(value);
  }

  decreasePendingDuration(pending: DogWorkload) {
    if (pending.duration_min > 1) {
      pending.duration_min -= 1;
    }
  }

  increasePendingDuration(pending: DogWorkload) {
    pending.duration_min += 1;
  }

  getIconForIntensity(level: number): string {
    if (level <= 3) return 'pets'; 
    if (level <= 7) return 'directions_run'; 
    return 'local_fire_department'; 
  }

  showInfo(type: 'time' | 'jump') {
    if (type === 'time') {
      this.toast.info('Se cuenta ÚNICAMENTE el tiempo de máxima intensidad. 1 h de clase suele suponer entre 6 y 8 min reales en pista.', 8000);
    } else {
      this.toast.info('Cruzar el umbral de altura a la cruz aumenta el impacto articular exponencialmente.', 5000);
    }
  }

  confirmPending(workload: DogWorkload) {
    if (!this.dogId) return;
    
    if (!workload.duration_min || workload.duration_min <= 0) {
       this.toast.error('Por favor, indica un tiempo activo mayor a 0 minutos.');
       return;
    }
    
    if (!workload.intensity_rpe) {
       this.toast.error('Por favor, evalúa el cansancio de tu perro.');
       return;
    }

    this.confirmingIds.update(ids => [...ids, workload.id]);

    this.workloadService.confirmWorkload(
       workload.id, 
       workload.duration_min, 
       workload.intensity_rpe, 
       workload.jumped_max_height, 
       workload.number_of_runs
    ).subscribe({
      next: () => {
        this.confirmingIds.update(ids => ids.filter(id => id !== workload.id));
        this.toast.success('Entrenamiento validado con éxito');
        
        // Remove from local list
        this.pendingReviews.update(list => list.filter(w => w.id !== workload.id));
        
        // Close if empty
        if (this.pendingReviews().length === 0) {
            this.dialogRef.close(true); // true means data was changed
        } else {
            const next = this.currentPending();
            if (next) this.currentRpe.set(next.intensity_rpe || 5);
        }
      },
      error: () => {
        this.confirmingIds.update(ids => ids.filter(id => id !== workload.id));
        this.toast.error('Hubo un error al confirmar el entrenamiento.');
      }
    });
  }

  close() {
    // If list is smaller than initial, something was saved, so return true
    const changed = this.pendingReviews().length < this.data.pendingReviews.length;
    this.dialogRef.close(changed);
  }
}
