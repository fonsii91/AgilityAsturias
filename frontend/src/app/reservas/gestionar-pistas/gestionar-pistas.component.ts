import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { ConfirmDialog, ConfirmDialogData } from '../../components/shared/confirm-dialog/confirm-dialog';
import { TrainingTrackService } from '../../services/training-track.service';
import { ToastService } from '../../services/toast.service';
import { ImageCompressorService } from '../../services/image-compressor.service';
import { TrainingTrack, TrainingTrackSurface, SURFACE_OPTIONS, surfaceLabel } from '../../models/training-track.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-gestionar-pistas',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule, RouterModule],
  templateUrl: './gestionar-pistas.component.html',
  styleUrl: './gestionar-pistas.component.css'
})
export class GestionarPistasComponent implements OnInit {
  clubConfig = environment.clubConfig;
  trackService = inject(TrainingTrackService);
  toastService = inject(ToastService);
  imageCompressor = inject(ImageCompressorService);
  dialog = inject(MatDialog);

  tracks = this.trackService.getTracks();
  surfaceOptions = SURFACE_OPTIONS;
  surfaceLabel = surfaceLabel;

  isModalOpen = false;
  isSubmitting = false;
  editingTrack: TrainingTrack | null = null;

  trackForm = {
    name: '',
    surface: 'tierra' as TrainingTrackSurface
  };
  photoFile: File | null = null;
  photoPreview: string | null = null;
  removePhoto = false;

  ngOnInit() {
    this.trackService.fetchTracks();
  }

  surfaceIcon(surface: string): string {
    switch (surface) {
      case 'tierra': return 'landscape';
      case 'cesped': return 'grass';
      case 'cesped_artificial': return 'texture';
      default: return 'sports_score';
    }
  }

  openModal(track: TrainingTrack | null = null) {
    this.editingTrack = track;
    this.trackForm = {
      name: track?.name || '',
      surface: (track?.surface || 'tierra') as TrainingTrackSurface
    };
    this.photoFile = null;
    this.photoPreview = track?.photo_url || null;
    this.removePhoto = false;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingTrack = null;
  }

  async onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      // Compresión en cliente antes de subir, como el resto de imágenes de la app
      const compressedFile = await this.imageCompressor.compress(file);
      this.photoFile = compressedFile;
      this.removePhoto = false;
      const reader = new FileReader();
      reader.onload = () => this.photoPreview = reader.result as string;
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Error comprimiendo la imagen de la pista:', error);
      this.toastService.error('No se pudo procesar la imagen. Prueba con otro archivo.');
      input.value = '';
    }
  }

  clearPhoto() {
    this.photoFile = null;
    this.photoPreview = null;
    // Solo hay que pedir el borrado al backend si la pista ya tenía foto guardada.
    this.removePhoto = !!this.editingTrack?.photo_url;
  }

  async saveTrack() {
    if (this.isSubmitting) return;

    if (!this.trackForm.name.trim()) {
      this.toastService.warning('Ponle un nombre a la pista.');
      return;
    }

    this.isSubmitting = true;
    try {
      const payload = {
        name: this.trackForm.name.trim(),
        surface: this.trackForm.surface,
        photo: this.photoFile,
        remove_photo: this.removePhoto
      };

      if (this.editingTrack) {
        await this.trackService.updateTrack(this.editingTrack.id, payload);
        this.toastService.success('Pista actualizada.');
      } else {
        await this.trackService.addTrack(payload);
        this.toastService.success('Pista creada.');
      }
      this.closeModal();
    } catch (error) {
      console.error(error);
      this.toastService.error('Error al guardar la pista.');
    } finally {
      this.isSubmitting = false;
    }
  }

  deleteTrack(track: TrainingTrack) {
    if (this.tracks().length <= 1) {
      this.toastService.warning('No puedes eliminar la única pista del club: debe existir siempre al menos una.');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Eliminar pista',
        message: `¿Seguro que quieres eliminar la pista "${track.name}"? Los horarios que la usaban pasarán a la pista principal del club (las clases y sus reservas se conservan).`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        isDestructive: true
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) return;
      try {
        await this.trackService.deleteTrack(track.id);
        this.toastService.success('Pista eliminada.');
      } catch (error: any) {
        console.error(error);
        this.toastService.error(error?.error?.message || 'Error al eliminar la pista.');
      }
    });
  }
}
