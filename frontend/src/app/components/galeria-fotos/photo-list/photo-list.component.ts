import { Component, OnInit, inject, HostListener, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PhotoService, PhotoFilters } from '../../../services/photo.service';
import { DogService } from '../../../services/dog.service';
import { CompetitionService } from '../../../services/competition.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { Photo, PhotoStorageStats, PHOTO_CATEGORIES, PHOTO_TYPES, photoCategoryLabel, photoTypeLabel } from '../../../models/photo.model';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-photo-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './photo-list.component.html',
    styleUrl: './photo-list.component.css'
})
export class PhotoListComponent implements OnInit {
    private photoService = inject(PhotoService);
    public dogService = inject(DogService);
    public compService = inject(CompetitionService);
    public authService = inject(AuthService);
    private toastService = inject(ToastService);
    private router = inject(Router);

    categories = PHOTO_CATEGORIES;
    photoTypes = PHOTO_TYPES;
    categoryLabel = photoCategoryLabel;
    typeLabel = photoTypeLabel;

    photos = signal<Photo[]>([]);
    storageStats = signal<PhotoStorageStats | null>(null);
    isLoading = signal<boolean>(false);
    currentPage = signal<number>(1);
    lastPage = signal<number>(1);
    total = signal<number>(0);

    // Filtros
    filterCategory = signal<string>('');
    filterType = signal<string>('');
    filterCompetition = signal<string>('');
    filterDog = signal<string>('');
    searchTerm = signal<string>('');
    private searchDebounce: any = null;

    // Lightbox
    selectedPhoto = signal<Photo | null>(null);
    isEditingTags = signal<boolean>(false);
    isDeleting = signal<boolean>(false);
    showSidebar = signal<boolean>(true);
    members = signal<{ id: number; name: string }[]>([]);

    ngOnInit() {
        this.dogService.loadAllDogs();
        this.loadPhotos(true);
        this.authService.getMinimalUsers()
            .then(users => { this.members.set(users); })
            .catch(() => { this.members.set([]); });
    }

    filters = computed<PhotoFilters>(() => {
        return {
            category: this.filterCategory() || undefined,
            photo_type: this.filterType() || undefined,
            competition_id: this.filterCompetition() || undefined,
            dog_id: this.filterDog() || undefined,
            search: this.searchTerm() || undefined,
        };
    });

    loadPhotos(reset: boolean = false) {
        if (reset) {
            this.currentPage.set(1);
            this.photos.set([]);
        }
        this.isLoading.set(true);
        this.photoService.getPhotos(this.currentPage(), this.filters()).subscribe({
            next: (response) => {
                this.photos.update(prev => [...prev, ...(response.data ?? [])]);
                this.lastPage.set(response.last_page ?? 1);
                this.total.set(response.total ?? this.photos().length);
                this.storageStats.set(response.storage ?? this.storageStats());
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
                this.toastService.error('Error al cargar las fotos.');
            }
        });
    }

    loadMore() {
        if (this.currentPage() >= this.lastPage() || this.isLoading()) return;
        this.currentPage.update(p => p + 1);
        this.loadPhotos();
    }

    onFilterChange() {
        this.loadPhotos(true);
    }

    selectCategory(category: string) {
        this.filterCategory.set(this.filterCategory() === category ? '' : category);
        this.onFilterChange();
    }

    onSearchChange() {
        clearTimeout(this.searchDebounce);
        this.searchDebounce = setTimeout(() => this.loadPhotos(true), 400);
    }

    competitions = computed(() => {
        return this.compService.getCompetitions()();
    });

    dogs = computed(() => {
        return this.dogService.getAllDogs()() || [];
    });

    formatStorage(bytes: number): string {
        if (!bytes) return '0 MB';
        const mb = bytes / (1024 * 1024);
        if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB';
        return mb.toFixed(1) + ' MB';
    }

    // ---- Lightbox ----

    openPhoto(photo: Photo) {
        this.selectedPhoto.set(photo);
        this.isEditingTags.set(false);
        this.showSidebar.set(true);
        document.body.style.overflow = 'hidden';
    }

    toggleSidebar() {
        this.showSidebar.update(v => !v);
    }

    closePhoto() {
        this.selectedPhoto.set(null);
        this.isEditingTags.set(false);
        document.body.style.overflow = '';
    }

    @HostListener('document:keydown.escape')
    onEscape() {
        if (this.selectedPhoto()) this.closePhoto();
    }

