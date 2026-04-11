import { Component, Input, SimpleChanges, OnChanges, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dog } from '../../models/dog.model';
import { getEmojiForCategory } from '../../utils/point-categories';

@Component({
    selector: 'app-ficha-perro',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './ficha-perro.component.html',
    styleUrl: './ficha-perro.component.css'
})
export class FichaPerroComponent implements OnChanges {
    @Input({ required: true }) dog!: Dog;
    readonly isOpen = input(false);
    readonly close = output<void>();

    // Image Modal state
    imageModalOpen = false;

    ngOnChanges(changes: SimpleChanges) {
        // Handle any open/close logic if needed
    }

    closeModal() {
        this.close.emit();
    }

    // Prevent closing when clicking inside the modal content
    stopPropagation(event: Event) {
        event.stopPropagation();
    }

    openImageModal() {
        if(this.dog.photo_url) {
            this.imageModalOpen = true;
        }
    }

    closeImageModal(event?: Event) {
        if (event) {
            event.stopPropagation();
        }
        this.imageModalOpen = false;
    }

    getFormattedAge(): string {
        if (!this.dog || !this.dog.birth_date) {
            return 'No especificada';
        }

        const birthDate = new Date(this.dog.birth_date);
        const today = new Date();

        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();

        if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
            years--;
            months += 12;
        }

        if (today.getDate() < birthDate.getDate()) {
             months--;
             if(months < 0) {
                 months = 11;
             }
        }

        let ageString = '';
        if (years > 0) {
            ageString += `${years} ${years === 1 ? 'año' : 'años'}`;
        }
        
        if (months > 0) {
            if (years > 0) ageString += ' y ';
            ageString += `${months} ${months === 1 ? 'mes' : 'meses'}`;
        }

        if (years === 0 && months === 0) {
            return 'Menos de 1 mes';
        }

        return ageString;
    }

    getFormattedHistoryDate(dateString: string): string {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    getEmoji(category: string, points: number): string {
        return getEmojiForCategory(category, points);
    }
}
