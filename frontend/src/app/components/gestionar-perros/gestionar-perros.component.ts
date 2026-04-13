import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';
import { ImageCompressorService } from '../../services/image-compressor.service';
import { ToastService } from '../../services/toast.service';
import { Dog } from '../../models/dog.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-gestionar-perros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestionar-perros.component.html',
  styleUrl: './gestionar-perros.component.css'
})
export class GestionarPerrosComponent implements OnInit {
  authService = inject(AuthService);
  dogService = inject(DogService);
  imageCompressor = inject(ImageCompressorService);
  toastService = inject(ToastService);

  dogs = this.dogService.getDogs();

  selectedDog = signal<Dog | null>(null);
  isAddingNew = signal(false);

  // Form Model
  formData = signal<Partial<Dog>>({});
  activeTab = signal<'publico' | 'privado' | 'familia'>('publico');
  
  // Local Selected File for Preview before upload
  selectedFile: File | null = null;
  previewUrl = signal<string | null>(null);
  isUploadingPhoto = signal(false);

  // Sharing state
  shareEmail = signal('');

  clubTheme = environment.clubConfig.colors;

  // Delete modal
  deleteModalOpen = signal(false);
  deleteConfirmText = signal('');

  // Help modal
  isHelpModalOpen = signal(false);

  ngOnInit() {
    this.dogService.loadUserDogs();
  }

  startAddDog() {
    this.selectedDog.set(null);
    this.isAddingNew.set(true);
    this.activeTab.set('publico');
    this.formData.set({ name: '', breed: '', birth_date: '', rsce_license: '', rsce_expiration_date: '', rfec_license: '', rfec_expiration_date: '', microchip: '', pedigree: '' });
    this.selectedFile = null;
    this.previewUrl.set(null);
  }

  editDog(dog: Dog) {
    this.isAddingNew.set(false);
    this.selectedDog.set(dog);
    this.activeTab.set('publico');
    this.formData.set({ 
      name: dog.name, 
      breed: dog.breed || '', 
      birth_date: dog.birth_date ? dog.birth_date.split('T')[0] : '', // Extract YYYY-MM-DD
      rsce_license: dog.rsce_license || '',
      rsce_expiration_date: dog.rsce_expiration_date ? dog.rsce_expiration_date.split('T')[0] : '',
      rfec_license: dog.rfec_license || '',
      rfec_expiration_date: dog.rfec_expiration_date ? dog.rfec_expiration_date.split('T')[0] : '',
      microchip: dog.microchip || '',
      pedigree: dog.pedigree || ''
    });
    this.selectedFile = null;
    this.previewUrl.set(dog.photo_url || null);
  }

