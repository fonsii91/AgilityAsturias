import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DogStateService } from '../../services/dog-state.service';
import { DogService } from '../../../../services/dog.service';
import { ToastService } from '../../../../services/toast.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-dog-training',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="health-container">
      <div class="form-header">
        <h3 [style.color]="clubTheme.primary">Rendimiento y Prevención (ACWR)</h3>
        <p>Estos datos biométricos y médicos configuran la sensibilidad de la brújula de fatiga del entorno deportivo para proteger a {{ dog()?.name }} contra lesiones.</p>
      </div>

      <div class="form-card glass-effect">
        <div class="two-col-grid">
          
          <div class="form-group">
            <label>
              Historial Relevante de Lesiones 
              <span class="trust-marker" title="Tener lesiones musculoesqueléticas previas incrementa el riesgo estadístico (OR=11.36) de sufrir una recaída por sobreutilización. Estudio: Inkilä et al. (2022). Univ. Helsinki.">
                <span class="material-icons-outlined">info</span>
              </span>
            </label>
            <div class="toggle-switch-wrapper">
              <label class="switch">
                <input type="checkbox" [(ngModel)]="formData.has_previous_injuries">
                <span class="slider round"></span>
              </label>
              <span class="toggle-label">{{ formData.has_previous_injuries ? 'Sí, tiene historial' : 'Perro sin lesiones graves' }}</span>
            </div>
          </div>

          <div class="form-group">
            <label>
              Esterilizado/a antes del cierre de placas
              <span class="trust-marker" title="La castración temprana está asociada a alteraciones del ángulo de la meseta tibial anterior, multiplicando la predisposición a rotura de cruzado anterior. Estudio: Pechette Markley et al.">
                <span class="material-icons-outlined">info</span>
              </span>
            </label>
            @if (!dog()?.birth_date || dog()?.birth_date === '') {
              <div class="info-note" style="background:#fee2e2; border-left-color:#ef4444; margin-bottom: 8px;">
                <span class="material-icons-outlined" style="color:#ef4444;">warning</span>
                <p style="color:#b91c1c;">Falta la <strong>Fecha de Nacimiento</strong> en su perfil público. Es obligatoria para poder calcular su edad de castración.</p>
              </div>
            }
            <div style="display: flex; gap: 10px;">
              <div class="input-with-icon" style="flex: 1;">
                <input type="number" class="custom-input" [(ngModel)]="formData.sterilized_years" placeholder="Años (ej. 1)" min="0" max="20" [disabled]="!dog()?.birth_date">
                <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.9em; pointer-events: none;">años</span>
              </div>
              <div class="input-with-icon" style="flex: 1;">
                <input type="number" class="custom-input" [(ngModel)]="formData.sterilized_months" placeholder="Meses (ej. 4)" min="0" max="11" [disabled]="!dog()?.birth_date">
                <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.9em; pointer-events: none;">meses</span>
              </div>
            </div>
            <small class="help-text">Deja en blanco si es entero/a o se desconoce.</small>
          </div>

          <div class="form-group">
            <label>Peso (Kg)</label>
            <div class="input-with-icon">
              <span class="material-icons-outlined input-icon">monitor_weight</span>
              <input type="number" step="0.1" [(ngModel)]="formData.weight_kg" placeholder="Ej. 16.5">
            </div>
          </div>

          <div class="form-group">
            <label>
              Altura a la cruz (cm)
              <span class="trust-marker" title="El Ratio Altura/Peso es crucial. Perros especialmente pesados para su estatura corta tienden a multiplicar la carga articular en virajes.">
                <span class="material-icons-outlined">info</span>
              </span>
            </label>
            <div class="input-with-icon">
              <span class="material-icons-outlined input-icon">height</span>
              <input type="number" step="0.5" [(ngModel)]="formData.height_cm" placeholder="Ej. 52">
            </div>
          </div>

        </div>

        <div class="form-actions mt-4">
          <button class="btn-save" [style.background]="clubTheme.primary" (click)="saveHealthData()" [disabled]="isSaving()">
            <span class="material-icons">fitness_center</span> {{ isSaving() ? 'Guardando...' : 'Guardar Datos Deportivos' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .health-container { animation: fadeIn 0.4s ease; padding: 1rem 0;}
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    
    .form-header { margin-bottom: 1.5rem; }
    .form-header h3 { margin: 0 0 0.5rem 0; font-size: 1.4rem; }
    .form-header p { color: #64748b; font-size: 0.95rem; line-height: 1.4; margin: 0; }
    
    .form-card { background: white; padding: 2rem; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    
    .two-col-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    @media (max-width: 700px) { .two-col-grid { grid-template-columns: 1fr; } }
    
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-group label { font-size: 0.9rem; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 5px;}
    
    .trust-marker { color: #60a5fa; cursor: pointer; display: flex; align-items: center; }
    .trust-marker .material-icons-outlined { font-size: 16px; }
    
    .input-with-icon { position: relative; }
    .input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 20px; pointer-events: none; }
    .input-with-icon input, .custom-input { width: 100%; padding: 12px 15px; border: 2px solid transparent; border-radius: 10px; background: #f1f5f9; color: #1e293b; font-size: 1rem; transition: all 0.2s; box-sizing: border-box; }
    .input-with-icon input { padding-left: 42px; }
    .input-with-icon input:focus, .custom-input:focus { outline: none; border-color: var(--primary-color, #0f172a); background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    
    .help-text { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; }
    
    /* Toggle Switch */
    .toggle-switch-wrapper { display: flex; align-items: center; gap: 12px; margin-top: 6px; }
    .switch { position: relative; display: inline-block; width: 50px; height: 26px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 34px; }
    .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
    input:checked + .slider { background-color: #ef4444; } /* Red because injury is a risk */
    input:checked + .slider:before { transform: translateX(24px); }
    .toggle-label { font-size: 0.95rem; color: #334155; font-weight: 500;}
    
    .mt-4 { margin-top: 1.5rem; }
    .form-actions { display: flex; justify-content: flex-end; }
    .btn-save { color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 30px; font-weight: 600; font-size: 1rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    .btn-save:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0,0,0,0.15); }
    .btn-save:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }
  `]
})
export class DogTrainingComponent {
  dogState = inject(DogStateService);
  dogService = inject(DogService);
  toast = inject(ToastService);
  
  dog = this.dogState.getDog();
  clubTheme = environment.clubConfig.colors;

  isSaving = signal<boolean>(false);

  formData = {
    has_previous_injuries: false,
    sterilized_years: null as number | null,
    sterilized_months: null as number | null,
    weight_kg: null as number | null,
    height_cm: null as number | null
  };

  constructor() {
    effect(() => {
      const currentDog = this.dog();
      if (currentDog) {
        this.formData = {
          has_previous_injuries: currentDog.has_previous_injuries || false,
          sterilized_years: null,
          sterilized_months: null,
          weight_kg: currentDog.weight_kg || null,
          height_cm: currentDog.height_cm || null
        };
        if (currentDog.sterilized_at && currentDog.birth_date) {
            const birthDate = new Date(currentDog.birth_date);
            const sterilizedDate = new Date(currentDog.sterilized_at);
            const diffTime = Math.abs(sterilizedDate.getTime() - birthDate.getTime());
            const diffMonths = Math.round(diffTime / (1000 * 60 * 60 * 24 * 30.44));
            this.formData.sterilized_years = Math.floor(diffMonths / 12);
            let rm = diffMonths % 12;
            this.formData.sterilized_months = rm === 0 && this.formData.sterilized_years > 0 ? null : rm;
        }
      }
    });
  }

  async saveHealthData() {
    const currentDog = this.dog();
    if (!currentDog) return;

    this.isSaving.set(true);
    
    try {
      let autoCategory = currentDog.rsce_category;
      if (this.formData.height_cm) {
         if (this.formData.height_cm < 35) autoCategory = 'S';
         else if (this.formData.height_cm < 43) autoCategory = 'M';
         else if (this.formData.height_cm < 48) autoCategory = 'I';
         else autoCategory = 'L';
      }

      const payload = {
        name: currentDog.name,
        breed: currentDog.breed,
        birth_date: currentDog.birth_date,
        has_previous_injuries: this.formData.has_previous_injuries,
        sterilized_at: this.calculateSterilizedDate(currentDog.birth_date, this.formData.sterilized_years, this.formData.sterilized_months),
        weight_kg: this.formData.weight_kg,
        height_cm: this.formData.height_cm,
        rsce_category: autoCategory
      };

      const updatedDog = await this.dogService.updateDog(currentDog.id, payload as any);
      this.dogState.setDog(updatedDog);
      this.toast.success('Perfil deportivo actualizado');
    } catch(err) {
      console.error(err);
      this.toast.error('Error al guardar datos deportivos');
    } finally {
      this.isSaving.set(false);
    }
  }

  calculateSterilizedDate(birthDateStr: string | undefined, years: number | null, months: number | null): string | null {
    if (!birthDateStr) return null;
    const y = years || 0;
    const m = months || 0;
    if (y === 0 && m === 0) return null; // No values provided
    
    const [yearStr, monthStr, dayStr] = birthDateStr.split('T')[0].split('-');
    const date = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
    
    date.setMonth(date.getMonth() + (y * 12) + m);
    
    const outYear = date.getFullYear();
    const outMonth = String(date.getMonth() + 1).padStart(2, '0');
    const outDay = String(date.getDate()).padStart(2, '0');
    
    return `${outYear}-${outMonth}-${outDay}`;
  }
}
