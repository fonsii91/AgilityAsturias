import { Component, OnInit, inject, ChangeDetectorRef, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VideoService } from '../../../services/video.service';
import { DogService } from '../../../services/dog.service';
import { CompetitionService } from '../../../services/competition.service';
import { Video } from '../../../models/video.model';
import { Dog } from '../../../models/dog.model';
import { SmartVideoPlayerComponent } from '../smart-video-player/smart-video-player.component';
import { FichaPerroComponent } from '../../ficha-perro/ficha-perro.component';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { TenantService } from '../../../services/tenant.service';
import { InstruccionesComponent } from '../../shared/instrucciones/instrucciones.component';
import { AnalyticsService } from '../../../services/analytics.service';

@Component({
    selector: 'app-video-list',
    standalone: true,
    imports: [CommonModule, FormsModule, SmartVideoPlayerComponent, RouterLink, FichaPerroComponent, InstruccionesComponent],
    templateUrl: './video-list.component.html',
    styleUrl: './video-list.component.css'
})
export class VideoListComponent implements OnInit {
    private videoService = inject(VideoService);
    public dogService = inject(DogService);
    public compService = inject(CompetitionService);
    public authService = inject(AuthService);
    private toastService = inject(ToastService);
    private cdr = inject(ChangeDetectorRef);
    tenantService = inject(TenantService);
    analyticsService = inject(AnalyticsService);
    clubConfig = environment.clubConfig;
    clubName = computed(() => this.tenantService.tenantInfo()?.name || this.clubConfig.name);

    videos: Video[] = [];
    currentUserId: number | null = null;
    videoToDelete: Video | null = null;
    videoToEdit: Video | null = null;
    editData: any = {};
    isSavingEdit = false;
    currentPage = 1;
    totalPages = 1;
    isLoading = true;
    hasReachedEnd = false;
    isFiltersOpen = false;
    activeTab: 'horizontal' | 'vertical' | 'all' = 'all';
    tabCounts = { vertical: 0, horizontal: 0 };

    selectedDogForProfile: Dog | null = null;
    isDogProfileOpen = false;


    searchQuery: string = '';
    filterDateRange: string = '';
    filterDogId: string = '';
    filterCompetitionId: string = '';
    activeSort: string = 'latest';

    ngOnInit() {
        this.analyticsService.logModuleAccess('videos');
        this.currentUserId = this.authService.currentUserSignal()?.id || null;
        this.loadVideos();
        this.dogService.loadAllDogs();
        this.compService.fetchCompetitions();
    }

    toggleFilters() {
        this.isFiltersOpen = !this.isFiltersOpen;
    }



