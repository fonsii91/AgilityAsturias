import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AnnouncementService } from '../../../services/announcement.service';
import { AuthService, User } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-crear-anuncio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, RouterModule],
  templateUrl: './crear-anuncio.component.html',
  styleUrls: ['./crear-anuncio.component.css']
})
export class CrearAnuncioComponent implements OnInit {
  announcementForm: FormGroup;
  isSubmitting = signal(false);

  // Notification Options
  usersList = signal<{id: number, name: string}[]>([]);
  notifyType = signal<'none' | 'all' | 'specific'>('all');
  selectedUsers = signal<Set<number>>(new Set<number>());

  constructor(
    private fb: FormBuilder,
    private announcementService: AnnouncementService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {
    this.announcementForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      content: ['', [Validators.required, Validators.maxLength(10000)]],
      category: ['General', [Validators.required]]
    });
  }

  async ngOnInit() {
    try {
      const users = await this.authService.getMinimalUsers();
      this.usersList.set(users);
    } catch (err) {
      console.warn('Could not load users for notification options');
    }
  }

  setNotifyType(type: 'none' | 'all' | 'specific') {
    this.notifyType.set(type);
  }

  toggleUser(id: number) {
    const current = this.selectedUsers();
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedUsers.set(new Set(current));
  }

  onSubmit() {
    if (this.announcementForm.invalid) return;

    this.isSubmitting.set(true);

    const payload: any = { ...this.announcementForm.value };

    if (this.notifyType() === 'all') {
      payload.notify_all = true;
    } else if (this.notifyType() === 'specific') {
      payload.notify_users = Array.from(this.selectedUsers());
    }

    this.announcementService.createAnnouncement(payload).subscribe({
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
