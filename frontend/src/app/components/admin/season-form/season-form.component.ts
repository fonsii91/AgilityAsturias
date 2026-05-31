import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ReservationService } from '../../../services/reservation.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-season-form',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './season-form.component.html',
    styleUrls: ['./season-form.component.css']
})
export class SeasonFormComponent implements OnInit {
    private reservationService = inject(ReservationService);
    private toastService = inject(ToastService);
    private router = inject(Router);
    authService = inject(AuthService);

    activeSeason: any = null;
    isSubmitting = false;

    // Form inputs for starting a new season
    newSeasonName = '';
    newSeasonType = 'ranking';
    newSeasonStartDate = new Date().toISOString().substring(0, 10);

    ngOnInit(): void {
        if (!this.authService.isManager()) {
            this.toastService.error('No tienes permisos para acceder a esta sección');
            this.router.navigate(['/ranking']);
            return;
        }
        this.loadActiveSeason();
    }

    loadActiveSeason() {
        this.reservationService.getSeasons().subscribe({
            next: (data) => {
                const active = data.find((s: any) => s.status === 'active');
                this.activeSeason = active || null;
            },
            error: (err) => {
                console.error('Error loading seasons', err);
            }
        });
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
                this.isSubmitting = false;
                this.router.navigate(['/admin/temporadas']);
            },
            error: (err) => {
                console.error('Error starting season', err);
                this.isSubmitting = false;
                const errMsg = err.error?.message || 'Error al iniciar la temporada';
                this.toastService.error(errMsg);
            }
        });
    }
}
