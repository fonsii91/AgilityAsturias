import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReservationService } from '../../services/reservation.service';
import { AuthService } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';
import { ToastService } from '../../services/toast.service';
import { FichaPerroComponent } from '../ficha-perro/ficha-perro.component';
import { InstruccionesComponent } from '../shared/instrucciones/instrucciones.component';
import { getEmojiForCategory } from '../../utils/point-categories';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-ranking',
    standalone: true,
    imports: [CommonModule, RouterModule, FichaPerroComponent, MatTooltipModule, InstruccionesComponent],
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
                const tenDaysAgo = new Date();
                tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

                const mappedRanking = data.map(d => {
                    const histories = d.point_histories || [];
                    // Filter notable histories
                    const notableHistories = histories.filter((h: any) => {
                        const historyDate = new Date(h.created_at);
                        if (historyDate < tenDaysAgo) return false;
                        
                        const isAttendance = h.category === 'Asistencia a entrenamiento' || h.category === 'Asistencia a clase';
                        return !isAttendance;
                    });
                    
                    // Get top 3 most recent emojis
                    const recentEmojis = notableHistories
                        .slice(0, 3)
                        .map((h: any) => ({
                            emoji: getEmojiForCategory(h.category, h.points),
                            category: h.category
                        }));

                    return {
                        ...d,
                        pointHistories: histories,
                        createdAt: d.created_at,
                        updatedAt: d.updated_at,
                        recentEmojis: recentEmojis
                    };
                });
                this.ranking.set(mappedRanking);
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

    hasDogUser(dog: any, userId: number | undefined): boolean {
        if (!dog?.users || !userId) return false;
        return dog.users.some((u: any) => u.id === userId);
    }

    getOwnerNames(dog: any): string {
        if (!dog?.users || dog.users.length === 0) return '';
        return dog.users.map((u: any) => u.name).join(' & ');
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
