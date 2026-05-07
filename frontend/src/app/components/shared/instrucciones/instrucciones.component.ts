import { Component, Input, signal, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { OnboardingService } from '../../../services/onboarding';

@Component({
  selector: 'app-instrucciones',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './instrucciones.component.html',
  styleUrl: './instrucciones.component.css'
})
export class InstruccionesComponent {
  onboardingService = inject(OnboardingService);
  @Input() titulo: string = 'Instrucciones';
  @Output() opened = new EventEmitter<void>();
  isHelpModalOpen = signal(false);

  openHelpModal() {
    this.isHelpModalOpen.set(true);
    this.opened.emit();
    this.onboardingService.markStepCompleted('miembro_instrucciones');
  }

  closeHelpModal(event?: Event) {
    if (event) {
      if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
        this.isHelpModalOpen.set(false);
      }
    } else {
      this.isHelpModalOpen.set(false);
    }
  }
}
