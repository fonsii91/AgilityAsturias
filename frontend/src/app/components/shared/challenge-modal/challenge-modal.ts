import { Component, inject, output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { OnboardingService, ChallengeData } from '../../../services/onboarding';

/**
 * Modal del "Reto de Activación": muestra el progreso de onboarding de cada
 * miembro del club y cuánto falta para el objetivo (7 miembros = 700%).
 * Se abre desde el calendario al pulsar el evento de tipo 'reto'.
 */
@Component({
  selector: 'app-challenge-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './challenge-modal.html',
  styleUrl: './challenge-modal.css',
})
export class ChallengeModalComponent implements OnInit {
  private onboarding = inject(OnboardingService);
  close = output<void>();

  data = signal<ChallengeData | null>(null);
  isLoading = signal(true);

  ngOnInit() {
    this.onboarding.getChallenge().subscribe({
      next: (d) => { this.data.set(d); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); },
    });
  }

  /** % de la barra global, recortado a 100. */
  progressPct = computed(() => {
    const d = this.data();
    if (!d || !d.target) return 0;
    return Math.min(100, Math.round((d.total / d.target) * 100));
  });

  /** Miembros (al 100%) que faltan para llegar al objetivo. */
  remainingMembers = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return Math.max(0, Math.ceil((d.target - d.total) / 100));
  });

  /** Días que quedan hasta la fecha límite (null si no hay). */
  daysLeft = computed(() => {
    const d = this.data();
    if (!d?.deadline) return null;
    const deadline = new Date(d.deadline + 'T23:59:59');
    return Math.ceil((deadline.getTime() - Date.now()) / 86400000);
  });

  roleLabel(role: string): string {
    if (role === 'manager') return 'Gestor';
    if (role === 'staff') return 'Staff';
    return 'Socio';
  }

  onClose() { this.close.emit(); }
}
