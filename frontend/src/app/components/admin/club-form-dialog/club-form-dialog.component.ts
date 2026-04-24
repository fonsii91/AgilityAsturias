import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClubAdminService, Club } from '../../../services/club-admin.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-club-form-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatDialogModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div mat-dialog-title class="dialog-header m-0">
      <div>
        <h2 class="m-0 text-xl font-bold text-slate-800">{{ data.club ? 'Editar Club' : 'Nuevo Club' }}</h2>
        <p class="text-sm text-slate-500 mt-1 mb-0 font-normal leading-tight">{{ data.club ? 'Modifica la configuración de este club' : 'Añade un nuevo club al sistema' }}</p>
      </div>
      <button mat-icon-button mat-dialog-close class="close-btn" type="button" aria-label="Cerrar">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="custom-scroll !pt-2">
      <form [formGroup]="form" class="flex flex-col gap-6 py-2">
        
        <!-- General Info Section -->
        <div class="section-container">
          <h3 class="section-title"><mat-icon class="section-icon">info</mat-icon> Información General</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Nombre del Club</mat-label>
              <mat-icon matPrefix class="mr-2 text-slate-400">pets</mat-icon>
              <input matInput formControlName="name" placeholder="Ej: Club Agility Madrid">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Slug (Subdominio)</mat-label>
              <mat-icon matPrefix class="mr-2 text-slate-400">link</mat-icon>
              <input matInput formControlName="slug" placeholder="Ej: madrid">
              <span matTextSuffix class="text-slate-400 mr-2 text-sm">.clubagility.com</span>
              <mat-hint>URL de acceso principal</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full md:col-span-2">
              <mat-label>Slogan</mat-label>
              <mat-icon matPrefix class="mr-2 text-slate-400">campaign</mat-icon>
              <input matInput formControlName="slogan" placeholder="Ej: Pasión por el agility">
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="w-full md:col-span-2">
              <mat-label>URL del Logo</mat-label>
              <mat-icon matPrefix class="mr-2 text-slate-400">image</mat-icon>
              <input matInput formControlName="logo_url" placeholder="Ej: https://midominio.com/logo.png">
            </mat-form-field>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Custom Domain Section -->
        <div class="section-container">
          <h3 class="section-title"><mat-icon class="section-icon">language</mat-icon> Dominio Personalizado</h3>
          <div class="bg-blue-50 p-4 rounded-xl border border-blue-100/50 mb-4 shadow-sm">
            <p class="text-sm text-blue-800 m-0 flex items-start gap-2">
              <mat-icon class="text-blue-500 icon-sm shrink-0 mt-0.5">help_outline</mat-icon>
              <span>Opcional. Configura tu propio dominio (ej. <strong>agilityasturias.com</strong>) para que tu club sea accesible desde él. Debe apuntar al servidor mediante registros A o CNAME.</span>
            </p>
          </div>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Dominio Propio</mat-label>
            <mat-icon matPrefix class="mr-2 text-slate-400">dns</mat-icon>
            <input matInput formControlName="domain" placeholder="Ej: agilityasturias.com">
          </mat-form-field>
        </div>

        <mat-divider></mat-divider>

        <!-- Appearance Section -->
        <div class="section-container mb-2">
          <h3 class="section-title"><mat-icon class="section-icon">palette</mat-icon> Apariencia</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Color Principal</mat-label>
              <div class="flex items-center w-full gap-3">
                <input type="color" class="color-picker shrink-0" [value]="form.get('primary_color')?.value" (input)="updateColor('primary_color', $event)">
                <input matInput formControlName="primary_color" placeholder="#0073CF" class="uppercase font-mono text-sm">
              </div>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Color Secundario</mat-label>
              <div class="flex items-center w-full gap-3">
                <input type="color" class="color-picker shrink-0" [value]="form.get('accent_color')?.value" (input)="updateColor('accent_color', $event)">
                <input matInput formControlName="accent_color" placeholder="#E65100" class="uppercase font-mono text-sm">
              </div>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full md:col-span-2">
              <mat-label>URL Imagen Cabecera (Hero)</mat-label>
              <mat-icon matPrefix class="mr-2 text-slate-400">wallpaper</mat-icon>
              <input matInput formControlName="heroImage" placeholder="Ej: Images/Perros/Pumba.jpeg">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full md:col-span-2">
              <mat-label>URL Imagen Salto (Call to Action)</mat-label>
              <mat-icon matPrefix class="mr-2 text-slate-400">pets</mat-icon>
              <input matInput formControlName="jumpImage" placeholder="Ej: Images/Perros/perro_saltando.jpg">
            </mat-form-field>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Contact & Social Section -->
        <div class="section-container mb-2">
          <h3 class="section-title"><mat-icon class="section-icon">contact_mail</mat-icon> Contacto y Redes Sociales</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Teléfono</mat-label>
              <mat-icon matPrefix class="mr-2 text-slate-400">phone</mat-icon>
              <input matInput formControlName="phone" placeholder="Ej: 600 000 000">
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Email</mat-label>
              <mat-icon matPrefix class="mr-2 text-slate-400">email</mat-icon>
              <input matInput formControlName="email" type="email" placeholder="Ej: club@ejemplo.com">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Instagram</mat-label>
              <mat-icon matPrefix class="mr-2 text-slate-400">camera_alt</mat-icon>
              <input matInput formControlName="instagram" placeholder="Ej: agilityasturias">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Facebook</mat-label>
              <mat-icon matPrefix class="mr-2 text-slate-400">thumb_up</mat-icon>
              <input matInput formControlName="facebook" placeholder="Ej: agilityasturias">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full md:col-span-2">
              <mat-label>Dirección Línea 1</mat-label>
              <mat-icon matPrefix class="mr-2 text-slate-400">place</mat-icon>
              <input matInput formControlName="addressLine1" placeholder="Ej: Calle Principal 123">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full md:col-span-2">
              <mat-label>Dirección Línea 2</mat-label>
              <mat-icon matPrefix class="mr-2 text-slate-400">map</mat-icon>
              <input matInput formControlName="addressLine2" placeholder="Ej: Ciudad, Provincia, CP">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full md:col-span-2">
              <mat-label>URL Google Maps Embed</mat-label>
              <mat-icon matPrefix class="mr-2 text-slate-400">location_on</mat-icon>
              <input matInput formControlName="mapUrl" placeholder="Ej: https://maps.google.com/maps?q=...">
            </mat-form-field>
          </div>
        </div>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-stroked-button mat-dialog-close class="cancel-btn">Cancelar</button>
      <button mat-flat-button color="primary" class="save-btn" [disabled]="form.invalid || isSaving" (click)="save()">
        <div class="flex items-center justify-center gap-2">
          <mat-icon *ngIf="!isSaving" class="m-0 icon-sm">save</mat-icon>
          <mat-spinner *ngIf="isSaving" diameter="20"></mat-spinner>
          <span>{{ isSaving ? 'Guardando...' : 'Guardar Cambios' }}</span>
        </div>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
    }
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 24px 28px 20px !important;
      background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
      border-bottom: 1px solid #e2e8f0;
      position: relative;
    }
    .close-btn {
      position: absolute !important;
      top: 16px;
      right: 16px;
      color: #94a3b8;
    }
    .close-btn:hover {
      color: #0f172a;
      background-color: rgba(15, 23, 42, 0.05);
    }
    mat-dialog-content {
      padding: 24px 28px !important;
      margin: 0 !important;
    }
    .section-container {
      margin-bottom: 8px;
    }
    .section-title {
      display: flex;
      align-items: center;
      font-size: 1.05rem;
      font-weight: 600;
      color: #334155;
      margin-top: 8px;
      margin-bottom: 16px;
      gap: 8px;
    }
    .section-icon {
      color: #3b82f6;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }
    .color-picker {
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      width: 36px;
      height: 36px;
      background-color: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      transition: transform 0.1s;
    }
    .color-picker:hover {
      transform: scale(1.05);
    }
    .color-picker::-webkit-color-swatch-wrapper {
      padding: 0;
    }
    .color-picker::-webkit-color-swatch {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    .color-picker::-moz-color-swatch {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    .dialog-actions {
      padding: 16px 28px;
      border-top: 1px solid #e2e8f0;
      background-color: #f8fafc;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 0 !important;
      min-height: auto;
    }
    .cancel-btn {
      color: #64748b !important;
      border-color: #e2e8f0 !important;
      border-radius: 8px !important;
      padding: 0 20px !important;
      font-weight: 500 !important;
      background-color: white !important;
    }
    .save-btn {
      border-radius: 8px !important;
      padding: 0 24px !important;
      font-weight: 600 !important;
      box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1) !important;
      transition: all 0.2s ease !important;
    }
    .save-btn:not([disabled]):hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 8px -1px rgba(59, 130, 246, 0.25), 0 4px 6px -1px rgba(59, 130, 246, 0.15) !important;
    }
    .icon-sm {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .custom-scroll::-webkit-scrollbar {
      width: 8px;
    }
    .custom-scroll::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scroll::-webkit-scrollbar-thumb {
      background-color: #cbd5e1;
      border-radius: 10px;
    }
    .custom-scroll::-webkit-scrollbar-thumb:hover {
      background-color: #94a3b8;
    }
    mat-form-field {
      width: 100%;
    }
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
      logo_url: [data.club?.logo_url || ''],
      slogan: [settings.slogan || ''],
      primary_color: [settings.colors?.primary || '#0073CF'],
      accent_color: [settings.colors?.accent || '#E65100'],
      heroImage: [settings.homeConfig?.heroImage || ''],
      jumpImage: [settings.homeConfig?.ctaImage || ''],
      phone: [settings.contact?.phone || ''],
      email: [settings.contact?.email || ''],
      instagram: [settings.social?.instagram || ''],
      facebook: [settings.social?.facebook || ''],
      addressLine1: [settings.contact?.addressLine1 || ''],
      addressLine2: [settings.contact?.addressLine2 || ''],
      mapUrl: [settings.contact?.mapUrl || '']
    });
  }

  updateColor(controlName: string, event: Event) {
    const input = event.target as HTMLInputElement;
    this.form.get(controlName)?.setValue(input.value.toUpperCase());
  }

  save() {
    if (this.form.invalid) return;
    this.isSaving = true;

    const formValue = this.form.value;
    const clubData: Partial<Club> = {
      name: formValue.name,
      slug: formValue.slug,
      domain: formValue.domain || null,
      logo_url: formValue.logo_url || null,
      settings: {
        slogan: formValue.slogan,
        colors: {
          primary: formValue.primary_color,
          accent: formValue.accent_color
        },
        homeConfig: {
          heroImage: formValue.heroImage,
          ctaImage: formValue.jumpImage
        },
        contact: {
          phone: formValue.phone,
          email: formValue.email,
          addressLine1: formValue.addressLine1,
          addressLine2: formValue.addressLine2,
          mapUrl: formValue.mapUrl
        },
        social: {
          instagram: formValue.instagram,
          facebook: formValue.facebook
        }
      }
    };

    if (this.data.club) {
      this.clubService.updateClub(this.data.club.id, clubData).subscribe({
        next: () => {
          this.toast.success('Club actualizado correctamente');
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
          this.toast.success('Club creado con éxito');
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
