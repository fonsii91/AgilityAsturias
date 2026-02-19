import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, UserProfile } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-usuarios.html',
  styleUrl: './admin-usuarios.css'
})
export class AdminUsuariosComponent implements OnInit {
  authService = inject(AuthService);
  toastService = inject(ToastService);

  users = signal<UserProfile[]>([]);
  loading = signal<boolean>(true);

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

  async updateRole(user: UserProfile, newRole: string) {
    if (user.role === newRole) return;

    try {
      const role = newRole as 'user' | 'member' | 'staff' | 'admin';
      await this.authService.updateUserRole(user.id, role);

      this.users.update(users =>
        users.map(u => u.uid === user.uid ? { ...u, role: role } : u)
      );

      this.toastService.success(`Rol de ${user.displayName} actualizado a ${role}`);
    } catch (error) {
      console.error('Error updating role', error);
      this.toastService.error('Error al actualizar rol');
    }
  }
}
