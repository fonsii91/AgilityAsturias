import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
  selector: 'app-rfec-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, InstruccionesComponent],
  templateUrl: './rfec-tracker.component.html',
  styleUrls: ['./rfec-tracker.component.scss']
})
export class RfecTrackerComponent implements OnInit {
  dogService = inject(DogService);
  rfecService = inject(RfecTrackService);
  compService = inject(CompetitionService);
  videoService = inject(VideoService);
  toast = inject(ToastService);
  authService = inject(AuthService);
  analyticsService = inject(AnalyticsService);

  dogs = this.dogService.getDogs();
  selectedDogId = signal<number | null>(null);
  expandedTrackIds = signal<Set<number>>(new Set());

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

  hasLicenseProfile = computed(() => {
    const user = this.authService.currentUserSignal();
    return !!user?.rfec_license && user.rfec_license.trim() !== '';
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
    notes: '',
    grade: null as string | null,
    time: null as number | null,
    faults: 0,
    refusals: 0,
    time_penalty: 0,
    total_penalty: 0,
    is_clean: false,
    course_length: null as number | null,
    standard_time: null as number | null
  };

  ngOnInit() {
    this.analyticsService.logModuleAccess('caza');
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

  onMetricChange() {
    const data = this.formData;
    const qualification = data.qualification || '';
    const isElim = this.isEliminated(qualification);

    const time = (data.time !== undefined && data.time !== null && (data.time as any) !== '') ? parseFloat(data.time.toString()) : null;
    const length = (data.course_length !== undefined && data.course_length !== null && (data.course_length as any) !== '') ? parseFloat(data.course_length.toString()) : null;
    const standardTime = (data.standard_time !== undefined && data.standard_time !== null && (data.standard_time as any) !== '') ? parseFloat(data.standard_time.toString()) : null;
    const faults = (data.faults !== undefined && data.faults !== null && (data.faults as any) !== '') ? parseInt(data.faults.toString(), 10) : 0;
    const refusals = (data.refusals !== undefined && data.refusals !== null && (data.refusals as any) !== '') ? parseInt(data.refusals.toString(), 10) : 0;

    // 1. Calculate speed
    if (time && time > 0 && length && length > 0) {
      data.speed = parseFloat((length / time).toFixed(2));
    } else {
      data.speed = null;
    }

    // 2. Calculate time penalty
    let timePenalty = 0;
    if (time && standardTime && time > standardTime) {
      timePenalty = parseFloat((time - standardTime).toFixed(2));
    }
    data.time_penalty = timePenalty;

    // 3. Calculate total penalty
    const totalPenalty = (faults * 5) + (refusals * 5) + timePenalty;
    data.total_penalty = totalPenalty;

    // 4. Calculate is_clean
    data.is_clean = !isElim && (time !== null && totalPenalty === 0 && faults === 0 && refusals === 0);
  }

  openAddForm() {
    this.isEditing = false;
    this.resetForm();
    this.isFormOpen = true;
  }

  editTrack(track: RfecTrack) {
    this.isEditing = true;
    
    // Normalize qualification to match select options
    let qual = track.qualification || '';
    const qLower = qual.toLowerCase().trim();
    if (qLower === 'exc_0' || qLower === 'excelente a 0' || qLower === 'excelente a cero') {
      qual = 'Excelente a 0';
    } else if (qLower === 'exc' || qLower === 'excelente') {
      qual = 'Excelente';
    } else if (qLower === 'mb' || qLower === 'muy bueno' || qLower === 'muy_bueno') {
      qual = 'Muy Bueno';
    } else if (qLower === 'b' || qLower === 'bueno') {
      qual = 'Bueno';
    } else if (qLower === 'suf' || qLower === 'suficiente' || qLower === 'no clasificado' || qLower === 'no_clasi') {
      qual = 'No Clasificado';
    } else if (qLower === 'elim' || qLower === 'eliminado') {
      qual = 'Eliminado';
    } else if (qLower === 'np' || qLower === 'no presentado' || qLower === 'no_pres') {
      qual = 'No Presentado';
    }

    // Normalize manga_type
    let manga = track.manga_type || '';
    const mLower = manga.toLowerCase().trim();
    if (mLower === 'agility') {
      manga = 'Agility';
    } else if (mLower === 'jumping') {
      manga = 'Jumping';
    }

    this.formData = {
      id: track.id || 0,
      competition_id: null,
      manual_date: track.date,
      manual_location: track.location || '',
      manga_type: manga,
      qualification: qual,
      speed: track.speed ?? null,
      judge_name: track.judge_name || '',
      notes: track.notes || '',
      grade: track.grade || 'Iniciación',
      time: track.time ?? null,
      faults: track.faults ?? 0,
      refusals: track.refusals ?? 0,
      time_penalty: track.time_penalty ?? 0,
      total_penalty: track.total_penalty ?? 0,
      is_clean: track.is_clean === true || track.is_clean === 1,
      course_length: track.course_length ?? null,
      standard_time: track.standard_time ?? null
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
      notes: '',
      grade: null,
      time: null,
      faults: 0,
      refusals: 0,
      time_penalty: 0,
      total_penalty: 0,
      is_clean: false,
      course_length: null,
      standard_time: null
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

    let finalSpeed = null;
    if (this.formData.speed !== undefined && this.formData.speed !== null && (this.formData.speed as any) !== '') {
      finalSpeed = parseFloat(this.formData.speed.toString());
    }
    let finalTime = null;
    if (this.formData.time !== undefined && this.formData.time !== null && (this.formData.time as any) !== '') {
      finalTime = parseFloat(this.formData.time.toString());
    }
    let finalFaults = 0;
    if (this.formData.faults !== undefined && this.formData.faults !== null && (this.formData.faults as any) !== '') {
      finalFaults = parseInt(this.formData.faults.toString(), 10);
    }
    let finalRefusals = 0;
    if (this.formData.refusals !== undefined && this.formData.refusals !== null && (this.formData.refusals as any) !== '') {
      finalRefusals = parseInt(this.formData.refusals.toString(), 10);
    }
    let finalTimePenalty = 0;
    if (this.formData.time_penalty !== undefined && this.formData.time_penalty !== null && (this.formData.time_penalty as any) !== '') {
      finalTimePenalty = parseFloat(this.formData.time_penalty.toString());
    }
    let finalTotalPenalty = 0;
    if (this.formData.total_penalty !== undefined && this.formData.total_penalty !== null && (this.formData.total_penalty as any) !== '') {
      finalTotalPenalty = parseFloat(this.formData.total_penalty.toString());
    }
    let finalClean = this.formData.is_clean ? 1 : 0;
    let finalLength = null;
    if (this.formData.course_length !== undefined && this.formData.course_length !== null && (this.formData.course_length as any) !== '') {
      finalLength = parseInt(this.formData.course_length.toString(), 10);
    }
    let finalStandardTime = null;
    if (this.formData.standard_time !== undefined && this.formData.standard_time !== null && (this.formData.standard_time as any) !== '') {
      finalStandardTime = parseFloat(this.formData.standard_time.toString());
    }

    const payload: RfecTrack = {
      dog_id: this.selectedDogId()!,
      date: finalDate,
      manga_type: this.formData.manga_type,
      qualification: this.formData.qualification,
      speed: finalSpeed,
      judge_name: this.formData.judge_name,
      location: finalLocation,
      notes: this.formData.notes,
      grade: this.isEditing ? this.formData.grade : (this.selectedDog()?.rfec_grade || 'Iniciación'),
      time: finalTime,
      faults: finalFaults,
      refusals: finalRefusals,
      time_penalty: finalTimePenalty,
      total_penalty: finalTotalPenalty,
      is_clean: finalClean,
      course_length: finalLength,
      standard_time: finalStandardTime
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
    let ceTotalPoints = 0;
    let ceAgilityPoints = 0;
    const jueces = new Set<string>();

    for (const t of ts) {
      const qual = t.qualification.toLowerCase().trim();
      let pts = 0;
      
      if (qual.includes('excelente a 0') || qual.includes('excelente a cero') || qual === 'exc a 0' || qual === 'exc_0') {
        pts = 10;
      } else if (qual.includes('excelente') || qual === 'exc') {
        pts = 5;
      }

      if (pts > 0) {
        totalPoints += pts;
        if (t.manga_type && t.manga_type.toLowerCase().includes('agility')) {
          agilityPoints += pts;
        }
        if (t.judge_name) {
          jueces.add(t.judge_name.toLowerCase().trim());
        }

        // Para Campeonato de España SOLO cuentan mangas corridas en Grado Competición
        // Permitimos t.grade undefined para mantener compatibilidad con mangas antiguas
        if (t.grade === 'Competición' || (!t.grade && this.selectedDog()?.rfec_grade === 'Competición')) {
           ceTotalPoints += pts;
           if (t.manga_type && t.manga_type.toLowerCase().includes('agility')) {
              ceAgilityPoints += pts;
           }
        }
      }
    }

    return {
      totalPoints,
      agilityPoints,
      ceTotalPoints,
      ceAgilityPoints,
      uniqueJudges: jueces.size
    };
  });

  ceTargets = computed(() => {
    const user = this.authService.currentUserSignal();
    const cat = user?.rfec_category;
    const isSenior = cat === 'Senior' || cat === 'Veterano' || cat === 'Sénior / Veterano';
    return {
      name: isSenior ? 'Sénior / Veterano' : 'Absoluto',
      total: isSenior ? 40 : 80,
      agility: isSenior ? 20 : 40
    };
  });

  printPassport() {
    window.print();
  }

  isEliminated(qualification: string | undefined): boolean {
    if (!qualification) return false;
    const qLower = qualification.toLowerCase().trim();
    return qLower.startsWith('elim') || qLower === 'np' || qLower.startsWith('no pres') || qLower.startsWith('no clas');
  }

  isCleanRun(track: RfecTrack): boolean {
    if (this.isEliminated(track.qualification)) return false;
    const qLower = (track.qualification || '').toLowerCase().trim();
    return qLower === 'excelente a 0' || qLower === 'exc_0' || qLower === 'excelente a cero' || qLower === 'exc a 0';
  }

  getComputedPenalty(track: RfecTrack): number {
    const faults = track.faults ?? 0;
    const refusals = track.refusals ?? 0;
    const timePenalty = track.time_penalty ?? 0;
    const calculated = (faults * 5) + (refusals * 5) + timePenalty;
    const dbVal = track.total_penalty !== null && track.total_penalty !== undefined ? parseFloat(track.total_penalty.toString()) : 0;
    return Math.max(calculated, dbVal);
  }

  toggleTrackExpand(trackId: number) {
    const current = this.expandedTrackIds();
    const next = new Set(current);
    if (next.has(trackId)) {
      next.delete(trackId);
    } else {
      next.add(trackId);
    }
    this.expandedTrackIds.set(next);
  }

  shortenManga(type: string): string {
    if (!type) return '';
    const lower = type.toLowerCase();
    if (lower.includes('agility')) {
      return type.replace(/agility/gi, 'AG');
    }
    if (lower.includes('jumping')) {
      return type.replace(/jumping/gi, 'JP');
    }
    return type;
  }

  shortenQualification(qual: string): string {
    if (!qual) return '';
    const qLower = qual.toLowerCase().trim();
    if (qLower === 'excelente a 0' || qLower === 'exc_0') return 'EXC 0';
    if (qLower === 'excelente' || qLower === 'exc') return 'EXC';
    if (qLower === 'muy bueno' || qLower === 'mb') return 'M. BUENO';
    if (qLower === 'bueno' || qLower === 'b') return 'BUENO';
    if (qLower === 'no clasificado' || qLower === 'nc') return 'NO CLAS.';
    if (qLower === 'eliminado' || qLower === 'elim') return 'ELIM';
    if (qLower === 'no presentado' || qLower === 'np') return 'N.P.';
    return qual;
  }

  getQualificationClass(qual: string): string {
    if (!qual) return '';
    const qLower = qual.toLowerCase().trim();
    if (qLower === 'excelente a 0' || qLower === 'exc_0') return 'qual-exc0';
    if (qLower.startsWith('excel') || qLower === 'exc') return 'qual-exc';
    if (qLower.startsWith('muy b') || qLower === 'mb') return 'qual-mb';
    if (qLower.startsWith('bue') || qLower === 'b') return 'qual-b';
    if (qLower.startsWith('no c') || qLower === 'suf' || qLower === 'suficiente') return 'qual-nc';
    if (qLower.startsWith('elim') || qLower === 'elim') return 'qual-elim';
    if (qLower.startsWith('no p') || qLower === 'np') return 'qual-np';
    return '';
  }
}
