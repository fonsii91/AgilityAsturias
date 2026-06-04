import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { SponsorService } from '../../services/sponsor.service';
import { Sponsor } from '../../models/sponsor.model';
import { ImageCompressorService } from '../../services/image-compressor.service';
import { ToastService } from '../../services/toast.service';
import { InstruccionesComponent } from '../shared/instrucciones/instrucciones.component';

@Component({
    selector: 'app-crud-patrocinadores',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatIconModule, RouterModule, InstruccionesComponent],
    template: `
        <div class="crud-container">
            <div class="sticky-header">
                <div>
                    <div class="breadcrumb">
                        <a routerLink="/perfil">
                            <mat-icon>arrow_back</mat-icon> Configuración del Club
                        </a>
                    </div>
                    <h1>Gestión de Patrocinadores</h1>
                    <p class="subtitle">Administra las marcas colaboradoras que aparecen en la presencia pública del club.</p>
                </div>
                <div class="header-actions">
                    @if (!showForm()) {
                        <button class="btn btn-primary" (click)="initNewSponsor()">
                            <mat-icon>add</mat-icon> Nuevo Patrocinador
                        </button>
                    } @else {
                        <button class="btn btn-outline" (click)="toggleView()">
                            <mat-icon>close</mat-icon> Cancelar
                        </button>
                    }
                </div>
            </div>

            <div class="main-content">
                <!-- Instructions panel -->
                @if (!showForm()) {
                    <app-instrucciones titulo="Gestión de Patrocinadores">
                        <div class="instructions-body">
                            <p>Aquí puedes gestionar las marcas patrocinadoras de tu club. Se mostrarán públicamente en la sección de <strong>Patrocinadores</strong> si el módulo correspondiente está habilitado.</p>
                            <ul>
                                <li><strong>Subir Logotipo:</strong> Los logos se comprimen automáticamente en el navegador para ahorrar ancho de banda móvil.</li>
                                <li><strong>Sitio Web:</strong> Opcional. Si se proporciona, aparecerá un botón directo en la ficha del patrocinador.</li>
                            </ul>
                        </div>
                    </app-instrucciones>
                }

                @if (showForm()) {
                    <!-- Form block -->
                    <div class="form-card bento-card fade-in">
                        <div class="card-header">
                            <div class="icon-box"><mat-icon>{{ isEditing() ? 'edit' : 'add_circle' }}</mat-icon></div>
                            <h2>{{ isEditing() ? 'Editar Patrocinador' : 'Añadir Nuevo Patrocinador' }}</h2>
                        </div>
                        <div class="card-body">
                            <form [formGroup]="sponsorForm" (ngSubmit)="onSubmit()">
                                <div class="form-layout">
                                    <!-- Image upload -->
                                    <div class="image-upload-section">
                                        <label>Logotipo del Patrocinador</label>
                                        <div class="upload-area" (click)="fileInput.click()">
                                            @if (logoPreviewUrl() || sponsorForm.get('imagen')?.value) {
                                                <img [src]="logoPreviewUrl() || sponsorForm.get('imagen')?.value" class="preview-img">
                                            } @else {
                                                <div class="upload-prompt">
                                                    <mat-icon>upload_file</mat-icon>
                                                    <p>Haz clic para subir logotipo</p>
                                                </div>
                                            }
                                            <input #fileInput type="file" accept="image/*" class="hidden-input" (change)="onFileSelected($event)">
                                        </div>
                                    </div>

                                    <!-- Fields -->
                                    <div class="fields-section">
                                        <div class="form-group">
                                            <label for="nombre">Nombre *</label>
                                            <input id="nombre" type="text" formControlName="nombre" class="form-control" placeholder="Ej: Agility Premium S.L.">
                                            @if (submitted && f['nombre'].errors?.['required']) {
                                                <span class="error-msg">El nombre es requerido</span>
                                            }
                                        </div>

                                        <div class="form-group">
                                            <label for="enlace">Enlace Web (URL)</label>
                                            <input id="enlace" type="text" formControlName="enlace" class="form-control" placeholder="Ej: https://misitioweb.com">
                                            @if (submitted && f['enlace'].errors?.['pattern']) {
                                                <span class="error-msg">Debe ingresar una URL válida (ej. https://...)</span>
                                            }
                                        </div>

                                        <div class="form-group full-width">
                                            <label for="descripcion">Descripción</label>
                                            <textarea id="descripcion" formControlName="descripcion" rows="4" class="form-control text-area" placeholder="Breve descripción del patrocinador, ofertas para socios o su compromiso con el club..."></textarea>
                                        </div>
                                    </div>
                                </div>

                                <div class="form-actions">
                                    <button type="button" class="btn btn-outline" (click)="toggleView()">Cancelar</button>
                                    <button type="submit" class="btn btn-primary" [disabled]="isSaving()">
                                        @if (isSaving()) {
                                            <span>Guardando...</span>
                                        } @else {
                                            <span>{{ isEditing() ? 'Guardar Cambios' : 'Crear Patrocinador' }}</span>
                                        }
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                } @else {
                    <!-- List block -->
                    @if (sponsors().length === 0) {
                        <div class="empty-state bento-card">
                            <div class="empty-icon-wrapper">
                                <span class="material-icons">handshake</span>
                            </div>
                            <p>No tienes patrocinadores registrados.</p>
                            <button class="btn btn-primary" (click)="initNewSponsor()">Registrar Primer Patrocinador</button>
                        </div>
                    } @else {
                        <div class="sponsors-grid">
                            @for (sponsor of sponsors(); track sponsor.id) {
                                <div class="sponsor-card bento-card">
                                    <div class="card-logo-area">
                                        @if (sponsor.imagen) {
                                            <img [src]="sponsor.imagen" [alt]="sponsor.nombre" class="card-logo">
                                        } @else {
                                            <div class="card-logo-placeholder">
                                                <span class="material-icons">handshake</span>
                                            </div>
                                        }
                                    </div>
                                    <div class="card-info">
                                        <h3>{{ sponsor.nombre }}</h3>
                                        <p class="desc">{{ sponsor.descripcion || 'Sin descripción.' }}</p>
                                        @if (sponsor.enlace) {
                                            <a [href]="sponsor.enlace" target="_blank" rel="noopener noreferrer" class="link-text">
                                                <mat-icon>open_in_new</mat-icon> {{ sponsor.enlace }}
                                            </a>
                                        }
                                    </div>
                                    <div class="card-actions">
                                        <button class="btn-icon edit-btn" (click)="editSponsor(sponsor)" title="Editar">
                                            <mat-icon>edit</mat-icon>
                                        </button>
                                        <button class="btn-icon delete-btn" (click)="deleteSponsor(sponsor.id!)" title="Eliminar">
                                            <mat-icon>delete</mat-icon>
                                        </button>
                                    </div>
                                </div>
                            }
                        </div>
                    }
                }
            </div>

            <!-- Custom Delete Dialog Overlay -->
            @if (showDeleteModal()) {
                <div class="modal-backdrop">
                    <div class="modal-card pop-in">
                        <div class="modal-header">
                            <span class="material-icons warn-icon">warning</span>
                            <h2>¿Eliminar Patrocinador?</h2>
                        </div>
                        <div class="modal-body">
                            <p>¿Estás seguro de que deseas eliminar este patrocinador? Esta acción no se puede deshacer y dejará de aparecer en la sección pública de inmediato.</p>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-outline" (click)="cancelDelete()">Cancelar</button>
                            <button class="btn btn-danger" (click)="confirmDelete()">Eliminar</button>
                        </div>
                    </div>
                </div>
            }
        </div>
    `,
    styles: [`
        :host {
            display: block;
            background-color: var(--surface-background);
            min-height: 100vh;
            font-family: 'Inter', Roboto, sans-serif;
        }

        .crud-container {
            max-width: 1024px;
            margin: 0 auto;
            padding: 1.5rem;
            padding-bottom: 6rem;
        }

        .sticky-header {
            position: sticky;
            top: 0;
            z-index: 50;
            background-color: color-mix(in srgb, var(--surface-card) 85%, transparent);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid color-mix(in srgb, var(--text-main) 10%, transparent);
            padding: 1.25rem 1.5rem;
            margin: -1.5rem -1.5rem 2rem -1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
            border-radius: 0 0 1rem 1rem;
        }

        @media (min-width: 768px) {
            .sticky-header {
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
            }
        }

        .breadcrumb a {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-light);
            text-decoration: none;
            font-size: 0.875rem;
            margin-bottom: 0.25rem;
            transition: color 0.2s;
        }

        .breadcrumb a:hover {
            color: var(--primary-color, #0073CF);
        }

        .breadcrumb mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
        }

        .sticky-header h1 {
            font-size: 1.875rem;
            font-weight: 700;
            color: var(--text-main);
            margin: 0;
        }

        .subtitle {
            color: var(--text-secondary);
            margin: 0.25rem 0 0 0;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .main-content {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .bento-card {
            background-color: var(--surface-card);
            border-radius: 1rem;
            border: 1px solid color-mix(in srgb, var(--text-main) 12%, transparent);
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }

        .card-header {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid color-mix(in srgb, var(--text-main) 8%, transparent);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            background-color: color-mix(in srgb, var(--text-main) 2%, var(--surface-card));
        }

        .card-header h2 {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-main);
            margin: 0;
        }

        .icon-box {
            width: 40px;
            height: 40px;
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: color-mix(in srgb, var(--primary-color) 12%, var(--surface-card));
            color: var(--primary-color);
        }

        .card-body {
            padding: 1.5rem;
        }

        /* Form styling */
        .form-layout {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            margin-bottom: 1.5rem;
        }

        @media (min-width: 768px) {
            .form-layout {
                flex-direction: row;
            }
        }

        .image-upload-section {
            flex-shrink: 0;
            width: 100%;
        }

        @media (min-width: 768px) {
            .image-upload-section {
                width: 220px;
            }
        }

        .image-upload-section label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-secondary);
            margin-bottom: 0.5rem;
        }

        .upload-area {
            position: relative;
            width: 100%;
            height: 180px;
            border-radius: 0.75rem;
            border: 2px dashed color-mix(in srgb, var(--text-main) 20%, transparent);
            background-color: var(--surface-background);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            overflow: hidden;
            transition: all 0.2s;
        }

        .upload-area:hover {
            border-color: var(--primary-color);
            background-color: color-mix(in srgb, var(--primary-color) 8%, var(--surface-background));
        }

        .upload-prompt {
            text-align: center;
            color: var(--text-light);
            padding: 1rem;
        }

        .upload-prompt p {
            font-size: 0.75rem;
            margin: 0.25rem 0 0 0;
        }

        .preview-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            padding: 0.5rem;
        }

        .hidden-input {
            display: none;
        }

        .fields-section {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
        }

        .form-group label {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-secondary);
        }

        .form-control {
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            border: 1px solid color-mix(in srgb, var(--text-main) 20%, transparent);
            font-size: 0.9rem;
            background-color: var(--surface-card);
            outline: none;
            transition: all 0.2s;
            color: var(--text-main);
        }

        .form-control:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color) 15%, transparent);
        }

        .text-area {
            resize: vertical;
            min-height: 80px;
            font-family: inherit;
        }

        .error-msg {
            font-size: 0.75rem;
            color: var(--error-color, #ef4444);
            font-weight: 500;
        }

        .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            border-top: 1px solid color-mix(in srgb, var(--text-main) 8%, transparent);
            padding-top: 1.25rem;
        }

        /* Buttons */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.65rem 1.25rem;
            border-radius: 0.75rem;
            font-weight: 600;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
            height: 40px;
        }

        .btn-primary {
            background-color: var(--primary-color, #0073CF);
            color: #ffffff;
        }

        .btn-primary:hover:not(:disabled) {
            background-color: var(--primary-blue-dark);
        }

        .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .btn-outline {
            background-color: transparent;
            border-color: color-mix(in srgb, var(--text-main) 20%, transparent);
            color: var(--text-secondary);
        }

        .btn-outline:hover {
            background-color: var(--surface-background);
            color: var(--text-main);
            border-color: color-mix(in srgb, var(--text-main) 40%, transparent);
        }

        .btn-danger {
            background-color: var(--error-color, #ef4444);
            color: #ffffff;
        }

        .btn-danger:hover {
            background-color: color-mix(in srgb, var(--error-color, #ef4444) 85%, black);
        }

        /* List Styling */
        .sponsors-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
        }

        .sponsor-card {
            display: flex;
            flex-direction: column;
            position: relative;
            padding: 1.25rem;
            gap: 1rem;
        }

        .card-logo-area {
            height: 120px;
            width: 100%;
            background-color: var(--surface-background);
            border-radius: 0.75rem;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid color-mix(in srgb, var(--text-main) 8%, transparent);
        }

        .card-logo {
            max-width: 80%;
            max-height: 80%;
            object-fit: contain;
        }

        .card-logo-placeholder {
            color: var(--text-light);
        }

        .card-logo-placeholder span {
            font-size: 3rem;
        }

        .card-info {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            flex-grow: 1;
        }

        .card-info h3 {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--text-main);
            margin: 0;
        }

        .card-info .desc {
            font-size: 0.85rem;
            color: var(--text-secondary);
            line-height: 1.5;
            margin: 0;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .card-info .link-text {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.8rem;
            color: var(--primary-color, #0073CF);
            text-decoration: none;
            word-break: break-all;
            margin-top: auto;
        }

        .card-info .link-text mat-icon {
            font-size: 14px;
            width: 14px;
            height: 14px;
        }

        .card-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            border-top: 1px solid color-mix(in srgb, var(--text-main) 8%, transparent);
            padding-top: 0.75rem;
            margin-top: 0.5rem;
        }

        .btn-icon {
            width: 38px;
            height: 38px;
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
            background: transparent;
        }

        .btn-icon mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .edit-btn {
            color: var(--text-secondary);
            background-color: var(--surface-background);
        }

        .edit-btn:hover {
            color: var(--primary-color);
            background-color: color-mix(in srgb, var(--primary-color) 12%, var(--surface-card));
        }

        .delete-btn {
            color: var(--error-color, #ef4444);
            background-color: color-mix(in srgb, var(--error-color, #ef4444) 10%, var(--surface-card));
        }

        .delete-btn:hover {
            color: color-mix(in srgb, var(--error-color, #ef4444) 85%, black);
            background-color: color-mix(in srgb, var(--error-color, #ef4444) 20%, var(--surface-card));
        }

        /* Empty state */
        .empty-state {
            padding: 4rem 2rem;
            text-align: center;
        }

        .empty-icon-wrapper {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background-color: var(--surface-background);
            color: var(--text-light);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem auto;
        }

        .empty-icon-wrapper span {
            font-size: 2.25rem;
        }

        .empty-state p {
            font-size: 1rem;
            color: var(--text-secondary);
            margin-bottom: 1.5rem;
        }

        /* Modal styling */
        .modal-backdrop {
            position: fixed;
            inset: 0;
            background-color: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(4px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }

        .modal-card {
            background-color: var(--surface-card);
            border-radius: 1rem;
            width: 100%;
            max-width: 440px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            overflow: hidden;
            border: 1px solid color-mix(in srgb, var(--text-main) 12%, transparent);
        }

        .modal-header {
            padding: 1.5rem 1.5rem 1rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .modal-header h2 {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-main);
            margin: 0;
        }

        .warn-icon {
            color: var(--accent-color, #f59e0b);
            font-size: 28px;
            width: 28px;
            height: 28px;
        }

        .modal-body {
            padding: 0 1.5rem 1.5rem 1.5rem;
        }

        .modal-body p {
            font-size: 0.95rem;
            color: var(--text-secondary);
            line-height: 1.5;
            margin: 0;
        }

        .modal-footer {
            padding: 1rem 1.5rem;
            background-color: var(--surface-background);
            border-top: 1px solid color-mix(in srgb, var(--text-main) 8%, transparent);
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
        }

        .fade-in {
            animation: fadeIn 0.25s ease-out forwards;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .pop-in {
            animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes popIn {
            0% { opacity: 0; transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
        }
    `]
})
export class CrudPatrocinadoresComponent {
    private fb = inject(FormBuilder);
    private sponsorService = inject(SponsorService);
    private imageCompressor = inject(ImageCompressorService);
    private toastService = inject(ToastService);

