import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DogService } from '../../../services/dog.service';
import { CompetitionService } from '../../../services/competition.service';
import { PhotoService } from '../../../services/photo.service';
import { ToastService } from '../../../services/toast.service';
import { ImageCompressorService } from '../../../services/image-compressor.service';
import { AuthService } from '../../../services/auth.service';
import { Dog } from '../../../models/dog.model';
import { Photo, PhotoStorageStats, PHOTO_CATEGORIES, PHOTO_TYPES } from '../../../models/photo.model';
import { extractExifDate } from '../../../utils/exif-date.util';
import { firstValueFrom } from 'rxjs';

interface PhotoUploadItem {
    file: File;
    previewUrl: string;
    status: 'pending' | 'compressing' | 'uploading' | 'done' | 'error';
    error?: string;
    photo?: Photo;
    // Estado de refinado del paso 2
    photoType: string;
    title: string;
    dogIds: number[];
    userIds: number[];
    saving: boolean;
    saved: boolean;
}

const MAX_FILES = 30;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB por foto original
const UPLOAD_CONCURRENCY = 3;

@Component({
    selector: 'app-upload-photos',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './upload-photos.component.html',
    styleUrl: './upload-photos.component.css'
})
export class UploadPhotosComponent implements OnInit, OnDestroy {
    private fb = inject(FormBuilder);
    public dogService = inject(DogService);
    public compService = inject(CompetitionService);
    private photoService = inject(PhotoService);
    private toastService = inject(ToastService);
    private compressor = inject(ImageCompressorService);
    private router = inject(Router);
    private cdr = inject(ChangeDetectorRef);
    public authService = inject(AuthService);

    categories = PHOTO_CATEGORIES;
    photoTypes = PHOTO_TYPES;

    uploadForm: FormGroup;
    items = signal<PhotoUploadItem[]>([]);
    isDragging = signal<boolean>(false);
    isUploading = signal<boolean>(false);
    uploadedCount = signal<number>(0);
    step = signal<1 | 2>(1);
    storageStats = signal<PhotoStorageStats | null>(null);
    members = signal<{ id: number; name: string }[]>([]);

    constructor() {
        this.uploadForm = this.fb.group({
            category: ['', Validators.required],
            competition_id: [''],
            taken_at: ['', Validators.required],
        });

        // Competición obligatoria solo cuando la categoría es 'competicion'
        this.uploadForm.get('category')?.valueChanges.subscribe(category => {
            const compControl = this.uploadForm.get('competition_id');
            if (category === 'competicion') {
                compControl?.setValidators([Validators.required]);
            } else {
                compControl?.clearValidators();
                compControl?.setValue('');
            }
            compControl?.updateValueAndValidity();
        });
    }

    ngOnInit() {
        this.dogService.loadAllDogs();

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        this.uploadForm.patchValue({ taken_at: today });

        this.photoService.getStorageStats().subscribe({
            next: stats => { this.storageStats.set(stats); },
            error: () => { /* la cuota se valida igualmente en el backend */ }
        });

        this.authService.getMinimalUsers()
            .then(users => { this.members.set(users); })
            .catch(() => { this.members.set([]); });
    }

    ngOnDestroy() {
        this.items().forEach(item => URL.revokeObjectURL(item.previewUrl));
    }

    get isCompetitionCategory(): boolean {
        return this.uploadForm.get('category')?.value === 'competicion';
    }

    get sortedDogs(): Dog[] {
        const dogs = this.dogService.getAllDogs()() || [];
        return [...dogs].sort((a, b) => a.name.localeCompare(b.name));
    }

