import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DogService } from '../../services/dog.service';
import { Dog } from '../../models/dog.model';
import { getEmojiForCategory } from '../../utils/point-categories';

@Component({
  selector: 'app-dar-puntos-extra-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  templateUrl: './dar-puntos-extra-dialog.component.html',
  styleUrl: './dar-puntos-extra-dialog.component.css'
})
export class DarPuntosExtraDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<DarPuntosExtraDialogComponent>);
  dogService = inject(DogService);
  snackBar = inject(MatSnackBar);

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
    // Assuming the API returns the user relation if populated, otherwise handle gracefully
    // Usually, in `all()`, dog.user may or may not be loaded depending on the backend.
    // Let's assume the user doesn't have it directly or use a fallback.
    return dog.user?.name || `Dueño ID: ${dog.userId}`;
  }

  isFormValid(): boolean {
    const isCategoryValid = this.selectedCategory === 'Otro' ? this.customCategory.trim().length > 0 : this.selectedCategory !== '';
    return this.selectedDogId !== null && 
           isCategoryValid && 
           this.selectedPoints >= 1 && 
           this.selectedPoints <= 3;
  }

  onCancel() {
    this.dialogRef.close();
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
      this.dialogRef.close(true);
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
