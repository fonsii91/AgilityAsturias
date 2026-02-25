import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { GalleryService, GalleryPhoto } from '../../services/gallery.service';
import { AuthService } from '../../services/auth.service';
import { ImageCompressorService } from '../../services/image-compressor.service';
import { AddPhotoDialog, AddPhotoDialogData } from './add-photo-dialog/add-photo-dialog';
import { ConfirmDialog, ConfirmDialogData } from '../shared/confirm-dialog/confirm-dialog';

@Component({
    selector: 'app-galeria',
    standalone: true,
    imports: [CommonModule, MatDialogModule],
    templateUrl: './galeria.component.html',
    styleUrl: './galeria.component.css',
    animations: [
        trigger('listAnimation', [
            transition('* => *', [
                query(':enter', [
                    style({ opacity: 0, transform: 'translateY(20px)' }),
                    stagger(100, [
                        animate('0.5s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
                    ])
                ], { optional: true })
            ])
        ])
    ]
})
export class GaleriaComponent implements OnInit {
    images = signal<GalleryPhoto[]>([]);

    lightboxOpen = signal(false);
    currentImageIndex = signal(0);
    isUploading = signal(false);

    private galleryService = inject(GalleryService);
    private authService = inject(AuthService);
    private imageCompressor = inject(ImageCompressorService);
    private dialog = inject(MatDialog);

    isStaff = this.authService.isStaff;

    ngOnInit() {
        this.loadPhotos();
    }

    private loadPhotos() {
        this.galleryService.getPhotos().subscribe({
            next: (photos) => {
                this.images.set(photos);
            },
            error: (err) => console.error('Error loading gallery photos', err)
        });
    }

    async onFileSelected(event: any) {
        const file: File = event.target.files?.[0];
        if (file) {
            try {
                const compressedFile = await this.imageCompressor.compress(file);
                const previewUrl = URL.createObjectURL(compressedFile);

                const dialogRef = this.dialog.open(AddPhotoDialog, {
                    width: '500px',
                    data: { file: compressedFile, previewUrl } as AddPhotoDialogData
                });

                dialogRef.afterClosed().subscribe(altText => {
                    URL.revokeObjectURL(previewUrl);
                    if (altText !== undefined) {
                        this.uploadPhoto(compressedFile, altText);
                    }
                });
            } catch (err) {
                console.error('Compression error', err);
                this.dialog.open(ConfirmDialog, {
                    data: {
                        title: 'Error',
                        message: 'Error al comprimir la foto.',
                        cancelText: 'Cerrar'
                    } as ConfirmDialogData
                });
            }
        }
        event.target.value = '';
    }

    private uploadPhoto(file: File, altText: string) {
        this.isUploading.set(true);
        this.galleryService.uploadPhoto(file, altText).subscribe({
            next: (photo) => {
                this.images.update(current => [photo, ...current]);
                this.isUploading.set(false);
            },
            error: (err) => {
                console.error('Error uploading photo', err);
                this.isUploading.set(false);
                this.dialog.open(ConfirmDialog, {
                    data: {
                        title: 'Error',
                        message: 'Error al subir la foto.',
                        cancelText: 'Cerrar'
                    } as ConfirmDialogData
                });
            }
        });
    }

    deletePhoto(id: number, event: Event) {
        event.stopPropagation();

        const dialogRef = this.dialog.open(ConfirmDialog, {
            data: {
                title: 'Eliminar Foto',
                message: '¿Estás seguro de que deseas eliminar esta foto destacada?',
                confirmText: 'Eliminar',
                cancelText: 'Cancelar',
                isDestructive: true
            } as ConfirmDialogData
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.galleryService.deletePhoto(id).subscribe({
                    next: () => {
                        this.images.update(current => current.filter(img => img.id !== id));
                        if (this.lightboxOpen()) {
                            this.closeLightbox();
                        }
                    },
                    error: (err) => {
                        console.error('Error deleting photo', err);
                        this.dialog.open(ConfirmDialog, {
                            data: {
                                title: 'Error',
                                message: 'Error al eliminar la foto.',
                                cancelText: 'Cerrar'
                            } as ConfirmDialogData
                        });
                    }
                });
            }
        });
    }

    openLightbox(index: number) {
        this.currentImageIndex.set(index);
        this.lightboxOpen.set(true);
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    closeLightbox() {
        this.lightboxOpen.set(false);
        document.body.style.overflow = 'auto'; // Restore scrolling
    }

    nextImage(event?: Event) {
        event?.stopPropagation();
        const current = this.currentImageIndex();
        const total = this.images().length;
        this.currentImageIndex.set((current + 1) % total);
    }

    prevImage(event?: Event) {
        event?.stopPropagation();
        const current = this.currentImageIndex();
        const total = this.images().length;
        this.currentImageIndex.set((current - 1 + total) % total);
    }
}
