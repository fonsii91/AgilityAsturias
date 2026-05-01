import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DogWorkloadService } from '../../../services/dog-workload.service';
import { DogService } from '../../../services/dog.service';
import { AcwrData, DogWorkload } from '../../../models/dog-workload.model';
import { Dog } from '../../../models/dog.model';
import { WorkloadGaugeComponent } from './workload-gauge/workload-gauge';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { PendingReviewsDialogComponent } from './pending-reviews-dialog/pending-reviews-dialog.component';
import { HistoryDialogComponent } from './history-dialog/history-dialog.component';

@Component({
  selector: 'app-salud-deportiva',
  standalone: true,
  imports: [CommonModule, FormsModule, WorkloadGaugeComponent, MatDialogModule, MatButtonModule, MatIconModule, MatRippleModule],
  templateUrl: './salud-deportiva.html',
  styleUrls: ['./salud-deportiva.css']
})
export class SaludDeportivaComponent implements OnInit {
  dialog = inject(MatDialog);
  dogs = signal<Dog[]>([]);
  selectedDogId = signal<number | null>(null);
  // Force recompile to pick up AcwrData status_color interface change
  acwrData = signal<AcwrData | null>(null);
  pendingReviews = signal<DogWorkload[]>([]);
  isLoading = signal<boolean>(false);

  selectedDogName = computed(() => {
    const id = this.selectedDogId();
    if (!id) return 'Tu perro';
    const dog = this.dogs().find(d => d.id === id);
    return dog ? dog.name : 'Tu perro';
  });

  selectedDog = computed(() => {
    const id = this.selectedDogId();
    if (!id) return null;
    return this.dogs().find(d => d.id === id) || null;
  });

  heroImageUrl = computed(() => {
    const dog = this.selectedDog();
    if (!dog) return '/placeholder-dog.jpg';

    // Se mantiene siempre la foto original del perro como foto principal.
    return dog.photo_url || '/placeholder-dog.jpg';
  });

  // Formularios manuales
  isManualFormOpen = signal<boolean>(false);
  isHelpModalOpen = signal<boolean>(false);

  visibleHistory = computed(() => {
    const data = this.acwrData();
    if (!data || !data.recent_history) return [];
    return data.recent_history.slice(0, 2);
  });

  editingWorkloadId = signal<number | null>(null);
  manualDate = signal<string>(new Date().toISOString().split('T')[0]);
  manualDuration = signal<number>(8);
  manualIntensity = signal<number>(8); // Agility default RPE
  manualJumpedMaxHeight = signal<boolean>(false);
  manualNumberOfRuns = signal<number | null>(2); // Preselected 1-2
  isSubmitting = signal<boolean>(false);

  getSafeAvatarUrl(level: number): string {
    const d = this.selectedDog();
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

  workloadToDelete = signal<number | null>(null);

  confirmingIds = signal<number[]>([]);

  constructor(
    private workloadService: DogWorkloadService,
    private dogService: DogService,
    private toast: ToastService
  ) { }

  ngOnInit() {
    this.dogService.loadUserDogs().then(dogs => {
      this.dogs.set(dogs);
      if (dogs.length > 0) {
        this.selectedDogId.set(dogs[0].id);
        this.loadDogData();
      }
    });
  }

  onDogChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedDogId.set(Number(target.value));
    this.loadDogData();
  }

  loadDogData() {
    const dogId = this.selectedDogId();
    if (!dogId) return;
    this.isLoading.set(true);

    this.workloadService.getAcwrData(dogId).subscribe(data => {
      this.acwrData.set(data);
      this.isLoading.set(false);
    });

    this.workloadService.getPendingReviews(dogId).subscribe(pending => {
      this.pendingReviews.set(pending.map(p => ({
        ...p,
        duration_min: p.duration_min || 8, // Respeta el valor dinámico calculado en backend
        intensity_rpe: p.intensity_rpe || 5,
        number_of_runs: p.number_of_runs || 2 // Preselect 1-2
      })));
    });
  }

  toggleManualForm() {
    this.isManualFormOpen.update(val => !val);
    if (!this.isManualFormOpen()) {
      this.resetManualForm();
    }
  }

  resetManualForm() {
    this.editingWorkloadId.set(null);
    this.manualDate.set(new Date().toISOString().split('T')[0]);
    this.manualDuration.set(8);
    this.manualIntensity.set(8);
    this.manualJumpedMaxHeight.set(false);
    this.manualNumberOfRuns.set(2);
  }

  startEditWorkload(w: DogWorkload) {
    this.editingWorkloadId.set(w.id);
    this.manualDate.set(w.date.split('T')[0]);
    this.manualDuration.set(w.duration_min);
    this.manualIntensity.set(w.intensity_rpe);
    this.manualJumpedMaxHeight.set(!!w.jumped_max_height);
    this.manualNumberOfRuns.set(w.number_of_runs || null);

    this.isManualFormOpen.set(true);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  }

