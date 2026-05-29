import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../services/analytics.service';
import { FormsModule } from '@angular/forms';

import { ReservationService } from '../../services/reservation.service';
import { AuthService } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';
import { ToastService } from '../../services/toast.service';
import { FichaPerroComponent } from '../ficha-perro/ficha-perro.component';
import { InstruccionesComponent } from '../shared/instrucciones/instrucciones.component';
import { getEmojiForCategory } from '../../utils/point-categories';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { OnboardingService } from '../../services/onboarding';
import { TenantService } from '../../services/tenant.service';
import { BountyService } from '../../services/bounty.service';

@Component({
    selector: 'app-ranking',
    standalone: true,
    imports: [CommonModule, RouterModule, FichaPerroComponent, MatTooltipModule, InstruccionesComponent, FormsModule],
    templateUrl: './ranking.component.html',
    styleUrls: ['./ranking.component.css']
})
export class RankingComponent {
    private reservationService = inject(ReservationService);
    private bountyService = inject(BountyService);
    private analytics = inject(AnalyticsService);
    authService = inject(AuthService);
    dogService = inject(DogService);
    toastService = inject(ToastService);
    onboardingService = inject(OnboardingService);
    tenantService = inject(TenantService);

    // Bounty Board signals
    activeRankingTab = signal<'clasificacion' | 'bounty'>('clasificacion');
    activeBountyTab = signal<'tablon' | 'mis_contratos' | 'feed'>('tablon');
    bountyPosters = signal<any[]>([]);
    myBountyContracts = signal<any | null>(null);
    bountyFeed = signal<any[]>([]);
    isBountyLoading = signal(false);
    isBuyingBounty = signal(false);
    isConfirmingCaza = signal<any | null>(null);
    selectedConfirmWitnessId = signal<number | null>(null);
    bountyPrivacyOptIn = signal(true);
    myDogs = this.dogService.getDogs();
    selectedHunterDogId = signal<number | null>(null);

    bountyBoardEnabled = computed(() => {
        return !!this.tenantService.tenantInfo()?.settings_ranking?.bounty_board_enabled;
    });

    ranking = signal<any[]>([]);
    isLoading = signal(true);
    
    selectedDogModal = signal<any | null>(null);
    fichaModalOpen = signal(false);

    // Seasons management signals
    seasons = signal<any[]>([]);
    selectedSeasonId = signal<number | null>(null);
    activeSeason = signal<any | null>(null);
    isSeasonModalOpen = signal(false);

    selectedSeason = computed(() => {
        const id = this.selectedSeasonId();
        return this.seasons().find(s => s.id === id) || null;
    });

    isStickersSeason = computed(() => {
        return this.selectedSeason()?.gamification_type === 'stickers';
    });

    // Stickers signals
    albumData = signal<any | null>(null);
    tradesList = signal<any[]>([]);
    activeTradeTab = signal<'album' | 'trades'>('album');
    isOpeningChest = signal(false);
    revealedSticker = signal<any | null>(null);
    isBuyingPack = signal(false);
    isClaimingReward = signal(false);

    // Trade form state
    usersMinimalList = signal<any[]>([]);
    selectedReceiverId = signal<number | null>(null);
    selectedOfferedDogId = signal<number | null>(null);
    selectedRequestedDogId = signal<number | null>(null);
    isSubmittingTrade = signal(false);

    // Form inputs for new season
    newSeasonName = '';
    newSeasonType = 'ranking';
    newSeasonStartDate = new Date().toISOString().substring(0, 10);

    constructor() {
        this.loadSeasons();
        this.dogService.loadUserDogs().then(dogs => {
            if (dogs && dogs.length > 0) {
                this.selectedHunterDogId.set(dogs[0].id);
            }
        });
        this.analytics.logSystemAction('ranking_viewed');
    }

