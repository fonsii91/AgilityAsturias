import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DogStateService } from '../../services/dog-state.service';
import { AuthService } from '../../../../services/auth.service';
import { DogService } from '../../../../services/dog.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
  selector: 'app-dog-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (dog()) {
      <div class="settings-container fade-in">
        
        <div class="danger-zone-card">
          <div class="dz-header">
            <span class="material-icons-outlined">warning</span>
            <h3>{{ isPrimaryOwner() ? 'Zona de Peligro' : 'Renunciar al acceso' }}</h3>
          </div>
          
          <div class="dz-body">
            <p>
              @if (isPrimaryOwner()) {
                <strong>Atención:</strong> Eliminar el perfil es una acción destructiva e irremediable. Borrará todo el historial, participaciones y métricas vinculadas a <strong>{{ dog()?.name }}</strong> en el sistema.
              } @else {
                <strong>Atención:</strong> Al desvincularte, dejarás de tener acceso al perfil de <strong>{{ dog()?.name }}</strong>. El animal seguirá existiendo en el sistema para el dueño original.
              }
            </p>

            <div class="action-btn-container">
              <button class="btn-danger-outline" (click)="promptDelete()">
                <span class="material-icons-outlined">{{ isPrimaryOwner() ? 'delete_forever' : 'person_remove' }}</span>
                {{ isPrimaryOwner() ? 'Eliminar a ' : 'Desvincularme de ' }} {{ dog()?.name }}
              </button>
            </div>
          </div>
        </div>

        <!-- Confirm Modal -->
        @if (deleteModalOpen()) {
          <div class="modal-overlay" (click)="closeDeleteModal()">
            <div class="modal-content delete-modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3 class="danger-title">{{ isPrimaryOwner() ? '¿Eliminar a ' : '¿Desvincularme de ' }}{{ dog()?.name }}?</h3>
                <button class="close-btn" (click)="closeDeleteModal()">&times;</button>
              </div>
              
              <div class="modal-body">
                @if (isPrimaryOwner()) {
                  <p>Estás a punto de borrar todos los datos de este perro. Esta acción <strong>no tiene marcha atrás</strong>.</p>
                } @else {
                  <p>Perderás el acceso localmente, pero el dueño original mantendrá el perro intacto.</p>
                }

                <div class="delete-confirm-input">
                  <label>Escribe <strong>"{{ isPrimaryOwner() ? 'BORRAR' : 'DESVINCULAR' }}"</strong> para confirmar:</label>
                  <input type="text" [(ngModel)]="deleteConfirmText"
                    [placeholder]="isPrimaryOwner() ? 'BORRAR' : 'DESVINCULAR'">
                </div>
              </div>
              
              <div class="modal-actions">
                <button class="btn-cancel" (click)="closeDeleteModal()">Cancelar</button>
                <button class="btn-confirm-delete" (click)="confirmDelete()"
                  [disabled]="deleteConfirmText() !== (isPrimaryOwner() ? 'BORRAR' : 'DESVINCULAR')">
                  {{ isPrimaryOwner() ? 'Sí, Eliminar Definitivamente' : 'Sí, Desvincularme del Perro' }}
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .fade-in { animation: fadeIn 0.4s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    
    .settings-container { display: flex; flex-direction: column; gap: 1.5rem; }
    
    .danger-zone-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 1.5rem; }
    .dz-header { display: flex; align-items: center; gap: 0.8rem; color: #b91c1c; margin-bottom: 1rem; }
    .dz-header h3 { margin: 0; font-size: 1.3rem; }
    .dz-header .material-icons-outlined { font-size: 1.8rem; }
    
    .dz-body p { margin: 0 0 1.5rem 0; color: #991b1b; font-size: 0.95rem; line-height: 1.6; }
    
    .btn-danger-outline { background: white; color: #ef4444; border: 2px solid #fecaca; padding: 0.8rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
    .btn-danger-outline:hover { background: #fef2f2; border-color: #ef4444; transform: translateY(-2px); box-shadow: 0 4px 6px rgba(239,68,68,0.1); }
    
    /* Modal styles */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal-content { background: white; border-radius: 12px; overflow: hidden; max-width: 450px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    @keyframes scaleUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
    
    .modal-header { padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
    .danger-title { margin: 0; color: #ef4444; font-size: 1.2rem; display: flex; align-items: center; gap: 0.5rem; }
    .close-btn { background: transparent; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; transition: background 0.2s; }
    .close-btn:hover { background: #e2e8f0; color: #334155; }
    
    .modal-body { padding: 1.5rem; }
    .modal-body p { margin-top: 0; color: #475569; font-size: 0.95rem; line-height: 1.5; }
    
    .delete-confirm-input { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .delete-confirm-input label { font-size: 0.85rem; color: #334155; }
    .delete-confirm-input input { width: 100%; padding: 10px 15px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 1rem; box-sizing: border-box;}
    .delete-confirm-input input:focus { outline: none; border-color: #ef4444; }
    
    .modal-actions { padding: 1.5rem; background: #f8fafc; display: flex; justify-content: flex-end; gap: 1rem; border-top: 1px solid #f1f5f9; }
    .btn-cancel { background: white; border: 1px solid #cbd5e1; color: #64748b; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-cancel:hover { background: #f1f5f9; color: #334155; }
    
    .btn-confirm-delete { background: #ef4444; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    .btn-confirm-delete:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-confirm-delete:not(:disabled):active { transform: scale(0.98); }
  `]
})
export class DogSettingsComponent {
  dogState = inject(DogStateService);
  authService = inject(AuthService);
  dogService = inject(DogService);
  toast = inject(ToastService);
  router = inject(Router);
  
  dog = this.dogState.getDog();

  deleteModalOpen = signal(false);
  deleteConfirmText = signal('');

  isPrimaryOwner(): boolean {
    const dog = this.dog();
    const currUserId = this.authService.currentUserSignal()?.id;
    if (!dog || !currUserId) return false;
    const me = dog.users?.find(u => u.id === currUserId);
    return !!me?.pivot?.is_primary_owner;
  }

  promptDelete() {
    this.deleteModalOpen.set(true);
    this.deleteConfirmText.set('');
  }

  closeDeleteModal() {
    this.deleteModalOpen.set(false);
    this.deleteConfirmText.set('');
  }

  async confirmDelete() {
    const dog = this.dog();
    if (!dog) return;

    try {
      await this.dogService.deleteDog(dog.id);
      if (this.isPrimaryOwner()) {
        this.toast.success(`Perfil de ${dog.name} borrado`);
      } else {
        this.toast.success(`Te has desvinculado de ${dog.name}`);
      }
      this.closeDeleteModal();
      this.dogState.clear();
      this.router.navigate(['/gestionar-perros']);
      
      // Actualizar listado en DogService
      await this.dogService.loadUserDogs();
    } catch (e) {
      this.toast.error('No se pudo borrar el perro');
    }
  }
}
