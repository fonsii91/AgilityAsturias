import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DogService } from '../../../services/dog.service';
import { ToastService } from '../../../services/toast.service';
import { ImageCompressorService } from '../../../services/image-compressor.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-dog-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="form-container fade-in">
      <div class="form-header">
        <button class="back-btn" routerLink="/gestionar-perros">
          <span class="material-icons-outlined">arrow_back</span> Cancelar
        </button>
        <h2>Registrar Nuevo Perro</h2>
        <p>Añade a tu compañero canino para gestionar sus entrenamientos y documentos.</p>
      </div>

      <div class="form-card glass-effect" [style.border-top]="'4px solid ' + clubTheme.primary">
        
        <div class="info-note" [style.border-left-color]="clubTheme.primary">
          <span class="material-icons-outlined" [style.color]="clubTheme.primary">info</span>
          <p>El <strong>Nombre</strong> es el único dato obligatorio para crear el perfil. Podrás añadir el resto de información (microchip, vacunas) más adelante.</p>
        </div>

        <div class="photo-section">
          <div class="photo-preview-wrapper" [class.no-photo]="!previewUrl()">
            @if (isUploadingPhoto()) {
              <div class="upload-overlay">
                <span class="material-icons-outlined spinner">sync</span>
              </div>
            }
            @if (previewUrl()) {
              <img [src]="previewUrl()" alt="Previsualización" class="dog-preview-img">
            } @else {
              <span class="material-icons-outlined placeholder-icon">add_a_photo</span>
            }
            <label class="camera-floating-btn" title="Subir foto" [style.background]="clubTheme.primary">
              <span class="material-icons">camera_alt</span>
              <input type="file" (change)="onFileSelected($event)" accept="image/*" hidden>
            </label>
          </div>
          <p class="photo-help-text">Sube una foto cuadrada (Opcional)</p>
        </div>

        <div class="two-col-grid">
          <div class="form-group required">
            <label>Nombre del Perro</label>
            <div class="input-with-icon">
              <span class="material-icons-outlined input-icon">badge</span>
              <input type="text" [(ngModel)]="formData.name" placeholder="P. ej. Toby">
            </div>
          </div>

          <div class="form-group">
            <label>Raza</label>
            <div class="input-with-icon">
              <span class="material-icons-outlined input-icon">category</span>
              <input type="text" [(ngModel)]="formData.breed" placeholder="Si es mestizo, indícalo">
            </div>
          </div>

          <div class="form-group full-width">
            <label>Fecha de Nacimiento</label>
            <input type="date" [(ngModel)]="formData.birth_date">
          </div>
        </div>
        
        <div class="form-actions">
          <button class="btn-save" [style.background]="clubTheme.primary" (click)="saveDog()" [disabled]="!formData.name.trim() || isSaving()">
            <span class="material-icons">pets</span> {{ isSaving() ? 'Registrando...' : 'Registrar Perro' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fade-in { animation: fadeIn 0.4s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    
    .form-container { max-width: 800px; margin: 2rem auto; padding: 0 1rem; display: flex; flex-direction: column; gap: 1.5rem; }
    
    .form-header { text-align: center; margin-bottom: 1rem; }
    .form-header h2 { margin: 1rem 0 0.5rem 0; font-size: 2rem; color: #1e293b; }
    .form-header p { color: #64748b; margin: 0; }
    
    .back-btn { background: transparent; border: none; color: #64748b; font-weight: 600; font-size: 0.95rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; transition: color 0.2s; }
    .back-btn:hover { color: #0f172a; }
    
    .form-card { background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    
    .info-note { background: #f8fafc; color: #334155; padding: 1rem; border-radius: 8px; font-size: 0.95rem; display: flex; align-items: flex-start; gap: 0.8rem; border-left: 4px solid var(--primary-color); margin-bottom: 2rem; }
    .info-note p { margin: 0; line-height: 1.5; }
    
    .photo-section { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; margin-bottom: 2.5rem; }
    .photo-preview-wrapper { width: 120px; height: 120px; border-radius: 50%; background: white; border: 4px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; position: relative; transition: transform 0.2s; }
    .photo-preview-wrapper:hover { transform: translateY(-2px); }
    .photo-preview-wrapper.no-photo { background: #f8fafc; border: 2px dashed #cbd5e1; box-shadow: none; }
    .dog-preview-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
    .placeholder-icon { font-size: 3rem; color: #94a3b8; }
    
    .upload-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; border-radius: 50%; z-index: 2; }
    .spinner { animation: spin 1s linear infinite; color: var(--primary-color, #0f172a); }
    
    .camera-floating-btn { position: absolute; bottom: 0; right: 0; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid white; transition: transform 0.2s; }
    .camera-floating-btn:hover { transform: scale(1.1); }
    .camera-floating-btn .material-icons { font-size: 18px; }
    .photo-help-text { font-size: 0.85rem; color: #64748b; margin: 0.5rem 0 0 0; }
    
    .two-col-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    @media (max-width: 600px) { .two-col-grid { grid-template-columns: 1fr; } }
    
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-group.full-width { grid-column: 1 / -1; }
    .form-group label { font-size: 0.9rem; font-weight: 600; color: #475569; }
    .form-group.required label::after { content: '*'; color: #ef4444; margin-left: 2px; }
    
    .input-with-icon { position: relative; }
    .input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 20px; pointer-events: none; }
    .input-with-icon input { padding-left: 42px; }
    
    input { width: 100%; padding: 12px 15px; border: 2px solid transparent; border-radius: 10px; background: #f1f5f9; color: #1e293b; font-size: 1rem; font-family: inherit; transition: all 0.2s; box-sizing: border-box; }
    input:focus { outline: none; border-color: var(--primary-color, #0f172a); background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    
    .form-actions { margin-top: 2rem; display: flex; justify-content: center; }
    .btn-save { color: white; border: none; padding: 1rem 2.5rem; border-radius: 30px; font-weight: 600; font-size: 1.1rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    .btn-save:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0,0,0,0.15); }
    .btn-save:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }
  `]
})
export class DogFormComponent {
  dogService = inject(DogService);
  toast = inject(ToastService);
  router = inject(Router);
  imageCompressor = inject(ImageCompressorService);
  
  clubTheme = environment.clubConfig.colors;

  formData = {
    name: '',
    breed: '',
    birth_date: ''
  };

  selectedFile: File | null = null;
  previewUrl = signal<string | null>(null);
  isUploadingPhoto = signal(false);
  isSaving = signal(false);

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      try {
        this.isUploadingPhoto.set(true);
        const compressedFile = await this.imageCompressor.compress(file);
        this.selectedFile = compressedFile;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.previewUrl.set(e.target?.result as string);
          this.isUploadingPhoto.set(false);
        };
        reader.readAsDataURL(compressedFile);
      } catch (e) {
        this.toast.error('Error procesando la foto');
        this.isUploadingPhoto.set(false);
      }
    }
  }

  async saveDog() {
    if (!this.formData.name.trim()) return;
    
    this.isSaving.set(true);
    try {
      const payload = {
        name: this.formData.name,
        breed: this.formData.breed?.trim() || null,
        birth_date: this.formData.birth_date || null
      };

      const newDog = await this.dogService.addDog(payload as any);
      
      if (this.selectedFile) {
        await this.dogService.updateDogPhoto(newDog.id, this.selectedFile);
      }
      
      this.toast.success('Perro registrado');
      // Reload user dogs locally so DogService keeps it
      await this.dogService.loadUserDogs();
      this.router.navigate(['/gestionar-perros']);
      
    } catch(err: any) {
      console.error(err);
      let errorMsg = 'Error al registrar';
      if (err.error?.errors) {
        errorMsg = err.error.errors[Object.keys(err.error.errors)[0]][0];
      }
      this.toast.error(errorMsg);
    } finally {
      this.isSaving.set(false);
    }
  }
}
