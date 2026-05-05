import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DogStateService } from '../../services/dog-state.service';
import { ToastService } from '../../../../services/toast.service';
import { DogService } from '../../../../services/dog.service';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../services/auth.service';

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
              <input type="text" [(ngModel)]="formData.microchip" (ngModelChange)="checkChanges()" placeholder="Número de 15 dígitos">
            </div>
            <div class="form-group">
              <label>Pedigree / LOE</label>
              <input type="text" [(ngModel)]="formData.pedigree" (ngModelChange)="checkChanges()" placeholder="Ej. LOE-0000000">
            </div>
          </div>

          <!-- Licencia RSCE -->
          <div class="doc-card rsce-card">
            <div class="doc-header">
              <span class="material-icons-outlined">military_tech</span>
              <h3>RSCE</h3>
            </div>
            <div class="form-group">
              <label>Nº Licencia</label>
              <input type="text" [(ngModel)]="formData.rsce_license" (ngModelChange)="checkChanges()">
            </div>
            <div class="form-group">
              <label>Caducidad</label>
              <input type="date" [(ngModel)]="formData.rsce_expiration_date" (ngModelChange)="checkChanges()" class="date-input">
            </div>
            <div class="form-group">
              <label>Grado Actual</label>
              <select [(ngModel)]="formData.rsce_grade" (ngModelChange)="checkChanges()">
                <option value="">-- No definido --</option>
                <option value="0">Grado 0</option>
                <option value="1">Grado I</option>
                <option value="2">Grado II</option>
                <option value="3">Grado III</option>
              </select>
            </div>
            <div class="form-group">
              <label>Categoría</label>
              <select [(ngModel)]="formData.rsce_category" (ngModelChange)="checkChanges()">
                <option value="">-- No definido --</option>
                <option value="S">Mini / Small (S) - &lt;35cm</option>
                <option value="M">Midi / Medium (M) - 35cm a 42.99cm</option>
                <option value="I">Intermediate (I) - 43cm a 47.99cm</option>
                <option value="L">Standard / Large (L) - &ge;48cm</option>
              </select>
              <small class="help-text" style="color: #64748b;">Métrica autocálculada por la FCI en base a la altura introducida en la pestaña de Entrenamiento. Puedes modificarla si es necesario.</small>
            </div>
            <div class="form-group" style="margin-top: 0.5rem; padding-top: 1rem; border-top: 1px dashed #cbd5e1;">
              <label>Categoría del Guía (RSCE)</label>
              <select [(ngModel)]="formData.rsce_handler_category" (ngModelChange)="checkChanges()">
                <option value="">-- No definido --</option>
                <option value="J12">J12 (Menor de 12 años)</option>
                <option value="J15">J15 (12 a 14 años)</option>
                <option value="J19">J19 (15 a 18 años)</option>
                <option value="Absoluta">Absoluta (19 a 54 años)</option>
                <option value="S55">S55 (55 a 64 años)</option>
                <option value="S65">S65 (Mayor de 65 años)</option>
              </select>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 4px;">
                <small class="help-text" style="color: #64748b; flex: 1;">Según año nacimiento.</small>
                <button (click)="calculateHandlerCategory()" class="reset-btn" style="color: var(--primary-color, #3b82f6); background: none; font-size: 0.8rem; padding: 0; font-weight: 600;">Autocalcular</button>
              </div>
            </div>
          </div>

          <!-- Licencia RFEC -->
          <div class="doc-card rfec-card">
            <div class="doc-header">
              <span class="material-icons-outlined">pets</span>
              <h3>RFEC</h3>
            </div>
            <div class="form-group">
              <label>Grado Actual</label>
              <select [(ngModel)]="formData.rfec_grade" (ngModelChange)="checkChanges()">
                <option value="">-- No definido --</option>
                <option value="Iniciación">Iniciación</option>
                <option value="Promoción">Promoción</option>
                <option value="Competición">Competición</option>
              </select>
            </div>
            <div class="form-group">
              <label>Clase (Categoría de Altura)</label>
              <select [(ngModel)]="formData.rfec_category" (ngModelChange)="checkChanges()">
                <option value="">-- No definido --</option>
                <option value="20">Clase 20 (&lt;28cm)</option>
                <option value="30">Clase 30 (28cm - 34.99cm)</option>
                <option value="40">Clase 40 (35cm - 42.99cm)</option>
                <option value="50">Clase 50 (43cm - 50.99cm)</option>
                <option value="60">Clase 60 (&ge;51cm)</option>
              </select>
              <small class="help-text" style="color: #64748b;">Sugerida por altura, puedes modificarla.</small>
            </div>
          </div>
        </div>
      </div>
      
      @if (hasChanges) {
        <div class="floating-save-bar pop-in">
          <div class="save-bar-content">
            <button class="reset-btn" (click)="resetForm()">Descartar</button>
            <button class="save-btn" [disabled]="isSaving" (click)="saveChanges()" [style.background]="'var(--primary-color)'">
              <div class="btn-content">
                @if (!isSaving) { <span class="material-icons">save</span> }
                @if (isSaving) { <span class="material-icons spinner-small">sync</span> }
                <span>@if (isSaving) { Guardando... } @else { Guardar Cambios }</span>
              </div>
            </button>
          </div>
        </div>
      }
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
export class DogDocsComponent {
  dogState = inject(DogStateService);
  dogService = inject(DogService);
  toast = inject(ToastService);
  authService = inject(AuthService);
  
