import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompetitionService } from '../../services/competition.service';
import { Competition } from '../../models/competition.model';

import { ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-crud-competicion',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './crud-competicion.component.html',
    styleUrl: './crud-competicion.component.css'
})
export class CrudCompeticionComponent {
    private toastService = inject(ToastService);
    competitions: any; // Initialized in constructor to avoid "used before initialization" error

    // View state
    isEditing = signal(false);
    showForm = signal(false);

    competitionForm: FormGroup;
    submitted = false;
    currentCompetitionId: string | null = null;

    // Delete Modal State
    showDeleteModal = signal(false);
    competitionToDeleteId: string | null = null;

    constructor(
        private fb: FormBuilder,
        private competitionService: CompetitionService
    ) {
        this.competitions = this.competitionService.getCompetitions();
        this.competitionForm = this.fb.group({
            lugar: ['', Validators.required],
            fechaEvento: ['', Validators.required],
            fechaLimite: ['', Validators.required],
            formaPago: ['', Validators.required],
            enlace: ['', [Validators.required, Validators.pattern('https?://.+')]],
            cartel: [null] // Validation handled manually if needed, or required only on creation
        });
    }

    get f() { return this.competitionForm.controls; }

    toggleView() {
        this.showForm.update(v => !v);
        if (!this.showForm()) {
            this.resetForm();
        }
    }

    initNewCompetition() {
        this.resetForm();
        this.showForm.set(true);
        this.isEditing.set(false);
    }

    // Used to hold the existing cartel when editing, if no new file is selected
    private existingCartel: string | null = null;

    editCompetition(comp: Competition) {
        this.currentCompetitionId = comp.id;
        this.existingCartel = comp.cartel;

        this.competitionForm.patchValue({
            lugar: comp.lugar,
            fechaEvento: comp.fechaEvento,
            fechaLimite: comp.fechaLimite,
            formaPago: comp.formaPago,
            enlace: comp.enlace,
            // Don't patch cartel with the file object/string directly as file input is read-only
            // We handle preservation via existingCartel
        });
        this.showForm.set(true);
        this.isEditing.set(true);
    }

    deleteCompetition(id: string) {
        this.competitionToDeleteId = id;
        this.showDeleteModal.set(true);
    }

    confirmDelete() {
        if (this.competitionToDeleteId) {
            this.competitionService.deleteCompetition(this.competitionToDeleteId)
                .then(() => {
                    this.toastService.success('Competición eliminada correctamente');
                    this.cancelDelete();
                })
                .catch(error => {
                    console.error(error);
                    this.toastService.error('Error al eliminar la competición');
                    this.cancelDelete();
                });
        }
    }

    cancelDelete() {
        this.showDeleteModal.set(false);
        this.competitionToDeleteId = null;
    }

    async onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            try {
                const compressedImage = await this.compressImage(file);

                // Firestore document limit is 1MB. We leave some buffer.
                // Base64 string length is approximately the size in bytes.
                if (compressedImage.length > 800 * 1024) {
                    this.toastService.warning('La imagen sigue siendo demasiado pesada incluso despues de comprimir. Por favor, elige otra.');
                    return;
                }

                this.competitionForm.patchValue({
                    cartel: compressedImage
                });
            } catch (error) {
                console.error('Error handling image:', error);
                this.toastService.error('Hubo un error al procesar la imagen.');
            }
        }
    }

    compressImage(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event: any) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        // Compress to JPEG with 0.7 quality
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                        resolve(dataUrl);
                    } else {
                        reject(new Error('Could not get canvas context'));
                    }
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    }

    // Kept for compatibility if template uses onFileChange
    onFileChange(event: any) {
        this.onFileSelected(event);
    }

    async onSubmit() {
        this.submitted = true;

        if (this.competitionForm.invalid) {
            return;
        }

        const formValue = this.competitionForm.value;

        // If no new cartel selected (null in form) but we have existing one in edit mode, use it
        // Note: formValue.cartel will be the base64 string if a new file was selected
        const finalCartel = formValue.cartel || (this.isEditing() ? this.existingCartel : null);

        const competitionData = {
            ...formValue,
            cartel: finalCartel
        };

        if (this.isEditing() && this.currentCompetitionId) {
            await this.competitionService.updateCompetition({
                id: this.currentCompetitionId,
                ...competitionData
            });
            this.toastService.success('Competición actualizada');
        } else {
            await this.competitionService.addCompetition(competitionData);
            this.toastService.success('Competición creada');
        }

        this.toggleView();
    }

    resetForm() {
        this.submitted = false;
        this.currentCompetitionId = null;
        this.existingCartel = null;
        this.competitionForm.reset();
    }
}
