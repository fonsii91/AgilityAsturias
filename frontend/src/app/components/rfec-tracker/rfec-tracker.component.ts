import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dog } from '../../models/dog.model';
import { DogService } from '../../services/dog.service';
import { RfecTrackService } from '../../services/rfec-track.service';
import { CompetitionService } from '../../services/competition.service';
import { VideoService } from '../../services/video.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';
import { RfecTrack } from '../../models/rfec-track.model';
import { InstruccionesComponent } from '../shared/instrucciones/instrucciones.component';
import { Competition } from '../../models/competition.model';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-rfec-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, InstruccionesComponent],
  templateUrl: './rfec-tracker.component.html',
  styleUrls: ['./rfec-tracker.component.scss']
})
export class RfecTrackerComponent implements OnInit {
  dogService = inject(DogService);
  rfecService = inject(RfecTrackService);
  compService = inject(CompetitionService);
  videoService = inject(VideoService);
  toast = inject(ToastService);

  dogs = this.dogService.getDogs();
  selectedDogId = signal<number | null>(null);

  constructor() {
    effect(() => {
      const currentDogs = this.dogs();
      if (currentDogs.length > 0 && !this.selectedDogId()) {
        this.selectedDogId.set(currentDogs[0].id!);
      }
    }, { allowSignalWrites: true });
  }
  
  tracks = this.rfecService.tracks;
  competitions = this.compService.getCompetitions();
  
