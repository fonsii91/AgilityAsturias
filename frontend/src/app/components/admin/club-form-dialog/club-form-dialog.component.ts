import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ClubAdminService, Club } from '../../../services/club-admin.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-club-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.club ? 'Editar Club' : 'Nuevo Club' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-4 mt-4">
        <mat-form-field appearance="outline">
          <mat-label>Nombre del Club</mat-label>
          <input matInput formControlName="name" placeholder="Ej: Club Agility Madrid">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Slug (Subdominio)</mat-label>
          <input matInput formControlName="slug" placeholder="Ej: madrid">
          <mat-hint>El club será accesible desde slug.clubagility.com</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Dominio Propio (Opcional)</mat-label>
          <input matInput formControlName="domain" placeholder="Ej: clubmadrid.com">
          <mat-hint>El club será accesible desde este dominio (debe apuntar al servidor)</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Color Principal (Hex)</mat-label>
          <input matInput formControlName="primary_color" placeholder="Ej: #ff0000">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Color Secundario (Hex)</mat-label>
          <input matInput formControlName="accent_color" placeholder="Ej: #00ff00">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid || isSaving" (click)="save()">
        {{ isSaving ? 'Guardando...' : 'Guardar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .gap-4 { gap: 1rem; }
    .mt-4 { margin-top: 1rem; }
    mat-form-field { width: 100%; }
  `]
})
export class ClubFormDialogComponent {
  private fb = inject(FormBuilder);
  private clubService = inject(ClubAdminService);
  private toast = inject(ToastService);
  
  form: FormGroup;
  isSaving = false;

  constructor(
    public dialogRef: MatDialogRef<ClubFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { club?: Club }
  ) {
    const settings = data.club?.settings || {};
    
    this.form = this.fb.group({
      name: [data.club?.name || '', Validators.required],
      slug: [data.club?.slug || '', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      domain: [data.club?.domain || ''],
      primary_color: [settings.colors?.primary || '#0073CF'],
      accent_color: [settings.colors?.accent || '#E65100']
    });
  }

  save() {
    if (this.form.invalid) return;
    this.isSaving = true;

    const formValue = this.form.value;
    const clubData: Partial<Club> = {
      name: formValue.name,
      slug: formValue.slug,
      domain: formValue.domain || null,
      settings: {
        colors: {
          primary: formValue.primary_color,
          accent: formValue.accent_color
        }
      }
    };

    if (this.data.club) {
      this.clubService.updateClub(this.data.club.id, clubData).subscribe({
        next: () => {
          this.toast.success('Club actualizado');
          this.dialogRef.close(true);
        },
        error: () => {
          this.toast.error('Error al actualizar club');
          this.isSaving = false;
        }
      });
    } else {
      this.clubService.createClub(clubData).subscribe({
        next: () => {
          this.toast.success('Club creado');
          this.dialogRef.close(true);
        },
        error: () => {
          this.toast.error('Error al crear club');
          this.isSaving = false;
        }
      });
    }
  }
}
