import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';
import { ImageCompressorService } from '../../services/image-compressor.service';
import { ToastService } from '../../services/toast.service';
import { Dog } from '../../models/dog.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil {
  authService = inject(AuthService);
  dogService = inject(DogService);
  imageCompressor = inject(ImageCompressorService);
  toastService = inject(ToastService);

  dogs = this.dogService.getDogs();

  // Image Modal state
  imageModalOpen = signal(false);
  selectedImage = signal<string | null>(null);



  // Profile editing state
  isEditingProfile = signal(false);
  editedName: string = '';
  editedBirthYear: number | null = null;
  
  // RFEC editing state
  isEditingRfec = signal(false);
  rfecData: { license: string; expiration: string; category: string } = { license: '', expiration: '', category: '' };

  // Branding theme
  clubTheme = environment.clubConfig.colors;

  constructor() {
    effect(() => {
      const user = this.authService.currentUserSignal();
      if (user) {
        this.dogService.loadUserDogs();
        this.editedName = user.name;
        this.editedBirthYear = user.birth_year || null;
        this.rfecData = { 
            license: user.rfec_license || '', 
            expiration: user.rfec_expiration_date ? user.rfec_expiration_date.split('T')[0] : '',
            category: user.rfec_category || ''
        };
      }
    }, { allowSignalWrites: true });
  }

  toggleEditProfile() {
    this.isEditingProfile.set(!this.isEditingProfile());
    if (this.isEditingProfile()) {
      const user = this.authService.currentUserSignal();
      if (user) {
        this.editedName = user.name;
        this.editedBirthYear = user.birth_year || null;
      }
    }
  }

  toggleEditRfec() {
    this.isEditingRfec.set(!this.isEditingRfec());
    if (this.isEditingRfec()) {
      const user = this.authService.currentUserSignal();
      if (user) {
        this.rfecData = { 
            license: user.rfec_license || '', 
            expiration: user.rfec_expiration_date ? user.rfec_expiration_date.split('T')[0] : '',
            category: user.rfec_category || ''
        };
      }
    }
  }

  // File upload state for user avatar
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isUploadingPhoto = signal(false);

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploadingPhoto.set(true);
      this.imageCompressor.compress(file).then(compressedFile => {
        this.selectedFile = compressedFile;

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => this.previewUrl = e.target?.result as string;
        reader.readAsDataURL(compressedFile);

        // Auto-upload
        this.uploadPhoto(compressedFile);
      }).catch(error => {
        console.error('Error compressing image:', error);
        this.toastService.error('Error al procesar la imagen.');
      });
    }
  }

  async uploadPhoto(file: File) {
    try {
      const user = this.authService.currentUserSignal();
      if (!user) return;

      await this.authService.updateProfile(user.name, file);
      this.toastService.success('Foto de perfil actualizada correctamente');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      let errorMsg = 'Error al subir la foto';
      if (error.error) {
        if (error.status === 422 && error.error.errors) {
          const firstErrorKey = Object.keys(error.error.errors)[0];
          errorMsg = error.error.errors[firstErrorKey][0];
        } else if (error.error.message) {
          errorMsg = error.error.message;
        }
      }
      this.toastService.error(errorMsg);
    } finally {
      this.isUploadingPhoto.set(false);
    }
  }

  async saveProfile() {
    if (!this.editedName.trim()) return;

    try {
      const user = this.authService.currentUserSignal();
      let calculatedCategory = user?.rfec_category;

      if (this.editedBirthYear && (!user?.birth_year || user.birth_year !== this.editedBirthYear)) {
        const age = new Date().getFullYear() - this.editedBirthYear;
        if (age < 14) calculatedCategory = 'Infantil';
        else if (age >= 14 && age <= 17) calculatedCategory = 'Junior';
        else if (age >= 18 && age <= 54) calculatedCategory = '';
        else if (age >= 55) calculatedCategory = 'Senior';
      }

      await this.authService.updateProfile(
        this.editedName,
        undefined,
        undefined,
        undefined,
        calculatedCategory,
        this.editedBirthYear
      );
      this.isEditingProfile.set(false);
      this.toastService.success('Perfil actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      let errorMsg = 'Error al actualizar el perfil';
      if (error.error && error.error.message) {
        errorMsg = error.error.message;
      }
      this.toastService.error(errorMsg);
    }
  }



  async saveRfec() {
    try {
      const user = this.authService.currentUserSignal();
      if(!user) return;
      await this.authService.updateProfile(
          user.name, 
          undefined, 
          this.rfecData.license || '', 
          this.rfecData.expiration || '',
          this.rfecData.category || '',
          undefined
      );
      this.isEditingRfec.set(false);
      this.toastService.success('Licencia RFEC actualizada');
    } catch (error) {
      console.error('Error updating RFEC:', error);
      this.toastService.error('Error al actualizar licencia RFEC');
    }
  }

  openImageModal(imageUrl: string | null) {
    if (imageUrl) {
      this.selectedImage.set(imageUrl);
      this.imageModalOpen.set(true);
    }
  }

  closeImageModal() {
    this.imageModalOpen.set(false);
    this.selectedImage.set(null);
  }
}
