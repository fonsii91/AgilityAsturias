import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingService, ChallengeData } from '../../services/onboarding';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-onboarding-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-onboarding-monitor.html',
  styleUrl: './admin-onboarding-monitor.css'
})
export class AdminOnboardingMonitorComponent implements OnInit {
  private onboarding = inject(OnboardingService);
  toast = inject(ToastService);

  data = signal<ChallengeData | null>(null);
  isLoading = signal<boolean>(true);

  /** % de la barra global del reto, recortado a 100. */
  progressPct = computed(() => {
    const d = this.data();
    if (!d || !d.target) return 0;
    return Math.min(100, Math.round((d.total / d.target) * 100));
  });

  ngOnInit(): void {
    this.onboarding.getChallenge().subscribe({
      next: (d) => { this.data.set(d); this.isLoading.set(false); },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Error al cargar el progreso de onboarding.');
      }
    });
  }

  roleLabel(role: string): string {
    if (role === 'manager') return 'Gestor';
    if (role === 'staff') return 'Staff';
    return 'Socio';
  }

  barColor(percent: number, finished: boolean): string {
    if (finished || percent >= 100) return '#10b981'; // verde
    if (percent > 0) return '#f59e0b'; // naranja
    return '#cbd5e1'; // gris
  }
}