    get pastAndCurrentCompetitions() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return this.compService.getCompetitions()()
            .filter(comp => {
                if (!comp.fechaEvento) return true;
                const parts = comp.fechaEvento.substring(0, 10).split('-');
                const compDate = parts.length === 3 ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(0);
                return compDate.getTime() <= today.getTime();
            })
            .slice(0, 10);
    }

    // ---- Selección de archivos ----

    onFilesSelected(event: any) {
        this.addFiles(Array.from(event.target.files ?? []));
        event.target.value = '';
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(true);
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);
        this.addFiles(Array.from(event.dataTransfer?.files ?? []));
    }

    private async addFiles(files: File[]) {
        const images = files.filter(f => f.type.startsWith('image/'));
        if (images.length < files.length) {
            this.toastService.error('Algunos archivos no eran imágenes y se han descartado.');
        }

        const newItems: PhotoUploadItem[] = [];
        for (const file of images) {
            if (this.items().length + newItems.length >= MAX_FILES) {
                this.toastService.error(`Máximo ${MAX_FILES} fotos por lote. Las demás se han descartado.`);
                break;
            }
            if (file.size > MAX_FILE_SIZE) {
                this.toastService.error(`"${file.name}" supera los 20MB y se ha descartado.`);
                continue;
            }
            newItems.push({
                file,
                previewUrl: URL.createObjectURL(file),
                status: 'pending',
                photoType: '',
                title: '',
                dogIds: [],
                userIds: [],
                saving: false,
                saved: false,
            });
        }

        if (newItems.length > 0) {
            this.items.update(prev => [...prev, ...newItems]);
        }

        // Autorrellenar la fecha desde el EXIF de la primera foto del lote
        if (this.items().length > 0) {
            const exifDate = await extractExifDate(this.items()[0].file);
            if (exifDate) {
                this.uploadForm.patchValue({ taken_at: exifDate });
                this.cdr.detectChanges();
            }
        }
    }

    removeItem(item: PhotoUploadItem) {
        URL.revokeObjectURL(item.previewUrl);
        this.items.update(prev => prev.filter(i => i !== item));
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    pendingCount = computed(() => {
        return this.items().filter(i => i.status !== 'done').length;
    });

    errorItems = computed(() => {
        return this.items().filter(i => i.status === 'error');
    });

    doneItems = computed(() => {
        return this.items().filter(i => i.status === 'done');
    });

    // ---- Subida del lote ----

    async onSubmit() {
        if (this.uploadForm.invalid) {
            this.uploadForm.markAllAsTouched();
            this.toastService.error('Completa los campos obligatorios antes de subir.');
            return;
        }
        if (this.items().length === 0) {
            this.toastService.error('Añade al menos una foto.');
            return;
        }

        this.isUploading.set(true);
        this.uploadedCount.set(this.doneItems().length);

        const queue = this.items().filter(i => i.status === 'pending' || i.status === 'error');
        const workers = Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, async () => {
            while (queue.length > 0) {
                const item = queue.shift();
                if (!item) break;
                await this.uploadItem(item);
            }
        });

        await Promise.all(workers);

        this.isUploading.set(false);
        this.cdr.detectChanges();

        if (this.errorItems().length === 0) {
            this.toastService.success(`${this.doneItems().length} fotos subidas correctamente.`);
            this.step.set(2);
        } else {
            this.toastService.error(`${this.errorItems().length} fotos fallaron. Puedes reintentarlas o continuar sin ellas.`);
        }
    }

    private async uploadItem(item: PhotoUploadItem) {
        try {
            item.status = 'compressing';
            item.error = undefined;
            this.cdr.detectChanges();

            const [display, thumb] = await Promise.all([
                this.compressor.compress(item.file, { maxDimension: 1920, quality: 0.8, forceWebp: true }),
                this.compressor.compress(item.file, { maxDimension: 400, quality: 0.7, forceWebp: true, suffix: '_thumb' }),
            ]);

            item.status = 'uploading';
            this.cdr.detectChanges();

            const photo = await firstValueFrom(this.photoService.uploadPhoto(display, thumb, {
                category: this.uploadForm.get('category')?.value,
                competition_id: this.isCompetitionCategory ? this.uploadForm.get('competition_id')?.value : null,
                taken_at: this.uploadForm.get('taken_at')?.value,
            }));

            item.photo = photo;
            item.status = 'done';
            this.uploadedCount.update(c => c + 1);
        } catch (err: any) {
            item.status = 'error';
            item.error = err?.error?.message || 'Error al subir la foto.';
            // Si es por cuota, no tiene sentido seguir intentándolo
            if (err?.status === 403) {
                this.toastService.error(item.error ?? 'Límite de almacenamiento excedido.');
            }
        } finally {
            this.cdr.detectChanges();
        }
    }

    retryItem(item: PhotoUploadItem) {
        if (this.isUploading()) return;
        item.status = 'pending';
        this.onSubmit();
    }

    continueWithoutFailed() {
        this.errorItems().forEach(item => this.removeItem(item));
        if (this.doneItems().length > 0) {
            this.step.set(2);
        }
    }

    // ---- Paso 2: refinado opcional ----

    addDogTag(item: PhotoUploadItem, event: any) {
        const dogId = Number(event.target.value);
        if (dogId && !item.dogIds.includes(dogId)) {
            item.dogIds = [...item.dogIds, dogId];
            item.saved = false;
        }
        event.target.value = '';
    }

    removeDogTag(item: PhotoUploadItem, dogId: number) {
        item.dogIds = item.dogIds.filter(id => id !== dogId);
        item.saved = false;
    }

    addUserTag(item: PhotoUploadItem, event: any) {
        const userId = Number(event.target.value);
        if (userId && !item.userIds.includes(userId)) {
            item.userIds = [...item.userIds, userId];
            item.saved = false;
        }
        event.target.value = '';
    }

    removeUserTag(item: PhotoUploadItem, userId: number) {
        item.userIds = item.userIds.filter(id => id !== userId);
        item.saved = false;
    }

    markDirty(item: PhotoUploadItem) {
        item.saved = false;
    }

    dogName(dogId: number): string {
        return this.sortedDogs.find(d => d.id === dogId)?.name ?? `#${dogId}`;
    }

    memberName(userId: number): string {
        return this.members().find(m => m.id === userId)?.name ?? `#${userId}`;
    }

    private itemHasChanges(item: PhotoUploadItem): boolean {
        return !!(item.photoType || item.title || item.dogIds.length || item.userIds.length);
    }

    async saveItemDetails(item: PhotoUploadItem) {
        if (!item.photo || item.saving) return;
        item.saving = true;
        try {
            const photo = await firstValueFrom(this.photoService.updatePhoto(item.photo.id, {
                photo_type: item.photoType || null,
                title: item.title || null,
                dog_ids: item.dogIds,
                user_ids: item.userIds,
            }));
            item.photo = photo;
            item.saved = true;
        } catch {
            this.toastService.error('Error al guardar los detalles de la foto.');
        } finally {
            item.saving = false;
            this.cdr.detectChanges();
        }
    }

    async finish() {
        // Guarda silenciosamente cualquier cambio pendiente antes de salir
        const dirty = this.doneItems().filter(i => !i.saved && this.itemHasChanges(i));
        for (const item of dirty) {
            await this.saveItemDetails(item);
        }
        this.router.navigate(['/galeria-fotos']);
    }

    cancel() {
        this.router.navigate(['/galeria-fotos']);
    }
}
