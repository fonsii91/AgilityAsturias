import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';
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

  newDogName = signal('');
  dogs = this.dogService.getDogs();

  deleteModalOpen = signal(false);
  dogToDelete = signal<{ id: string, name: string } | null>(null);

  // Name editing state
  isEditingName = signal(false);
  editedName = signal('');

  constructor() {
    effect(() => {
      const user = this.authService.currentUserSignal();
      if (user) {
        this.dogService.subscribeToUserDogs(user.uid);
      }

      // Sync editedName with profile name 
      const profile = this.authService.userProfileSignal();
      if (profile) {
        this.editedName.set(profile.displayName);
      }
    });
  }

  toggleEditName() {
    this.isEditingName.set(!this.isEditingName());
    if (this.isEditingName()) {
      const profile = this.authService.userProfileSignal();
      if (profile) this.editedName.set(profile.displayName);
    }
  }

  async saveName() {
    if (!this.editedName().trim()) return;

    try {
      await this.authService.updateDisplayName(this.editedName());
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
        userId: user.uid,
        name: this.newDogName(),
        createdAt: Date.now()
      });
      this.newDogName.set(''); // Clear input
    } catch (error) {
      console.error('Error adding dog:', error);
    }
  }

  // Open the modal instead of window.confirm
  deleteDog(id: string, name: string) {
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
