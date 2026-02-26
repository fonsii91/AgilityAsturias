import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReservationService } from '../../services/reservation.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-ranking',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './ranking.component.html',
    styleUrls: ['./ranking.component.css']
})
export class RankingComponent {
    private reservationService = inject(ReservationService);
    authService = inject(AuthService);

    ranking = signal<any[]>([]);
    isLoading = signal(true);
    lightboxOpen = signal(false);
    currentImage = signal('');

    constructor() {
        this.loadRanking();
    }

    loadRanking() {
        this.reservationService.getRanking().subscribe({
            next: (data) => {
                this.ranking.set(data);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading ranking', err);
                this.isLoading.set(false);
            }
        });
    }

    getMedal(index: number): string {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return '';
    }

    openLightbox(imageUrl: string) {
        if (imageUrl) {
            this.currentImage.set(imageUrl);
            this.lightboxOpen.set(true);
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        }
    }

    closeLightbox() {
        this.lightboxOpen.set(false);
        this.currentImage.set('');
        document.body.style.overflow = 'auto'; // Restore scrolling
    }
}