    loadSeasons() {
        this.reservationService.getSeasons().subscribe({
            next: (data) => {
                this.seasons.set(data);
                
                // Track active season
                const active = data.find((s: any) => s.status === 'active');
                this.activeSeason.set(active || null);

                // Default selection logic: select active season, or fallback to first ranking, or first generally
                if (active) {
                    this.selectedSeasonId.set(active.id);
                } else if (this.selectedSeasonId() === null && data.length > 0) {
                    const firstRanking = data.find((s: any) => s.gamification_type === 'ranking');
                    if (firstRanking) {
                        this.selectedSeasonId.set(firstRanking.id);
                    } else {
                        this.selectedSeasonId.set(data[0].id);
                    }
                }

                this.loadRanking();
            },
            error: (err) => {
                console.error('Error loading seasons', err);
                this.isLoading.set(false);
            }
        });
    }

    onSeasonChange(event: any) {
        const val = event.target.value;
        const id = val ? Number(val) : null;
        this.selectedSeasonId.set(id);
        this.isLoading.set(true);
        this.loadRanking();
    }

    loadRanking() {
        const seasonId = this.selectedSeasonId() || undefined;
        if (!seasonId) {
            this.ranking.set([]);
            this.isLoading.set(false);
            return;
        }

        if (this.isStickersSeason()) {
            this.loadStickerAlbum();
            return;
        }

        this.reservationService.getRanking(seasonId).subscribe({
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

    loadStickerAlbum() {
        const seasonId = this.selectedSeasonId() || undefined;
        this.reservationService.getStickerAlbum(seasonId).subscribe({
            next: (data) => {
                this.albumData.set(data);
                this.isLoading.set(false);
                if (this.activeTradeTab() === 'trades') {
                    this.loadTrades();
                }
            },
            error: (err) => {
                console.error('Error loading sticker album', err);
                this.isLoading.set(false);
                this.toastService.error('Error al cargar el álbum de stickers');
            }
        });
    }

    setTradeTab(tab: 'album' | 'trades') {
        this.activeTradeTab.set(tab);
        if (tab === 'trades') {
            this.loadTrades();
            this.loadMinimalUsersForTrades();
        }
    }

    loadTrades() {
        this.reservationService.getStickerTrades().subscribe({
            next: (data) => {
                this.tradesList.set(data);
            },
            error: (err) => {
                console.error('Error loading trades', err);
            }
        });
    }

    async loadMinimalUsersForTrades() {
        try {
            const users = await this.authService.getMinimalUsers();
            // Exclude current user
            const currentUserId = this.authService.currentUserSignal()?.id;
            this.usersMinimalList.set(users.filter((u: any) => u.id !== currentUserId));
        } catch (err) {
            console.error('Error loading minimal users', err);
        }
    }

    // Helper to get my duplicates for trade form
    getMyDuplicates() {
        const album = this.albumData();
        if (!album || !album.promotions) return [];
        const duplicates: any[] = [];
        album.promotions.forEach((p: any) => {
            p.dogs.forEach((d: any) => {
                if (d.level === 3 && d.duplicates_count > 0) {
                    duplicates.push(d);
                }
            });
        });
        return duplicates;
    }

    // Helper to get all dogs list
    getAllDogsList() {
        const album = this.albumData();
        if (!album || !album.promotions) return [];
        const dogs: any[] = [];
        album.promotions.forEach((p: any) => {
            p.dogs.forEach((d: any) => {
                dogs.push(d);
            });
        });
        return dogs;
    }

    proposeTrade() {
        const receiverId = this.selectedReceiverId();
        const offeredDogId = this.selectedOfferedDogId();
        const requestedDogId = this.selectedRequestedDogId();

        if (!receiverId || !offeredDogId || !requestedDogId) {
            this.toastService.error('Por favor, selecciona el usuario y ambos stickers para el intercambio');
            return;
        }

        this.isSubmittingTrade.set(true);
        this.reservationService.proposeStickerTrade(receiverId, offeredDogId, requestedDogId).subscribe({
            next: (res) => {
                this.toastService.success(res.message || 'Propuesta de intercambio enviada con éxito');
                this.selectedReceiverId.set(null);
                this.selectedOfferedDogId.set(null);
                this.selectedRequestedDogId.set(null);
                this.loadTrades();
                this.loadStickerAlbum();
                this.isSubmittingTrade.set(false);
            },
            error: (err) => {
                console.error(err);
                this.toastService.error(err.error?.message || 'Error al proponer intercambio');
                this.isSubmittingTrade.set(false);
            }
        });
    }

    acceptTrade(tradeId: number) {
        if (confirm('¿Estás seguro de que deseas aceptar este intercambio? Esto transferirá los duplicados.')) {
            this.reservationService.acceptStickerTrade(tradeId).subscribe({
                next: (res) => {
                    this.toastService.success(res.message || 'Intercambio completado con éxito');
                    this.loadTrades();
                    this.loadStickerAlbum();
                },
                error: (err) => {
                    console.error(err);
                    this.toastService.error(err.error?.message || 'Error al aceptar intercambio');
                }
            });
        }
    }

    rejectTrade(tradeId: number) {
        this.reservationService.rejectStickerTrade(tradeId).subscribe({
            next: (res) => {
                this.toastService.success(res.message || 'Intercambio rechazado');
                this.loadTrades();
                this.loadStickerAlbum();
            },
            error: (err) => {
                console.error(err);
                this.toastService.error(err.error?.message || 'Error al rechazar intercambio');
            }
        });
    }

    cancelTrade(tradeId: number) {
        this.reservationService.cancelStickerTrade(tradeId).subscribe({
            next: (res) => {
                this.toastService.success(res.message || 'Intercambio cancelado');
                this.loadTrades();
                this.loadStickerAlbum();
            },
            error: (err) => {
                console.error(err);
                this.toastService.error(err.error?.message || 'Error al cancelar intercambio');
            }
        });
    }

    openStickerChest() {
        if (this.isOpeningChest()) return;
        this.isOpeningChest.set(true);
        this.revealedSticker.set(null);

        this.reservationService.openChest().subscribe({
            next: (res) => {
                this.revealedSticker.set(res);
                this.loadStickerAlbum();
                this.isOpeningChest.set(false);
            },
            error: (err) => {
                console.error(err);
                this.isOpeningChest.set(false);
                this.toastService.error(err.error?.message || 'Error al abrir el cofre');
            }
        });
    }

    closeRevealedStickerModal() {
        this.revealedSticker.set(null);
    }

    buyPack() {
        if (this.isBuyingPack()) return;
        this.isBuyingPack.set(true);

        this.reservationService.buyStickerPack().subscribe({
            next: (res) => {
                this.toastService.success(res.message || 'Cofre comprado con éxito');
                this.loadStickerAlbum();
                this.isBuyingPack.set(false);
            },
            error: (err) => {
                console.error(err);
                this.isBuyingPack.set(false);
                this.toastService.error(err.error?.message || 'Error al comprar el cofre');
            }
        });
    }

    claimPromotion(year: number) {
        if (this.isClaimingReward()) return;
        this.isClaimingReward.set(true);

        this.reservationService.claimPromotionReward(year).subscribe({
            next: (res) => {
                this.toastService.success(res.message || '¡Recompensa cobrada!');
                this.loadStickerAlbum();
                this.isClaimingReward.set(false);
            },
            error: (err) => {
                console.error(err);
                this.isClaimingReward.set(false);
                this.toastService.error(err.error?.message || 'Error al cobrar recompensa');
            }
        });
    }

    openSeasonManager() {
        this.isSeasonModalOpen.set(true);
        document.body.style.overflow = 'hidden';
    }

    closeSeasonManager() {
        this.isSeasonModalOpen.set(false);
        document.body.style.overflow = 'auto';
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

        this.reservationService.startSeason(payload).subscribe({
            next: (res) => {
                this.toastService.success(res.message || 'Nueva temporada iniciada con éxito');
                this.newSeasonName = '';
                this.loadSeasons();
                this.closeSeasonManager();
            },
            error: (err) => {
                console.error('Error starting season', err);
                const errMsg = err.error?.message || 'Error al iniciar la temporada';
                this.toastService.error(errMsg);
            }
        });
    }

    endCurrentSeason() {
        if (!confirm('¿Estás seguro de que deseas finalizar la temporada actual? Esto congelará las posiciones y puntuaciones de los perros.')) {
            return;
        }

        this.reservationService.endSeason().subscribe({
            next: (res) => {
                this.toastService.success(res.message || 'Temporada finalizada con éxito');
                this.loadSeasons();
                this.closeSeasonManager();
            },
            error: (err) => {
                console.error('Error ending season', err);
                const errMsg = err.error?.message || 'Error al finalizar la temporada';
                this.toastService.error(errMsg);
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

    getAlbumCompletedCount() {
        const album = this.albumData();
        if (!album || !album.promotions) return 0;
        return album.promotions.reduce((sum: number, p: any) => sum + p.completed, 0);
    }

    getAlbumTotalCount() {
        const album = this.albumData();
        if (!album || !album.promotions) return 0;
        return album.promotions.reduce((sum: number, p: any) => sum + p.total, 0);
    }

    isPromotionClaimed(year: number): boolean {
        const profile = this.albumData()?.profile;
        if (!profile || !profile.claimed_promotions) return false;
        return profile.claimed_promotions.includes(year);
    }

    getPendingTradesCount(): number {
        const currentUserId = this.authService.currentUserSignal()?.id;
        return this.tradesList().filter(t => t.status === 'pending' && t.receiver_id === currentUserId).length;
    }

    getIncomingPendingTrades() {
        const currentUserId = this.authService.currentUserSignal()?.id;
        return this.tradesList().filter(t => t.status === 'pending' && t.receiver_id === currentUserId);
    }

    getOutgoingPendingTrades() {
        const currentUserId = this.authService.currentUserSignal()?.id;
        return this.tradesList().filter(t => t.status === 'pending' && t.sender_id === currentUserId);
    }

    getTradeHistory() {
        return this.tradesList().filter(t => t.status !== 'pending');
    }

    onInstructionsOpened() {
        this.onboardingService.markStepCompleted('staff_asistencia');
        this.onboardingService.markStepCompleted('miembro_clasificacion');
    }

    // Bounty Board Methods
    loadBountyData() {
        this.isBountyLoading.set(true);
        // Load posters
        this.bountyService.getBountyPosters().subscribe({
            next: (data: any) => {
                this.bountyPosters.set(data.posters || []);
                this.bountyPrivacyOptIn.set(data.opt_in !== false);
                this.isBountyLoading.set(false);
            },
            error: (err: any) => {
                console.error('Error loading posters', err);
                this.isBountyLoading.set(false);
            }
        });

        // Load my contracts
        this.bountyService.getMyBountyContracts().subscribe({
            next: (data: any) => {
                this.myBountyContracts.set(data);
            },
            error: (err: any) => console.error('Error loading my contracts', err)
        });

        // Load feed
        this.bountyService.getBountyFeed().subscribe({
            next: (data: any[]) => {
                this.bountyFeed.set(data || []);
            },
            error: (err: any) => console.error('Error loading feed', err)
        });
    }

    setRankingTab(tab: 'clasificacion' | 'bounty') {
        this.activeRankingTab.set(tab);
        if (tab === 'bounty') {
            this.loadBountyData();
        }
    }

    setBountyTab(tab: 'tablon' | 'mis_contratos' | 'feed') {
        this.activeBountyTab.set(tab);
        this.loadBountyData();
    }

    buyBounty(poster: any, type: string) {
        const cost = poster.carteles[type].cost;
        const bounty = poster.carteles[type].bounty;
        const msg = `¿Estás seguro de que deseas comprar el cartel de ${poster.name} (${type.replace('_', ' ')}) por ${cost} puntos del ranking? Si tienes éxito robarás ${bounty} puntos. Si fallas o expira a los 30 días, perderás la fianza y se le ingresará el 20% (${Math.floor(cost * 0.2)} puntos) a la víctima.`;
        if (confirm(msg)) {
            this.isBuyingBounty.set(true);

            const payload: any = {
                victim_dog_id: poster.dog_id,
                cartel_type: type
            };
            if (this.selectedHunterDogId()) {
                payload.hunter_dog_id = this.selectedHunterDogId();
            }

            this.bountyService.buyBountyContract(payload).subscribe({
                next: (res: any) => {
                    this.toastService.success(res.message || 'Contrato adquirido con éxito');
                    this.loadBountyData();
                    this.isBuyingBounty.set(false);
                },
                error: (err: any) => {
                    console.error(err);
                    this.toastService.error(err.error?.message || 'Error al comprar contrato');
                    this.isBuyingBounty.set(false);
                }
            });
        }
    }

    openConfirmCazaModal(contract: any) {
        this.isConfirmingCaza.set(contract);
        this.selectedConfirmWitnessId.set(null);
    }

    closeConfirmCazaModal() {
        this.isConfirmingCaza.set(null);
        this.selectedConfirmWitnessId.set(null);
    }

    confirmCazaSubmission() {
        const contract = this.isConfirmingCaza();
        const witnessId = this.selectedConfirmWitnessId();
        if (!contract || !witnessId) return;

        this.bountyService.confirmBountyCaza(contract.id, witnessId).subscribe({
            next: (res: any) => {
                this.toastService.success(res.message || 'Caza confirmada. Esperando validación del testigo.');
                this.closeConfirmCazaModal();
                this.loadBountyData();
            },
            error: (err: any) => {
                console.error(err);
                this.toastService.error(err.error?.message || 'Error al confirmar caza');
            }
        });
    }

    validateCaza(contractId: number, approved: boolean) {
        const actionText = approved ? 'confirmar' : 'denegar';
        if (confirm(`¿Estás seguro de que deseas ${actionText} esta caza?`)) {
            this.bountyService.validateBountyCaza(contractId, approved).subscribe({
                next: (res: any) => {
                    this.toastService.success(res.message || 'Contrato validado correctamente.');
                    this.loadBountyData();
                },
                error: (err: any) => {
                    console.error(err);
                    this.toastService.error(err.error?.message || 'Error al validar contrato');
                }
            });
        }
    }

    toggleBountyBoardState(event: any) {
        const enabled = event.target.checked;
        this.bountyService.toggleBountyBoard(enabled).subscribe({
            next: (res: any) => {
                this.toastService.success(res.message || 'Ajuste guardado con éxito');
                this.tenantService.reload();
            },
            error: (err: any) => {
                console.error(err);
                this.toastService.error(err.error?.message || 'Error al guardar ajuste');
            }
        });
    }

    onBountyPrivacyChange(event: any) {
        const optIn = event.target.checked;
        this.bountyService.updateBountySettings(optIn).subscribe({
            next: (res: any) => {
                this.toastService.success(res.message || 'Configuración de privacidad guardada');
                this.bountyPrivacyOptIn.set(optIn);
                this.loadBountyData();
            },
            error: (err: any) => {
                console.error(err);
                this.toastService.error('Error al guardar privacidad');
                // Revert toggle in case of error
                event.target.checked = !optIn;
            }
        });
    }

    rerollCaza(contractId: number) {
        if (confirm('¿Estás seguro de que deseas cambiar la misión de este contrato? Puedes hacerlo un máximo de 2 veces en total.')) {
            this.bountyService.rerollBountyContract(contractId).subscribe({
                next: (res: any) => {
                    this.toastService.success(res.message || 'Misión cambiada con éxito.');
                    this.loadBountyData();
                },
                error: (err: any) => {
                    console.error(err);
                    this.toastService.error(err.error?.message || 'Error al cambiar la misión');
                }
            });
        }
    }
}
