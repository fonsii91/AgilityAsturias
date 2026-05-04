import { Component, effect, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { DogService } from '../../services/dog.service';
import { RsceTrackService } from '../../services/rsce-track.service';
import { CompetitionService } from '../../services/competition.service';
import { VideoService } from '../../services/video.service';
import { environment } from '../../../environments/environment';
import { TenantService } from '../../services/tenant.service';
import { Dog } from '../../models/dog.model';
import { RsceTrack } from '../../models/rsce-track.model';
import { Video } from '../../models/video.model';
import confetti from 'canvas-confetti';
import { SmartVideoPlayerComponent } from '../galeria-videos/smart-video-player/smart-video-player.component';
import { InstruccionesComponent } from '../shared/instrucciones/instrucciones.component';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-rsce-tracker',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SmartVideoPlayerComponent, MatIconModule, InstruccionesComponent],
  templateUrl: './rsce-tracker.component.html',
  styleUrls: ['./rsce-tracker.component.css'],
  providers: [DatePipe]
})
export class RsceTrackerComponent implements OnInit {
  clubTheme = environment.clubConfig.colors;
  
  private toastService = inject(ToastService);
  private dogService = inject(DogService);
  private trackService = inject(RsceTrackService);
  private competitionService = inject(CompetitionService);
  private videoService = inject(VideoService);
  private datePipe = inject(DatePipe);
  tenantService = inject(TenantService);

  clubName = computed(() => this.tenantService.tenantInfo()?.name || environment.clubConfig.name);
  dogs = this.dogService.getDogs();
  competitions = this.competitionService.getCompetitions();

