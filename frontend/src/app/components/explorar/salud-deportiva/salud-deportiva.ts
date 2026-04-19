import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DogWorkloadService } from '../../../services/dog-workload.service';
import { DogService } from '../../../services/dog.service';
import { AcwrData, DogWorkload } from '../../../models/dog-workload.model';
import { Dog } from '../../../models/dog.model';
import { WorkloadGaugeComponent } from './workload-gauge/workload-gauge';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-salud-deportiva',
  standalone: true,
  imports: [CommonModule, FormsModule, WorkloadGaugeComponent],
  templateUrl: './salud-deportiva.html',
  styleUrls: ['./salud-deportiva.css']
})
export class SaludDeportivaComponent implements OnInit {
  dogs = signal<Dog[]>([]);
  selectedDogId = signal<number | null>(null);
  acwrData = signal<AcwrData | null>(null);
  pendingReviews = signal<DogWorkload[]>([]);
  isLoading = signal<boolean>(false);

  selectedDogName = computed(() => {
    const id = this.selectedDogId();
    if (!id) return 'Tu perro';
    const dog = this.dogs().find(d => d.id === id);
    return dog ? dog.name : 'Tu perro';
  });

  // Formularios manuales
  isManualFormOpen = signal<boolean>(false);
  isHelpModalOpen = signal<boolean>(false);
  editingWorkloadId = signal<number | null>(null);
  manualDate = signal<string>(new Date().toISOString().split('T')[0]);
  manualDuration = signal<number>(15);
  manualIntensity = signal<number>(8); // Agility default RPE
  manualJumpedMaxHeight = signal<boolean>(false);
  manualNumberOfRuns = signal<number | null>(null);
  isSubmitting = signal<boolean>(false);
  workloadToDelete = signal<number | null>(null);
  
  confirmingIds = signal<number[]>([]);

  constructor(
    private workloadService: DogWorkloadService,
    private dogService: DogService,
    private toast: ToastService
  ) {}

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
        duration_min: 15, // Ignora el 60min antiguo de DB
        intensity_rpe: p.intensity_rpe || 5
      })));
    });
  }

  confirmPending(workload: DogWorkload) {
    if (!this.selectedDogId()) return;
    
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
        this.loadDogData();
      },
      error: () => {
        this.confirmingIds.update(ids => ids.filter(id => id !== workload.id));
        this.toast.error('Hubo un error al confirmar el entrenamiento.');
      }
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
    this.manualDuration.set(15);
    this.manualIntensity.set(8);
    this.manualJumpedMaxHeight.set(false);
    this.manualNumberOfRuns.set(null);
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

  openHelpModal() {
    this.isHelpModalOpen.set(true);
  }

  closeHelpModal() {
    this.isHelpModalOpen.set(false);
  }

  getIconForIntensity(level: number): string {
    if (level <= 3) return 'pets'; 
    if (level <= 7) return 'directions_run'; 
    return 'local_fire_department'; 
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