  dog = this.dogState.getDog();
  clubTheme = environment.clubConfig.colors;
  
  formData = {
    microchip: this.dog()?.microchip || '',
    pedigree: this.dog()?.pedigree || '',
    rsce_license: this.dog()?.pivot?.rsce_license || '',
    rsce_expiration_date: this.dog()?.pivot?.rsce_expiration_date ? this.dog()!.pivot!.rsce_expiration_date!.split('T')[0] : '',
    rsce_grade: this.dog()?.pivot?.rsce_grade || '',
    rsce_handler_category: this.dog()?.pivot?.rsce_handler_category || '',
    rsce_category: this.dog()?.rsce_category || this.getAutoRsceCategory(),
    rfec_grade: this.dog()?.rfec_grade || '',
    rfec_category: this.dog()?.rfec_category || this.getAutoRfecCategory()
  };
  initialData = { ...this.formData };
  
  isSaving = false;
  hasChanges = false;
  
  checkChanges() {
    this.hasChanges = JSON.stringify(this.formData) !== JSON.stringify(this.initialData);
  }
  
  resetForm() {
    this.formData = { ...this.initialData };
    this.hasChanges = false;
  }

  getAutoRsceCategory(): string {
    const dog = this.dog();
    if (!dog?.height_cm) return '';
    if (dog.height_cm < 35) return 'S';
    if (dog.height_cm < 43) return 'M';
    if (dog.height_cm < 48) return 'I';
    return 'L';
  }

  getAutoRfecCategory(): string {
    const dog = this.dog();
    if (!dog?.height_cm) return '';
    if (dog.height_cm < 28) return '20';
    if (dog.height_cm < 35) return '30';
    if (dog.height_cm < 43) return '40';
    if (dog.height_cm < 51) return '50';
    return '60';
  }

  calculateHandlerCategory() {
    const user = this.authService.currentUserSignal();
    if (!user?.birth_year) {
      this.toast.error('Primero debes configurar tu Año de Nacimiento en Mi Perfil');
      return;
    }
    const age = new Date().getFullYear() - user.birth_year;
    let newCategory = '';
    if (age < 12) newCategory = 'J12';
    else if (age >= 12 && age <= 14) newCategory = 'J15';
    else if (age >= 15 && age <= 18) newCategory = 'J19';
    else if (age >= 19 && age <= 54) newCategory = 'Absoluta';
    else if (age >= 55 && age <= 64) newCategory = 'S55';
    else if (age >= 65) newCategory = 'S65';

    this.formData.rsce_handler_category = newCategory;
    this.checkChanges();
    this.toast.success('Categoría de guía RSCE calculada');
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
        rsce_grade: this.formData.rsce_grade || null,
        rsce_handler_category: this.formData.rsce_handler_category || null,
        rsce_category: this.formData.rsce_category || null,
        rfec_grade: this.formData.rfec_grade || null,
        rfec_category: this.formData.rfec_category || null
      };

      const updated = await this.dogService.updateDog(currentDog.id, payload as any);
      this.dogState.setDog(updated);
      this.initialData = { ...this.formData };
      this.hasChanges = false;
      this.toast.success('Documentos actualizados');
    } catch(e) {
      this.toast.error('Error al guardar documentos');
    } finally {
      this.isSaving = false;
    }
  }
}