    sponsors = this.sponsorService.getSponsors();
    sponsorForm: FormGroup;

    showForm = signal(false);
    isEditing = signal(false);
    isSaving = signal(false);
    submitted = false;

    currentSponsorId: number | null = null;
    logoPreviewUrl = signal<string | null>(null);

    // Delete modal states
    showDeleteModal = signal(false);
    sponsorToDeleteId: number | null = null;

    constructor() {
        this.sponsorForm = this.fb.group({
            nombre: ['', Validators.required],
            enlace: ['', [Validators.pattern('https?://.+')]],
            descripcion: [''],
            imagen: [null]
        });
    }

    get f() { return this.sponsorForm.controls; }

    toggleView() {
        this.showForm.update(v => !v);
        if (!this.showForm()) {
            this.resetForm();
        }
    }

    initNewSponsor() {
        this.resetForm();
        this.showForm.set(true);
        this.isEditing.set(false);
    }

    editSponsor(sponsor: Sponsor) {
        this.resetForm();
        this.currentSponsorId = sponsor.id || null;
        this.sponsorForm.patchValue({
            nombre: sponsor.nombre,
            enlace: sponsor.enlace || '',
            descripcion: sponsor.descripcion || '',
            imagen: sponsor.imagen || null
        });
        this.showForm.set(true);
        this.isEditing.set(true);
    }

