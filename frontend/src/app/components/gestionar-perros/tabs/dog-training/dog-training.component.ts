import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DogStateService } from '../../services/dog-state.service';
import { DogService } from '../../../../services/dog.service';
import { ToastService } from '../../../../services/toast.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-dog-training',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="health-container">
      <div class="form-header">
        <h3 style="color: var(--primary-color);">Rendimiento y Prevención (ACWR)</h3>
        <p>Estos datos biométricos y médicos configuran la sensibilidad de la brújula de fatiga del entorno deportivo para proteger a {{ dog()?.name }} contra lesiones.</p>
      </div>

      <div class="form-card glass-effect">
        <div class="two-col-grid">
          
          <div class="form-group">
            <label>
              Historial Relevante de Lesiones 
              <span class="trust-marker" (click)="showInfo('Tener lesiones musculoesqueléticas previas incrementa el riesgo estadístico (OR=11.36) de sufrir una recaída por sobreutilización. Estudio: Inkilä et al. (2022). Univ. Helsinki.')" title="Tener lesiones musculoesqueléticas previas incrementa el riesgo estadístico (OR=11.36) de sufrir una recaída por sobreutilización. Estudio: Inkilä et al. (2022). Univ. Helsinki.">
                <span class="material-icons-outlined" style="color: var(--primary-color);">info</span>
              </span>
            </label>
            <div class="toggle-switch-wrapper">
              <label class="switch">
                <input type="checkbox" [(ngModel)]="formData.has_previous_injuries" (ngModelChange)="checkChanges()">
                <span class="slider round"></span>
              </label>
              <span class="toggle-label">{{ formData.has_previous_injuries ? 'Sí, tiene historial' : 'Perro sin lesiones graves' }}</span>
            </div>
          </div>

          <div class="form-group">
            <label>
              Esterilizado/a antes del cierre de placas
              <span class="trust-marker" (click)="showInfo('La castración temprana está asociada a alteraciones del ángulo de la meseta tibial anterior, multiplicando la predisposición a rotura de cruzado anterior. Estudio: Pechette Markley et al.')" title="La castración temprana está asociada a alteraciones del ángulo de la meseta tibial anterior, multiplicando la predisposición a rotura de cruzado anterior. Estudio: Pechette Markley et al.">
                <span class="material-icons-outlined" style="color: var(--primary-color);">info</span>
              </span>
            </label>
            @if (!dog()?.birth_date || dog()?.birth_date === '') {
              <div class="info-note" style="background:#fee2e2; border-left-color:#ef4444; margin-bottom: 8px;">
                <span class="material-icons-outlined" style="color:#ef4444;">warning</span>
                <p style="color:#b91c1c; margin: 0;">Falta la <strong>Fecha de Nacimiento</strong> en su <a [routerLink]="['/gestionar-perros', dog()?.id, 'resumen']" style="color:#991b1b; text-decoration: underline; font-weight: bold;">pestaña de Resumen</a>. Es obligatoria para poder calcular su edad de castración.</p>
              </div>
            }
            <div style="display: flex; gap: 10px;">
              <div class="input-with-icon" style="flex: 1;">
                <input type="number" class="custom-input" [(ngModel)]="formData.sterilized_years" (ngModelChange)="checkChanges()" placeholder="Años (ej. 1)" min="0" max="20" [disabled]="!dog()?.birth_date">
                <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.9em; pointer-events: none;">años</span>
              </div>
              <div class="input-with-icon" style="flex: 1;">
                <input type="number" class="custom-input" [(ngModel)]="formData.sterilized_months" (ngModelChange)="checkChanges()" placeholder="Meses (ej. 4)" min="0" max="11" [disabled]="!dog()?.birth_date">
                <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.9em; pointer-events: none;">meses</span>
              </div>
            </div>
            <small class="help-text">Deja en blanco si es entero/a o se desconoce.</small>
          </div>

          <div class="form-group">
            <label>Peso (Kg)</label>
            <div class="input-with-icon">
              <span class="material-icons-outlined input-icon">monitor_weight</span>
              <input type="number" step="0.1" [(ngModel)]="formData.weight_kg" (ngModelChange)="checkChanges()" placeholder="Ej. 16.5">
            </div>
          </div>

          <div class="form-group">
            <label>
              Altura a la cruz (cm)
              <span class="trust-marker" (click)="showInfo('El Ratio Altura/Peso es crucial. Perros especialmente pesados para su estatura corta tienden a multiplicar la carga articular en virajes.')" title="El Ratio Altura/Peso es crucial. Perros especialmente pesados para su estatura corta tienden a multiplicar la carga articular en virajes.">
                <span class="material-icons-outlined" style="color: var(--primary-color);">info</span>
              </span>
            </label>
            <div class="input-with-icon">
              <span class="material-icons-outlined input-icon">height</span>
              <input type="number" step="0.5" [(ngModel)]="formData.height_cm" (ngModelChange)="checkChanges()" placeholder="Ej. 52">
            </div>
          </div>

        </div>
      </div>
      
      @if (hasChanges) {
        <div class="floating-save-bar pop-in">
          <div class="save-bar-content">
            <button class="reset-btn" (click)="resetForm()">Descartar</button>
            <button class="save-btn" [disabled]="isSaving()" (click)="saveHealthData()" [style.background]="'var(--primary-color)'">
              <div class="btn-content">
                @if (!isSaving()) { <span class="material-icons">save</span> }
                @if (isSaving()) { <span class="material-icons spinner-small">sync</span> }
                <span>@if (isSaving()) { Guardando... } @else { Guardar Cambios }</span>
              </div>
            </button>
          </div>
        </div>
      }
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
    
    .trust-marker { cursor: pointer; display: flex; align-items: center; }
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
    
    .floating-save-bar { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); background-color: #1e293b; color: white; padding: 0.75rem 1rem; border-radius: 9999px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1); z-index: 100; width: max-content; max-width: 90%; border: 1px solid rgba(255, 255, 255, 0.1); }
    .pop-in { animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes popIn { 0% { opacity: 0; transform: translate(-50%, 20px) scale(0.95); } 100% { opacity: 1; transform: translate(-50%, 0) scale(1); } }
    .save-bar-content { display: flex; align-items: center; justify-content: center; gap: 1rem; }
    .reset-btn { background: transparent; border: none; color: #cbd5e1; font-weight: 600; padding: 0.5rem 1rem; border-radius: 9999px; cursor: pointer; transition: all 0.2s; }
    .reset-btn:hover { background-color: rgba(255, 255, 255, 0.1); color: white; }
    .save-btn { border: none; border-radius: 9999px; font-weight: 600; color: white; height: 40px; padding: 0 1.5rem; cursor: pointer; transition: filter 0.2s; }
    .save-btn:hover:not(:disabled) { filter: brightness(1.1); }
    .save-btn:disabled { background: rgba(255, 255, 255, 0.1) !important; color: rgba(255, 255, 255, 0.5) !important; cursor: not-allowed; }
    .btn-content { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
    .btn-content .material-icons { font-size: 18px; }
    .spinner-small { animation: spin 1s linear infinite; }
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
  initialData: any = {};
  hasChanges = false;
  
  checkChanges() {
    this.hasChanges = JSON.stringify(this.formData) !== JSON.stringify(this.initialData);
  }
  
  resetForm() {
    this.formData = { ...this.initialData };
    this.hasChanges = false;
  }

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
        
        // Timeout to avoid ExpressionChangedAfterItHasBeenCheckedError if hasChanges is bound
        setTimeout(() => {
          this.initialData = { ...this.formData };
          this.hasChanges = false;
        });
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
      
      this.initialData = { ...this.formData };
      this.hasChanges = false;
      
      this.toast.success('Perfil deportivo actualizado');
    } catch(err) {
      console.error(err);
      this.toast.error('Error al guardar datos deportivos');
    } finally {
      this.isSaving.set(false);
    }
  }

  showInfo(msg: string) {
    this.toast.info(msg, 6000);
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
