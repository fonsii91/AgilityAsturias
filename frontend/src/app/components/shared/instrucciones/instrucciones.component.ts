import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-instrucciones',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './instrucciones.component.html',
  styleUrl: './instrucciones.component.css'
})
export class InstruccionesComponent {
  @Input() titulo: string = 'Instrucciones';
  isHelpModalOpen = signal(false);

  openHelpModal() {
    this.isHelpModalOpen.set(true);
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
