import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DogService } from '../../../services/dog.service';
import { CompetitionService } from '../../../services/competition.service';
import { VideoService } from '../../../services/video.service';
import { ToastService } from '../../../services/toast.service';
import { Router } from '@angular/router';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

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

    uploadForm: FormGroup;
    selectedFile: File | null = null;
    isUploading = false;

    ffmpeg = new FFmpeg();
    isCompressing = false;
    compressionMessage = '';
    compressionProgress = 0;

    constructor() {
        this.uploadForm = this.fb.group({
            dog_id: ['', Validators.required],
            competition_id: [''],
            date: ['', Validators.required],
            title: ['']
        });
    }

    ngOnInit() {
        this.dogService.loadAllDogs();
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
        }
    }

    async loadFFmpeg() {
        if (this.ffmpeg.loaded) return;

        this.isCompressing = true;
        this.compressionMessage = 'Cargando motor de compresión...';
        this.cdr.detectChanges();

        this.ffmpeg.on('progress', ({ progress }) => {
            this.compressionProgress = Math.round(progress * 100);
            this.compressionMessage = `Comprimiendo vídeo... ${this.compressionProgress}%`;
            this.cdr.detectChanges();
        });

        const baseURL = 'assets/ffmpeg';
        await this.ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
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
        // Solo comprimir si es mayor a 380MB (Al borde de los 400MB de Hostalia)
        if (this.selectedFile.size > 380 * 1024 * 1024) {
            try {
                finalFile = await this.compressVideo(this.selectedFile);
            } catch (error) {
                console.error('Error comprimiendo vídeo', error);
                this.toastService.error('Error al comprimir el vídeo en local. Se intentará subir el original.');
                this.isCompressing = false;
                this.cdr.detectChanges();
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
                    this.toastService.error(errorMsg);
                } else if (err.status === 413) {
                    this.toastService.error('El vídeo fue rechazado por el servidor porque es demasiado pesado (Máximo 100MB).');
                } else if (err.status === 0) {
                    this.toastService.error('Se perdió la conexión con el servidor. El archivo podría ser demasiado pesado.');
                } else {
                    this.toastService.error('Error procesando el vídeo. Inténtalo de nuevo.');
                }
            }
        });
    }
}
