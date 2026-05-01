import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DogService } from '../../services/dog.service';
import { Dog } from '../../models/dog.model';
import { ToastService } from '../../services/toast.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-avatares',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-avatares.html',
  styleUrl: './admin-avatares.css'
})
export class AdminAvataresComponent implements OnInit {
  dogService = inject(DogService);
  toast = inject(ToastService);

  allDogs = this.dogService.getAllDogs();
  
  searchTerm = signal('');
  selectedDog = signal<Dog | null>(null);

  // Form inputs (previews or existing URLs)
  avatarBlueUrl = signal<string | null>(null);
  avatarGreenUrl = signal<string | null>(null);
  avatarYellowUrl = signal<string | null>(null);
  avatarRedUrl = signal<string | null>(null);

  // Files to upload
  fileBlue = signal<File | null>(null);
  fileGreen = signal<File | null>(null);
  fileYellow = signal<File | null>(null);
  fileRed = signal<File | null>(null);

  // Clear flags
  clearBlue = signal(false);
  clearGreen = signal(false);
  clearYellow = signal(false);
  clearRed = signal(false);

  isSubmitting = signal(false);
  isGenerating = signal(false);
  aiPromptDetails = signal('');

  filteredDogs = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.allDogs();
    return this.allDogs().filter(d => 
      d.name.toLowerCase().includes(term) || 
      (d.breed && d.breed.toLowerCase().includes(term))
    );
  });

  ngOnInit() {
    this.dogService.loadAllDogs();
  }

  selectDog(dog: Dog) {
    this.selectedDog.set(dog);
    this.avatarBlueUrl.set(dog.avatar_blue_url || null);
    this.avatarGreenUrl.set(dog.avatar_green_url || null);
    this.avatarYellowUrl.set(dog.avatar_yellow_url || null);
    this.avatarRedUrl.set(dog.avatar_red_url || null);

    this.fileBlue.set(null);
    this.fileGreen.set(null);
    this.fileYellow.set(null);
    this.fileRed.set(null);

    this.clearBlue.set(false);
    this.clearGreen.set(false);
    this.clearYellow.set(false);
    this.clearRed.set(false);
  }

  closeModal() {
    this.selectedDog.set(null);
  }

  onFileSelected(event: any, color: 'blue'|'green'|'yellow'|'red') {
    const file: File = event.target.files[0];
    if (file) {
      if (color === 'blue') { this.fileBlue.set(file); this.clearBlue.set(false); }
      if (color === 'green') { this.fileGreen.set(file); this.clearGreen.set(false); }
      if (color === 'yellow') { this.fileYellow.set(file); this.clearYellow.set(false); }
      if (color === 'red') { this.fileRed.set(file); this.clearRed.set(false); }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (color === 'blue') this.avatarBlueUrl.set(e.target.result);
        if (color === 'green') this.avatarGreenUrl.set(e.target.result);
        if (color === 'yellow') this.avatarYellowUrl.set(e.target.result);
        if (color === 'red') this.avatarRedUrl.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  clearAvatar(color: 'blue'|'green'|'yellow'|'red') {
    if (color === 'blue') { this.fileBlue.set(null); this.avatarBlueUrl.set(null); this.clearBlue.set(true); }
    if (color === 'green') { this.fileGreen.set(null); this.avatarGreenUrl.set(null); this.clearGreen.set(true); }
    if (color === 'yellow') { this.fileYellow.set(null); this.avatarYellowUrl.set(null); this.clearYellow.set(true); }
    if (color === 'red') { this.fileRed.set(null); this.avatarRedUrl.set(null); this.clearRed.set(true); }
  }

  saveAvatars() {
    const dog = this.selectedDog();
    if (!dog) return;

    this.isSubmitting.set(true);

    const formData = new FormData();
    if (this.fileBlue()) formData.append('avatar_blue', this.fileBlue() as File);
    if (this.fileGreen()) formData.append('avatar_green', this.fileGreen() as File);
    if (this.fileYellow()) formData.append('avatar_yellow', this.fileYellow() as File);
    if (this.fileRed()) formData.append('avatar_red', this.fileRed() as File);

    if (this.clearBlue()) formData.append('clear_blue', '1');
    if (this.clearGreen()) formData.append('clear_green', '1');
    if (this.clearYellow()) formData.append('clear_yellow', '1');
    if (this.clearRed()) formData.append('clear_red', '1');

    this.dogService.updateAdminAvatars(dog.id, formData).then(() => {
      this.toast.success('Avatares guardados correctamente.');
      this.isSubmitting.set(false);
      this.closeModal();
    }).catch(err => {
      console.error(err);
      this.toast.error('Error al guardar avatares.');
      this.isSubmitting.set(false);
    });
  }

  generateWithAI() {
    const dog = this.selectedDog();
    if (!dog) return;

    this.isGenerating.set(true);

    this.dogService.generateAiAvatars(dog.id, this.aiPromptDetails()).then((updatedDog) => {
      this.toast.success('Avatares generados correctamente con IA.');
      this.isGenerating.set(false);
      // Actualizar vista actual con las nuevas URLs devueltas
      this.selectedDog.set(updatedDog);
      this.avatarBlueUrl.set(updatedDog.avatar_blue_url || null);
      this.avatarGreenUrl.set(updatedDog.avatar_green_url || null);
      this.avatarYellowUrl.set(updatedDog.avatar_yellow_url || null);
      this.avatarRedUrl.set(updatedDog.avatar_red_url || null);
    }).catch(err => {
      console.error(err);
      if (err.status === 429) {
        this.toast.error(err.error?.message || 'Has alcanzado el límite diario de generación gratuita.');
      } else {
        this.toast.error('Error al generar avatares con IA.');
      }
      this.isGenerating.set(false);
    });
  }
}
