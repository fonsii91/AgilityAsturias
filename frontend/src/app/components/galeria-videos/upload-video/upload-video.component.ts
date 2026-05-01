import { Component, OnInit, inject, ChangeDetectorRef, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DogService } from '../../../services/dog.service';
import { CompetitionService } from '../../../services/competition.service';
import { VideoService } from '../../../services/video.service';
import { ToastService } from '../../../services/toast.service';
import { Router } from '@angular/router';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { AuthService } from '../../../services/auth.service';
import { Dog } from '../../../models/dog.model';

@Component({
    selector: 'app-upload-video',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './upload-video.component.html',
    styleUrl: './upload-video.component.css'
})
export class UploadVideoComponent implements OnInit {
    private fb = inject(FormBuilder);
    public dogService = inject(DogService);
    public compService = inject(CompetitionService);
    private videoService = inject(VideoService);
    private toastService = inject(ToastService);
    private router = inject(Router);
    private cdr = inject(ChangeDetectorRef);
    public authService = inject(AuthService);

    uploadForm: FormGroup;
    selectedFile: File | null = null;
    isUploading = false;
    isDragging = false;

    ffmpeg = new FFmpeg();
    isCompressing = false;
    compressionMessage = '';
    compressionProgress = 0;

    detectedOrientation: 'horizontal' | 'vertical' = 'vertical';

    constructor() {
        this.uploadForm = this.fb.group({
            dog_id: ['', Validators.required],
            competition_id: [''],
            date: ['', Validators.required],
            manga_type: ['Agility 1'],
            title: ['']
        });

        effect(() => {
            const comps = this.compService.getCompetitions()();
            const today = new Date().toISOString().split('T')[0];

            const currentCompId = this.uploadForm.get('competition_id')?.value;
            if (!currentCompId) {
                // Find if any competition is happening today (or within its date range)
                const todayComp = comps.find(c => {
                    if (!c.fechaEvento) return false;
                    const start = c.fechaEvento.split('T')[0];
                    const end = c.fechaFinEvento ? c.fechaFinEvento.split('T')[0] : start;
                    return today >= start && today <= end;
                });
                if (todayComp) {
                    this.uploadForm.patchValue({ competition_id: todayComp.id });
                }
            }
        });
    }

    ngOnInit() {
        this.dogService.loadAllDogs();

        const today = new Date().toISOString().split('T')[0];
        this.uploadForm.patchValue({ date: today });
    }

    cancel() {
        this.router.navigate(['/galeria-videos']);
    }

