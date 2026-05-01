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
  avatarCansancio1Url = signal<string | null>(null);
  avatarCansancio2Url = signal<string | null>(null);
  avatarCansancio3Url = signal<string | null>(null);
  avatarCansancio4Url = signal<string | null>(null);
  avatarCansancio5Url = signal<string | null>(null);

  // Files to upload
  fileCansancio1 = signal<File | null>(null);
  fileCansancio2 = signal<File | null>(null);
  fileCansancio3 = signal<File | null>(null);
  fileCansancio4 = signal<File | null>(null);
  fileCansancio5 = signal<File | null>(null);

  // Clear flags
  clearCansancio1 = signal(false);
  clearCansancio2 = signal(false);
  clearCansancio3 = signal(false);
  clearCansancio4 = signal(false);
  clearCansancio5 = signal(false);

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
    this.avatarCansancio1Url.set(dog.avatar_cansancio_1_url || null);
    this.avatarCansancio2Url.set(dog.avatar_cansancio_2_url || null);
    this.avatarCansancio3Url.set(dog.avatar_cansancio_3_url || null);
    this.avatarCansancio4Url.set(dog.avatar_cansancio_4_url || null);
    this.avatarCansancio5Url.set(dog.avatar_cansancio_5_url || null);

    this.fileCansancio1.set(null);
    this.fileCansancio2.set(null);
    this.fileCansancio3.set(null);
    this.fileCansancio4.set(null);
    this.fileCansancio5.set(null);

    this.clearCansancio1.set(false);
    this.clearCansancio2.set(false);
    this.clearCansancio3.set(false);
    this.clearCansancio4.set(false);
    this.clearCansancio5.set(false);
  }

  closeModal() {
    this.selectedDog.set(null);
  }

  onFileSelected(event: any, level: 1|2|3|4|5) {
    const file: File = event.target.files[0];
    if (file) {
      if (level === 1) { this.fileCansancio1.set(file); this.clearCansancio1.set(false); }
      if (level === 2) { this.fileCansancio2.set(file); this.clearCansancio2.set(false); }
      if (level === 3) { this.fileCansancio3.set(file); this.clearCansancio3.set(false); }
      if (level === 4) { this.fileCansancio4.set(file); this.clearCansancio4.set(false); }
      if (level === 5) { this.fileCansancio5.set(file); this.clearCansancio5.set(false); }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (level === 1) this.avatarCansancio1Url.set(e.target.result);
        if (level === 2) this.avatarCansancio2Url.set(e.target.result);
        if (level === 3) this.avatarCansancio3Url.set(e.target.result);
        if (level === 4) this.avatarCansancio4Url.set(e.target.result);
        if (level === 5) this.avatarCansancio5Url.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  clearAvatar(level: 1|2|3|4|5) {
    if (level === 1) { this.fileCansancio1.set(null); this.avatarCansancio1Url.set(null); this.clearCansancio1.set(true); }
    if (level === 2) { this.fileCansancio2.set(null); this.avatarCansancio2Url.set(null); this.clearCansancio2.set(true); }
    if (level === 3) { this.fileCansancio3.set(null); this.avatarCansancio3Url.set(null); this.clearCansancio3.set(true); }
    if (level === 4) { this.fileCansancio4.set(null); this.avatarCansancio4Url.set(null); this.clearCansancio4.set(true); }
    if (level === 5) { this.fileCansancio5.set(null); this.avatarCansancio5Url.set(null); this.clearCansancio5.set(true); }
  }

  saveAvatars() {
    const dog = this.selectedDog();
    if (!dog) return;

    this.isSubmitting.set(true);

    const formData = new FormData();
    if (this.fileCansancio1()) formData.append('avatar_cansancio_1', this.fileCansancio1() as File);
    if (this.fileCansancio2()) formData.append('avatar_cansancio_2', this.fileCansancio2() as File);
    if (this.fileCansancio3()) formData.append('avatar_cansancio_3', this.fileCansancio3() as File);
    if (this.fileCansancio4()) formData.append('avatar_cansancio_4', this.fileCansancio4() as File);
    if (this.fileCansancio5()) formData.append('avatar_cansancio_5', this.fileCansancio5() as File);

    if (this.clearCansancio1()) formData.append('clear_cansancio_1', '1');
    if (this.clearCansancio2()) formData.append('clear_cansancio_2', '1');
    if (this.clearCansancio3()) formData.append('clear_cansancio_3', '1');
    if (this.clearCansancio4()) formData.append('clear_cansancio_4', '1');
    if (this.clearCansancio5()) formData.append('clear_cansancio_5', '1');

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
      this.avatarCansancio1Url.set(updatedDog.avatar_cansancio_1_url || null);
      this.avatarCansancio2Url.set(updatedDog.avatar_cansancio_2_url || null);
      this.avatarCansancio3Url.set(updatedDog.avatar_cansancio_3_url || null);
      this.avatarCansancio4Url.set(updatedDog.avatar_cansancio_4_url || null);
      this.avatarCansancio5Url.set(updatedDog.avatar_cansancio_5_url || null);
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
