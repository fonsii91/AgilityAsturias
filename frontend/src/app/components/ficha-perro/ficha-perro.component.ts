import { Component, Input, SimpleChanges, OnChanges, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dog } from '../../models/dog.model';
import { DogService } from '../../services/dog.service';
import { ImageCompressorService } from '../../services/image-compressor.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { getEmojiForCategory } from '../../utils/point-categories';

@Component({
    selector: 'app-ficha-perro',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './ficha-perro.component.html',
    styleUrl: './ficha-perro.component.css'
})
export class FichaPerroComponent implements OnChanges {
    @Input({ required: true }) dog!: Dog;
    readonly isOpen = input(false);
    readonly startInEditMode = input(false);

    readonly close = output<void>();
    readonly save = output<Partial<Dog>>();

    dogService = inject(DogService);
    imageCompressor = inject(ImageCompressorService);
    toastService = inject(ToastService);
    authService = inject(AuthService);

    isEditing = false;
    editForm: Partial<Dog> = {};

    // Image Modal state
    imageModalOpen = false;

    ngOnChanges(changes: SimpleChanges) {
        if (changes['isOpen'] && changes['isOpen'].currentValue) {
            this.isEditing = this.startInEditMode();
        }

        if (this.dog) {
            if (!this.isEditing || (changes['isOpen'] && changes['isOpen'].currentValue && this.isEditing)) {
                this.editForm = {
                    name: this.dog.name,
                    breed: this.dog.breed,
                    birth_date: this.dog.birth_date,
                    license_expiration_date: this.dog.license_expiration_date,
                    microchip: this.dog.microchip,
                    pedigree: this.dog.pedigree
                };
            }
        }
    }

    toggleEdit() {
        this.isEditing = !this.isEditing;
        if (!this.isEditing) {
            // Cancel edit: reset form
            this.editForm = {
                name: this.dog.name,
                breed: this.dog.breed,
                birth_date: this.dog.birth_date,
                license_expiration_date: this.dog.license_expiration_date,
                microchip: this.dog.microchip,
                pedigree: this.dog.pedigree
            };
        }
    }

    saveChanges() {
        if (!this.editForm.name?.trim()) return;
        
        this.save.emit(this.editForm);
        this.isEditing = false;
    }

    closeModal() {
        // TODO: The 'emit' function requires a mandatory void argument
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

    async onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            try {
                const compressedFile = await this.imageCompressor.compress(file);
                this.uploadDogPhoto(this.dog.id, compressedFile);
            } catch (error) {
                console.error('Error compressing dog image:', error);
                this.toastService.error('Error al procesar la imagen del perro.');
            }
        }
    }

    async uploadDogPhoto(dogId: number, file: File) {
        try {
            const updatedDog = await this.dogService.updateDogPhoto(dogId, file);
            this.dog = updatedDog; // Update local dog object with new photo
            this.toastService.success('Foto actualizada con éxito');
        } catch (error: any) {
            console.error('Error uploading dog photo:', error);
            this.toastService.error('Error al subir la foto del perro');
        }
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

    getFormattedLicenseExpirationDate(): string {
        if (!this.dog || !this.dog.license_expiration_date) {
            return 'No especificada';
        }

        const date = new Date(this.dog.license_expiration_date);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
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

    isOwner(): boolean {
        const currentUser = this.authService.userProfileSignal();
        if (!currentUser || !this.dog) return false;
        
        if (this.dog.users && this.dog.users.some((u: any) => u.id == currentUser.id)) return true;

        return false;
    }

    // Share Dog feature
    isSharing = false;
    shareEmail = '';
    usersList: {id: number, name: string, email: string}[] = [];
    isFetchingUsers = false;

    async toggleShare() {
        this.isSharing = !this.isSharing;
        this.shareEmail = '';
        if (this.isSharing && this.usersList.length === 0) {
            this.isFetchingUsers = true;
            try {
                const users = await this.authService.getMinimalUsers();
                const currentUser = this.authService.userProfileSignal();
                
                const existingOwnerIds = this.dog?.users?.map((u: any) => u.id) || [];
                if (currentUser) {
                    existingOwnerIds.push(currentUser.id);
                }

                this.usersList = users.filter((u: any) => !existingOwnerIds.includes(u.id));
            } catch (error) {
                console.error('Error fetching users for share:', error);
                this.toastService.error('Error al cargar la lista de usuarios.');
            } finally {
                this.isFetchingUsers = false;
            }
        }
    }

    async submitShare() {
        if (!this.shareEmail) return;
        try {
            const updatedDog = await this.dogService.shareDog(this.dog.id, this.shareEmail);
            this.dog = updatedDog; // Update local dog object so the ownership changes
            this.toastService.success('Perro compartido exitosamente.');
            this.isSharing = false;
        } catch (error: any) {
            const msg = error?.error?.message || 'Error al compartir el perro.';
            this.toastService.error(msg);
        }
    }
}