    deleteSponsor(id: number) {
        this.sponsorToDeleteId = id;
        this.showDeleteModal.set(true);
    }

    cancelDelete() {
        this.showDeleteModal.set(false);
        this.sponsorToDeleteId = null;
    }

    confirmDelete() {
        if (this.sponsorToDeleteId) {
            this.sponsorService.deleteSponsor(this.sponsorToDeleteId)
                .then(() => {
                    this.toastService.success('Patrocinador eliminado con éxito.');
                    this.cancelDelete();
                })
                .catch(err => {
                    console.error(err);
                    this.toastService.error('Error al eliminar patrocinador.');
                    this.cancelDelete();
                });
        }
    }

    async onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            try {
                const compressedFile = await this.imageCompressor.compress(file);
                const reader = new FileReader();
                reader.onload = (e: any) => {
                    this.logoPreviewUrl.set(e.target.result);
                    this.sponsorForm.patchValue({
                        imagen: e.target.result
                    });
                };
                reader.readAsDataURL(compressedFile);
            } catch (error) {
                console.error('Image compression error', error);
                this.toastService.error('Hubo un error al procesar el logotipo.');
            }
        }
    }

    onSubmit() {
        this.submitted = true;
        if (this.sponsorForm.invalid) {
            return;
        }

        this.isSaving.set(true);
        const formValue = this.sponsorForm.value;

        const request = this.isEditing() && this.currentSponsorId
            ? this.sponsorService.updateSponsor(this.currentSponsorId, formValue)
            : this.sponsorService.addSponsor(formValue);

        request
            .then(() => {
                this.toastService.success(this.isEditing() ? 'Patrocinador actualizado.' : 'Patrocinador creado con éxito.');
                this.isSaving.set(false);
                this.toggleView();
            })
            .catch(err => {
                console.error(err);
                this.toastService.error('Hubo un error al guardar el patrocinador.');
                this.isSaving.set(false);
            });
    }

    resetForm() {
        this.submitted = false;
        this.currentSponsorId = null;
        this.logoPreviewUrl.set(null);
        this.sponsorForm.reset();
    }
}