    navigatePhoto(direction: 1 | -1) {
        const currentPhoto = this.selectedPhoto();
        if (!currentPhoto) return;
        const index = this.photos().findIndex(p => p.id === currentPhoto.id);
        const next = this.photos()[index + direction];
        if (next) {
            this.selectedPhoto.set(next);
            this.isEditingTags.set(false);
        }
    }

    canManage(photo: Photo): boolean {
        const user = this.authService.currentUserSignal();
        if (!user) return false;
        return photo.user_id === user.id || this.authService.isStaff();
    }

    isTaggedSelf(photo: Photo): boolean {
        const user = this.authService.currentUserSignal();
        return !!user && !!photo.tagged_users?.some(u => u.id === user.id);
    }

    async deletePhoto(photo: Photo) {
        if (this.isDeleting()) return;
        if (!confirm('¿Seguro que quieres borrar esta foto? Esta acción no se puede deshacer.')) return;

        this.isDeleting.set(true);
        try {
            await firstValueFrom(this.photoService.deletePhoto(photo.id));
            this.photos.update(prev => prev.filter(p => p.id !== photo.id));
            this.total.update(t => t - 1);
            this.closePhoto();
            this.toastService.success('Foto eliminada.');
        } catch {
            this.toastService.error('No se pudo borrar la foto.');
        } finally {
            this.isDeleting.set(false);
        }
    }

    async untagSelf(photo: Photo) {
        try {
            await firstValueFrom(this.photoService.untagSelf(photo.id));
            const user = this.authService.currentUserSignal();
            photo.tagged_users = (photo.tagged_users ?? []).filter(u => u.id !== user?.id);
            this.toastService.success('Te has quitado de la foto.');
        } catch {
            this.toastService.error('No se pudo quitar la etiqueta.');
        }
    }

    getDownloadUrl(photo: Photo): string {
        if (!photo.id) return '#';
        return `${environment.apiUrl}/photos/${photo.id}/download`;
    }

    async downloadPhoto(photo: Photo) {
        if (!photo.id) return;

        const url = this.getDownloadUrl(photo);

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'No se pudo descargar la foto');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;

            let extension = 'webp';
            if (photo.url) {
                const cleanUrl = photo.url.split('?')[0];
                extension = cleanUrl.split('.').pop() || 'webp';
            }
            
            const safeTitle = (photo.title || 'foto_' + photo.id).replace(/[^a-z0-9]/gi, '_').toLowerCase();
            a.download = `${safeTitle}.${extension}`;

            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(a);
            }, 100);

            this.toastService.success('Descarga iniciada.');
        } catch (error) {
            console.error('Download error:', error);
            const msg = error instanceof Error ? error.message : 'No se pudo descargar la foto';
            this.toastService.error(msg);
        }
    }

    // ---- Etiquetado colaborativo desde el lightbox ----

    async addDogTag(photo: Photo, event: any) {
        const dogId = Number(event.target.value);
        event.target.value = '';
        if (!dogId || photo.dogs?.some(d => d.id === dogId)) return;
        const dogIds = [...(photo.dogs ?? []).map(d => d.id), dogId];
        await this.syncTags(photo, { dog_ids: dogIds });
    }

    async removeDogTag(photo: Photo, dogId: number) {
        const dogIds = (photo.dogs ?? []).filter(d => d.id !== dogId).map(d => d.id);
        await this.syncTags(photo, { dog_ids: dogIds });
    }

    async addUserTag(photo: Photo, event: any) {
        const userId = Number(event.target.value);
        event.target.value = '';
        if (!userId || photo.tagged_users?.some(u => u.id === userId)) return;
        const userIds = [...(photo.tagged_users ?? []).map(u => u.id), userId];
        await this.syncTags(photo, { user_ids: userIds });
    }

    async removeUserTag(photo: Photo, userId: number) {
        const userIds = (photo.tagged_users ?? []).filter(u => u.id !== userId).map(u => u.id);
        await this.syncTags(photo, { user_ids: userIds });
    }

    private async syncTags(photo: Photo, tags: { dog_ids?: number[]; user_ids?: number[] }) {
        try {
            const updated = await firstValueFrom(this.photoService.updatePhoto(photo.id, tags));
            photo.dogs = updated.dogs;
            photo.tagged_users = updated.tagged_users;
        } catch {
            this.toastService.error('No se pudo actualizar el etiquetado.');
        }
    }

    goToUpload() {
        this.router.navigate(['/galeria-fotos/subir']);
    }
}
