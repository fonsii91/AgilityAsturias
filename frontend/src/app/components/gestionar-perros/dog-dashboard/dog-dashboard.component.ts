import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { DogStateService } from '../services/dog-state.service';
import { environment } from '../../../../environments/environment';
import { DogService } from '../../../services/dog.service';
import { ToastService } from '../../../services/toast.service';
import { ImageCompressorService } from '../../../services/image-compressor.service';
import { OnboardingService } from '../../../services/onboarding';

@Component({
  selector: 'app-dog-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (isLoading()) {
      <div class="loading-state">
        <span class="material-icons-outlined spinner" style="color: var(--primary-color);">pets</span>
        <p>Cargando perfil...</p>
      </div>
    } @else if (dog()) {
      <div class="dashboard-container fade-in">
        
        <!-- Dog Header -->
        <div class="dog-header-card glass-effect">
          <button class="back-btn" routerLink="/gestionar-perros">
            <span class="material-icons-outlined">arrow_back</span> Volver a la manada
          </button>
          
          <div class="header-content">
            <div class="dog-avatar-wrapper">
              @if (isUploadingPhoto()) {
                <div class="upload-overlay">
                  <span class="material-icons-outlined spinner-small">sync</span>
                </div>
              }
              @if (dog()!.photo_url) {
                <img [src]="dog()!.photo_url" [alt]="dog()!.name">
              } @else {
                <span class="material-icons placeholder">pets</span>
              }
              <label class="camera-floating-btn" title="Cambiar foto" style="background: var(--primary-color);">
                <span class="material-icons">camera_alt</span>
                <input type="file" (change)="onFileSelected($event)" accept="image/*" hidden>
              </label>
            </div>
            
            <div class="dog-main-info">
              <div class="title-row">
                <h2>{{ dog()!.name }}</h2>
                @if (dog()!.pivot?.rsce_grade) { <span class="badge grade">Grado {{ dog()!.pivot?.rsce_grade }}</span> }
              </div>
              <p class="subtitle">
                {{ dog()!.breed || 'Mestizo' }}{{ calculateAge(dog()!.birth_date) ? ' &bull; ' + calculateAge(dog()!.birth_date) : '' }}
              </p>
            </div>
            
            <div class="dog-points-badge" style="background: var(--accent-orange, #EAB308);">
              <span class="pts">{{ dog()!.points || 0 }}</span>
              <span class="lbl">PUNTOS</span>
            </div>
          </div>
        </div>
        
        <!-- Navigation Tabs -->
        <div class="nav-container">
          <div class="scroll-hint-mobile"><span class="material-icons-outlined" style="font-size: 14px;">swipe</span> Desliza para ver más opciones</div>
          <div class="dashboard-nav">
            <a routerLink="resumen" routerLinkActive="active" class="nav-tab" style="--active-color: var(--primary-color);">
              <span class="material-icons-outlined">dashboard</span> Resumen
            </a>
            <a routerLink="entrenamiento" routerLinkActive="active" class="nav-tab" style="--active-color: var(--primary-color);">
              <span class="material-icons-outlined">fitness_center</span> Entrenamiento
            </a>
            <a routerLink="salud" routerLinkActive="active" class="nav-tab" style="--active-color: var(--primary-color);">
              <span class="material-icons-outlined">medical_services</span> Salud
            </a>
            <a routerLink="documentacion" routerLinkActive="active" class="nav-tab" style="--active-color: var(--primary-color);">
              <span class="material-icons-outlined">folder_shared</span> Documentos
            </a>
            <a routerLink="familia" routerLinkActive="active" class="nav-tab" style="--active-color: var(--primary-color);">
              <span class="material-icons-outlined">family_restroom</span> Familia
            </a>
            <a routerLink="ajustes" routerLinkActive="active" class="nav-tab danger-tab">
              <span class="material-icons-outlined">settings</span> Ajustes
            </a>
          </div>
        </div>
        
        <!-- Content Area -->
        <div class="dashboard-content">
          <router-outlet></router-outlet>
        </div>
      </div>
    } @else {
      <div class="empty-state">
        <span class="material-icons-outlined empty-icon">error_outline</span>
        <p>No pudimos encontrar a este perro.</p>
        <button class="btn-primary" routerLink="/gestionar-perros" style="background-color: var(--primary-color);">
          Volver a Mis Perros
        </button>
      </div>
    }
  `,
  styles: [`
    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    
    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; color: #64748b; }
    .spinner { font-size: 3rem; animation: spin 1.5s linear infinite; margin-bottom: 1rem; }
    
    .dashboard-container { max-width: 1000px; margin: 2rem auto; padding: 0 1rem; display: flex; flex-direction: column; gap: 1.5rem; }
    
    .dog-header-card {
      background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 1.5rem;
      position: relative; overflow: hidden;
    }
    
    .back-btn { background: transparent; border: none; color: #64748b; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; padding: 0; margin-bottom: 1.5rem; transition: color 0.2s; }
    .back-btn:hover { color: #0f172a; }
    .back-btn .material-icons-outlined { font-size: 1.1rem; }
    
    .header-content { display: flex; align-items: center; gap: 1rem; flex-wrap: nowrap; }
    @media (max-width: 480px) {
      .header-content { gap: 0.8rem; }
      .dog-avatar-wrapper { width: 80px; height: 80px; }
      .dog-points-badge { width: 65px; height: 65px; }
      .dog-points-badge .pts { font-size: 1.4rem; }
    }
    
    .dog-avatar-wrapper { position: relative; width: 100px; height: 100px; border-radius: 50%; background: #f1f5f9; border: 4px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .dog-avatar-wrapper img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    .dog-avatar-wrapper .placeholder { font-size: 3rem; color: #cbd5e1; }
    
    .camera-floating-btn { position: absolute; bottom: -5px; right: -5px; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border: 3px solid white; transition: transform 0.2s; z-index: 5; }
    .camera-floating-btn:hover { transform: scale(1.1); }
    .camera-floating-btn .material-icons { font-size: 16px; }
    
    .upload-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; z-index: 10; border-radius: 50%; }
    .spinner-small { animation: spin 1s linear infinite; font-size: 28px; }
    
    .dog-main-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
    .title-row { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; margin-bottom: 0.2rem; }
    .title-row h2 { margin: 0; font-size: 1.8rem; color: #1e293b; font-weight: 800; letter-spacing: -0.5px; line-height: 1.15; word-wrap: break-word; }
    .badge { font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; white-space: nowrap; }
    .badge.grade { background: #e0f2fe; color: #0369a1; }
    
    .subtitle { margin: 0; color: #64748b; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    
    .dog-points-badge { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 80px; height: 80px; border-radius: 16px; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.15); transform: rotate(5deg); transition: transform 0.3s; }
    .dog-points-badge:hover { transform: rotate(0deg) scale(1.05); }
    .dog-points-badge .pts { font-size: 1.8rem; font-weight: 800; line-height: 1; }
    .dog-points-badge .lbl { font-size: 0.65rem; font-weight: 700; letter-spacing: 1px; margin-top: 4px; }
    
    .nav-container { background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); overflow: hidden; padding-bottom: 0.5rem; }
    .dashboard-nav { display: flex; overflow-x: auto; padding: 0 0.5rem; gap: 0.5rem; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; }
    .dashboard-nav::-webkit-scrollbar { height: 6px; }
    .dashboard-nav::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; }
    .dashboard-nav::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; margin: 0 4px; }
    
    .scroll-hint-mobile { display: none; text-align: right; color: #64748b; font-size: 0.8rem; padding: 0.5rem 1rem 0.2rem; align-items: center; justify-content: flex-end; gap: 4px; font-weight: 500; }
    @media (max-width: 768px) {
      .scroll-hint-mobile { display: flex; animation: subtleBounceX 2s infinite; }
    }
    @keyframes subtleBounceX {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(-5px); }
    }
    
    .nav-tab { flex: 1; min-width: max-content; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.8rem 1rem; border-radius: 8px; color: #64748b; text-decoration: none; font-weight: 600; font-size: 0.95rem; transition: all 0.2s; }
    .nav-tab:hover { background: #f8fafc; color: #334155; }
    .nav-tab.active { background: #f1f5f9; color: var(--active-color, #0f172a); }
    
    .danger-tab:hover { background: #fef2f2; color: #ef4444; }
    .danger-tab.active { background: #fef2f2; color: #ef4444; border-bottom: 2px solid #ef4444; border-radius: 8px 8px 0 0;}
    
    .dashboard-content { animation: fadeIn 0.4s ease; }
    
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; text-align: center; color: #64748b; }
    .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
    .btn-primary { border: none; padding: 0.8rem 1.5rem; border-radius: 30px; font-weight: 600; color: white; cursor: pointer; display: inline-block; margin-top: 1rem; }
  `]
})
export class DogDashboardComponent implements OnInit, OnDestroy {
  route = inject(ActivatedRoute);
  router = inject(Router);
  dogState = inject(DogStateService);
  dogService = inject(DogService);
  toast = inject(ToastService);
  imageCompressor = inject(ImageCompressorService);
  onboardingService = inject(OnboardingService);
  
  dog = this.dogState.getDog();
  isLoading = signal(true);
  isUploadingPhoto = signal(false);
  clubTheme = environment.clubConfig.colors;

  async ngOnInit() {
    this.route.paramMap.subscribe(async params => {
      const id = Number(params.get('id'));
      if (id) {
        this.isLoading.set(true);
        const loaded = await this.dogState.loadDog(id);
        this.isLoading.set(false);
        
        if (loaded) {
          this.onboardingService.markStepCompleted('miembro_perfil');
        } else {
          console.warn('Dog not found, maybe redirect to list');
        }
      }
    });
  }

  ngOnDestroy() {
    // Limpiamos el estado al salir del dashboard
    this.dogState.clear();
  }

  calculateAge(birthDate: string | undefined): string {
    if (!birthDate) return '';
    const bdate = new Date(birthDate);
    const today = new Date();
    let numAgnos = today.getFullYear() - bdate.getFullYear();
    let numMeses = today.getMonth() - bdate.getMonth();
    if (numMeses < 0 || (numMeses === 0 && today.getDate() < bdate.getDate())) {
      numAgnos--;
      numMeses += 12;
    }
    if (numAgnos === 0) return `${numMeses} meses`;
    return `${numAgnos} años`;
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    const currentDog = this.dog();
    if (file && currentDog) {
      try {
        this.isUploadingPhoto.set(true);
        const compressedFile = await this.imageCompressor.compress(file);
        const updatedDog = await this.dogService.updateDogPhoto(currentDog.id, compressedFile);
        
        // Actualizar el estado global con el perro que ahora tiene la foto actualizada
        this.dogState.setDog(updatedDog);
        this.toast.success('Foto actualizada correctamente');
      } catch (e) {
        this.toast.error('Error al actualizar la foto');
      } finally {
        this.isUploadingPhoto.set(false);
      }
    }
  }
}
