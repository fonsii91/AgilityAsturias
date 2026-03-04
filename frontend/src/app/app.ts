import { Component, signal, inject, OnInit, OnDestroy, Injector } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';

import { ToastComponent } from './components/toast/toast.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { AuthService } from './services/auth.service';
import { ReservationService } from './services/reservation.service';
import { CompetitionService } from './services/competition.service';
import { TimeSlotService } from './services/time-slot.service';
import { ToastService } from './services/toast.service';
import { SwUpdate } from '@angular/service-worker';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, NavbarComponent, ToastComponent, MatSidenavModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('AgilityAsturias');
  authService = inject(AuthService);
  private toastService = inject(ToastService);
  private swUpdate = inject(SwUpdate);
  private injector = inject(Injector);

  ngOnInit() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') {
          this.toastService.info('Actualizando aplicación...', 3000);
          setTimeout(() => {
            document.location.reload();
          }, 1500);
        }
      });
    }

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  ngOnDestroy() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && this.authService.isLoggedIn()) {
      // =========================================================================
      // NOTA IMPORTANTE PARA FUTURAS FUNCIONALIDADES:
      // Cualquier servicio nuevo que maneje datos que el usuario necesite ver 
      // actualizados en tiempo real (ej. listados, chats, notificaciones) 
      // DEBE ser inyectado y refrescado aquí. Esto garantiza que cuando la PWA
      // vuelva a primer plano tras estar minimizada, tire del servidor y 
      // refresque las Angular Signals para repintar la pantalla automáticamente.
      // =========================================================================

      const reservationService = this.injector.get(ReservationService);
      const competitionService = this.injector.get(CompetitionService);
      const timeSlotService = this.injector.get(TimeSlotService);

      reservationService.fetchReservations();
      reservationService.fetchAvailability();
      competitionService.fetchCompetitions();
      timeSlotService.fetchTimeSlots();
    }
  };
}
