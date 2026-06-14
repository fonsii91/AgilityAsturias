import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OnboardingService, OnboardingStep } from '../../../services/onboarding';
import { TenantService } from '../../../services/tenant.service';
import { AuthService } from '../../../services/auth.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-onboarding-widget',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './onboarding-widget.html',
  styleUrls: ['./onboarding-widget.css'],
  animations: [
    trigger('popover', [
      state('void', style({ opacity: 0, transform: 'translateY(10px) scale(0.95)', pointerEvents: 'none' })),
      state('*', style({ opacity: 1, transform: 'translateY(0) scale(1)', pointerEvents: 'auto' })),
      transition('void => *', animate('200ms cubic-bezier(0.175, 0.885, 0.32, 1.275)')),
      transition('* => void', animate('150ms ease-in'))
    ])
  ]
})
export class OnboardingWidgetComponent {
  onboardingService = inject(OnboardingService);
  router = inject(Router);
  tenantService = inject(TenantService);
  authService = inject(AuthService);
  isExpanded = signal(false);

  /**
   * Fase 1: el onboarding solo se reactiva para socios (rol exacto 'member').
   * Staff y Gestor se reactivarán en la Fase 2, cuando sus tutoriales estén
   * blindados (scope de club, sin pasos redundantes/destructivos).
   */
  fase1RoleAllowed = computed(() => this.authService.currentUserSignal()?.role === 'member');

  toggle() {
    this.isExpanded.update(v => !v);
  }

  navigate(step: OnboardingStep) {
    this.toggle();
    if (step.route === 'DYNAMIC_CLUB_CONFIG') {
      const clubId = this.tenantService.tenantInfo()?.id;
      if (clubId) {
        this.router.navigate(['/admin/clubs/edit', clubId]);
      } else {
        this.router.navigate(['/admin/clubs']);
      }
    } else {
      this.router.navigate([step.route]);
    }
  }

  skipStep(step: OnboardingStep, event: Event) {
    event.stopPropagation();
    this.onboardingService.skipStep(step);
  }

  skipTutorial() {
    const ok = confirm('¿Saltar el tutorial de inicio? Podrás seguir usando la app con normalidad.');
    if (ok) {
      this.onboardingService.skipTutorial();
      this.isExpanded.set(false);
    }
  }

  get activeTypeDisplay() {
    const type = this.onboardingService.activeTutorialType();
    if (type === 'gestor') return 'Gestor';
    if (type === 'staff') return 'Staff';
    if (type === 'miembro') return 'Socio';
    return '';
  }
}
