import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DogWorkloadService } from '../../../services/dog-workload.service';
import { DogService } from '../../../services/dog.service';
import { AcwrData, DogWorkload } from '../../../models/dog-workload.model';
import { Dog } from '../../../models/dog.model';
import { AthleticProfileCardComponent } from '../../ui/athletic-profile-card/athletic-profile-card.component';
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
  imports: [CommonModule, FormsModule, AthleticProfileCardComponent, MatDialogModule, MatButtonModule, MatIconModule, MatRippleModule],
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
  isHelpModalOpen = signal<boolean>(false);

  visibleHistory = computed(() => {
    const data = this.acwrData();
    if (!data || !data.recent_history) return [];
    return data.recent_history.slice(0, 2);
  });

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
      this.pendingReviews.set(pending.map(p => {
        const isCompetition = p.source_type && p.source_type.toLowerCase().includes('competition');
        return {
          ...p,
          duration_min: p.duration_min || (isCompetition ? 2 : 5),
          intensity_rpe: p.intensity_rpe || (isCompetition ? 8 : 6),
          number_of_runs: p.number_of_runs || (isCompetition ? 2 : 4)
        };
      }));
    });
  }

  toggleManualForm() {
    this.openManualModal();
  }

  openManualModal(workloadToEdit?: DogWorkload) {
    const dialogRef = this.dialog.open(PendingReviewsDialogComponent, {
      width: '650px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'bento-dialog-panel',
      data: {
        pendingReviews: [],
        dogId: this.selectedDogId(),
        dog: this.selectedDog(),
        isManual: true,
        manualWorkload: workloadToEdit
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDogData();
      }
    });
  }

  startEditWorkload(w: DogWorkload) {
    this.openManualModal(w);
  }

  openHelpModal() {
    this.isHelpModalOpen.set(true);
  }

  showInfo(type: 'time' | 'jump' | 'studies') {
    if (type === 'time') {
      this.toast.info('Se cuenta ÚNICAMENTE el tiempo de máxima intensidad. 1 h de clase suele suponer entre 4 y 6 min reales en pista.', 8000);
    } else if (type === 'jump') {
      this.toast.info('Cruzar el umbral de altura a la cruz aumenta el impacto articular exponencialmente.', 5000);
    } else if (type === 'studies') {
      this.toast.info('Basado en consensos veterinarios (CPT Training, VetBloom): Las micro-sesiones (3-5m) son óptimas. Más de 12 min puramente activos elevan drásticamente el riesgo de lesión.', 10000);
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


}
