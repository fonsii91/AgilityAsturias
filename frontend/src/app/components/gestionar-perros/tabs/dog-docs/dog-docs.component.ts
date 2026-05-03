import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DogStateService } from '../../services/dog-state.service';
import { ToastService } from '../../../../services/toast.service';
import { DogService } from '../../../../services/dog.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-dog-docs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (dog()) {
      <div class="docs-container fade-in">
        <div class="info-note" style="border-left-color: var(--primary-color);">
          <span class="material-icons-outlined" style="color: var(--primary-color);">lock</span>
          <p>
            Tus números de Microchip, LOE y Licencias jamás se muestran al público. Se guardan encriptados y son confidenciales.
            Añade caducidades para recibir alertas antes de que expiren.
          </p>
        </div>

        <div class="docs-grid">
          <!-- Identificación Básica -->
          <div class="doc-card">
            <div class="doc-header">
              <span class="material-icons-outlined">fingerprint</span>
              <h3>Identificación</h3>
            </div>
            <div class="form-group">
              <label>Microchip</label>
              <input type="text" [(ngModel)]="formData.microchip" placeholder="Número de 15 dígitos">
            </div>
            <div class="form-group">
              <label>Pedigree / LOE</label>
              <input type="text" [(ngModel)]="formData.pedigree" placeholder="Ej. LOE-0000000">
            </div>
          </div>

          <!-- Licencia RSCE -->
          <div class="doc-card rsce-card">
            <div class="doc-header">
              <span class="material-icons-outlined">military_tech</span>
              <h3>Licencia RSCE</h3>
            </div>
            <div class="form-group">
              <label>Nº Licencia</label>
              <input type="text" [(ngModel)]="formData.rsce_license">
            </div>
            <div class="form-group">
              <label>Caducidad</label>
              <input type="date" [(ngModel)]="formData.rsce_expiration_date" class="date-input">
            </div>
            <div class="form-group">
              <label>Grado Actual</label>
              <select [(ngModel)]="formData.rsce_grade">
                <option value="">-- No definido --</option>
                <option value="0">Grado 0</option>
                <option value="1">Grado I</option>
                <option value="2">Grado II</option>
                <option value="3">Grado III</option>
              </select>
            </div>
            <div class="form-group">
              <label>Categoría</label>
              <input type="text" [value]="calculatedCategory" disabled style="background-color: #e2e8f0; color: #64748b; font-weight: 600; border: 1px solid #cbd5e1;">
              <small class="help-text" style="color: #64748b;">Métrica autocálculada por la FCI en base a la altura introducida en la pestaña de Entrenamiento.</small>
            </div>
          </div>
        </div>
        
        <div class="form-actions" style="margin-top: 1.5rem; text-align: right;">
          <button class="btn-save" style="background: var(--primary-color);" (click)="saveChanges()" [disabled]="isSaving">
            <span class="material-icons">save</span> Guardar Documentos
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .fade-in { animation: fadeIn 0.4s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    
    .docs-container { display: flex; flex-direction: column; gap: 1.5rem; }
    
    .info-note { background: #f8fafc; color: #334155; padding: 1rem; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: flex-start; gap: 0.8rem; border-left: 4px solid var(--primary-color); }
    .info-note p { margin: 0; line-height: 1.5; }
    
    .docs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
    
    .doc-card { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-top: 4px solid #cbd5e1; }
    .doc-card.rsce-card { border-top-color: var(--primary-color, #3b82f6); }
    .doc-card.rfec-card { border-top-color: #10b981; }
    
    .doc-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; color: #1e293b; }
    .doc-header h3 { margin: 0; font-size: 1.2rem; }
    
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    .form-group label { font-size: 0.85rem; font-weight: 600; color: #475569; }
    input, select { width: 100%; padding: 10px 12px; border: 2px solid transparent; border-radius: 8px; background: #f1f5f9; color: #1e293b; font-size: 0.95rem; font-family: inherit; transition: all 0.2s; box-sizing: border-box;}
    input:focus, select:focus { outline: none; border-color: var(--primary-color, #0f172a); background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    
    .btn-save { color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; transition: transform 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    .btn-save:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0,0,0,0.15); }
    .btn-save:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
  `]
})
export class DogDocsComponent {
  dogState = inject(DogStateService);
  dogService = inject(DogService);
  toast = inject(ToastService);
  
  dog = this.dogState.getDog();
  clubTheme = environment.clubConfig.colors;
  
  formData = {
    microchip: this.dog()?.microchip || '',
    pedigree: this.dog()?.pedigree || '',
    rsce_license: this.dog()?.pivot?.rsce_license || '',
    rsce_expiration_date: this.dog()?.pivot?.rsce_expiration_date ? this.dog()!.pivot!.rsce_expiration_date!.split('T')[0] : '',
    rsce_grade: this.dog()?.pivot?.rsce_grade || ''
  };
  
  isSaving = false;

  get calculatedCategory(): string {
    const dog = this.dog();
    if (!dog?.height_cm) return 'Falta altura (Ir a Entrenamiento)';
    if (dog.height_cm < 35) return 'Mini / Small (S) - ' + dog.height_cm + 'cm';
    if (dog.height_cm < 43) return 'Midi / Medium (M) - ' + dog.height_cm + 'cm';
    if (dog.height_cm < 48) return 'Intermediate (I) - ' + dog.height_cm + 'cm';
    return 'Standard / Large (L) - ' + dog.height_cm + 'cm';
  }

  async saveChanges() {
    const currentDog = this.dog();
    if (!currentDog) return;
    
    this.isSaving = true;
    try {
      const payload = {
        ...currentDog,
        microchip: this.formData.microchip || null,
        pedigree: this.formData.pedigree || null,
        rsce_license: this.formData.rsce_license || null,
        rsce_expiration_date: this.formData.rsce_expiration_date || null,
        rsce_grade: this.formData.rsce_grade || null
      };

      const updated = await this.dogService.updateDog(currentDog.id, payload as any);
      this.dogState.setDog(updated);
      this.toast.success('Documentos actualizados');
    } catch(e) {
      this.toast.error('Error al guardar documentos');
    } finally {
      this.isSaving = false;
    }
  }
}
