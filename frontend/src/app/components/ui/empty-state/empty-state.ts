import { Component, input, output, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { OnboardingService } from '../../../services/onboarding';

/**
 * Estado vacío reutilizable para toda la app.
 *
 * Sustituye los `.empty-state` dispersos por un patrón único: icono + título +
 * mensaje + (opcional) CTA. El color del icono y del botón usa `--primary-color`,
 * que el sistema multi-tenant inyecta por club (ver TenantService.applyTheming),
 * de modo que el estado vacío respeta la marca de cada club.
 *
 * El CTA puede:
 *  - navegar a una ruta (`ctaRoute`), o
 *  - emitir un evento (`ctaClick`) para acciones in-place (abrir modal, etc.).
 *
 * Si se indica `onboardingStep`, al pulsar el CTA se marca ese paso del tutorial
 * de onboarding como completado (engancha los vacíos con el checklist existente).
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterModule, MatIconModule],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
})
export class EmptyStateComponent {
  private onboarding = inject(OnboardingService);

  /** Nombre del icono de Material (p.ej. 'group_add', 'pets'). */
  readonly icon = input<string>('inbox');
  readonly title = input<string>('');
  readonly message = input<string>('');

  /** Texto del botón. Si está vacío, no se muestra CTA. */
  readonly ctaLabel = input<string>('');
  /** Ruta a la que navega el CTA. Si está vacía, el CTA emite `ctaClick`. */
  readonly ctaRoute = input<string>('');

  /** 'first-use' (vacío real, guía a actuar) vs 'no-results' (filtro/búsqueda). */
  readonly variant = input<'first-use' | 'no-results'>('first-use');

  /** Id del paso de onboarding a completar al pulsar el CTA (opcional). */
  readonly onboardingStep = input<string>('');

  readonly ctaClick = output<void>();

  onCta() {
    const step = this.onboardingStep();
    if (step) {
      this.onboarding.markStepCompleted(step);
    }
    this.ctaClick.emit();
  }
}