  cancelEdit() {
    this.isAddingNew.set(false);
    this.selectedDog.set(null);
    this.formData.set({});
    this.previewUrl.set(null);
    this.selectedFile = null;
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      try {
        this.isUploadingPhoto.set(true);
        const compressedFile = await this.imageCompressor.compress(file);
        this.selectedFile = compressedFile;
        // Create local preview
        const reader = new FileReader();
        reader.onload = (e) => {
          this.previewUrl.set(e.target?.result as string);
          // If NOT adding new, we delay setting isUploading to false after server response
          if (this.isAddingNew()) this.isUploadingPhoto.set(false);
        };
        reader.readAsDataURL(compressedFile);
        
        // If editing an existing dog, upload immediately
        const currentDog = this.selectedDog();
        if (currentDog && !this.isAddingNew()) {
          await this.dogService.updateDogPhoto(currentDog.id, compressedFile);
          this.toastService.success('Foto actualizada correctamente');
          // Reload dogs just in case to update main list
          await this.dogService.loadUserDogs();
          this.isUploadingPhoto.set(false);
        }
      } catch (error) {
        console.error('Error compressing/uploading image:', error);
        this.toastService.error('Error al procesar la foto');
        this.isUploadingPhoto.set(false);
      }
    }
  }

  async saveDog() {
    const data = this.formData();
    if (!data.name?.trim()) {
      this.toastService.error('El nombre del perro es obligatorio');
      return;
    }

    // Prepare data to meet Omit<Dog, 'id'> requirements and sanitize empty fields
    const dogDataToSave = {
      ...data,
      name: data.name!,
      breed: data.breed?.trim() || null,
      birth_date: data.birth_date || null,
      rsce_license: data.rsce_license?.trim() || null,
      rsce_expiration_date: data.rsce_expiration_date || null,
      rfec_license: data.rfec_license?.trim() || null,
      rfec_expiration_date: data.rfec_expiration_date || null,
      microchip: data.microchip?.trim() || null,
      pedigree: data.pedigree?.trim() || null
    };

    try {
      if (this.isAddingNew()) {
        const newDog = await this.dogService.addDog(dogDataToSave as any);
        if (this.selectedFile) {
          // Upload photo right after creating
          await this.dogService.updateDogPhoto(newDog.id, this.selectedFile);
        }
        this.toastService.success('Perro añadido correctamente');
      } else {
        const dogId = this.selectedDog()?.id;
        if (dogId) {
          const updatedDog = await this.dogService.updateDog(dogId, dogDataToSave as any);
          this.toastService.success('Datos actualizados correctamente');
        }
      }
      this.cancelEdit();
      await this.dogService.loadUserDogs();
    } catch (error: any) {
      console.error('Error guardando el perro', error);
      let errorMsg = 'Hubo un error al guardar los datos';
      if (error.error) {
        if (error.status === 422 && error.error.errors) {
          const firstErrorKey = Object.keys(error.error.errors)[0];
          errorMsg = error.error.errors[firstErrorKey][0];
        } else if (error.error.message) {
          errorMsg = error.error.message;
        }
      }
      this.toastService.error(errorMsg);
    }
  }

  // Delete logic
  promptDelete(event: Event) {
    event.stopPropagation();
    this.deleteModalOpen.set(true);
    this.deleteConfirmText.set('');
  }

  closeDeleteModal() {
    this.deleteModalOpen.set(false);
    this.deleteConfirmText.set('');
  }

  async confirmDelete() {
    const dog = this.selectedDog();
    if (dog) {
      try {
        await this.dogService.deleteDog(dog.id);
        if (this.isPrimaryOwner()) {
          this.toastService.success(`Perfil de ${dog.name} borrado`);
        } else {
          this.toastService.success(`Te has desvinculado de ${dog.name}`);
        }
        this.closeDeleteModal();
        this.cancelEdit();
        // Load user dogs ensures dogs() signal updates correctly
        await this.dogService.loadUserDogs();
      } catch (e) {
        this.toastService.error('No se pudo borrar el perro');
      }
    }
  }

  // Gamification & Helpers
  calculateAge(birthDate: string | undefined): string {
    if (!birthDate) return 'Desconocida';
    const bdate = new Date(birthDate);
    const today = new Date();
    let numAgnos = today.getFullYear() - bdate.getFullYear();
    let numMeses = today.getMonth() - bdate.getMonth();

    if (numMeses < 0 || (numMeses === 0 && today.getDate() < bdate.getDate())) {
      numAgnos--;
      numMeses += 12;
    }
    
    if (numAgnos === 0) {
      if (numMeses === 0) return 'Cachorro (menos de un mes)';
      return `${numMeses} m.`;
    }
    return `${numAgnos} a.`;
  }

  calculateProgress(dog: Dog): number {
    let completed = 0;
    const fields = ['name', 'photo_url', 'breed', 'birth_date', 'microchip', 'pedigree', 'rsce_license', 'rsce_expiration_date', 'rfec_license', 'rfec_expiration_date'];
    fields.forEach(field => {
      if ((dog as any)[field]) completed++;
    });
    return Math.round((completed / fields.length) * 100);
  }

  async shareDog() {
    const dog = this.selectedDog();
    const email = this.shareEmail().trim();
    if (!dog || !email) return;

    try {
      await this.dogService.shareDog(dog.id, email);
      this.toastService.success('Perro compartido con ' + email);
      this.shareEmail.set('');
      // Reload dog selection to see new owners
      await this.dogService.loadUserDogs();
      const updatedDog = this.dogService.getDogs()().find(d => d.id === dog.id) || null;
      this.selectedDog.set(updatedDog);
    } catch (error: any) {
      console.error('Error compartiendo:', error);
      let msj = 'Error al compartir';
      if (error.error?.message) msj = error.error.message;
      this.toastService.error(msj);
    }
  }

  isPrimaryOwner(): boolean {
    const dog = this.selectedDog();
    const currUserId = this.authService.currentUserSignal()?.id;
    if (!dog || !currUserId) return false;
    const me = dog.users?.find(u => u.id === currUserId);
    return !!me?.pivot?.is_primary_owner;
  }

  async removeShareUser(userId: number, userName: string) {
    const dog = this.selectedDog();
    if (!dog) return;

    if (!confirm(`¿Estás seguro de que quieres revocar el acceso a ${userName}?`)) return;

    try {
      await this.dogService.removeShare(dog.id, userId);
      this.toastService.success(`Acceso de ${userName} revocado exitosamente`);
      await this.dogService.loadUserDogs();
      const updatedDog = this.dogService.getDogs()().find(d => d.id === dog.id) || null;
      this.selectedDog.set(updatedDog);
    } catch (error: any) {
      console.error('Error al revocar acceso', error);
      let msj = 'Error al revocar el acceso';
      if (error.error?.message) msj = error.error.message;
      this.toastService.error(msj);
    }
  }

  // Help modal methods
  openHelpModal() {
    this.isHelpModalOpen.set(true);
  }

  closeHelpModal() {
    this.isHelpModalOpen.set(false);
  }
}
