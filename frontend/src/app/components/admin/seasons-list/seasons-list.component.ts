import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ReservationService } from '../../../services/reservation.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-seasons-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './seasons-list.component.html',
    styleUrls: ['./seasons-list.component.css']
})
export class SeasonsListComponent implements OnInit {
    private reservationService = inject(ReservationService);
    private toastService = inject(ToastService);
    private router = inject(Router);
    authService = inject(AuthService);

    seasons = signal<any[]>([]);
    isLoading = signal<boolean>(true);
    isSubmitting = false;

    // Edit state
    editingSeasonId: number | null = null;
    editForm = {
        name: '',
        start_date: '',
        end_date: ''
    };

    // Delete state
    deletingSeasonId: number | null = null;

    ngOnInit(): void {
        if (!this.authService.isManager()) {
            this.toastService.error('No tienes permisos para acceder a esta sección');
            this.router.navigate(['/ranking']);
            return;
        }
        this.loadSeasons();
    }

    loadSeasons() {
        this.isLoading.set(true);
        this.reservationService.getSeasons().subscribe({
            next: (data) => {
                this.seasons.set(data);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading seasons', err);
                this.toastService.error('Error al cargar el historial de temporadas');
                this.isLoading.set(false);
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
                this.loadSeasons();
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
                this.loadSeasons();
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
                this.loadSeasons();
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
