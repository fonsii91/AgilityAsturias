import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompetitionService } from '../../services/competition.service';
import { Competition } from '../../models/competition.model';

@Component({
    selector: 'app-crud-competicion',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './crud-competicion.component.html',
    styleUrl: './crud-competicion.component.css'
})
export class CrudCompeticionComponent {
    competitions: any; // Initialized in constructor to avoid "used before initialization" error

    // View state
    isEditing = signal(false);
    showForm = signal(false);

    competitionForm: FormGroup;
    submitted = false;
    currentCompetitionId: string | null = null;

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
        if (confirm('¿Estás seguro de que quieres eliminar esta competición?')) {
            this.competitionService.deleteCompetition(id);
        }
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 500000) { // 500KB limit
                alert('La imagen es demasiado grande. Por favor sube una imagen menor de 500KB.');
                // clear the input?
                event.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                // Store the base64 string in the form control
                this.competitionForm.patchValue({
                    cartel: reader.result
                });
            };
            reader.readAsDataURL(file);
        }
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
            alert('Competición actualizada');
        } else {
            await this.competitionService.addCompetition(competitionData);
            alert('Competición creada');
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
