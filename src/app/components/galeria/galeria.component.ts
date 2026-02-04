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
        { url: '/Images/Perros/Ana y Pompa.jpeg', alt: 'Ana y Pompa' },
        { url: '/Images/Perros/Carysse.jpeg', alt: 'Carysse' },
        { url: '/Images/Perros/Cris y Peca.jpeg', alt: 'Cris y Peca' },
        { url: '/Images/Perros/Diego Tuco y Ponga.jpeg', alt: 'Diego Tuco y Ponga' },
        { url: '/Images/Perros/Fitiño y Fits.jpeg', alt: 'Fitiño y Fits' },
        { url: '/Images/Perros/Golti.jpeg', alt: 'Golti' },
        { url: '/Images/Perros/Helena y Pumba.jpeg', alt: 'Helena y Pumba' },
        { url: '/Images/Perros/Jesús y Ginebra.jpeg', alt: 'Jesús y Ginebra' },
        { url: '/Images/Perros/Kinder.jpeg', alt: 'Kinder' },
        { url: '/Images/Perros/Lyan y Boo.jpeg', alt: 'Lyan y Boo' },
        { url: '/Images/Perros/Lyan y Shaggy.jpeg', alt: 'Lyan y Shaggy' },
        { url: '/Images/Perros/Magda y Balto.jpeg', alt: 'Magda y Balto' },
        { url: '/Images/Perros/Marina-Chris Dafne.jpeg', alt: 'Marina-Chris Dafne' },
        { url: '/Images/Perros/Merle y Noly.jpeg', alt: 'Merle y Noly' },
        { url: '/Images/Perros/Moka.jpeg', alt: 'Moka' },
        { url: '/Images/Perros/Nala y Rosa.jpeg', alt: 'Nala y Rosa' },
        { url: '/Images/Perros/Narcea.jpeg', alt: 'Narcea' },
        { url: '/Images/Perros/Pompa.jpeg', alt: 'Pompa' },
        { url: '/Images/Perros/Pumba.jpeg', alt: 'Pumba' },
        { url: '/Images/Perros/Raylee.jpeg', alt: 'Raylee' }
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
