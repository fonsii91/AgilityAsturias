import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClubAdminService, Club } from '../../../services/club-admin.service';
import { ToastService } from '../../../services/toast.service';
import { ImageCompressorService } from '../../../services/image-compressor.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-club-form',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  template: `
    <div class="form-container">
      
      <!-- Sticky Header -->
      <div class="sticky-header">
        <div>
          <div class="breadcrumb">
            <a routerLink="/admin/clubs">
              <mat-icon>arrow_back</mat-icon> Gestión de Clubes
            </a>
          </div>
          <h1>
            @if (isEditMode()) { Configuración del Club } @else { Nuevo Club }
          </h1>
          <p class="subtitle">
            @if (isEditMode()) { Gestiona la identidad y accesos de tu espacio. } @else { Configura los datos principales para el nuevo espacio. }
          </p>
        </div>
        
        <div class="header-actions">
          <button mat-stroked-button color="basic" routerLink="/admin/clubs">Cancelar</button>
          <button mat-flat-button color="primary" class="save-btn"
                  [disabled]="form.invalid || isSaving() || isLoading()" (click)="save()">
            <div class="btn-content">
              @if (!isSaving()) { <mat-icon>save</mat-icon> }
              @if (isSaving()) { <mat-spinner diameter="20"></mat-spinner> }
              <span>@if (isSaving()) { Guardando... } @else { Guardar Cambios }</span>
            </div>
          </button>
        </div>
      </div>

      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <form [formGroup]="form" class="bento-grid">
          
          <!-- Left Column (Identity & Brand) -->
          <div class="grid-col-left">
            
            <!-- Card: Visual Identity -->
            <div class="bento-card">
              <div class="card-header blue-header">
                <div class="icon-box blue-icon"><mat-icon>fingerprint</mat-icon></div>
                <h2>Identidad Visual</h2>
              </div>
              <div class="card-body form-grid">
                
                <div class="logo-name-row">
                  <div class="logo-upload" (click)="logoInput.click()">
                    @if (!logoPreviewUrl() && !form.get('logo_url')?.value) {
                      <mat-icon class="upload-icon">add_photo_alternate</mat-icon>
                      <span>Subir Logo</span>
                    } @else {
                      <img [src]="logoPreviewUrl() || form.get('logo_url')?.value" class="preview-img">
                    }
                    <div class="hover-overlay" [class.show]="logoPreviewUrl() || form.get('logo_url')?.value">
                      <mat-icon>edit</mat-icon>
                    </div>
                    <input #logoInput type="file" accept="image/*" class="hidden-input" (change)="onFileSelected('logo', $event)">
                  </div>
                  <div class="name-input">
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Nombre del Club</mat-label>
                      <input matInput formControlName="name" placeholder="Ej: Club Agility Madrid">
                    </mat-form-field>
                  </div>
                </div>
                
                <p class="help-text" style="margin-top: -0.5rem; margin-bottom: 0.5rem;">
                  * Recomendado: Imagen cuadrada (1:1), ej. 512x512px en formato PNG. Este icono se utilizará al instalar la aplicación en el móvil.
                </p>

                <mat-form-field appearance="outline" class="w-full full-width">
                  <mat-label>Slogan / Lema</mat-label>
                  <input matInput formControlName="slogan" placeholder="Ej: Pasión por el agility">
                </mat-form-field>
              </div>
            </div>

            <!-- Card: Advanced Branding (Images) -->
            <div class="bento-card">
              <div class="card-header indigo-header">
                <div class="icon-box indigo-icon"><mat-icon>wallpaper</mat-icon></div>
                <h2>Imágenes de Portada</h2>
              </div>
              <div class="card-body form-grid-2">
                
                <div class="image-upload-box">
                  <label>Imagen Cabecera (Hero)</label>
                  <div class="upload-area" (click)="heroInput.click()">
                    @if (heroPreviewUrl() || form.get('heroImage')?.value) {
                      <img [src]="heroPreviewUrl() || form.get('heroImage')?.value" class="preview-img">
                    } @else {
                      <div class="upload-prompt">
                        <mat-icon>upload_file</mat-icon>
                        <p>Haz clic para subir imagen</p>
                      </div>
                    }
                    <input #heroInput type="file" accept="image/*" class="hidden-input" (change)="onFileSelected('hero', $event)">
                  </div>
                </div>

                <div class="image-upload-box">
                  <label>Imagen Salto (Call to Action)</label>
                  <div class="upload-area" (click)="ctaInput.click()">
                    @if (ctaPreviewUrl() || form.get('jumpImage')?.value) {
                      <img [src]="ctaPreviewUrl() || form.get('jumpImage')?.value" class="preview-img">
                    } @else {
                      <div class="upload-prompt">
                        <mat-icon>upload_file</mat-icon>
                        <p>Haz clic para subir imagen</p>
                      </div>
                    }
                    <input #ctaInput type="file" accept="image/*" class="hidden-input" (change)="onFileSelected('cta', $event)">
                  </div>
                </div>

              </div>
            </div>

            <!-- Card: Contact & Social -->
            <div class="bento-card">
              <div class="card-header teal-header">
                <div class="icon-box teal-icon"><mat-icon>contact_mail</mat-icon></div>
                <h2>Contacto y Redes Sociales</h2>
              </div>
              <div class="card-body form-grid-2">
                
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Teléfono</mat-label>
                  <mat-icon matPrefix class="form-icon">phone</mat-icon>
                  <input matInput formControlName="phone" placeholder="Ej: 600 000 000">
                </mat-form-field>
                
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Email</mat-label>
                  <mat-icon matPrefix class="form-icon">email</mat-icon>
                  <input matInput formControlName="email" type="email" placeholder="Ej: club@ejemplo.com">
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full full-width">
                  <mat-label>Dirección Línea 1</mat-label>
                  <mat-icon matPrefix class="form-icon">place</mat-icon>
                  <input matInput formControlName="addressLine1" placeholder="Ej: Calle Principal 123">
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full full-width">
                  <mat-label>Dirección Línea 2</mat-label>
                  <mat-icon matPrefix class="form-icon">map</mat-icon>
                  <input matInput formControlName="addressLine2" placeholder="Ej: Ciudad, Provincia, CP">
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Instagram</mat-label>
                  <span matPrefix class="form-icon text-bold">@&nbsp;</span>
                  <input matInput formControlName="instagram" placeholder="agilityasturias">
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Facebook</mat-label>
                  <mat-icon matPrefix class="form-icon">thumb_up</mat-icon>
                  <input matInput formControlName="facebook" placeholder="agilityasturias">
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full full-width">
                  <mat-label>URL Google Maps Embed</mat-label>
                  <mat-icon matPrefix class="form-icon">location_on</mat-icon>
                  <input matInput formControlName="mapUrl" placeholder="Ej: https://maps.google.com/maps?q=...">
                </mat-form-field>
              </div>
            </div>

          </div>

          <!-- Right Column (Access & Config) -->
          <div class="grid-col-right">
            
            <!-- Card: Access -->
            <div class="bento-card">
              <div class="card-header orange-header">
                <div class="icon-box orange-icon"><mat-icon>link</mat-icon></div>
                <h2>Enlaces y Acceso</h2>
              </div>
              <div class="card-body stack-gap">
                
                <div class="input-group">
                  <label>Subdominio de la Plataforma *</label>
                  <div class="addon-input">
                    <div class="addon">https://</div>
                    <input type="text" formControlName="slug" class="main-input" placeholder="tu-club">
                    <div class="addon">.clubagility.com</div>
                  </div>
                  <p class="help-text">Este será el enlace principal de acceso a tu panel.</p>
                </div>

                <hr class="divider">

                <div class="input-group">
                  <label>Dominio Personalizado (Avanzado)</label>
                  <div class="info-box">
                    <p>Opcional. Apunta tu dominio hacia nuestro servidor usando un registro A o CNAME para que el club sea accesible desde tu propia web.</p>
                  </div>
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-icon matPrefix class="form-icon">language</mat-icon>
                    <input matInput formControlName="domain" placeholder="Ej: agilityasturias.com">
                  </mat-form-field>
                </div>

              </div>
            </div>

            <!-- Card: Theme Colors -->
            <div class="bento-card">
              <div class="card-header pink-header">
                <div class="icon-box pink-icon"><mat-icon>palette</mat-icon></div>
                <h2>Colores del Tema</h2>
              </div>
              <div class="card-body stack-gap">
                
                <div class="input-group">
                  <label>Color Principal</label>
                  <div class="color-input-wrapper">
                    <input type="color" class="color-picker" [value]="form.get('primary_color')?.value" (input)="updateColor('primary_color', $event)">
                    <input type="text" formControlName="primary_color" class="hex-input">
                  </div>
                </div>

                <div class="input-group">
                  <label>Color Secundario / Botones</label>
                  <div class="color-input-wrapper">
                    <input type="color" class="color-picker" [value]="form.get('accent_color')?.value" (input)="updateColor('accent_color', $event)">
                    <input type="text" formControlName="accent_color" class="hex-input">
                  </div>
                </div>

              </div>
            </div>

          </div>

        </form>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background-color: #f8fafc;
      min-height: 100vh;
      font-family: 'Inter', Roboto, sans-serif;
    }
    
    .form-container {
      max-width: 1024px;
      margin: 0 auto;
      padding: 1.5rem;
      padding-bottom: 6rem;
    }
    
    .sticky-header {
      position: sticky;
      top: 0;
      z-index: 10;
      background-color: rgba(255,255,255,0.9);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1rem;
      margin-bottom: 1.5rem;
      padding-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    @media (min-width: 768px) {
      .sticky-header {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    
    .breadcrumb a {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #64748b;
      text-decoration: none;
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
      transition: color 0.2s;
    }
    .breadcrumb a:hover { color: #2563eb; }
    .breadcrumb mat-icon { font-size: 18px; width: 18px; height: 18px; }
    
    .sticky-header h1 {
      font-size: 1.875rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }
    .subtitle {
      color: #64748b;
      margin: 0.25rem 0 0 0;
    }
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .save-btn {
      padding: 0 2rem;
      border-radius: 0.75rem;
      font-weight: 600;
    }
    .btn-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .btn-content mat-icon { font-size: 18px; width: 18px; height: 18px; margin: 0; }
    
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 5rem 0;
    }
    
    .bento-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 1024px) {
      .bento-grid { grid-template-columns: repeat(12, 1fr); }
      .grid-col-left { grid-column: span 8; }
      .grid-col-right { grid-column: span 4; }
    }
    
    .grid-col-left, .grid-col-right {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .bento-card {
      background-color: white;
      border-radius: 1rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      overflow: hidden;
      transition: box-shadow 0.2s, transform 0.2s;
    }
    .bento-card:hover {
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
    }
    
    .card-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background-color: rgba(248, 250, 252, 0.5);
    }
    .card-header h2 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }
    
    .icon-box {
      width: 40px;
      height: 40px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .blue-icon { background-color: #dbeafe; color: #2563eb; }
    .indigo-icon { background-color: #e0e7ff; color: #4f46e5; }
    .teal-icon { background-color: #ccfbf1; color: #0d9488; }
    .orange-icon { background-color: #ffedd5; color: #ea580c; }
    .pink-icon { background-color: #fce7f3; color: #db2777; }
    
    .card-body {
      padding: 1.25rem 1.5rem;
    }
    
    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 768px) {
      .form-grid-2 { grid-template-columns: 1fr 1fr; }
      .full-width { grid-column: span 2; }
    }
    
    .logo-name-row {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    }
    @media (min-width: 768px) {
      .logo-name-row { flex-direction: row; align-items: center; }
    }
    
    .logo-upload {
      position: relative;
      width: 96px;
      height: 96px;
      border-radius: 1rem;
      border: 2px dashed #cbd5e1;
      background-color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      overflow: hidden;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .logo-upload:hover {
      border-color: #3b82f6;
      background-color: #eff6ff;
    }
    .upload-icon { color: #94a3b8; margin-bottom: 0.25rem; }
    .logo-upload span { font-size: 0.75rem; color: #64748b; font-weight: 500; }
    
    .preview-img { width: 100%; height: 100%; object-fit: cover; }
    
    .hover-overlay {
      position: absolute;
      inset: 0;
      background-color: rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .logo-upload:hover .hover-overlay.show { opacity: 1; }
    .hover-overlay mat-icon { color: white; }
    
    .hidden-input { display: none; }
    
    .name-input { flex: 1; width: 100%; }
    .w-full { width: 100%; }
    
    .image-upload-box label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #334155;
      margin-bottom: 0.5rem;
    }
    .upload-area {
      position: relative;
      width: 100%;
      height: 128px;
      border-radius: 0.75rem;
      border: 2px dashed #cbd5e1;
      background-color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      overflow: hidden;
      transition: all 0.2s;
    }
    .upload-area:hover {
      border-color: #6366f1;
      background-color: #eef2ff;
    }
    .upload-prompt {
      text-align: center;
      color: #94a3b8;
    }
    .upload-prompt p { font-size: 0.75rem; margin: 0.25rem 0 0 0; }
    
    .form-icon { margin-right: 0.5rem; color: #94a3b8; }
    .text-bold { font-weight: bold; }
    
    .stack-gap {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .input-group label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #334155;
      margin-bottom: 0.25rem;
    }
    .help-text {
      font-size: 0.75rem;
      color: #64748b;
      margin: 0.5rem 0 0 0;
    }
    
    .addon-input {
      display: flex;
      margin-top: 0.25rem;
      width: 100%;
    }
    .addon {
      display: flex;
      align-items: center;
      padding: 0 0.75rem;
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #64748b;
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
    }
    .addon:first-child { border-right: none; border-radius: 0.5rem 0 0 0.5rem; }
    .addon:last-child { border-left: none; border-radius: 0 0.5rem 0.5rem 0; }
    
    .main-input {
      flex: 1 1 auto;
      width: 100%;
      min-width: 0;
      padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1;
      font-size: 0.875rem;
      outline: none;
    }
    .main-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 1px #3b82f6;
    }
    
    .divider {
      height: 1px;
      background-color: #e2e8f0;
      border: none;
      margin: 0.5rem 0;
    }
    
    .info-box {
      background-color: rgba(239, 246, 255, 0.5);
      padding: 0.75rem;
      border-radius: 0.5rem;
      border: 1px solid #dbeafe;
      margin-bottom: 0.75rem;
    }
    .info-box p {
      font-size: 0.75rem;
      color: #1e40af;
      margin: 0;
      line-height: 1.5;
    }
    
    .color-input-wrapper {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.25rem;
      border-radius: 0.75rem;
      border: 1px solid #e2e8f0;
      background-color: #f8fafc;
    }
    
    .color-picker {
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      width: 40px;
      height: 40px;
      background-color: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .color-picker::-webkit-color-swatch-wrapper { padding: 0; }
    .color-picker::-webkit-color-swatch { border: 1px solid rgba(0,0,0,0.1); border-radius: 0.5rem; }
    
    .hex-input {
      text-transform: uppercase;
      font-family: monospace;
      font-size: 0.875rem;
      background: transparent;
      border: none;
      outline: none;
      flex: 1;
      color: #334155;
    }
  `]
})
export class ClubFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clubService = inject(ClubAdminService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private imageCompressor = inject(ImageCompressorService);
  
  form!: FormGroup;
  
  // Zoneless approach: use Signals for state
  isSaving = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  isEditMode = signal<boolean>(false);
  
  logoPreviewUrl = signal<string | null>(null);
  heroPreviewUrl = signal<string | null>(null);
  ctaPreviewUrl = signal<string | null>(null);

  clubId: number | null = null;
  clubData: Club | null = null;

  logoFile: File | null = null;
  heroFile: File | null = null;
  ctaFile: File | null = null;

  ngOnInit() {
    this.initForm();
    
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode.set(true);
        this.clubId = +id;
        this.loadClub(this.clubId);
      } else {
        this.isEditMode.set(false);
        this.isLoading.set(false);
      }
    });
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      domain: [''],
      logo_url: [''],
      slogan: [''],
      primary_color: ['#0073CF'],
      accent_color: ['#E65100'],
      heroImage: [''],
      jumpImage: [''],
      phone: [''],
      email: [''],
      instagram: [''],
      facebook: [''],
      addressLine1: [''],
      addressLine2: [''],
      mapUrl: ['']
    });
  }

  loadClub(id: number) {
    this.isLoading.set(true);
    this.clubService.getClub(id).subscribe({
      next: (club) => {
        if (club) {
          this.clubData = club;
          const settings = club.settings || {};
          
          this.form.patchValue({
            name: club.name || '',
            slug: club.slug || '',
            domain: club.domain || '',
            logo_url: club.logo_url || '',
            slogan: settings.slogan || '',
            primary_color: settings.colors?.primary || '#0073CF',
            accent_color: settings.colors?.accent || '#E65100',
            heroImage: settings.homeConfig?.heroImage || '',
            jumpImage: settings.homeConfig?.ctaImage || '',
            phone: settings.contact?.phone || '',
            email: settings.contact?.email || '',
            instagram: settings.social?.instagram || '',
            facebook: settings.social?.facebook || '',
            addressLine1: settings.contact?.addressLine1 || '',
            addressLine2: settings.contact?.addressLine2 || '',
            mapUrl: settings.contact?.mapUrl || ''
          });
        } else {
          this.toast.error('Club no encontrado');
          this.router.navigate(['/admin/clubs']);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar datos del club');
        this.isLoading.set(false);
        this.router.navigate(['/admin/clubs']);
      }
    });
  }

  updateColor(controlName: string, event: Event) {
    const input = event.target as HTMLInputElement;
    this.form.get(controlName)?.setValue(input.value.toUpperCase());
  }

  async onFileSelected(field: 'logo' | 'hero' | 'cta', event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      let file = input.files[0];
      
      try {
        // Compress the image before storing it
        file = await this.imageCompressor.compress(file);
      } catch (error) {
        console.error('Error compressing image:', error);
        this.toast.error('Error al optimizar la imagen');
      }

      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        if (field === 'logo') {
          this.logoFile = file;
          this.logoPreviewUrl.set(e.target.result);
          this.form.get('logo_url')?.disable();
        }
        if (field === 'hero') {
          this.heroFile = file;
          this.heroPreviewUrl.set(e.target.result);
          this.form.get('heroImage')?.disable();
        }
        if (field === 'cta') {
          this.ctaFile = file;
          this.ctaPreviewUrl.set(e.target.result);
          this.form.get('jumpImage')?.disable();
        }
      };
      
      reader.readAsDataURL(file);
    }
  }

  save() {
    if (this.form.invalid) {
      this.toast.error('Por favor, revisa los campos requeridos.');
      this.form.markAllAsTouched();
      return;
    }
    
    this.isSaving.set(true);

    const formValue = this.form.getRawValue();
    
    const settingsObj = {
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
    };

    const formData = new FormData();
    formData.append('name', formValue.name);
    formData.append('slug', formValue.slug);
    if (formValue.domain) formData.append('domain', formValue.domain);
    if (!this.logoFile && formValue.logo_url) formData.append('logo_url', formValue.logo_url);
    formData.append('settings', JSON.stringify(settingsObj));

    if (this.logoFile) formData.append('logo_file', this.logoFile);
    if (this.heroFile) formData.append('hero_file', this.heroFile);
    if (this.ctaFile) formData.append('cta_file', this.ctaFile);

    const request$ = this.isEditMode() && this.clubId
      ? this.clubService.updateClubWithFormData(this.clubId, formData)
      : this.clubService.createClubWithFormData(formData);

    request$.subscribe({
      next: () => {
        this.toast.success(this.isEditMode() ? 'Club actualizado correctamente' : 'Club creado con éxito');
        this.router.navigate(['/admin/clubs']);
      },
      error: (err) => {
        if (err.status === 422) {
          console.error('Validation errors from backend:', err.error.errors || err.error);
          this.toast.error('Error de validación: por favor revisa los datos (ver consola).');
        } else {
          this.toast.error(this.isEditMode() ? 'Error al actualizar club' : 'Error al crear club');
        }
        this.isSaving.set(false);
      }
    });
  }
}
