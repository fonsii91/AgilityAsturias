import { Component, signal, inject, OnInit, OnDestroy, Injector, effect } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';

import { ToastComponent } from './components/toast/toast.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { AuthService } from './services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { DarPuntosExtraDialogComponent } from './components/dar-puntos-extra-dialog/dar-puntos-extra-dialog.component';
import { ReservationService } from './services/reservation.service';
import { CompetitionService } from './services/competition.service';
import { TimeSlotService } from './services/time-slot.service';
import { ToastService } from './services/toast.service';
import { SwUpdate } from '@angular/service-worker';
import { NotificationService } from './services/notification.service';
import { DogService } from './services/dog.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NavbarComponent, ToastComponent, MatSidenavModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal(environment.clubConfig?.name || 'Agility Asturias');
  authService = inject(AuthService);
  private toastService = inject(ToastService);
  private swUpdate = inject(SwUpdate);
  private injector = inject(Injector);
  private router = inject(Router);
  private dogService = inject(DogService);
  private dialog = inject(MatDialog);

  isProfileRoute = signal(false);
  isWarningMinimized = signal(false);

  constructor() {
      // Listen to route changes
      this.router.events.subscribe(event => {
          if (event instanceof NavigationEnd) {
              this.isProfileRoute.set(event.urlAfterRedirects.includes('/perfil'));
          }
      });
      
      // Load dogs when user changes
      effect(() => {
          const user = this.authService.currentUserSignal();
          if (user) {
              this.dogService.loadUserDogs();
          }
      });
  }

  ngOnInit() {
      // Inject CSS properties from club config
      if (environment.clubConfig?.colors) {
        document.documentElement.style.setProperty('--primary-blue', environment.clubConfig.colors.primary);
        document.documentElement.style.setProperty('--accent-orange', environment.clubConfig.colors.accent);
        if (environment.clubConfig.colors.warn) {
            document.documentElement.style.setProperty('--error-color', environment.clubConfig.colors.warn);
            document.documentElement.style.setProperty('--danger', environment.clubConfig.colors.warn);
        }
      }

      if (this.authService.isLoggedIn()) {
          this.dogService.loadUserDogs();
      }
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

  showLicenseWarning() {
      if (this.isProfileRoute()) return false;
      if (!this.authService.isLoggedIn()) return false;

      const dogs = this.dogService.getDogs()();
      if (!dogs || dogs.length === 0) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const warningDays = 15;

      return dogs.some(dog => {
          if (!dog.license_expiration_date) return false;
          
          const expirationDate = new Date(dog.license_expiration_date);
          expirationDate.setHours(0,0,0,0);
          
          const diffTime = expirationDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          return diffDays <= warningDays;
      });
  }

  goToProfile() {
      this.router.navigate(['/perfil']);
      this.isWarningMinimized.set(false); // reset state when going to profile
  }

  minimizeWarning() {
      this.isWarningMinimized.set(true);
  }

  maximizeWarning() {
      this.isWarningMinimized.set(false);
  }

  openExtraPointsDialog() {
      this.dialog.open(DarPuntosExtraDialogComponent, {
          width: '400px',
          maxWidth: '90vw'
      });
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
      const dogService = this.injector.get(DogService);
      const notificationService = this.injector.get(NotificationService);

      reservationService.fetchReservations();
      reservationService.fetchAvailability();
      competitionService.fetchCompetitions();
      timeSlotService.fetchTimeSlots();
      dogService.loadUserDogs();
      dogService.loadAllDogs();
      notificationService.loadNotifications();
    }
  };
}
