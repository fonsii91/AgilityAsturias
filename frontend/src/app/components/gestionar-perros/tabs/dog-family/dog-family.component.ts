import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DogStateService } from '../../services/dog-state.service';
import { AuthService } from '../../../../services/auth.service';
import { DogService } from '../../../../services/dog.service';
import { ToastService } from '../../../../services/toast.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-dog-family',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (dog()) {
      <div class="family-container fade-in">
        <div class="info-note" [style.border-left-color]="clubTheme.primary">
          <span class="material-icons-outlined" [style.color]="clubTheme.primary">info</span>
          <p>
            Invita a otras personas introduciendo el email con el que se han registrado en la web.
            Podrán ver la ficha de tu perro y usarla para apuntarse a clases.
          </p>
        </div>

        <div class="card share-card">
          <h3><span class="material-icons-outlined">person_add</span> Vincular a un nuevo usuario</h3>
          <div class="input-group-action">
            <input type="email" [(ngModel)]="shareEmail" placeholder="Email del usuario dado de alta">
            <button class="btn-primary" [style.background]="clubTheme.primary" (click)="shareDog()" [disabled]="!shareEmail().trim()">
              Compartir
            </button>
          </div>
        </div>

        <div class="card users-card">
          <h3><span class="material-icons-outlined">group</span> Tienen acceso actual</h3>
          
          <div class="owners-list">
            @for(owner of dog()?.users; track owner.id) {
              <div class="user-chip">
                <div class="user-chip-avatar" [style.background]="clubTheme.primary">
                  {{ owner.name.substring(0,2).toUpperCase() }}
                </div>
                <div class="user-info">
                  <p class="u-name">
                    {{ owner.name }}
                    @if (owner.pivot?.is_primary_owner) {
                      <span class="badge-primary">Original</span>
                    }
                  </p>
                  <p class="u-email">{{ owner.email }}</p>
                </div>

                <!-- Only primary owner can revoke access of others -->
                @if (isPrimaryOwner() && owner.id !== authService.currentUserSignal()?.id) {
                  <button class="btn-icon-close" (click)="removeShareUser(owner.id, owner.name)" title="Revocar acceso">
                    <span class="material-icons-outlined">person_remove</span>
                  </button>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .fade-in { animation: fadeIn 0.4s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    
    .family-container { display: flex; flex-direction: column; gap: 1.5rem; }
    
    .info-note { background: #f8fafc; color: #334155; padding: 1rem; border-radius: 8px; font-size: 0.9rem; display: flex; align-items: flex-start; gap: 0.8rem; border-left: 4px solid var(--primary-color); }
    .info-note p { margin: 0; line-height: 1.5; }
    
    .card { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .card h3 { margin: 0 0 1rem 0; font-size: 1.2rem; color: #1e293b; display: flex; align-items: center; gap: 0.5rem; }
    
    .input-group-action { display: flex; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    .input-group-action input { flex: 1; border: none; padding: 12px 15px; background: #f1f5f9; font-size: 0.95rem; }
    .input-group-action input:focus { outline: none; background: white; box-shadow: inset 0 0 0 2px var(--primary-color, #0f172a); }
    .input-group-action .btn-primary { border-radius: 0; padding: 0 1.5rem; color: white; border: none; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    .input-group-action .btn-primary:active { opacity: 0.8; }
    .input-group-action .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .owners-list { display: flex; flex-direction: column; gap: 0.8rem; }
    
    .user-chip { display: flex; align-items: center; gap: 1rem; background: #f8fafc; padding: 1rem; border-radius: 10px; border: 1px solid #e2e8f0; transition: transform 0.2s; }
    .user-chip:hover { transform: translateX(4px); }
    
    .user-chip-avatar { width: 42px; height: 42px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; flex-shrink: 0; }
    
    .user-info { flex: 1; }
    .u-name { margin: 0; font-weight: 600; font-size: 1rem; color: #1e293b; display: flex; align-items: center; gap: 0.5rem; }
    .u-email { margin: 0.2rem 0 0 0; font-size: 0.85rem; color: #64748b; }
    
    .badge-primary { font-size: 0.7rem; background: #e2e8f0; color: #475569; padding: 2px 6px; border-radius: 12px; font-weight: 700; text-transform: uppercase; }
    
    .btn-icon-close { background: white; border: 1px solid #fecaca; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #ef4444; transition: all 0.2s; }
    .btn-icon-close:hover { background: #fef2f2; transform: scale(1.05); }
    .btn-icon-close .material-icons-outlined { font-size: 1.2rem; }
  `]
})
export class DogFamilyComponent {
  dogState = inject(DogStateService);
  authService = inject(AuthService);
  dogService = inject(DogService);
  toast = inject(ToastService);
  
  dog = this.dogState.getDog();
  clubTheme = environment.clubConfig.colors;
  shareEmail = signal('');

  isPrimaryOwner(): boolean {
    const dog = this.dog();
    const currUserId = this.authService.currentUserSignal()?.id;
    if (!dog || !currUserId) return false;
    const me = dog.users?.find(u => u.id === currUserId);
    return !!me?.pivot?.is_primary_owner;
  }

  async shareDog() {
    const dog = this.dog();
    const email = this.shareEmail().trim();
    if (!dog || !email) return;

    try {
      const updatedDog = await this.dogService.shareDog(dog.id, email);
      this.dogState.setDog(updatedDog); // Actualiza estado global
      this.toast.success('Perro compartido con ' + email);
      this.shareEmail.set('');
    } catch (error: any) {
      let msj = 'Error al compartir';
      if (error.error?.message) msj = error.error.message;
      this.toast.error(msj);
    }
  }

  async removeShareUser(userId: number, userName: string) {
    const dog = this.dog();
    if (!dog) return;

    if (!confirm(`¿Estás seguro de que quieres revocar el acceso a ${userName}?`)) return;

    try {
      const updatedDog = await this.dogService.removeShare(dog.id, userId);
      this.dogState.setDog(updatedDog);
      this.toast.success(`Acceso de ${userName} revocado exitosamente`);
    } catch (error: any) {
      let msj = 'Error al revocar el acceso';
      if (error.error?.message) msj = error.error.message;
      this.toast.error(msj);
    }
  }
}
