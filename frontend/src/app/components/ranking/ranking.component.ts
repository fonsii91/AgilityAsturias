import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReservationService } from '../../services/reservation.service';
import { AuthService } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';
import { ToastService } from '../../services/toast.service';
import { FichaPerroComponent } from '../ficha-perro/ficha-perro.component';

@Component({
    selector: 'app-ranking',
    standalone: true,
    imports: [CommonModule, FichaPerroComponent],
    templateUrl: './ranking.component.html',
    styleUrls: ['./ranking.component.css']
})
export class RankingComponent {
    private reservationService = inject(ReservationService);
    authService = inject(AuthService);
    dogService = inject(DogService);
    toastService = inject(ToastService);

    ranking = signal<any[]>([]);
    isLoading = signal(true);
    
    selectedDogModal = signal<any | null>(null);
    fichaModalOpen = signal(false);

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

    openFicha(dog: any) {
        if (dog) {
            this.selectedDogModal.set(dog);
            this.fichaModalOpen.set(true);
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        }
    }

    closeFicha() {
        this.fichaModalOpen.set(false);
        this.selectedDogModal.set(null);
        document.body.style.overflow = 'auto'; // Restore scrolling
    }

    async saveDogFicha(updatedData: any) {
        if (this.selectedDogModal()) {
            const id = this.selectedDogModal().id;
            try {
                await this.dogService.updateDog(id, updatedData);
                this.toastService.success('Perfil del perro actualizado con éxito');
                this.loadRanking(); // Refresh ranking to reflect changes
            } catch (error) {
                console.error('Error updating dog form ranking:', error);
                this.toastService.error('Error al actualizar el perro');
            }
        }
    }
}