  pastAndCurrentCompetitions = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.competitions().filter(comp => {
      if (!comp.fechaEvento) return true;
      const compDate = new Date(comp.fechaEvento.substring(0, 10));
      compDate.setHours(0, 0, 0, 0);
      return compDate.getTime() <= today.getTime();
    });
  });
  
  selectedDogId = signal<number | null>(null);
  selectedDog = signal<Dog | null>(null);
  
  tracks = signal<RsceTrack[]>([]);
  filteredTracks = signal<RsceTrack[]>([]);
  
  userVideos = signal<Video[]>([]);
  videoToPlay = signal<Video | null>(null);

  // RSCE Progress state
  progressTitleA = signal<string>('');
  progressSubtitleA = signal<string>('');
  progressTitleB = signal<string>('');
  progressSubtitleB = signal<string>('');
  progressValueA = signal<number>(0);
  progressValueB = signal<number>(0);
  progressMet = signal<boolean>(false);
  hasCelebrated = false;

  // Grade 0
  gradeZeroChecklist = signal<boolean>(false);
  isUpgrading = signal<boolean>(false);

  // Arrays for Medals
  slotArrayA = [1, 2, 3];
  slotArrayB = [1, 2, 3, 4];

  // CE Progress state
  ceMet = signal<boolean>(false);
  ceTargetYear = signal<number>(new Date().getFullYear());
  availableCEYears = [new Date().getFullYear(), new Date().getFullYear() - 1];
  ceDiscardedBySpeedCount = signal<number>(0);
  
  ceAgilityCount = signal<number>(0);
  ceAgilitySpeedCount = signal<number>(0);
  ceAgilityRequired = signal<number>(6);
  ceAgilitySpeedRequired = signal<number>(4);
  
  ceJumpingCount = signal<number>(0);
  ceJumpingSpeedCount = signal<number>(0);
  ceJumpingRequired = signal<number>(6);
  ceJumpingSpeedRequired = signal<number>(4);
  
  slotArrayCE_A = [1, 2, 3, 4, 5, 6];
  slotArrayCE_J = [1, 2, 3, 4, 5, 6];

  // Form
  isFormOpen = signal(false);
  isHelpModalOpen = signal(false);
  isEditing = signal(false);
  formData = signal<Partial<RsceTrack>>({});
  locationSelectMode = signal<string>('');

  ngOnInit() {
    this.loadTracks();
    this.loadUserVideos();
  }

  constructor() {
    effect(() => {
      const availableDogs = this.dogs();
      if (availableDogs.length > 0 && !this.selectedDogId()) {
        this.onDogSelectId(availableDogs[0].id!);
      }
    }, { allowSignalWrites: true });
  }
  
  loadUserVideos() {
    // Load up to 100 recent videos from the user
    this.videoService.getVideos(1, { category: 'my_videos', per_page: 100 }).subscribe({
        next: (res) => {
            if (res && res.data) {
                this.userVideos.set(res.data);
            }
        },
        error: (err) => console.error('Error loading video bridge', err)
    });
  }

  loadTracks() {
    this.trackService.getTracks().subscribe({
      next: (data) => {
        this.tracks.set(data);
        this.filterTracks();
      },
      error: (err) => {
        console.error('Error loading tracks:', err);
        this.toastService.error('Error al cargar la bitácora RSCE');
      }
    });
  }

  onDogSelectId(dogId: number) {
    if (this.selectedDogId() === dogId) {
      // Toggle off if re-clicked
      this.selectedDogId.set(null);
      this.selectedDog.set(null);
      this.filterTracks();
      return;
    }

    this.selectedDogId.set(dogId);
    const dog = this.dogs().find((d) => d.id === dogId) || null;
    this.selectedDog.set(dog);
    this.filterTracks();
  }

  filterTracks() {
    const dogId = this.selectedDogId();
    if (!dogId) {
      this.filteredTracks.set([]);
      return;
    }
    
    const filtered = this.tracks().filter(t => t.dog_id === dogId).sort((a, b) => {
      const dateA = a.date ? new Date((a.date as string).substring(0, 10)).getTime() : 0;
      const dateB = b.date ? new Date((b.date as string).substring(0, 10)).getTime() : 0;
      return dateB - dateA;
    });
    
    this.filteredTracks.set(filtered);
    this.calculateProgress();
  }

  currentGrade(): string {
    return this.selectedDog()?.pivot?.rsce_grade || '0';
  }

  async upgradeToGrade1() {
    const dog = this.selectedDog();
    if (!dog || !dog.id) return;

    this.isUpgrading.set(true);
    try {
      const updated = await this.dogService.updateDog(dog.id, { 
        name: dog.name, 
        rsce_grade: '1' 
      } as any);
      
      confetti({
          particleCount: 200,
          spread: 120,
          origin: { y: 0.6 },
          colors: ['#10b981', '#fbbf24', '#3b82f6', '#ef4444']
      });
      
      this.selectedDog.set(updated);
      this.toastService.success('¡Perro ascendido a Grado 1!');
      this.gradeZeroChecklist.set(false);
      this.calculateProgress();
    } catch (err) {
      console.error('Error al ascender a Grado 1', err);
      this.toastService.error('Hubo un error al ascender de grado');
    } finally {
      this.isUpgrading.set(false);
    }
  }

  nextGrade(): string {
    const current = this.currentGrade();
    if (current === '1') return '2';
    if (current === '2') return '3';
    return '';
  }

  async upgradeNextGrade() {
    const dog = this.selectedDog();
    if (!dog || !dog.id) return;
    
    const next = this.nextGrade();
    if (!next) return;

    this.isUpgrading.set(true);
    try {
      const updated = await this.dogService.updateDog(dog.id, { 
        name: dog.name, 
        rsce_grade: next 
      } as any);
      
      confetti({
          particleCount: 200,
          spread: 120,
          origin: { y: 0.6 },
          colors: ['#10b981', '#fbbf24', '#3b82f6', '#ef4444']
      });
      
      this.selectedDog.set(updated);
      this.toastService.success(`¡Enhorabuena! Ascenso a Grado ${next} registrado.`);
      this.calculateProgress();
    } catch (err) {
      console.error('Error al ascender de grado', err);
      this.toastService.error('Hubo un error al ascender de grado');
    } finally {
      this.isUpgrading.set(false);
    }
  }

  resetProgress() {
    this.progressTitleA.set('');
    this.progressSubtitleA.set('');
    this.progressTitleB.set('');
    this.progressSubtitleB.set('');
    this.progressValueA.set(0);
    this.progressValueB.set(0);
    this.progressMet.set(false);
    
    this.ceMet.set(false);
    this.ceDiscardedBySpeedCount.set(0);
    this.ceAgilityCount.set(0);
    this.ceAgilitySpeedCount.set(0);
    this.ceJumpingCount.set(0);
    this.ceJumpingSpeedCount.set(0);
  }

  calculateProgress() {
    const tracks = this.filteredTracks();
    const dog = this.selectedDog();
    
    this.resetProgress();
    
    if (!dog || tracks.length === 0) return;

    const grade = dog.pivot?.rsce_grade || '0'; // Default to 0 if not set
    const category = dog.rsce_category || 'M';

    if (grade === '1') {
        const exc0 = tracks.filter(t => t.qualification === 'Excelente a 0' || t.qualification === 'EXCELENTE' || t.qualification === 'Excelente');
        const agilityPaths = exc0.filter(t => t.manga_type.startsWith('Agility'));
        const jumpingPaths = exc0.filter(t => t.manga_type.startsWith('Jumping'));

        let aCount = agilityPaths.length;
        let aJudges = new Set(agilityPaths.filter(t => t.judge_name).map(t => t.judge_name?.trim().toLowerCase())).size;

        let optionAMet = aCount >= 3 && aJudges >= 2;
        let aScore = Math.min(3, aCount);
        this.progressValueA.set((aScore / 3) * 100);
        this.progressTitleA.set('Opción A: Sólo Agility');
        this.progressSubtitleA.set(`${aCount}/3 puntos` + (aCount > 0 && aJudges < 2 ? ' (Falta 1 juez distinto)' : ''));

        let bAgilityCount = agilityPaths.length;
        let bJumpingCount = jumpingPaths.length;
        
        let combinedTracks = [...agilityPaths.slice(0, 2), ...jumpingPaths.slice(0, 2)];
        let bJudges = new Set(combinedTracks.filter(t => t.judge_name).map(t => t.judge_name?.trim().toLowerCase())).size;

        let optionBMet = bAgilityCount >= 2 && bJumpingCount >= 2 && bJudges >= 2;
        let bScore = Math.min(2, bAgilityCount) + Math.min(2, bJumpingCount);
        this.progressValueB.set((bScore / 4) * 100);
        
        this.progressTitleB.set('Opción B: Mix de Mangas');
        this.progressSubtitleB.set(`Agility ${Math.min(bAgilityCount, 2)}/2 | Jumping ${Math.min(bJumpingCount, 2)}/2` + (bScore > 0 && bJudges < 2 ? ' (Falta 1 juez)' : ''));

        this.progressMet.set(optionAMet || optionBMet);

    } else if (grade === '2') {
        const requiredAgilitySpeed = (category === 'S' || category === 'M') ? 4.50 : 4.70;
        const requiredJumpingSpeed = (category === 'S' || category === 'M') ? 4.70 : 4.90;

        const exc0 = tracks.filter(t => t.qualification === 'Excelente a 0' || t.qualification === 'EXCELENTE' || t.qualification === 'Excelente');
        
        const validAgility = exc0.filter(t => t.manga_type.startsWith('Agility') && t.speed && t.speed >= requiredAgilitySpeed);
        const validJumping = exc0.filter(t => t.manga_type.startsWith('Jumping') && t.speed && t.speed >= requiredJumpingSpeed);

        let aJudges = new Set(validAgility.filter(t => t.judge_name).map(t => t.judge_name?.trim().toLowerCase())).size;
        let jJudges = new Set(validJumping.filter(t => t.judge_name).map(t => t.judge_name?.trim().toLowerCase())).size;

        let aCount = validAgility.length;
        let jCount = validJumping.length;

        let aMet = aCount >= 3 && aJudges >= 3;
        let jMet = jCount >= 3 && jJudges >= 3;

        let aScore = Math.min(3, aCount);
        let jScore = Math.min(3, jCount);

        this.progressValueA.set((aScore / 3) * 100);
        this.progressValueB.set((jScore / 3) * 100);

        this.progressTitleA.set('Agility');
        this.progressSubtitleA.set(`Vel ≥ ${requiredAgilitySpeed} m/s • ${aCount}/3 puntos` + (aCount > 0 && aJudges < 3 ? ` (${aJudges}/3 jueces)` : ''));
        
        this.progressTitleB.set('Jumping');
        this.progressSubtitleB.set(`Vel ≥ ${requiredJumpingSpeed} m/s • ${jCount}/3 puntos` + (jCount > 0 && jJudges < 3 ? ` (${jJudges}/3 jueces)` : ''));

        this.progressMet.set(aMet && jMet);

    } else {
        this.progressTitleA.set('¡Grado Máximo Alcanzado!');
        this.progressSubtitleA.set('El perro está compitiendo al más alto nivel.');
        this.progressValueA.set(100);
        this.progressMet.set(true);
    }

    // Campeonato de España (CE) Logic for Grades 2 and 3
    if (grade === '2' || grade === '3') {
        const targetYear = this.ceTargetYear();
        
        let seasonStartDate = new Date(`${targetYear}-01-01T00:00:00`);
        let seasonEndDate = new Date(`${targetYear}-12-31T23:59:59`);
        
        const ceTracks = tracks.filter(t => {
            const isExc = (t.qualification === 'Excelente a 0' || t.qualification === 'EXCELENTE' || t.qualification === 'Excelente');
            if (!isExc || !t.date) return false;
            const tDate = new Date((t.date as string).substring(0, 10));
            return tDate >= seasonStartDate && tDate <= seasonEndDate;
        });

        const ceAgilityTracks = ceTracks.filter(t => t.manga_type.startsWith('Agility'));
        const ceJumpingTracks = ceTracks.filter(t => t.manga_type.startsWith('Jumping'));

        let aSpeedReq = 0;
        let jSpeedReq = 0;
        
        if (grade === '2') {
            aSpeedReq = (category === 'S' || category === 'M') ? 4.00 : 4.20;
            jSpeedReq = (category === 'S' || category === 'M') ? 4.20 : 4.40;
            
            this.ceAgilityRequired.set(6);
            this.ceAgilitySpeedRequired.set(4);
            this.ceJumpingRequired.set(6);
            this.ceJumpingSpeedRequired.set(4);
        } else {
            aSpeedReq = (category === 'S' || category === 'M') ? 4.50 : 4.70;
            jSpeedReq = (category === 'S' || category === 'M') ? 4.70 : 4.90;
            
            this.ceAgilityRequired.set(4);
            this.ceAgilitySpeedRequired.set(4);
            this.ceJumpingRequired.set(4);
            this.ceJumpingSpeedRequired.set(4);
        }

        let aTotal = ceAgilityTracks.length;
        const aSpeedTotal = ceAgilityTracks.filter(t => t.speed && t.speed >= aSpeedReq).length;
        
        let jTotal = ceJumpingTracks.length;
        const jSpeedTotal = ceJumpingTracks.filter(t => t.speed && t.speed >= jSpeedReq).length;

        let discarded = 0;

        if (grade === '3') {
            // En Grado 3, TODAS deben ser de velocidad. Las que no tienen velocidad no sirven de nada.
            discarded = (aTotal - aSpeedTotal) + (jTotal - jSpeedTotal);
            aTotal = aSpeedTotal;
            jTotal = jSpeedTotal;
        } else {
            // En Grado 2, se admiten hasta 2 sin velocidad por disciplina (6 total, 4 velocidad).
            const aNoSpeed = aTotal - aSpeedTotal;
            if (aNoSpeed > 2) {
                discarded += (aNoSpeed - 2);
                aTotal = aSpeedTotal + 2;
            }
            
            const jNoSpeed = jTotal - jSpeedTotal;
            if (jNoSpeed > 2) {
                discarded += (jNoSpeed - 2);
                jTotal = jSpeedTotal + 2;
            }
        }

        this.ceDiscardedBySpeedCount.set(discarded);
        this.ceAgilityCount.set(aTotal);
        this.ceAgilitySpeedCount.set(aSpeedTotal);
        this.ceJumpingCount.set(jTotal);
        this.ceJumpingSpeedCount.set(jSpeedTotal);

        const aMet = aTotal >= this.ceAgilityRequired() && aSpeedTotal >= this.ceAgilitySpeedRequired();
        const jMet = jTotal >= this.ceJumpingRequired() && jSpeedTotal >= this.ceJumpingSpeedRequired();

        this.ceMet.set(aMet && jMet);
    }
    
    // Confetti effect
    if (this.progressMet() && !this.hasCelebrated) {
      this.hasCelebrated = true;
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#0073CF', '#10b981', '#fbbf24']
        });
      }, 300);
    } else if (!this.progressMet()) {
      // Reset if they change parameters and it's no longer met
      this.hasCelebrated = false;
    }
  }

  onCompetitionChange(value: string) {
    this.locationSelectMode.set(value);
    
    if (value && value !== 'otro') {
      const selectedCompName = value.split(' - ')[0];
      const comp = this.competitions()?.find(c => c.nombre === selectedCompName);
      
      if (comp && comp.judge_name) {
        // Automatically set the judge name if the form's judge name is empty
        if (!this.formData().judge_name?.trim()) {
          this.formData.update(data => ({
            ...data,
            judge_name: comp.judge_name
          }));
        }
      }
    }
  }

  openAddForm() {
    if (!this.selectedDogId()) {
      this.toastService.error('Debes seleccionar un perro primero');
      return;
    }
    
    this.isEditing.set(false);
    this.formData.set({
      dog_id: this.selectedDogId()!,
      date: new Date().toISOString().split('T')[0],
      manga_type: 'Agility 1',
      qualification: 'Excelente',
      speed: null,
      judge_name: '',
      location: '',
      notes: ''
    });
    this.locationSelectMode.set('');
    this.isFormOpen.set(true);
  }

  openEditForm(track: RsceTrack) {
    this.isEditing.set(true);
    // Format date properly for input field
    let formattedDate = track.date as string;
    if (typeof track.date === 'string' && track.date.includes('T')) {
      formattedDate = track.date.split('T')[0];
    }
    
    this.formData.set({
      ...track,
      date: formattedDate
    });
    
    // Determine location mode
    if (track.location) {
      const isKnown = this.competitions().some(c => `${c.nombre} - ${c.lugar}` === track.location);
      this.locationSelectMode.set(isKnown ? track.location : 'otro');
    } else {
      this.locationSelectMode.set('');
    }

    this.isFormOpen.set(true);
  }

  closeForm() {
    this.isFormOpen.set(false);
    this.formData.set({});
  }

  saveTrack() {
    const data = this.formData() as RsceTrack;
    
    if (this.locationSelectMode() !== 'otro' && this.locationSelectMode() !== '') {
        data.location = this.locationSelectMode();
    }
    
    if (!data.date || !data.manga_type || !data.qualification) {
      this.toastService.error('Faltan datos obligatorios');
      return;
    }

    // Force speed to standard number correctly decimal
    if (data.speed) {
        data.speed = parseFloat(data.speed.toString());
    }

    if (this.isEditing() && data.id) {
      this.trackService.updateTrack(data.id, data).subscribe({
        next: (res) => {
          this.toastService.success('Manga actualizada');
          this.loadTracks();
          this.closeForm();
        },
        error: (err) => {
          this.toastService.error('Error al actualizar la manga');
        }
      });
    } else {
      this.trackService.addTrack(data).subscribe({
        next: (res) => {
          this.toastService.success('Manga registrada correctamente');
          this.loadTracks();
          this.closeForm();
        },
        error: (err) => {
          this.toastService.error('Error al registrar la manga');
        }
      });
    }
  }

  deleteTrack(id: number) {
    if (confirm('¿Estás seguro de que quieres eliminar este registro?')) {
      this.trackService.deleteTrack(id).subscribe({
        next: () => {
          this.toastService.success('Registro eliminado');
          this.loadTracks();
        },
        error: () => this.toastService.error('Error al eliminar')
      });
    }
  }

  getQualificationClass(qual: string): string {
    if (!qual) return '';
    if (qual === 'Excelente a 0') return 'qual-exc0';
    if (qual.startsWith('EXCEL')) return 'qual-exc';
    if (qual.startsWith('MUY B')) return 'qual-mb';
    if (qual.startsWith('BUE')) return 'qual-b';
    if (qual.startsWith('NO C')) return 'qual-nc';
    if (qual.startsWith('Elim')) return 'qual-elim';
    if (qual.startsWith('No P')) return 'qual-np';
    return '';
  }

  getFilledSlotsA(): number {
    return Math.round((this.progressValueA() / 100) * this.slotArrayA.length);
  }

  getFilledSlotsB(): number {
    return Math.round((this.progressValueB() / 100) * this.slotArrayB.length);
  }

  getCESlotArrayA(): number[] {
    return this.slotArrayCE_A.slice(0, this.ceAgilityRequired());
  }

  getCESlotArrayJ(): number[] {
    return this.slotArrayCE_J.slice(0, this.ceJumpingRequired());
  }

  getCESlotStatus(type: 'agility' | 'jumping', index: number): 'empty' | 'speed' | 'nospeed' {
    const total = type === 'agility' ? this.ceAgilityCount() : this.ceJumpingCount();
    const speedTotal = type === 'agility' ? this.ceAgilitySpeedCount() : this.ceJumpingSpeedCount();
    
    if (index >= total) return 'empty';
    if (index < speedTotal) return 'speed';
    return 'nospeed';
  }

  setCEYear(year: number) {
    this.ceTargetYear.set(year);
    this.calculateProgress();
  }

  printPassport() {
    window.print();
  }

  getMatchingVideo(track: RsceTrack): Video | undefined {
    return this.userVideos().find(video => {
        // Mismo perro
        if (video.dog_id !== track.dog_id) return false;
        
        // Misma fecha robusta
        try {
            const vDate = (video.date as string).substring(0, 10);
            const tDate = (track.date as string).substring(0, 10);
            if (vDate !== tDate) return false;
        } catch(e) {
            return false; // Si falla la conversión de fecha, descartamos
        }
        
        // Misma manga (Agility, Jumping, Otra)
        if (video.manga_type !== track.manga_type) return false;
        
        // Si coinciden: Perro + Fecha + Manga, es estadísticamente imposible 
        // que haya dos carreras idénticas el mismo día. Obviamos el nombre del lugar
        // por fallos tipográficos o tildes.
        return true;
    });
  }

  playVideo(video: Video) {
    this.videoToPlay.set(video);
  }

  closeVideo() {
    this.videoToPlay.set(null);
  }
}
