import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AnnouncementService } from '../../../services/announcement.service';
import { ToastService } from '../../../services/toast.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-crear-anuncio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, RouterModule],
  templateUrl: './crear-anuncio.component.html',
  styleUrls: ['./crear-anuncio.component.css']
})
export class CrearAnuncioComponent {
  announcementForm: FormGroup;
  isSubmitting = signal(false);

  constructor(
    private fb: FormBuilder,
    private announcementService: AnnouncementService,
    private toastService: ToastService,
    private router: Router
  ) {
    this.announcementForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      content: ['', [Validators.required, Validators.maxLength(10000)]]
    });
  }

  onSubmit() {
    if (this.announcementForm.invalid) return;

    this.isSubmitting.set(true);
    this.announcementService.createAnnouncement(this.announcementForm.value).subscribe({
      next: () => {
        this.toastService.success('Anuncio publicado espectacularmente');
        this.isSubmitting.set(false);
        this.router.navigate(['/tablon-anuncios']);
      },
      error: (err) => {
        console.error('Error creating announcement', err);
        this.toastService.error('Error al publicar el anuncio');
        this.isSubmitting.set(false);
      }
    });
  }
}
