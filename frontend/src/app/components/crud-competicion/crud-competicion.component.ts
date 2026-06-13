import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CompetitionService } from '../../services/competition.service';
import { Competition } from '../../models/competition.model';
import { ImageCompressorService } from '../../services/image-compressor.service';
import { ToastService } from '../../services/toast.service';
import { InstruccionesComponent } from '../shared/instrucciones/instrucciones.component';
import { OnboardingService } from '../../services/onboarding';
import { ScraperAdminService } from '../../services/scraper-admin.service';
import { EmptyStateComponent } from '../ui/empty-state/empty-state';

@Component({
    selector: 'app-crud-competicion',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatIconModule, InstruccionesComponent, EmptyStateComponent],
    templateUrl: './crud-competicion.component.html',
    styleUrl: './crud-competicion.component.css'
})
export class CrudCompeticionComponent {
    private toastService = inject(ToastService);
    private imageCompressor = inject(ImageCompressorService);
    private onboardingService = inject(OnboardingService);
    private scraperService = inject(ScraperAdminService);
    
    proximosEventos: any;
    eventosPasados: any;

    // FlowAgility scraping integration signals
    searchQuery = signal('');
    globalEvents = signal<any[]>([]);
    isSearching = signal(false);
    isDetecting = signal(false);
    showAutocomplete = signal(false);
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
            federacion: [''],
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
        this.loadUpcomingGlobalEvents();
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
            federacion: comp.federacion || '',
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

        if (formValue.tipo === 'competicion' && !formValue.federacion) {
            this.toastService.error('Debes seleccionar una federación para las competiciones.');
            return;
        }

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
                this.onboardingService.markStepCompleted('staff_evento');
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

    loadUpcomingGlobalEvents() {
        this.isSearching.set(true);
        this.scraperService.getGlobalEvents().subscribe({
            next: (events) => {
                this.globalEvents.set(events);
                this.isSearching.set(false);
            },
            error: (err) => {
                console.error('Error loading global events:', err);
                this.isSearching.set(false);
            }
        });
    }

    onSearchChange(event: Event) {
        const query = (event.target as HTMLInputElement).value;
        this.searchQuery.set(query);
        this.isSearching.set(true);
        this.scraperService.getGlobalEvents(query).subscribe({
            next: (events) => {
                this.globalEvents.set(events);
                this.isSearching.set(false);
                this.showAutocomplete.set(true);
            },
            error: (err) => {
                console.error(err);
                this.isSearching.set(false);
            }
        });
    }

    selectGlobalEvent(event: any) {
        let mappedFed = 'Otro';
        if (event.federacion) {
            if (event.federacion.toUpperCase().includes('RSCE')) {
                mappedFed = 'RSCE';
            } else if (event.federacion.toUpperCase().includes('RFEC')) {
                mappedFed = 'RFEC';
            }
        }
        
        this.competitionForm.patchValue({
            nombre: event.nombre,
            lugar: event.lugar || '',
            fechaEvento: event.fecha_evento,
            fechaFinEvento: event.fecha_fin_evento || event.fecha_evento,
            fechaLimite: event.fecha_limite || '',
            enlace: event.enlace,
            tipo: 'competicion',
            federacion: mappedFed,
            judge_name: event.judge_name || ''
        });

        this.showAutocomplete.set(false);
        this.searchQuery.set('');
        this.toastService.success('Evento de FlowAgility importado en el formulario');
    }

    onUrlBlur() {
        const url = this.competitionForm.get('enlace')?.value;
        if (!url || !url.includes('flowagility.com')) {
            return;
        }

        if (this.isDetecting()) {
            return;
        }

        this.isDetecting.set(true);
        this.toastService.info('Detectando evento en FlowAgility...');

        this.scraperService.detectEvent(url).subscribe({
            next: (eventData) => {
                this.isDetecting.set(false);
                if (eventData) {
                    this.competitionForm.patchValue({
                        nombre: eventData.nombre || this.competitionForm.get('nombre')?.value,
                        lugar: eventData.lugar || this.competitionForm.get('lugar')?.value,
                        fechaEvento: eventData.fecha_evento || this.competitionForm.get('fechaEvento')?.value,
                        fechaFinEvento: eventData.fecha_fin_evento || this.competitionForm.get('fechaFinEvento')?.value || eventData.fecha_evento,
                        fechaLimite: eventData.fecha_limite || this.competitionForm.get('fechaLimite')?.value,
                        federacion: eventData.federacion || this.competitionForm.get('federacion')?.value || 'Otro',
                        tipo: 'competicion',
                        judge_name: eventData.judge_name || this.competitionForm.get('judge_name')?.value
                    });
                    this.toastService.success('Datos del evento autocompletados con éxito');
                }
            },
            error: (err) => {
                console.error('Error detecting event:', err);
                this.isDetecting.set(false);
                this.toastService.warning('No se pudo autocompletar desde el enlace, introduce los datos manualmente');
            }
        });
    }

    closeAutocomplete() {
        setTimeout(() => {
            this.showAutocomplete.set(false);
        }, 200);
    }
}
