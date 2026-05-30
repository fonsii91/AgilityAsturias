import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReservationService } from '../../../services/reservation.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { TenantService } from '../../../services/tenant.service';
import { BountyService } from '../../../services/bounty.service';

@Component({
    selector: 'app-seasons-manager',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './seasons-manager.component.html',
    styleUrls: ['./seasons-manager.component.css']
})
export class SeasonsManagerComponent {
    private reservationService = inject(ReservationService);
    private bountyService = inject(BountyService);
    private toastService = inject(ToastService);
    tenantService = inject(TenantService);
    authService = inject(AuthService);

    @Input() isOpen = false;
    @Input() activeSeason: any = null;
    @Input() activeSeasonStats: any = null;
    @Input() seasons: any[] = [];
    @Input() bountyBoardEnabled = false;

    @Output() close = new EventEmitter<void>();
    @Output() seasonChanged = new EventEmitter<void>();

    // Form inputs for starting a new season
    newSeasonName = '';
    newSeasonType = 'ranking';
    newSeasonStartDate = new Date().toISOString().substring(0, 10);

    // Edit state
    editingSeasonId: number | null = null;
    editForm = {
        name: '',
        start_date: '',
        end_date: ''
    };

    // Delete state for inline confirmation
    deletingSeasonId: number | null = null;

    // Loading indicators
    isSubmitting = false;

    // Close on overlay click
    onOverlayClick(event: MouseEvent) {
        this.close.emit();
    }

    // Stop propagation to prevent modal close
    onContentClick(event: MouseEvent) {
        event.stopPropagation();
    }

    startNewSeason() {
        if (!this.newSeasonName.trim()) {
            this.toastService.error('Debes introducir un nombre para la temporada');
            return;
        }

        const payload = {
            name: this.newSeasonName,
            gamification_type: this.newSeasonType,
            start_date: this.newSeasonStartDate
        };

        this.isSubmitting = true;
        this.reservationService.startSeason(payload).subscribe({
            next: (res) => {
                this.toastService.success(res.message || 'Nueva temporada iniciada con éxito');
                this.newSeasonName = '';
                this.newSeasonStartDate = new Date().toISOString().substring(0, 10);
                this.isSubmitting = false;
                this.seasonChanged.emit();
            },
            error: (err) => {
                console.error('Error starting season', err);
                this.isSubmitting = false;
                const errMsg = err.error?.message || 'Error al iniciar la temporada';
                this.toastService.error(errMsg);
            }
        });
    }

    endCurrentSeason() {
        if (!confirm('¿Estás seguro de que deseas finalizar la temporada actual? Esto congelará las posiciones y puntuaciones de los perros.')) {
            return;
        }

        this.isSubmitting = true;
        this.reservationService.endSeason().subscribe({
            next: (res) => {
                this.toastService.success(res.message || 'Temporada finalizada con éxito');
                this.isSubmitting = false;
                this.seasonChanged.emit();
            },
            error: (err) => {
                console.error('Error ending season', err);
                this.isSubmitting = false;
                const errMsg = err.error?.message || 'Error al finalizar la temporada';
                this.toastService.error(errMsg);
            }
        });
    }

    toggleBountyBoardState(event: any) {
        const enabled = event.target.checked;
        this.bountyService.toggleBountyBoard(enabled).subscribe({
            next: (res: any) => {
                this.toastService.success(res.message || 'Ajuste de recompensas guardado');
                this.tenantService.reload();
            },
            error: (err: any) => {
                console.error(err);
                this.toastService.error(err.error?.message || 'Error al guardar ajuste de recompensas');
            }
        });
    }

    // Inline edit operations
    startEdit(season: any) {
        this.editingSeasonId = season.id;
        this.editForm = {
            name: season.name,
            start_date: season.start_date ? season.start_date.substring(0, 10) : '',
            end_date: season.end_date ? season.end_date.substring(0, 10) : ''
        };
        this.deletingSeasonId = null; // Clear delete confirmation if editing
    }

    cancelEdit() {
        this.editingSeasonId = null;
    }

    saveEdit(seasonId: number) {
        if (!this.editForm.name.trim()) {
            this.toastService.error('El nombre no puede estar vacío');
            return;
        }
        if (!this.editForm.start_date) {
            this.toastService.error('La fecha de inicio es requerida');
            return;
        }

        const payload = {
            name: this.editForm.name,
            start_date: this.editForm.start_date,
            end_date: this.editForm.end_date || null
        };

        this.isSubmitting = true;
        this.reservationService.updateSeason(seasonId, payload).subscribe({
            next: (res) => {
                this.toastService.success(res.message || 'Temporada actualizada con éxito');
                this.editingSeasonId = null;
                this.isSubmitting = false;
                this.seasonChanged.emit();
            },
            error: (err) => {
                console.error('Error updating season', err);
                this.isSubmitting = false;
                const errMsg = err.error?.message || 'Error al actualizar la temporada';
                this.toastService.error(errMsg);
            }
        });
    }

    // Reopen finished season
    reopenSeason(season: any) {
        if (!confirm(`¿Estás seguro de que deseas reabrir la temporada "${season.name}"? Se cambiará su estado a activa.`)) {
            return;
        }

        this.isSubmitting = true;
        this.reservationService.reopenSeason(season.id).subscribe({
            next: (res) => {
                this.toastService.success(res.message || 'Temporada reabierta con éxito');
                this.isSubmitting = false;
                this.seasonChanged.emit();
            },
            error: (err) => {
                console.error('Error reopening season', err);
                this.isSubmitting = false;
                const errMsg = err.error?.message || 'Error al reabrir la temporada';
                this.toastService.error(errMsg);
            }
        });
    }

    // Delete season operations
    requestDelete(seasonId: number) {
        this.deletingSeasonId = seasonId;
        this.editingSeasonId = null; // Clear edit mode if deleting
    }

    cancelDelete() {
        this.deletingSeasonId = null;
    }

    confirmDelete(seasonId: number) {
        this.isSubmitting = true;
        this.reservationService.deleteSeason(seasonId).subscribe({
            next: (res) => {
                this.toastService.success(res.message || 'Temporada eliminada con éxito');
                this.deletingSeasonId = null;
                this.isSubmitting = false;
                this.seasonChanged.emit();
            },
            error: (err) => {
                console.error('Error deleting season', err);
                this.isSubmitting = false;
                const errMsg = err.error?.message || 'Error al eliminar la temporada';
                this.toastService.error(errMsg);
            }
        });
    }
}
