import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';
import { ImageCompressorService } from '../../services/image-compressor.service';
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

  newDogName = signal('');
  dogs = this.dogService.getDogs();

  deleteModalOpen = signal(false);
  dogToDelete = signal<{ id: number, name: string } | null>(null);

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
        alert('Error al procesar la imagen.');
      });
    }
  }

  async uploadPhoto(file: File) {
    try {
      const user = this.authService.currentUserSignal();
      if (!user) return;

      await this.authService.updateProfile(user.name, file);
      // Toast success (if we had one)
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error al subir la foto');
    }
  }

  async saveName() {
    if (!this.editedName().trim()) return;

    try {
      await this.authService.updateProfile(this.editedName());
      this.isEditingName.set(false);
    } catch (error) {
      console.error('Error updating name:', error);
      alert('Error al actualizar el nombre');
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

  async confirmDelete() {
    const dog = this.dogToDelete();
    if (dog) {
      await this.dogService.deleteDog(dog.id);
      this.closeDeleteModal();
    }
  }
}
