import { Component, effect, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { DogService } from '../../services/dog.service';
import { RsceTrackService } from '../../services/rsce-track.service';
import { CompetitionService } from '../../services/competition.service';
import { VideoService } from '../../services/video.service';
import { environment } from '../../../environments/environment';
import { Dog } from '../../models/dog.model';
import { RsceTrack } from '../../models/rsce-track.model';
import { Video } from '../../models/video.model';
import confetti from 'canvas-confetti';
import { SmartVideoPlayerComponent } from '../galeria-videos/smart-video-player/smart-video-player.component';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-rsce-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, SmartVideoPlayerComponent, MatIconModule],
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

  dogs = this.dogService.getDogs();
  competitions = this.competitionService.getCompetitions();
  
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
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    this.filteredTracks.set(filtered);
    this.calculateProgress();
  }

  currentGrade(): string {
    return this.selectedDog()?.rsce_grade || '0';
  }

  async upgradeToGrade1() {
    const dog = this.selectedDog();
    if (!dog || !dog.id) return;

    this.isUpgrading.set(true);
    try {
      const updated = await this.dogService.updateDog(dog.id, { 
        name: dog.name, 
        rsce_grade: '1' 
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

  resetProgress() {
    this.progressTitleA.set('');
    this.progressSubtitleA.set('');
    this.progressTitleB.set('');
    this.progressSubtitleB.set('');
    this.progressValueA.set(0);
    this.progressValueB.set(0);
    this.progressMet.set(false);
  }

  calculateProgress() {
    const tracks = this.filteredTracks();
    const dog = this.selectedDog();
    
    this.resetProgress();
    
    if (!dog || tracks.length === 0) return;

    const grade = dog.rsce_grade || '0'; // Default to 0 if not set
    const category = dog.rsce_category || 'M';

    if (grade === '1') {
        const exc0 = tracks.filter(t => t.qualification === 'Excelente a 0' || t.qualification === 'EXCELENTE' || t.qualification === 'Excelente');
        const agilityPaths = exc0.filter(t => t.manga_type.startsWith('Agility'));
        const jumpingPaths = exc0.filter(t => t.manga_type.startsWith('Jumping'));

        let aCount = agilityPaths.length;
        let aJudges = new Set(agilityPaths.filter(t => t.judge_name).map(t => t.judge_name?.trim().toLowerCase())).size;

        let optionAMet = aCount >= 3 && aJudges >= 2;
        this.progressValueA.set(Math.min((aCount / 3) * 100, 100));
        this.progressTitleA.set('Opción A: Sólo Agility');
        this.progressSubtitleA.set(`${aCount}/3 puntos` + (aCount > 0 && aJudges < 2 ? ' (Falta 1 juez distinto)' : ''));

        let bAgilityCount = agilityPaths.length;
        let bJumpingCount = jumpingPaths.length;
        
        let combinedTracks = [...agilityPaths.slice(0, 2), ...jumpingPaths.slice(0, 2)];
        let bJudges = new Set(combinedTracks.filter(t => t.judge_name).map(t => t.judge_name?.trim().toLowerCase())).size;

        let optionBMet = bAgilityCount >= 2 && bJumpingCount >= 2 && bJudges >= 2;
        let bProgress = ((Math.min(bAgilityCount, 2) + Math.min(bJumpingCount, 2)) / 4) * 100;
        this.progressValueB.set(bProgress);
        
        this.progressTitleB.set('Opción B: Mix de Mangas');
        this.progressSubtitleB.set(`Agility ${Math.min(bAgilityCount, 2)}/2 | Jumping ${Math.min(bJumpingCount, 2)}/2` + (bProgress > 0 && bJudges < 2 ? ' (Falta 1 juez distinto)' : ''));

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

        this.progressValueA.set(Math.min((aCount / 3) * 100, 100));
        this.progressValueB.set(Math.min((jCount / 3) * 100, 100));

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

  printPassport() {
    window.print();
  }

  getMatchingVideo(track: RsceTrack): Video | undefined {
    return this.userVideos().find(video => {
        // Mismo perro
        if (video.dog_id !== track.dog_id) return false;
        
        // Misma fecha robusta
        try {
            const vDate = new Date(video.date as string).toISOString().split('T')[0];
            const tDate = new Date(track.date as string).toISOString().split('T')[0];
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
