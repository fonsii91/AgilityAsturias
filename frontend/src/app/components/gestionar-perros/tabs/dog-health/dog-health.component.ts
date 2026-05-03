import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DogStateService } from '../../services/dog-state.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-dog-health',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="health-container">
      <div class="coming-soon glass-effect" style="border-top: 4px solid var(--primary-color);">
        <span class="material-icons-outlined huge-icon" style="color: var(--primary-color);">medical_services</span>
        <h3>Cartilla Sanitaria Digital</h3>
        <p>Pronto podrás gestionar el historial veterinario de {{ dog()?.name || 'tu perro' }}:</p>
        <ul class="feature-list">
          <li><span class="material-icons-outlined">vaccines</span> Control de Vacunas y Desparasitaciones</li>
          <li><span class="material-icons-outlined">fingerprint</span> Número de Microchip</li>
          <li><span class="material-icons-outlined">medical_information</span> Diagnósticos Crotales</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .health-container { animation: fadeIn 0.4s ease; padding: 1rem 0; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    
    .coming-soon { background: white; padding: 3rem; border-radius: 16px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 600px; margin: 0 auto; }
    .huge-icon { font-size: 4rem; margin-bottom: 1rem; }
    .coming-soon h3 { margin: 0 0 1rem 0; font-size: 1.5rem; color: #1e293b; }
    .coming-soon p { color: #64748b; font-size: 1.05rem; margin-bottom: 2rem; }
    
    .feature-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem; text-align: left; background: #f8fafc; padding: 1.5rem; border-radius: 12px; }
    .feature-list li { display: flex; align-items: center; gap: 1rem; color: #334155; font-weight: 500; font-size: 1.05rem; }
    .feature-list li .material-icons-outlined { color: #94a3b8; }
  `]
})
export class DogHealthComponent {
  dogState = inject(DogStateService);
  dog = this.dogState.getDog();
  clubTheme = environment.clubConfig.colors;
}
