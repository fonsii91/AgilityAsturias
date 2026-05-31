import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReservationService } from '../../../services/reservation.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { TenantService } from '../../../services/tenant.service';
import { BountyService } from '../../../services/bounty.service';

@Component({
    selector: 'app-seasons-manager',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './seasons-manager.component.html',
    styleUrls: ['./seasons-manager.component.css']
})
export class SeasonsManagerComponent {
    private reservationService = inject(ReservationService);
    private bountyService = inject(BountyService);
    private toastService = inject(ToastService);
    private router = inject(Router);
    tenantService = inject(TenantService);
    authService = inject(AuthService);

    @Input() isOpen = false;
    @Input() activeSeason: any = null;
    @Input() activeSeasonStats: any = null;
    @Input() seasons: any[] = [];
    @Input() bountyBoardEnabled = false;

    @Output() close = new EventEmitter<void>();
    @Output() seasonChanged = new EventEmitter<void>();

    isSubmitting = false;

    onOverlayClick(event: MouseEvent) {
        this.close.emit();
    }

    onContentClick(event: MouseEvent) {
        event.stopPropagation();
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

    manageSeasons() {
        this.close.emit();
        this.router.navigate(['/admin/temporadas']);
    }
}
