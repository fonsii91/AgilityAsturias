import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DogService } from '../../../services/dog.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-dog-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <div class="gestion-container fade-in">
    <div class="gestion-header">
      <div class="header-titles">
        <h2 style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span class="material-icons-outlined">pets</span> Mi Manada
        </h2>
        <p>Selecciona un perro para gestionar su perfil, entrenamientos y salud.</p>
      </div>
      <button class="btn-primary add-btn" routerLink="nuevo">
        <span class="material-icons">add</span> Añadir Perro
      </button>
    </div>

    @if (dogs().length === 0) {
      <div class="empty-state">
        <span class="material-icons-outlined empty-icon">sentiment_dissatisfied</span>
        <p>Todavía no has registrado ningún perro.</p>
        <button class="btn-primary" routerLink="nuevo" style="margin-top: 1rem;">
          Añadir tu primer perro
        </button>
      </div>
    } @else {
      <div class="dog-grid">
        @for (dog of dogs(); track dog.id) {
          <div class="dog-card" [routerLink]="['/gestionar-perros', dog.id]">
            <div class="dog-card-header">
              <div class="avatar-container">
                @if (dog.photo_url) {
                  <img [src]="dog.photo_url" [alt]="dog.name">
                } @else {
                  <span class="material-icons placeholder-icon">pets</span>
                }
              </div>
              <div class="dog-info-main">
                <h3>{{ dog.name }}</h3>
                <span class="breed">{{ dog.breed || 'Sin raza especificada' }}</span>
              </div>
            </div>
            
            <div class="dog-card-stats">
              <div class="stat-item">
                <span class="stat-value">{{ calculateAge(dog.birth_date) }}</span>
                <span class="stat-label">Edad</span>
              </div>
              <div class="stat-item points" style="color: var(--accent-orange)">
                <span class="stat-value">{{ dog.points || 0 }}</span>
                <span class="stat-label">Puntos</span>
              </div>
            </div>

            <div class="dog-card-footer" [style.border-top-color]="'#f1f5f9'">
              <span>Gestionar Perfil</span>
              <span class="material-icons-outlined">arrow_forward</span>
            </div>
          </div>
        }
      </div>
    }
  </div>
  `,
  styles: [`
    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    
    .gestion-container {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .gestion-header {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;
      padding: 1.5rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    .header-titles h2 { margin: 0; color: #1e293b; font-size: 1.8rem; }
    .header-titles p { margin: 0.5rem 0 0 0; color: #64748b; }
    
    .btn-primary { background: var(--primary-color); border: none; padding: 0.8rem 1.5rem; border-radius: 30px; font-weight: 600; color: white; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; transition: filter 0.2s, transform 0.2s, box-shadow 0.2s; }
    .btn-primary:hover { transform: translateY(-2px); filter: brightness(0.9); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; background: white; border-radius: 12px; text-align: center; border: 1px dashed #cbd5e1; }
    .empty-icon { font-size: 4rem; color: #94a3b8; margin-bottom: 1rem; }
    
    .dog-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }
    
    .dog-card {
      background: white; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); cursor: pointer; transition: all 0.2s;
      display: flex; flex-direction: column; overflow: hidden; border: 1px solid transparent;
    }
    .dog-card:hover { transform: translateY(-4px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-color: #e2e8f0; }
    
    .dog-card-header { padding: 1.5rem; display: flex; gap: 1rem; align-items: center; background: #f8fafc; }
    .avatar-container { width: 70px; height: 70px; border-radius: 50%; overflow: hidden; background: #e2e8f0; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); flex-shrink:0; }
    .avatar-container img { width: 100%; height: 100%; object-fit: cover; }
    .placeholder-icon { font-size: 2rem; color: #94a3b8; }
    
    .dog-info-main h3 { margin: 0 0 0.2rem 0; font-size: 1.3rem; color: #1e293b; }
    .dog-info-main .breed { font-size: 0.85rem; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 12px; display: inline-block;}
    
    .dog-card-stats { display: flex; padding: 1.5rem; gap: 1rem; }
    .stat-item { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
    .stat-value { font-size: 1.1rem; font-weight: 700; color: #334155; }
    .stat-label { font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    
    .dog-card-footer { padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; color: #64748b; font-weight: 600; font-size: 0.9rem; transition: color 0.2s; }
    .dog-card:hover .dog-card-footer { color: var(--primary-color, #0f172a); }
  `]
})
export class DogListComponent implements OnInit {
  dogService = inject(DogService);
  dogs = this.dogService.getDogs();

  ngOnInit() {
    this.dogService.loadUserDogs();
  }

  calculateAge(birthDate: string | undefined): string {
    if (!birthDate) return '-';
    const bdate = new Date(birthDate);
    const today = new Date();
    let numAgnos = today.getFullYear() - bdate.getFullYear();
    let numMeses = today.getMonth() - bdate.getMonth();

    if (numMeses < 0 || (numMeses === 0 && today.getDate() < bdate.getDate())) {
      numAgnos--;
      numMeses += 12;
    }
    
    if (numAgnos === 0) {
      if (numMeses === 0) return 'Cachorro';
      return `${numMeses} meses`;
    }
    return `${numAgnos} años`;
  }
}
