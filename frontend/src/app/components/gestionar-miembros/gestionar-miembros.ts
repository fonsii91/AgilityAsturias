import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, UserProfile } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-gestionar-miembros',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestionar-miembros.html',
  styleUrls: ['./gestionar-miembros.css']
})
export class GestionarMiembrosComponent implements OnInit {
  authService = inject(AuthService);
  toastService = inject(ToastService);

  users = signal<UserProfile[]>([]);
  loading = signal<boolean>(true);

  // Filter out admins to prevent modification by regular staff, but SHOW staff
  displayUsers = computed(() => {
    return this.users().filter(u => u.role !== 'admin');
  });

  async ngOnInit() {
    await this.loadUsers();
  }

  async loadUsers() {
    this.loading.set(true);
    try {
      const users = await this.authService.getAllUsers();
      this.users.set(users);
    } catch (error) {
      console.error('Error loading users', error);
      this.toastService.error('Error al cargar usuarios');
    } finally {
      this.loading.set(false);
    }
  }

  async generateResetLink(user: UserProfile) {
    try {
      if (!confirm(`¿Generar enlace de recuperación para ${user.displayName}?`)) return;
      const response = await this.authService.generateResetLink(user.uid!);

      // Copy to clipboard
      await navigator.clipboard.writeText(response.link);

      this.toastService.success('Enlace de recuperación copiado al portapapeles');
    } catch (error: any) {
      console.error('Error generating reset link', error);
      let errorMsg = 'Error al generar el enlace';
      if (error.error && error.error.message) {
        errorMsg = error.error.message;
      }
      this.toastService.error(errorMsg);
    }
  }

  // Role Update Logic
  async updateRole(user: UserProfile, newRole: string) {
    if (user.role === newRole) return;

    try {
      const role = newRole as 'user' | 'member' | 'staff';
      await this.authService.updateUserRole(user.id, role);

      this.users.update(users =>
        users.map(u => u.uid === user.uid ? { ...u, role: role } : u)
      );

      // Map roles to spanish for the toast
      const roleMap: any = {
        'user': 'Usuario',
        'member': 'Miembro',
        'staff': 'Staff'
      };

      this.toastService.success(`Rol de ${user.displayName} actualizado a ${roleMap[role]}`);
    } catch (error: any) {
      console.error('Error updating role', error);
      let errorMsg = 'Error al actualizar rol';
      if (error.error && error.error.message) {
        errorMsg = error.error.message;
      }
      this.toastService.error(errorMsg);
    }
  }

  // Zoom Image State
  zoomedImageURL: string | null = null;
  isZoomModalOpen = false;

  openImageZoom(url: string | null) {
    if (!url) return;
    this.zoomedImageURL = url;
    this.isZoomModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeImageZoom() {
    this.isZoomModalOpen = false;
    this.zoomedImageURL = null;
    document.body.style.overflow = 'auto';
  }
}