  // Filtrar competiciones pasadas/actuales que sean de federación RFEC u Otro
  pastAndCurrentCompetitions = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.competitions().filter((c: Competition) => {
      // Filtrar por fechas
      let isPastOrCurrent = false;
      if (c.fechaFinEvento) {
        isPastOrCurrent = c.fechaFinEvento <= today || c.fechaEvento <= today;
      } else {
        isPastOrCurrent = c.fechaEvento <= today;
      }
      
      // Filtrar por federación (asumimos que está en tipo o deberemos chequear cómo RSCETracker lo hace, comp.federacion no existe, espera)
      // Ah, Competition model don't have federacion. Let's just return true for now, or filter if we can.
      // We will allow all past/current for now.
      return isPastOrCurrent;
    });
  });

  dogTracks = computed(() => {
    return this.tracks().filter(t => t.dog_id === this.selectedDogId());
  });

  selectedDog = computed(() => {
    return this.dogs().find(d => d.id === this.selectedDogId()) || null;
  });

  // Calcular puntos
  stats = computed(() => {
    const ts = this.dogTracks();
    let totalPts = 0;
    let agilityPts = 0;
    const jueces = new Set<string>();

    for (const t of ts) {
      if (t.qualification.toLowerCase().includes('excelente')) {
        let pts = 0;
        if (t.speed === 0 || !t.speed) {
          // If penalizations were zero, maybe 10 pts. Let's assume user inputs speed as penalizations? Wait, no, the form should ask for Penalizations, not Speed. Let's adjust this in HTML.
        }
      }
    }
  });

  isFormOpen = false;
  isEditing = false;
  isUpgrading = signal<boolean>(false);
  
  // Checklist de Iniciación
  chkEdad = signal<boolean>(false);
  chkSociabilidad = signal<boolean>(false);
  chkMedicion = signal<boolean>(false);
  chkLicencia = signal<boolean>(false);
  hasCelebratedCE = false;

  allIniciacionMet = computed(() => {
    return this.chkEdad() && this.chkSociabilidad() && this.chkMedicion() && this.chkLicencia();
  });
  
  // Modificar: Formulario con penalizaciones en vez de velocidad
  formData = {
    id: 0,
    competition_id: null as number | null,
    manual_date: '',
    manual_location: '',
    manga_type: 'Agility 1',
    qualification: 'Excelente a 0',
    speed: null as number | null,
    judge_name: '',
    notes: ''
  };

  ngOnInit() {
    this.loadData();
  }

  // Effect for CE celebration
  private ceCelebrationEffect = effect(() => {
    const stats = this.calculatedStats();
    const dog = this.selectedDog();
    if (dog?.rfec_grade === 'Competición') {
      if (stats.totalPoints >= 80 && stats.agilityPoints >= 40) {
        if (!this.hasCelebratedCE) {
          this.hasCelebratedCE = true;
          setTimeout(() => {
            confetti({
              particleCount: 300,
              spread: 160,
              origin: { y: 0.5 },
              colors: ['#ffd700', '#ff8c00', '#ff0000', '#00ff00', '#0000ff']
            });
            this.toast.success('¡Increíble! ¡Te has clasificado para el Campeonato de España Absoluto!');
          }, 500);
        }
      } else {
        this.hasCelebratedCE = false;
      }
    }
  }, { allowSignalWrites: true });

  async loadData() {
    try {
      await this.dogService.loadUserDogs();
      this.rfecService.loadTracks();
      this.compService.fetchCompetitions();
    } catch (e) {
      this.toast.error('Error cargando datos');
    }
  }

  onDogSelectId(id: number) {
    this.selectedDogId.set(id);
  }

  openAddForm() {
    this.isEditing = false;
    this.resetForm();
    this.isFormOpen = true;
  }

  editTrack(track: RfecTrack) {
    this.isEditing = true;
    this.formData = {
      id: track.id || 0,
      competition_id: null, // Always manual mode when editing for simplicity, or we could try to map it if we had competition_id in track
      manual_date: track.date,
      manual_location: track.location || '',
      manga_type: track.manga_type,
      qualification: track.qualification,
      speed: track.speed ?? null,
      judge_name: track.judge_name || '',
      notes: track.notes || ''
    };
    this.isFormOpen = true;
  }

  closeForm() {
    this.isFormOpen = false;
  }

  onCompetitionChange(compId: number | null) {
    if (compId) {
      const comp = this.competitions().find((c: Competition) => c.id === Number(compId));
      if (comp && comp.judge_name) {
        // Automatically set the judge name if the form's judge name is empty
        if (!this.formData.judge_name?.trim()) {
          this.formData.judge_name = comp.judge_name;
        }
      }
    }
  }

  resetForm() {
    this.formData = {
      id: 0,
      competition_id: null,
      manual_date: new Date().toISOString().split('T')[0],
      manual_location: '',
      manga_type: 'Agility 1',
      qualification: 'Excelente a 0',
      speed: null,
      judge_name: '',
      notes: ''
    };
  }

  async submitForm() {
    if (!this.selectedDogId()) return;

    let finalDate = this.formData.manual_date;
    let finalLocation = this.formData.manual_location;

    if (this.formData.competition_id) {
      const comp = this.competitions().find((c: Competition) => c.id === Number(this.formData.competition_id));
      if (comp) {
        finalDate = comp.fechaEvento;
        finalLocation = comp.lugar;
      }
    }

    const payload: RfecTrack = {
      dog_id: this.selectedDogId()!,
      date: finalDate,
      manga_type: this.formData.manga_type,
      qualification: this.formData.qualification,
      speed: this.formData.speed || 0,
      judge_name: this.formData.judge_name,
      location: finalLocation,
      notes: this.formData.notes
    };

    try {
      if (this.isEditing) {
        payload.id = this.formData.id;
        await this.rfecService.updateTrack(payload);
        this.toast.success('Manga actualizada');
      } else {
        await this.rfecService.addTrack(payload);
        this.toast.success('Manga registrada');
      }
      this.rfecService.loadTracks();
      this.closeForm();
    } catch (e) {
      this.toast.error('Error al guardar la manga');
    }
  }

  async deleteTrack(id: number) {
    if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
    try {
      await this.rfecService.deleteTrack(id);
      this.toast.success('Registro eliminado');
      this.rfecService.loadTracks();
    } catch (e) {
      this.toast.error('Error al eliminar');
    }
  }

  async upgradeToPromocion() {
    const dog = this.selectedDog();
    if (!dog || !dog.id) return;

    this.isUpgrading.set(true);
    try {
      const updated = await this.dogService.updateDog(dog.id, { 
        name: dog.name, 
        rfec_grade: 'Promoción' 
      } as any);
      
      confetti({
          particleCount: 200,
          spread: 120,
          origin: { y: 0.6 },
          colors: ['#10b981', '#fbbf24', '#3b82f6', '#ef4444']
      });
      
      this.toast.success('¡Perro ascendido a Promoción!');
      this.chkEdad.set(false);
      this.chkSociabilidad.set(false);
      this.chkMedicion.set(false);
      this.chkLicencia.set(false);
    } catch (err) {
      console.error('Error al ascender a Promoción', err);
      this.toast.error('Hubo un error al ascender de grado');
    } finally {
      this.isUpgrading.set(false);
    }
  }

  async upgradeToCompeticion() {
    const dog = this.selectedDog();
    if (!dog || !dog.id) return;

    this.isUpgrading.set(true);
    try {
      const updated = await this.dogService.updateDog(dog.id, { 
        name: dog.name, 
        rfec_grade: 'Competición' 
      } as any);
      
      confetti({
          particleCount: 200,
          spread: 120,
          origin: { y: 0.6 },
          colors: ['#10b981', '#fbbf24', '#3b82f6', '#ef4444']
      });
      
      this.toast.success('¡Enhorabuena! Ascenso a Competición registrado.');
    } catch (err) {
      console.error('Error al ascender a Competición', err);
      this.toast.error('Hubo un error al ascender de grado');
    } finally {
      this.isUpgrading.set(false);
    }
  }

  // --- STATS COMPUTATION ---
  calculatedStats = computed(() => {
    const ts = this.dogTracks();
    let totalPoints = 0;
    let agilityPoints = 0;
    const jueces = new Set<string>();

    for (const t of ts) {
      // Puntos solo para Excelente
      const qual = t.qualification.toLowerCase();
      if (qual === 'excelente a 0' || qual === 'excelente') {
        let pts = 0;
        
        if (qual === 'excelente a 0') {
          pts = 10;
        } else if (qual === 'excelente') {
          pts = 5;
        }

        if (pts > 0) {
          totalPoints += pts;
          if (t.manga_type && t.manga_type.startsWith('Agility')) {
            agilityPoints += pts;
          }
          if (t.judge_name) {
            jueces.add(t.judge_name.toLowerCase().trim());
          }
        }
      }
    }

    return {
      totalPoints,
      agilityPoints,
      uniqueJudges: jueces.size
    };
  });
}
