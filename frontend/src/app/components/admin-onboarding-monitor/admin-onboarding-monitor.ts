import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

interface UserOnboardingStatus {
  id: number;
  name: string;
  email: string;
  role: string;
  photo_url?: string;
  onboarding_progress?: any;
  tutorialCompleted: boolean;
  stepsCompleted: number;
  totalSteps: number;
}

@Component({
  selector: 'app-admin-onboarding-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-onboarding-monitor.html',
  styleUrl: './admin-onboarding-monitor.css'
})
export class AdminOnboardingMonitorComponent implements OnInit {
  authService = inject(AuthService);
  toast = inject(ToastService);

  users = signal<UserOnboardingStatus[]>([]);
  isLoading = signal<boolean>(true);

  // The steps we consider part of the introduction checklist
  expectedSteps = ['miembro_comunidad', 'miembro_perfil'];

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers() {
    this.isLoading.set(true);
    try {
      const allUsers = await this.authService.getAllUsers();
      
      const mappedUsers: UserOnboardingStatus[] = allUsers.map(u => {
        const anyUser = u as any;
        const progress = anyUser['onboarding_progress'] || {};
        const miembroProgress = progress['miembro'] || {};
        
        let completedCount = 0;
        for (const step of this.expectedSteps) {
          if (miembroProgress[step]) {
            completedCount++;
          }
        }

        return {
          id: anyUser.uid || anyUser['id'],
          name: anyUser.displayName || anyUser['name'],
          email: anyUser['email'],
          role: u.role,
          photo_url: anyUser.photoURL || anyUser['photo_url'],
          onboarding_progress: progress,
          tutorialCompleted: !!progress['miembro_finished'],
          stepsCompleted: completedCount,
          totalSteps: this.expectedSteps.length
        };
      });

      // Sort by completion status, or name
      mappedUsers.sort((a, b) => a.name.localeCompare(b.name));
      
      this.users.set(mappedUsers);
    } catch (e) {
      console.error('Error loading users for onboarding monitor', e);
      this.toast.error('Error al cargar la lista de usuarios.');
    } finally {
      this.isLoading.set(false);
    }
  }

  getProgressBarColor(completed: number, total: number): string {
    if (completed === total) return '#10b981'; // green
    if (completed > 0) return '#f59e0b'; // orange
    return '#cbd5e1'; // gray
  }
}
