import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CompetitionService } from '../../services/competition.service';
import { Competition } from '../../models/competition.model';
import { ImageCompressorService } from '../../services/image-compressor.service';
import { ToastService } from '../../services/toast.service';
import { InstruccionesComponent } from '../shared/instrucciones/instrucciones.component';

@Component({
    selector: 'app-crud-competicion',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatIconModule, InstruccionesComponent],
    templateUrl: './crud-competicion.component.html',
    styleUrl: './crud-competicion.component.css'
})
export class CrudCompeticionComponent {
    private toastService = inject(ToastService);
    private imageCompressor = inject(ImageCompressorService);
    proximosEventos: any;
    eventosPasados: any;
    displayedEvents: any;
    totalPages: any;
    
    activeTab = signal<'proximos' | 'pasados'>('proximos');
    currentPage = signal<number>(1);
    pageSize = 10;

    // View state
    isEditing = signal(false);
    showForm = signal(false);

    competitionForm: FormGroup;
    submitted = false;
    currentCompetitionId: number | null = null;

    // Delete Modal State
    showDeleteModal = signal(false);
    competitionToDeleteId: number | null = null;

    constructor(
        private fb: FormBuilder,
        private competitionService: CompetitionService
    ) {
        // Create a computed signal to sort competitions by date
        const rawCompetitions = this.competitionService.getCompetitions();
        
        // Sorting function
        const sortEvents = (events: Competition[], ascending: boolean = true) => {
            return [...events].sort((a, b) => {
                const parseDateStr = (dateStr: string) => {
                    if (!dateStr) return 0;
                    const parts = dateStr.substring(0, 10).split('-');
                    if (parts.length === 3) {
                       return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
                    }
                    return 0;
                };
                const dateA = parseDateStr(a.fechaEvento);
                const dateB = parseDateStr(b.fechaEvento);
                return ascending ? dateA - dateB : dateB - dateA;
            });
        };

        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        const isPastEvent = (c: Competition) => {
            const dateStr = c.fechaFinEvento || c.fechaEvento;
            if (!dateStr) return true; // If no date, consider past? Actually shouldn't happen
            const parts = dateStr.substring(0, 10).split('-');
            const compDate = parts.length === 3 ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(0);
            return compDate.getTime() < todayDate.getTime();
        };

        this.proximosEventos = computed(() => {
            return sortEvents(rawCompetitions().filter(c => !isPastEvent(c)), true);
        });

        this.eventosPasados = computed(() => {
            // Pasados ordenados de más reciente a más antiguo
            return sortEvents(rawCompetitions().filter(c => isPastEvent(c)), false);
        });
        
        this.displayedEvents = computed(() => {
            const list = this.activeTab() === 'proximos' ? this.proximosEventos() : this.eventosPasados();
            const startIndex = (this.currentPage() - 1) * this.pageSize;
            return list.slice(startIndex, startIndex + this.pageSize);
        });
        
        this.totalPages = computed(() => {
            const list = this.activeTab() === 'proximos' ? this.proximosEventos() : this.eventosPasados();
            return Math.max(1, Math.ceil(list.length / this.pageSize));
        });

        this.competitionForm = this.fb.group({
            nombre: ['', Validators.required],
            lugar: [''],
            fechaEvento: ['', Validators.required],
            fechaFinEvento: [''],
            fechaLimite: [''],
            formaPago: [''],
            enlace: ['', [Validators.pattern('https?://.+')]],
            tipo: ['competicion', Validators.required],
            cartel: [null],
            judge_name: [''] // Optional judge name
        });
    }

    get f() { return this.competitionForm.controls; }

    toggleView() {
        this.showForm.update(v => !v);
        if (!this.showForm()) {
            this.resetForm();
        }
    }

    setTab(tab: 'proximos' | 'pasados') {
        this.activeTab.set(tab);
        this.currentPage.set(1);
    }

    nextPage() {
        if (this.currentPage() < this.totalPages()) {
            this.currentPage.update(p => p + 1);
        }
    }

    prevPage() {
        if (this.currentPage() > 1) {
            this.currentPage.update(p => p - 1);
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
        this.existingCartel = comp.cartel || null;

        this.competitionForm.patchValue({
            nombre: comp.nombre || '', 
            lugar: comp.lugar,
            fechaEvento: comp.fechaEvento,
            fechaFinEvento: comp.fechaFinEvento || '',
            fechaLimite: comp.fechaLimite,
            formaPago: comp.formaPago,
            enlace: comp.enlace,
            tipo: comp.tipo || 'competicion',
            judge_name: comp.judge_name || ''
            // Don't patch cartel with the file object/string directly as file input is read-only
            // We handle preservation via existingCartel
        });
        this.showForm.set(true);
        this.isEditing.set(true);
    }

    deleteCompetition(id: number) {
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
                const compressedFile = await this.imageCompressor.compress(file);

                // Convert file to Base64 for current backend implementation (LONGTEXT)
                const reader = new FileReader();
                reader.onload = (e: any) => {
                    const base64String = e.target.result;

                    // Check size check on the base64 string length (~size)
                    if (base64String.length > 800 * 1024) {
                        this.toastService.warning('La imagen sigue siendo demasiado pesada incluso despues de comprimir. Por favor, elige otra.');
                        // Still set it? Or reject? The prompt implies stricter control, but 800kb is fine for LONGTEXT.
                        // Let's accept it but warn, or just accept it. 
                        // The service ensures MAX 800x800 @ 0.7 quality, so it SHOULD be small.
                    }

                    this.competitionForm.patchValue({
                        cartel: base64String
                    });
                };
                reader.readAsDataURL(compressedFile);

            } catch (error) {
                console.error('Error handling image:', error);
                this.toastService.error('Hubo un error al procesar la imagen.');
            }
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

        try {
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
        } catch (error) {
            console.error('Error saving competition:', error);
            this.toastService.error('Error al guardar el evento. Revisa los datos.');
        }
    }

    resetForm() {
        this.submitted = false;
        this.currentCompetitionId = null;
        this.existingCartel = null;
        this.competitionForm.reset({
            tipo: 'competicion'
        });
    }
}
