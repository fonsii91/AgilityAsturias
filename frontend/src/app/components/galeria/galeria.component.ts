import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { GalleryService, GalleryPhoto } from '../../services/gallery.service';
import { AuthService } from '../../services/auth.service';
import { ImageCompressorService } from '../../services/image-compressor.service';

@Component({
    selector: 'app-galeria',
    standalone: true,
    imports: [CommonModule],
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
            this.isUploading.set(true);
            try {
                const compressedFile = await this.imageCompressor.compress(file);
                const altText = prompt('Introduce un título alternativo para la foto (opcional):') || 'Foto de galería';

                this.galleryService.uploadPhoto(compressedFile, altText).subscribe({
                    next: (photo) => {
                        this.images.update(current => [photo, ...current]);
                        this.isUploading.set(false);
                    },
                    error: (err) => {
                        console.error('Error uploading photo', err);
                        this.isUploading.set(false);
                        alert('Error al subir la foto');
                    }
                });
            } catch (err) {
                console.error('Compression error', err);
                this.isUploading.set(false);
                alert('Error al comprimir la foto');
            }
        }
        event.target.value = '';
    }

    deletePhoto(id: number, event: Event) {
        event.stopPropagation();
        if (confirm('¿Estás seguro de que deseas eliminar esta foto destacada?')) {
            this.galleryService.deletePhoto(id).subscribe({
                next: () => {
                    this.images.update(current => current.filter(img => img.id !== id));
                    if (this.lightboxOpen()) {
                        this.closeLightbox();
                    }
                },
                error: (err) => {
                    console.error('Error deleting photo', err);
                    alert('Error al eliminar la foto');
                }
            });
        }
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