  decreaseManualDuration() {
    let val = this.manualDuration();
    if (val > 1) {
      this.manualDuration.set(val - 1);
    }
  }

  increaseManualDuration() {
    this.manualDuration.set(this.manualDuration() + 1);
  }

  openHelpModal() {
    this.isHelpModalOpen.set(true);
  }

  showInfo(type: 'time' | 'jump') {
    if (type === 'time') {
      this.toast.info('Se cuenta ÚNICAMENTE el tiempo de máxima intensidad. 1 h de clase suele suponer entre 6 y 8 min reales en pista.', 8000);
    } else {
      this.toast.info('Cruzar el umbral de altura a la cruz aumenta el impacto articular exponencialmente.', 5000);
    }
  }

  closeHelpModal() {
    this.isHelpModalOpen.set(false);
  }

  openPendingModal() {
    const dialogRef = this.dialog.open(PendingReviewsDialogComponent, {
      width: '650px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'bento-dialog-panel',
      data: {
        pendingReviews: this.pendingReviews(),
        dogId: this.selectedDogId(),
        dog: this.selectedDog()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDogData();
      }
    });
  }

  openHistoryModal() {
    const dialogRef = this.dialog.open(HistoryDialogComponent, {
      width: '650px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'bento-dialog-panel',
      data: {
        history: this.acwrData()?.recent_history || []
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'edit' && result.workload) {
        this.startEditWorkload(result.workload);
      } else if (result && result.action === 'delete' && result.id) {
        this.promptDeleteWorkload(result.id);
      }
    });
  }

  getIconForIntensity(level: number): string {
    if (level <= 3) return 'pets';
    if (level <= 7) return 'directions_run';
    return 'local_fire_department';
  }

  getStatusText(color: string | undefined): string {
    if (!color) return 'Analizando...';
    switch (color) {
      case 'blue': return 'Desentrenamiento';
      case 'green': return 'Estado Óptimo';
      case 'yellow': return 'Sobrecarga Ligera';
      case 'red': return 'Riesgo de Lesión';
      case 'gray': return 'Calibrando (Faltan datos)';
      default: return 'Desconocido';
    }
  }

  translateSourceType(type: string): string {
    const translations: Record<string, string> = {
      'attendance': 'Clase',
      'competition': 'Competición',
      'manual': 'Agility'
    };

    for (const key in translations) {
      if (type.toLowerCase().includes(key)) {
        return translations[key];
      }
    }
    return 'Entrenamiento';
  }

  promptDeleteWorkload(id: number) {
    this.workloadToDelete.set(id);
  }

  cancelDeleteWorkload() {
    this.workloadToDelete.set(null);
  }

  confirmDeleteWorkload() {
    const id = this.workloadToDelete();
    if (!id) return;

    this.workloadService.deleteWorkload(id).subscribe({
      next: () => {
        this.toast.success('Registro eliminado correctamente');
        this.workloadToDelete.set(null);
        this.loadDogData();
      },
      error: () => {
        this.toast.error('Error al intentar eliminar el registro');
        this.workloadToDelete.set(null);
      }
    });
  }

  submitManualWorkload() {
    const dogId = this.selectedDogId();
    if (!dogId || !this.manualDate() || !this.manualDuration() || !this.manualIntensity()) return;

    this.isSubmitting.set(true);
    const data = {
      date: this.manualDate(),
      duration_min: this.manualDuration(),
      intensity_rpe: this.manualIntensity(),
      activity_type: 'agility',
      jumped_max_height: this.manualJumpedMaxHeight(),
      number_of_runs: this.manualNumberOfRuns() || undefined
    };

    const editingId = this.editingWorkloadId();
    if (editingId) {
      this.workloadService.updateWorkload(editingId, data as any).subscribe({
        next: () => {
          this.toast.success('Registro actualizado correctamente');
          this.isSubmitting.set(false);
          this.isManualFormOpen.set(false);
          this.resetManualForm();
          this.loadDogData();
        },
        error: (err) => {
          console.error("Error updating workload", err);
          this.toast.error('Error al actualizar el registro');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.workloadService.storeManualWorkload(dogId, data).subscribe({
        next: () => {
          this.toast.success('Registro añadido correctamente');
          this.isSubmitting.set(false);
          this.isManualFormOpen.set(false);
          this.resetManualForm();
          this.loadDogData();
        },
        error: (err) => {
          console.error("Error saving manual workload", err);
          this.toast.error('Error al guardar el registro');
          this.isSubmitting.set(false);
        }
      });
    }
  }
}
