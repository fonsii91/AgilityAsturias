import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';
import { ImageCompressorService } from '../../services/image-compressor.service';
import { ToastService } from '../../services/toast.service';
import { Dog } from '../../models/dog.model';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil {
  authService = inject(AuthService);
  dogService = inject(DogService);
  imageCompressor = inject(ImageCompressorService);
  toastService = inject(ToastService);

  newDogName = signal('');
  dogs = this.dogService.getDogs();

  deleteModalOpen = signal(false);
  dogToDelete = signal<{ id: number, name: string } | null>(null);

  // Image Modal state
  imageModalOpen = signal(false);
  selectedImage = signal<string | null>(null);

  // Name editing state
  isEditingName = signal(false);
  editedName = signal('');

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

  // File upload state
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
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
    }
  }

  async onDogFileSelected(event: any, dogId: number) {
    const file = event.target.files[0];
    if (file) {
      this.imageCompressor.compress(file).then(compressedFile => {
        this.uploadDogPhoto(dogId, compressedFile);
      }).catch(error => {
        console.error('Error compressing dog image:', error);
        this.toastService.error('Error al procesar la imagen del perro.');
      });
    }
  }

  async uploadDogPhoto(dogId: number, file: File) {
    try {
      await this.dogService.updateDogPhoto(dogId, file);
    } catch (error: any) {
      console.error('Error uploading dog photo:', error);
      this.toastService.error('Error al subir la foto del perro');
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

  async addDog() {
    if (!this.newDogName().trim()) return;

    const user = this.authService.currentUserSignal();
    if (!user) return;

    try {
      await this.dogService.addDog({
        userId: user.id,
        name: this.newDogName()
        // createdAt handled by backend
      });
      this.newDogName.set(''); // Clear input
    } catch (error) {
      console.error('Error adding dog:', error);
    }
  }

  // Open the modal instead of window.confirm
  deleteDog(id: number, name: string) {
    this.dogToDelete.set({ id, name });
    this.deleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.deleteModalOpen.set(false);
    this.dogToDelete.set(null);
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

  async confirmDelete() {
    const dog = this.dogToDelete();
    if (dog) {
      await this.dogService.deleteDog(dog.id);
      this.closeDeleteModal();
    }
  }
}
