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

  constructor() {
    effect(() => {
      const user = this.authService.currentUserSignal();
      if (user) {
        this.dogService.subscribeToUserDogs(user.uid);
      }
    });
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

  async deleteDog(id: string) {
    if (confirm('¿Seguro que quieres eliminar a este perrete?')) {
      await this.dogService.deleteDog(id);
    }
  }
}
