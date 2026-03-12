import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DogService } from '../../services/dog.service';
import { Dog } from '../../models/dog.model';

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
  isLoading = false;

  categories = [
    'Puntualidad',
    'Proactividad',
    'Compañerismo',
    'Motivación',
    'Otra'
  ];

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
    const isCategoryValid = this.selectedCategory === 'Otra' ? this.customCategory.trim().length > 0 : this.selectedCategory !== '';
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
      const finalCategory = this.selectedCategory === 'Otra' ? this.customCategory.trim() : this.selectedCategory;

      await this.dogService.giveExtraPoints(
        this.selectedDogId!,
        this.selectedPoints,
        finalCategory
      );
      this.snackBar.open('¡Puntos extra otorgados exitosamente!', 'Cerrar', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error al dar puntos extra', error);
      this.snackBar.open('Error al otorgar los puntos extra.', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading = false;
    }
  }
}
