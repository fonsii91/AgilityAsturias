import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { SuggestionService } from '../../../services/suggestion.service';
import { environment } from '../../../../environments/environment';
import { TenantService } from '../../../services/tenant.service';
@Component({
  selector: 'app-sugerencia-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule],
  templateUrl: './sugerencia-dialog.html',
  styleUrls: ['./sugerencia-dialog.css']
})
export class SugerenciaDialog {
  type: 'bug' | 'suggestion' = 'suggestion';
  content: string = '';
  isSubmitting = false;
  tenantService = inject(TenantService);
  clubConfig = environment.clubConfig;
  clubName = computed(() => this.tenantService.tenantInfo()?.name || this.clubConfig.name);
  constructor(
    public dialogRef: MatDialogRef<SugerenciaDialog>,
    private suggestionService: SuggestionService
  ) {}

  submit() {
    if (!this.content || this.content.trim() === '') {
      return;
    }

    this.isSubmitting = true;
    this.suggestionService.createSuggestion({ type: this.type, content: this.content }).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.dialogRef.close(true); // pass true to indicate success
        // Se podría agregar un toast si se inyecta MatSnackBar
      },
      error: (err) => {
        console.error('Error enviando reporte', err);
        this.isSubmitting = false;
        alert('Hubo un error al enviar tu reporte, por favor intenta más tarde.');
      }
    });
  }

  cancel() {
    this.dialogRef.close();
  }
}