    get sortedDogs(): Dog[] {
        const dogs = this.dogService.getAllDogs()() || [];
        const userId = this.currentUserId;
        if (!userId) {
            return [...dogs].sort((a, b) => a.name.localeCompare(b.name));
        }

        return [...dogs].sort((a, b) => {
            const aIsMine = this.hasDogUser(a, userId);
            const bIsMine = this.hasDogUser(b, userId);
            if (aIsMine && !bIsMine) return -1;
            if (!aIsMine && bIsMine) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    goToTab(tab: 'horizontal' | 'vertical' | 'all') {
        if (this.activeTab !== tab) {
            this.activeTab = tab;
            this.loadVideos(1);
        }
    }

    loadVideos(page: number = 1) {
        this.isLoading = true;
        const filters: any = {
            search: this.searchQuery
        };
        if (this.activeTab !== 'all') {
            filters.orientation = this.activeTab;
        }

        if (this.filterDateRange) filters.dateRange = this.filterDateRange;
        if (this.filterDogId) filters.dog_id = this.filterDogId;
        if (this.filterCompetitionId) filters.competition_id = this.filterCompetitionId;

        if (this.activeSort !== 'latest') {
            filters.sort = this.activeSort;
        }

        this.videoService.getVideos(page, filters).subscribe({
            next: (res) => {
                this.videos = res.data;
                
                this.currentPage = Number(res.current_page);
                this.totalPages = Number(res.last_page);
                this.hasReachedEnd = this.currentPage >= this.totalPages;
                
                if (res.counts) {
                    this.tabCounts = res.counts;
                }
                
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading videos', err);
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    get pageNumbers(): (number|string)[] {
        const pages: (number|string)[] = [];
        const maxPagesToShow = 5;
        if (this.totalPages <= maxPagesToShow) {
            for (let i = 1; i <= this.totalPages; i++) pages.push(i);
        } else {
            if (this.currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', this.totalPages);
            } else if (this.currentPage > this.totalPages - 3) {
                pages.push(1, '...', this.totalPages - 3, this.totalPages - 2, this.totalPages - 1, this.totalPages);
            } else {
                pages.push(1, '...', this.currentPage - 1, this.currentPage, this.currentPage + 1, '...', this.totalPages);
            }
        }
        return pages;
    }

    goToPage(page: number | string) {
        const pageNum = Number(page);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= this.totalPages && pageNum !== this.currentPage) {
            this.loadVideos(pageNum);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    applyFilters() {
        this.loadVideos(1);
    }

    clearFilters() {
        this.searchQuery = '';
        this.filterDateRange = '';
        this.filterDogId = '';
        this.filterCompetitionId = '';
        this.activeSort = 'latest';
        this.activeTab = 'all';
        this.loadVideos(1);
    }

    toggleLike(video: Video) {
        const originallyLiked = video.is_liked_by_user;
        video.is_liked_by_user = !originallyLiked;
        video.likes_count = (video.likes_count || 0) + (originallyLiked ? -1 : 1);

        this.videoService.toggleLike(video.id).subscribe({
            next: (res) => {
                video.is_liked_by_user = res.liked;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error toggling like', err);
                // Revert optimistic update
                video.is_liked_by_user = originallyLiked;
                video.likes_count = (video.likes_count || 0) + (originallyLiked ? 1 : -1);
                this.cdr.detectChanges();
            }
        });
    }

    togglePublicGallery(event: Event, video: Video) {
        event.stopPropagation();
        const originallyInPublic = video.in_public_gallery;
        video.in_public_gallery = !originallyInPublic;

        this.videoService.togglePublicGallery(video.id).subscribe({
            next: (res: any) => {
                video.in_public_gallery = res.in_public_gallery;
                this.toastService.success(video.in_public_gallery ? 'Vídeo añadido a la galería pública' : 'Vídeo retirado de la galería pública');
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                console.error('Error toggling public gallery', err);
                video.in_public_gallery = originallyInPublic;
                this.toastService.error('Error al actualizar el estado en la galería pública');
                this.cdr.detectChanges();
            }
        });
    }

    getDownloadUrl(video: Video): string {
        if (!video.id) return '#';
        return `${environment.apiUrl}/videos/${video.id}/download`;
    }

    async downloadVideo(event: Event, video: Video) {
        event.preventDefault();
        event.stopPropagation();

        if (!video.id) return;

        const url = this.getDownloadUrl(video);

        try {
            // Using fetch alongside the new backend download endpoint
            const response = await fetch(url, {
                headers: {
                    // Provide auth token if required by backend to fetch the file
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
                }
            });

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;

            // Define safe filename
            const extension = video.local_path?.split('.').pop() || 'mp4';
            const safeTitle = (video.title || video.dog?.name || 'video_agility').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            a.download = `${safeTitle}.${extension}`;

            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(a);
            }, 100);

        } catch (error) {
            console.error('Download error:', error);
            this.toastService.error('No se pudo descargar el vídeo');
        }
    }

    canModifyVideo(video: Video): boolean {
        const userId = this.currentUserId;
        if (!userId) return false;
        
        const role = this.authService.currentUserSignal()?.role;
        if (role === 'admin' || role === 'staff' || role === 'manager') return true;

        if (video.user_id == userId) return true;
        if (video.dog?.users && video.dog.users.some(u => u.id == userId)) return true;

        return false;
    }

    hasDogUser(dog: Dog | undefined, userId: number | undefined | null): boolean {
        if (!dog?.users || !userId) return false;
        return dog.users.some(u => u.id === userId);
    }

    openDeleteModal(event: Event, video: Video) {
        event.stopPropagation();
        this.videoToDelete = video;
        this.cdr.detectChanges();
    }

    cancelDelete() {
        this.videoToDelete = null;
        this.cdr.detectChanges();
    }

    openDogProfile(event: Event, dog?: Dog) {
        event.stopPropagation();
        event.preventDefault();
        if (!dog) return;
        this.selectedDogForProfile = dog;
        this.isDogProfileOpen = true;
        this.cdr.detectChanges();
    }

    closeDogProfile() {
        this.isDogProfileOpen = false;
        setTimeout(() => {
            this.selectedDogForProfile = null;
            this.cdr.detectChanges();
        }, 300);
    }

    confirmDelete() {
        if (!this.videoToDelete) return;

        const videoId = this.videoToDelete.id;
        this.videoService.deleteVideo(videoId).subscribe({
            next: () => {
                this.toastService.success('Vídeo eliminado correctamente');
                this.videos = this.videos.filter(v => v.id !== videoId);
                this.videoToDelete = null;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error deleting video', err);
                this.toastService.error('Hubo un error al eliminar el vídeo');
                this.videoToDelete = null;
                this.cdr.detectChanges();
            }
        });
    }

    openEditModal(event: Event, video: Video) {
        event.stopPropagation();
        this.videoToEdit = video;
        this.editData = {
            title: video.title || '',
            date: video.date || '',
            dog_id: video.dog_id || (video.dog ? video.dog.id : ''),
            competition_id: video.competition_id || (video.competition ? video.competition.id : '')
        };
        this.cdr.detectChanges();
    }

    closeEditModal() {
        this.videoToEdit = null;
        this.cdr.detectChanges();
    }

    saveVideoChanges() {
        if (!this.videoToEdit || this.isSavingEdit) return;

        if (!this.editData.dog_id || !this.editData.date) {
            this.toastService.error('Por favor completa los campos obligatorios (Perro y Fecha).');
            return;
        }

        this.isSavingEdit = true;
        this.cdr.detectChanges();

        this.videoService.updateVideo(this.videoToEdit.id, this.editData).subscribe({
            next: (updatedVideo) => {
                this.toastService.success('Vídeo actualizado correctamente');
                const index = this.videos.findIndex(v => v.id === updatedVideo.id);
                if (index !== -1) {
                    updatedVideo.likes_count = this.videos[index].likes_count;
                    updatedVideo.is_liked_by_user = this.videos[index].is_liked_by_user;
                    this.videos[index] = updatedVideo;
                }
                this.isSavingEdit = false;
                this.videoToEdit = null;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error updating video', err);
                this.toastService.error('Hubo un error al actualizar el vídeo');
                this.isSavingEdit = false;
                this.cdr.detectChanges();
            }
        });
    }
}
