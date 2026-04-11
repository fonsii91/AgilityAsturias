import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';
import { ImageCompressorService } from '../../services/image-compressor.service';
import { ToastService } from '../../services/toast.service';
import { Dog } from '../../models/dog.model';
import { FichaPerroComponent } from '../ficha-perro/ficha-perro.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FichaPerroComponent],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil {
  authService = inject(AuthService);
  dogService = inject(DogService);
  imageCompressor = inject(ImageCompressorService);
  toastService = inject(ToastService);

  dogs = this.dogService.getDogs();

  // Image Modal state
  imageModalOpen = signal(false);
  selectedImage = signal<string | null>(null);

  // Ficha Perro Modal state
  fichaModalOpen = signal(false);
  selectedDogFicha = signal<Dog | null>(null);

  // Name editing state
  isEditingName = signal(false);
  editedName = signal('');

  // Branding theme
  clubTheme = environment.clubConfig.colors;

  constructor() {
    effect(() => {
      const user = this.authService.currentUserSignal();
      if (user) {
        this.dogService.loadUserDogs();
        this.editedName.set(user.name);
      }
    });
  }

  toggleEditName() {
    this.isEditingName.set(!this.isEditingName());
    if (this.isEditingName()) {
      const user = this.authService.currentUserSignal();
      if (user) this.editedName.set(user.name);
    }
  }

  // File upload state for user avatar
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isUploadingPhoto = signal(false);

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploadingPhoto.set(true);
      this.imageCompressor.compress(file).then(compressedFile => {
        this.selectedFile = compressedFile;

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => this.previewUrl = e.target?.result as string;
        reader.readAsDataURL(compressedFile);

        // Auto-upload
        this.uploadPhoto(compressedFile);
      }).catch(error => {
        console.error('Error compressing image:', error);
        this.toastService.error('Error al procesar la imagen.');
      });
    }
  }

  async uploadPhoto(file: File) {
    try {
      const user = this.authService.currentUserSignal();
      if (!user) return;

      await this.authService.updateProfile(user.name, file);
      this.toastService.success('Foto de perfil actualizada correctamente');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      let errorMsg = 'Error al subir la foto';
      if (error.error) {
        if (error.status === 422 && error.error.errors) {
          const firstErrorKey = Object.keys(error.error.errors)[0];
          errorMsg = error.error.errors[firstErrorKey][0];
        } else if (error.error.message) {
          errorMsg = error.error.message;
        }
      }
      this.toastService.error(errorMsg);
    } finally {
      this.isUploadingPhoto.set(false);
    }
  }

  async saveName() {
    if (!this.editedName().trim()) return;

    try {
      await this.authService.updateProfile(this.editedName());
      this.isEditingName.set(false);
      this.toastService.success('Nombre actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating name:', error);
      let errorMsg = 'Error al actualizar el nombre';
      if (error.error && error.error.message) {
        errorMsg = error.error.message;
      }
      this.toastService.error(errorMsg);
    }
  }

  openImageModal(imageUrl: string | null) {
    if (imageUrl) {
      this.selectedImage.set(imageUrl);
      this.imageModalOpen.set(true);
    }
  }

  closeImageModal() {
    this.imageModalOpen.set(false);
    this.selectedImage.set(null);
  }

  openFicha(dog: Dog) {
    this.selectedDogFicha.set(dog);
    this.fichaModalOpen.set(true);
  }

  closeFicha() {
    this.fichaModalOpen.set(false);
    this.selectedDogFicha.set(null);
  }
}