    get sortedDogs(): Dog[] {
        const dogs = this.dogService.getAllDogs()() || [];
        const userId = this.authService.currentUserSignal()?.id;
        if (!userId) {
            return [...dogs].sort((a, b) => a.name.localeCompare(b.name));
        }

        return [...dogs].sort((a, b) => {
            const aIsMine = this.hasDogUser(a, userId);
            const bIsMine = this.hasDogUser(b, userId);
            if (aIsMine && !bIsMine) return -1;
            if (!aIsMine && bIsMine) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    hasDogUser(dog: any, userId: number | null): boolean {
        if (!dog?.users || !userId) return false;
        return dog.users.some((u: any) => u.id == userId);
    }

    getDogOwners(dog: any): string {
        if (!dog?.users || dog.users.length === 0) return 'Sin dueño';
        return dog.users.map((u: any) => u.name).join(', ');
    }

    get pastAndCurrentCompetitions(): import('../../../models/competition.model').Competition[] {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.compService.getCompetitions()().filter(comp => {
            if (!comp.fechaEvento) return true;
            const compDate = new Date(comp.fechaEvento);
            compDate.setHours(0, 0, 0, 0);
            return compDate.getTime() <= today.getTime();
        });
    }

    async onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            this.detectedOrientation = await this.detectOrientation(file);
        }
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = true;
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
    }

    async onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            // Validate it's a video
            if (file.type.startsWith('video/')) {
                this.selectedFile = file;
                this.detectedOrientation = await this.detectOrientation(file);
            } else {
                this.toastService.error('Por favor, selecciona un archivo de vídeo válido.');
            }
        }
    }

    async detectOrientation(file: File): Promise<'horizontal' | 'vertical'> {
        return new Promise((resolve) => {
            try {
                const video = document.createElement('video');
                const url = URL.createObjectURL(file);

                video.onloadedmetadata = () => {
                    URL.revokeObjectURL(url);
                    if (video.videoWidth > video.videoHeight) {
                        resolve('horizontal');
                    } else {
                        resolve('vertical');
                    }
                };

                video.onerror = () => {
                    URL.revokeObjectURL(url);
                    resolve('vertical');
                };

                video.src = url;
            } catch (error) {
                resolve('vertical');
            }
        });
    }

    removeFile() {
        this.selectedFile = null;
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async fetchWithProgress(url: string, mimeType: string, isMainFiles: boolean = false): Promise<string> {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let loaded = 0;

        const reader = response.body?.getReader();
        if (!reader) {
            const blob = await response.blob();
            return URL.createObjectURL(new Blob([blob], { type: mimeType }));
        }

        const chunks: Uint8Array[] = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
                chunks.push(value);
                loaded += value.length;
                if (total && isMainFiles) {
                    const progress = Math.round((loaded / total) * 100);
                    this.compressionMessage = `Descargando motor de compresión... ${progress}%`;
                    this.cdr.detectChanges();
                }
            }
        }

        const blob = new Blob(chunks as any, { type: mimeType });
        return URL.createObjectURL(blob);
    }

    async loadFFmpeg() {
        if (this.ffmpeg.loaded) return;

        this.isCompressing = true;
        this.compressionMessage = 'Cargando motor de compresión (30MB)...';
        this.cdr.detectChanges();

        this.ffmpeg.on('progress', ({ progress }) => {
            this.compressionProgress = Math.round(progress * 100);
            this.compressionMessage = `Comprimiendo vídeo... ${this.compressionProgress}%`;
            this.cdr.detectChanges();
        });

        const baseURL = 'assets/ffmpeg';
        let workerUrl = '';
        try {
            const check = await fetch(`${baseURL}/814.ffmpeg.js`, { method: 'HEAD' });
            if (!check.ok) throw new Error('Not found locally');
            workerUrl = await toBlobURL(`${baseURL}/814.ffmpeg.js`, 'application/javascript');
        } catch (e) {
            workerUrl = await toBlobURL('https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/umd/814.ffmpeg.js', 'application/javascript');
        }

        const OriginalWorker = window.Worker;
        window.Worker = function (url: string | URL, options?: WorkerOptions) {
            // Force classic worker by stripping `{ type: 'module' }`.
            // Module workers prevent `importScripts`, which crashes the UMD worker internally.
            return new OriginalWorker(url);
        } as any;

        try {
            await this.ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await this.fetchWithProgress(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm', true),
                classWorkerURL: workerUrl
            });
        } finally {
            window.Worker = OriginalWorker;
        }
    }

    async compressVideo(file: File): Promise<File> {
        await this.loadFFmpeg();
        this.isCompressing = true;
        this.compressionMessage = 'Preparando el archivo...';
        this.cdr.detectChanges();

        const inputName = 'input.' + file.name.split('.').pop();
        const outputName = 'output.mp4';

        await this.ffmpeg.writeFile(inputName, await fetchFile(file));

        this.compressionMessage = 'Comprimiendo vídeo... 0%';
        this.cdr.detectChanges();

        await this.ffmpeg.exec([
            '-i', inputName,
            '-vf', 'scale=-2:720',
            '-r', '30',
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-profile:v', 'baseline',
            '-level', '3.0',
            '-preset', 'ultrafast',
            '-crf', '28',
            outputName
        ]);

        const data = await this.ffmpeg.readFile(outputName);
        this.isCompressing = false;
        this.compressionProgress = 0;
        this.cdr.detectChanges();

        this.ffmpeg.deleteFile(inputName);
        this.ffmpeg.deleteFile(outputName);

        const compressedBlob = new Blob([data as any], { type: 'video/mp4' });
        return new File([compressedBlob], `compressed_${file.name.replace(/\.[^/.]+$/, "")}.mp4`, { type: 'video/mp4' });
    }

    async onSubmit() {
        if (this.uploadForm.invalid || !this.selectedFile) {
            this.toastService.error('Por favor completa todos los campos requeridos y selecciona un vídeo.');
            return;
        }

        let finalFile = this.selectedFile;
        // Solo comprimir si es mayor a 500MB (Límite del servidor)
        if (this.selectedFile.size > 500 * 1024 * 1024) {
            try {
                finalFile = await this.compressVideo(this.selectedFile);
            } catch (error) {
                console.error('Error comprimiendo vídeo', error);
                this.toastService.error('Error al comprimir. El archivo original es demasiado pesado para subirlo sin comprimir (>500MB).');
                this.isCompressing = false;
                this.cdr.detectChanges();
                return;
            }
        }

        this.isUploading = true;
        this.cdr.detectChanges();

        const formData = new FormData();
        formData.append('dog_id', this.uploadForm.get('dog_id')?.value);

        const compId = this.uploadForm.get('competition_id')?.value;
        if (compId) {
            formData.append('competition_id', compId);
        }

        formData.append('date', this.uploadForm.get('date')?.value);
        formData.append('title', this.uploadForm.get('title')?.value || '');
        formData.append('manga_type', this.uploadForm.get('manga_type')?.value || 'Agility 1');
        formData.append('orientation', this.detectedOrientation);
        formData.append('video', finalFile);

        this.videoService.uploadVideo(formData).subscribe({
            next: () => {
                this.toastService.success('Vídeo subido exitosamente.');
                this.router.navigate(['/galeria-videos']);
                this.isUploading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Upload Error:', err);
                this.isUploading = false;
                this.cdr.detectChanges();

                if (err.status === 422) {
                    // Extract validation errors from Laravel
                    let errorMsg = 'Datos inválidos. Por favor, revisa el formulario.';
                    if (err.error?.errors) {
                        const firstErrorKey = Object.keys(err.error.errors)[0];
                        errorMsg = err.error.errors[firstErrorKey][0];
                    } else if (err.error?.message) {
                        errorMsg = err.error.message;
                    }

                    if (errorMsg === 'The video failed to upload.') {
                        errorMsg = 'El archivo supera el límite (upload_max_filesize) configurado en el servidor PHP local. Sube un vídeo más pequeño o aumenta este límite en tu php.ini.';
                    }

                    this.toastService.error(errorMsg);
                } else if (err.status === 413) {
                    this.toastService.error('El vídeo fue rechazado por el servidor porque es demasiado pesado (Máximo 500MB).');
                } else if (err.status === 0) {
                    this.toastService.error('Se perdió la conexión con el servidor. El archivo podría ser demasiado pesado.');
                } else {
                    this.toastService.error('Error procesando el vídeo. Inténtalo de nuevo.');
                }
            }
        });
    }
}
