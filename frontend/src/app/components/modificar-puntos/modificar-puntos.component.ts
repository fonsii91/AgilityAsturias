import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DogService } from '../../services/dog.service';
import { Dog } from '../../models/dog.model';
import { getEmojiForCategory } from '../../utils/point-categories';
import { OnboardingService } from '../../services/onboarding';

@Component({
  selector: 'app-modificar-puntos',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  templateUrl: './modificar-puntos.component.html',
  styleUrl: './modificar-puntos.component.css'
})
export class ModificarPuntosComponent implements OnInit {
  router = inject(Router);
  location = inject(Location);
  dogService = inject(DogService);
  snackBar = inject(MatSnackBar);
  onboardingService = inject(OnboardingService);

  dogs = this.dogService.getAllDogs();
  
  selectedDogId: number | null = null;
  selectedCategory: string = '';
  customCategory: string = '';
  selectedPoints: number = 1;
  action: 'add' | 'remove' = 'add';
  isLoading = false;

  positiveCategories = [
    'Puntualidad',
    'Proactividad',
    'Compañerismo',
    'Motivación',
    'Otro'
  ];

  negativeCategories = [
    'Falta sin avisar',
    'Retraso',
    'Molestar a un perro en pista',
    'Caca',
    'Pis',
    'Otro'
  ];

  get categories() {
    return this.action === 'add' ? this.positiveCategories : this.negativeCategories;
  }

  getEmoji(category: string) {
    return getEmojiForCategory(category, this.action === 'add' ? 1 : -1);
  }

  onActionChange() {
    this.selectedCategory = '';
    this.customCategory = '';
  }

  ngOnInit() {
    this.dogService.loadAllDogs();
  }

  getOwnerName(dog: any): string {
    return dog.users?.map((u: any) => u.name).join(', ') || 'Sin dueño';
  }

  isFormValid(): boolean {
    const isCategoryValid = this.selectedCategory === 'Otro' ? this.customCategory.trim().length > 0 : this.selectedCategory !== '';
    return this.selectedDogId !== null && 
           isCategoryValid && 
           this.selectedPoints >= 1 && 
           this.selectedPoints <= 3;
  }

  onCancel() {
    this.router.navigate(['/ranking']);
  }

  async onSubmit() {
    if (!this.isFormValid()) return;

    this.isLoading = true;
    try {
      const finalCategory = this.selectedCategory === 'Otro' ? this.customCategory.trim() : this.selectedCategory;
      const finalPoints = this.action === 'add' ? this.selectedPoints : -this.selectedPoints;

      await this.dogService.giveExtraPoints(
        this.selectedDogId!,
        finalPoints,
        finalCategory
      );
      
      const successMessage = this.action === 'add' ? '¡Puntos otorgados exitosamente!' : '¡Puntos quitados exitosamente!';
      this.snackBar.open(successMessage, 'Cerrar', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
      this.onboardingService.markStepCompleted('staff_puntos');
      this.router.navigate(['/ranking']);
    } catch (error) {
      console.error('Error al modificar puntos', error);
      this.snackBar.open('Error al modificar los puntos.', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading = false;
    }
  }
}
