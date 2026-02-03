import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

interface GalleryImage {
    url: string;
    alt: string;
}

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
export class GaleriaComponent {
    // Real images extracted from agilityasturias.com
    images = signal<GalleryImage[]>([
        { url: 'https://files.123inventatuweb.com/8b/0b/8b0b3c88-427e-4a88-91cf-fe85bc7c29c2.jpeg', alt: 'Agility Asturias Slide' },
        { url: 'https://files.123inventatuweb.com/51/81/5181677e-0b5d-40be-a5c7-9fc856e082ee.jpg', alt: 'Agility Dog Jumping' },
        { url: 'https://imagecdn.123inventatuweb.com/36/52/36524045-e7dd-4758-bdea-2dd5b062b94a.jpeg', alt: 'Dog Agility Course' },
        { url: 'https://imagecdn.123inventatuweb.com/05/a3/05a394a4-0f1d-470c-ba3d-4c5326c0f40f.jpeg', alt: 'Agility Training' },
        { url: 'https://imagecdn.123inventatuweb.com/6a/f0/6af0de33-7414-4478-9f8e-335624167e93.jpeg', alt: 'Competition Day' },
        { url: 'https://imagecdn.123inventatuweb.com/1c/af/1cafe345-7080-49d7-bc1e-767ad3c18251.jpeg', alt: 'Agility Action' },
        { url: 'https://imagecdn.123inventatuweb.com/85/0a/850a6c51-0138-4b6f-b5c7-c0240fdbab05.jpeg', alt: 'Agility Jump' },
        { url: 'https://files.123inventatuweb.com/d1/37/d137b7c8-4901-4933-bda0-5924d440b920.jpeg', alt: 'Agility Practice' },
        { url: 'https://files.123inventatuweb.com/67/6d/676dee79-7a27-4b44-bb97-4938d27035d7.jpeg', alt: 'Dog Speed' },
        { url: 'https://files.123inventatuweb.com/ad/c7/adc7219c-9425-4af2-b565-8f1307a62c78.jpeg', alt: 'Agility Fun' },
        { url: 'https://files.123inventatuweb.com/bb/cd/bbcdfa94-9b9f-4a36-97e8-e1091fbe96af.jpeg', alt: 'Agility Team' }
    ]);

    lightboxOpen = signal(false);
    currentImageIndex = signal(0);

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
