import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DogStateService } from '../../services/dog-state.service';
import { ToastService } from '../../../../services/toast.service';
import { DogService } from '../../../../services/dog.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-dog-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (dog()) {
      <div class="summary-container">
        
        <div class="info-note" [style.border-left-color]="clubTheme.primary">
          <span class="material-icons-outlined" [style.color]="clubTheme.primary">info</span>
          <p>Vista general básica. Puedes actualizar el nombre y la fecha de nacimiento aquí.</p>
        </div>

        <div class="card basic-info-card">
          <h3><span class="material-icons-outlined">badge</span> Datos Generales</h3>
          <div class="two-col-grid">
            <div class="form-group">
              <label>Nombre</label>
              <input type="text" [(ngModel)]="formData.name" placeholder="P. ej. Toby">
            </div>
            
            <div class="form-group">
              <label>Raza</label>
              <input type="text" [(ngModel)]="formData.breed" placeholder="Si es mestizo, indícalo">
            </div>

            <div class="form-group">
              <label>Fecha de Nacimiento</label>
              <input type="date" [(ngModel)]="formData.birth_date">
            </div>
            
            <div class="form-group submit-group" style="grid-column: 1 / -1; margin-top: 1rem; text-align: right;">
              <button class="btn-save" [style.background]="clubTheme.primary" (click)="saveChanges()" [disabled]="isSaving">
                <span class="material-icons">save</span> Guardar Cambios
              </button>
            </div>
          </div>
        </div>
        
        <div class="card progress-card">
          <h3>Progreso del Perfil</h3>
          <p class="text-muted">Completa los datos en las otras pestañas para llegar al 100%.</p>
          <div class="progress-bar-container" style="background:#e2e8f0; border-radius:8px; height:20px; overflow:hidden; position:relative; margin-top:1rem;">
            <div class="progress-bar-fill" [style.width.%]="calculateProgress()" 
                 [style.background]="calculateProgress() === 100 ? '#22c55e' : clubTheme.primary"
                 style="height: 100%; transition: width 0.5s ease; position:relative;">
               <span style="position:absolute; right:10px; top:50%; transform:translateY(-50%); color:white; font-size:0.75rem; font-weight:bold;">{{ calculateProgress() }}%</span>
            </div>
          </div>
        </div>

      </div>
    }
  `,
  styles: [`
    .summary-container { display: flex; flex-direction: column; gap: 1.5rem; }
    .card { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .card h3 { margin: 0 0 1rem 0; font-size: 1.2rem; color: #1e293b; display: flex; align-items: center; gap: 0.5rem; }
    
    .text-muted { color: #64748b; margin: 0; font-size: 0.9rem; }
    .info-note { background: #f8fafc; color: #334155; padding: 1rem; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: flex-start; gap: 0.8rem; border-left: 4px solid var(--primary-color); }
    .info-note p { margin: 0; }
    
    .two-col-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 600px) { .two-col-grid { grid-template-columns: 1fr; } }
    
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-group label { font-size: 0.85rem; font-weight: 600; color: #475569; }
    input { width: 100%; padding: 10px 15px; border: 2px solid transparent; border-radius: 8px; background: #f1f5f9; color: #1e293b; font-size: 0.95rem; font-family: inherit; transition: all 0.2s; box-sizing: border-box;}
    input:focus { outline: none; border-color: var(--primary-color, #0f172a); background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    
    .btn-save { color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; transition: transform 0.2s; }
    .btn-save:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    .btn-save:disabled { opacity: 0.7; cursor: not-allowed; }
  `]
})
export class DogSummaryComponent {
  dogState = inject(DogStateService);
  dogService = inject(DogService);
  toast = inject(ToastService);
  
  dog = this.dogState.getDog();
  clubTheme = environment.clubConfig.colors;
  
  formData = {
    name: this.dog()?.name || '',
    breed: this.dog()?.breed || '',
    birth_date: this.dog()?.birth_date ? this.dog()!.birth_date!.split('T')[0] : ''
  };
  
  isSaving = false;

  calculateProgress(): number {
    const currentDog = this.dog();
    if (!currentDog) return 0;
    let completed = 0;
    const directFields = ['name', 'photo_url', 'breed', 'birth_date', 'microchip', 'pedigree'];
    const pivotFields = ['rsce_license', 'rsce_expiration_date'];
    
    directFields.forEach(field => {
      if ((currentDog as any)[field]) completed++;
    });
    
    pivotFields.forEach(field => {
      if ((currentDog.pivot as any)?.[field]) completed++;
    });

    const totalFields = directFields.length + pivotFields.length;
    return Math.round((completed / totalFields) * 100);
  }

  async saveChanges() {
    const currentDog = this.dog();
    if (!currentDog) return;
    
    if (!this.formData.name.trim()) {
      this.toast.error('El nombre es obligatorio');
      return;
    }
    
    this.isSaving = true;
    try {
      const payload = {
        ...currentDog,
        name: this.formData.name,
        breed: this.formData.breed || null,
        birth_date: this.formData.birth_date || null
      };

      const updated = await this.dogService.updateDog(currentDog.id, payload as any);
      this.dogState.setDog(updated);
      this.toast.success('Datos actualizados');
    } catch(e) {
      this.toast.error('Error al actualizar');
    } finally {
      this.isSaving = false;
    }
  }
}
