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

  // Filter out admins and staff to prevent modification by regular staff
  displayUsers = computed(() => {
    return this.users().filter(u => u.role !== 'admin' && u.role !== 'staff');
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

  // Confirmation Modal State
  selectedUser: UserProfile | null = null;
  confirmationAction: 'promote' | 'revoke' | null = null;
  isModalOpen = false;

  initiateToggleMember(user: UserProfile) {
    this.selectedUser = user;
    this.confirmationAction = user.role === 'member' ? 'revoke' : 'promote';
    this.isModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedUser = null;
    this.confirmationAction = null;
    document.body.style.overflow = 'auto';
  }

  async confirmToggle() {
    if (!this.selectedUser || !this.confirmationAction) return;

    const user = this.selectedUser;
    const newRole = this.confirmationAction === 'promote' ? 'member' : 'user';

    // Close modal immediately and show loading or just process
    this.closeModal();

    try {
      await this.authService.updateUserRole(user.uid, newRole);

      this.users.update(users =>
        users.map(u => u.uid === user.uid ? { ...u, role: newRole } : u)
      );

      this.toastService.success(`Rol de ${user.displayName} actualizado a ${newRole === 'member' ? 'Miembro' : 'Usuario'}`);
    } catch (error) {
      console.error('Error updating role', error);
      this.toastService.error('Error al cambiar rol');
    }
  }
}
