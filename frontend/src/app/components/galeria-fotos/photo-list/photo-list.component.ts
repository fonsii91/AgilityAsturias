import { Component, OnInit, inject, HostListener, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PhotoService, PhotoFilters, PhotoUploadMetadata } from '../../../services/photo.service';
import { DogService } from '../../../services/dog.service';
import { CompetitionService } from '../../../services/competition.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { Photo, PhotoStorageStats, PHOTO_CATEGORIES, PHOTO_TYPES, photoCategoryLabel, photoTypeLabel } from '../../../models/photo.model';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { EmptyStateComponent } from '../../ui/empty-state/empty-state';
import { InstruccionesComponent } from '../../shared/instrucciones/instrucciones.component';

@Component({
    selector: 'app-photo-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, EmptyStateComponent, InstruccionesComponent],
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
    filterMember = signal<string>('');
    searchTerm = signal<string>('');
    private searchDebounce: any = null;

    // Panel de filtros avanzados (Tipo/Perro/Miembro/Competición) plegable
    isFiltersOpen = signal<boolean>(false);

    // Lightbox
    selectedPhoto = signal<Photo | null>(null);
    isEditingTags = signal<boolean>(false);
    // Edición colaborativa de metadatos (cualquier miembro)
    isEditingMeta = signal<boolean>(false);
    isSavingMeta = signal<boolean>(false);
    editMeta = { title: '', category: '', photo_type: '', competition_id: '', taken_at: '' };
    isDeleting = signal<boolean>(false);
    pendingDelete = signal<Photo | null>(null);
    showSidebar = signal<boolean>(true);
    members = signal<{ id: number; name: string }[]>([]);

    // Gesto de deslizar horizontal en móvil: pasa la tarjeta entera (imagen + datos)
    swipeOffset = signal<number>(0);   // desplazamiento horizontal (px) mientras se arrastra
    isSwiping = signal<boolean>(false);
    private touchStartX = 0;
    private touchStartY = 0;
    private touchActive = false;

    // Ajuste colaborativo del punto focal (encuadre con object-fit: cover)
    isEditingFocal = signal<boolean>(false);
    focalDraft = signal<{ x: number; y: number }>({ x: 50, y: 50 });
    private focalDragging = false;

    ngOnInit() {
        this.dogService.loadAllDogs();
        this.loadPhotos(true);
        this.authService.getMinimalUsers()
            .then(users => { this.members.set(users); })
            .catch(() => { this.members.set([]); });
    }

    hasActiveFilters = computed<boolean>(() => !!(
        this.filterCategory() || this.filterType() || this.filterDog() ||
        this.filterMember() || this.filterCompetition() || this.searchTerm()
    ));

    // Mostrar la barra de filtros solo si hay fotos o algún filtro aplicado
    showFilters = computed<boolean>(() => this.photos().length > 0 || this.hasActiveFilters());

    // Filtros avanzados (los plegables): excluye solo la búsqueda, que queda siempre visible
    hasAdvancedFilters = computed<boolean>(() => !!(
        this.filterCategory() || this.filterType() || this.filterDog() || this.filterMember() || this.filterCompetition()
    ));

    filters = computed<PhotoFilters>(() => {
        return {
            category: this.filterCategory() || undefined,
            photo_type: this.filterType() || undefined,
            competition_id: this.filterCompetition() || undefined,
            dog_id: this.filterDog() || undefined,
            tagged_user_id: this.filterMember() || undefined,
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

    onCategoryChange() {
        // "Competición" solo aplica dentro de la categoría Competición: al salir, se limpia.
        if (this.filterCategory() !== 'competicion' && this.filterCompetition()) {
            this.filterCompetition.set('');
        }
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

    private dogIsMine(dog: { users?: Array<{ id: number }> }, userId: number | null): boolean {
        return !!userId && !!dog.users?.some(u => u.id === userId);
    }

    /** Perros del usuario actual, ordenados alfabéticamente (van primero y destacados). */
    myDogs = computed(() => {
        const uid = this.authService.currentUserSignal()?.id ?? null;
        return this.dogs().filter(d => this.dogIsMine(d, uid))
            .sort((a, b) => a.name.localeCompare(b.name));
    });

    /** Resto de perros del club, ordenados alfabéticamente. */
    otherDogs = computed(() => {
        const uid = this.authService.currentUserSignal()?.id ?? null;
        return this.dogs().filter(d => !this.dogIsMine(d, uid))
            .sort((a, b) => a.name.localeCompare(b.name));
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
        this.isEditingMeta.set(false);
        this.showSidebar.set(true);
        document.body.style.overflow = 'hidden';
    }

    toggleSidebar() {
        this.showSidebar.update(v => !v);
    }

    closePhoto() {
        this.selectedPhoto.set(null);
        this.isEditingTags.set(false);
        this.isEditingMeta.set(false);
        this.isEditingFocal.set(false);
        this.isSwiping.set(false);
        this.swipeOffset.set(0);
        document.body.style.overflow = '';
    }

    @HostListener('document:keydown.escape')
    onEscape() {
        // El modal de confirmación tiene prioridad sobre el cierre del visor.
        if (this.pendingDelete()) { this.cancelDelete(); return; }
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
            this.isEditingMeta.set(false);
            this.isEditingFocal.set(false);
        }
        // Al acercarse al final de lo cargado, pide la siguiente página para no cortar.
        if (direction === 1 && index >= this.photos().length - 3) {
            this.loadMore();
        }
    }

    // ---- Gesto de deslizar horizontal (pasa la tarjeta entera, solo móvil) ----

    /**
     * El gesto se activa en cualquier dispositivo táctil, independientemente de
     * la orientación: por ancho un móvil en horizontal supera los 820px, así que
     * nos apoyamos sobre todo en el puntero "grueso" (táctil).
     */
    private isMobileViewport(): boolean {
        if (typeof window === 'undefined') return false;
        return window.matchMedia?.('(pointer: coarse)')?.matches || window.innerWidth <= 820;
    }

    /** Opacidad de la tarjeta durante el arrastre: se atenúa al alejarse. */
    swipeOpacity = computed<number>(() => {
        const d = Math.abs(this.swipeOffset());
        return d ? Math.max(0.5, 1 - d / 600) : 1;
    });

    onTouchStart(event: TouchEvent) {
        if (this.isEditingFocal() || !this.isMobileViewport() || event.touches.length !== 1) return;
        const t = event.touches[0];
        this.touchStartX = t.clientX;
        this.touchStartY = t.clientY;
        this.touchActive = true;
        this.isSwiping.set(false);
    }

    onTouchMove(event: TouchEvent) {
        if (!this.touchActive || event.touches.length !== 1) return;
        const t = event.touches[0];
        const dx = t.clientX - this.touchStartX;
        const dy = t.clientY - this.touchStartY;
        // Solo lo tratamos como swipe si es predominantemente horizontal;
        // si es vertical, lo dejamos al scroll nativo del panel de datos.
        if (!this.isSwiping()) {
            if (Math.abs(dx) < 10) return;
            if (Math.abs(dx) <= Math.abs(dy)) { this.touchActive = false; return; }
            this.isSwiping.set(true);
        }
        this.swipeOffset.set(dx);
    }

    onTouchEnd() {
        if (!this.touchActive && !this.isSwiping()) return;
        const dx = this.swipeOffset();
        const threshold = 70;
        if (this.isSwiping() && Math.abs(dx) > threshold) {
            // Deslizar a la izquierda → siguiente; a la derecha → anterior.
            this.navigatePhoto(dx < 0 ? 1 : -1);
        }
        this.touchActive = false;
        this.isSwiping.set(false);
        this.swipeOffset.set(0);
    }

    // ---- Interacción con la imagen del visor ----
    // Un único punto de entrada para los punteros sobre la imagen: si se está
    // ajustando el encuadre coloca el punto focal; si no, arrastra con el ratón
    // para pasar de foto. Los botones de la barra superior son un subárbol
    // aparte, así que sus clics nunca pasan por aquí (no quedan bloqueados).
    private mouseDragging = false;
    private mouseStartX = 0;

    onImagePointerDown(event: PointerEvent) {
        if (this.isEditingFocal()) {
            (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
            this.focalDragging = true;
            this.updateFocalFromEvent(event);
            return;
        }
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        this.mouseStartX = event.clientX;
        this.mouseDragging = true;
        this.isSwiping.set(false);
        (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    }

    onImagePointerMove(event: PointerEvent) {
        if (this.isEditingFocal()) {
            if (this.focalDragging) this.updateFocalFromEvent(event);
            return;
        }
        if (!this.mouseDragging) return;
        const dx = event.clientX - this.mouseStartX;
        if (!this.isSwiping()) {
            if (Math.abs(dx) < 10) return;
            this.isSwiping.set(true);
        }
        this.swipeOffset.set(dx);
    }

    onImagePointerUp() {
        if (this.isEditingFocal()) {
            if (this.focalDragging) { this.focalDragging = false; this.saveFocal(); }
            return;
        }
        if (!this.mouseDragging) return;
        this.mouseDragging = false;
        const dx = this.swipeOffset();
        if (this.isSwiping() && Math.abs(dx) > 70) {
            this.navigatePhoto(dx < 0 ? 1 : -1);
        }
        this.isSwiping.set(false);
        this.swipeOffset.set(0);
    }

    // ---- Punto focal colaborativo (encuadre para object-fit: cover) ----

    /** object-position de la foto, con el centro (50/50) como valor por defecto. */
    focalPosition(photo: Photo): string {
        return `${photo.focal_x ?? 50}% ${photo.focal_y ?? 50}%`;
    }

    startEditFocal(photo: Photo) {
        this.focalDraft.set({ x: photo.focal_x ?? 50, y: photo.focal_y ?? 50 });
        this.isEditingFocal.set(true);
    }

    stopEditFocal() {
        this.isEditingFocal.set(false);
        this.focalDragging = false;
    }

    private updateFocalFromEvent(event: PointerEvent) {
        const el = event.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.round(Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)));
        const y = Math.round(Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100)));
        this.focalDraft.set({ x, y });
    }

    private async saveFocal() {
        const photo = this.selectedPhoto();
        if (!photo) return;
        const { x, y } = this.focalDraft();
        if (photo.focal_x === x && photo.focal_y === y) return;
        try {
            const updated = await firstValueFrom(this.photoService.updatePhoto(photo.id, { focal_x: x, focal_y: y }));
            this.applyPhotoUpdate(updated);
        } catch {
            this.toastService.error('No se pudo guardar el encuadre.');
        }
    }

    // ---- Edición colaborativa de metadatos ----

    startEditMeta(photo: Photo) {
        this.editMeta = {
            title: photo.title || '',
            category: photo.category || '',
            photo_type: photo.photo_type || '',
            competition_id: photo.competition_id ? String(photo.competition_id) : '',
            taken_at: (photo.taken_at || '').slice(0, 10),
        };
        this.isEditingMeta.set(true);
    }

    async saveMeta(photo: Photo) {
        if (this.isSavingMeta()) return;
        if (!this.editMeta.category) {
            this.toastService.error('La categoría es obligatoria.');
            return;
        }

        const isComp = this.editMeta.category === 'competicion';
        const payload: Partial<PhotoUploadMetadata> = {
            title: this.editMeta.title || null,
            category: this.editMeta.category,
            photo_type: this.editMeta.photo_type || null,
            taken_at: this.editMeta.taken_at,
            competition_id: isComp ? (this.editMeta.competition_id ? Number(this.editMeta.competition_id) : null) : null,
        };

        this.isSavingMeta.set(true);
        try {
            const updated = await firstValueFrom(this.photoService.updatePhoto(photo.id, payload));
            this.applyPhotoUpdate(updated);
            this.isEditingMeta.set(false);
            this.toastService.success('Datos actualizados.');
        } catch {
            this.toastService.error('No se pudieron guardar los cambios.');
        } finally {
            this.isSavingMeta.set(false);
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

    askDeletePhoto(photo: Photo) {
        this.pendingDelete.set(photo);
    }

    cancelDelete() {
        if (this.isDeleting()) return;
        this.pendingDelete.set(null);
    }

    async confirmDelete() {
        const photo = this.pendingDelete();
        if (!photo || this.isDeleting()) return;

        this.isDeleting.set(true);
        try {
            await firstValueFrom(this.photoService.deletePhoto(photo.id));
            this.photos.update(prev => prev.filter(p => p.id !== photo.id));
            this.total.update(t => t - 1);
            this.pendingDelete.set(null);
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
            this.applyPhotoUpdate({ ...photo, tagged_users: (photo.tagged_users ?? []).filter(u => u.id !== user?.id) });
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
            this.applyPhotoUpdate(updated);
        } catch {
            this.toastService.error('No se pudo actualizar el etiquetado.');
        }
    }

    /**
     * Aplica una actualización de foto de forma inmutable: reemplaza el objeto en
     * la lista y en la foto seleccionada para que las señales notifiquen y la
     * vista se refresque al instante (en vez de mutar el objeto in situ).
     */
    private applyPhotoUpdate(updated: Photo) {
        this.photos.update(list => list.map(p => p.id === updated.id ? updated : p));
        if (this.selectedPhoto()?.id === updated.id) {
            this.selectedPhoto.set(updated);
        }
    }

    goToUpload() {
        this.router.navigate(['/galeria-fotos/subir']);
    }
}
