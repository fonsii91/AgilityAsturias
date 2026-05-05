import { Component, signal, inject, OnInit, OnDestroy, Injector, effect, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';

import { ToastComponent } from './components/toast/toast.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { AuthService } from './services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { ReservationService } from './services/reservation.service';
import { CompetitionService } from './services/competition.service';
import { TimeSlotService } from './services/time-slot.service';
import { ToastService } from './services/toast.service';
import { SwUpdate } from '@angular/service-worker';
import { NotificationService } from './services/notification.service';
import { DogService } from './services/dog.service';
import { environment } from '../environments/environment';
import { TenantService } from './services/tenant.service';

import { CommonModule, DatePipe } from '@angular/common';
import { ClubagilityComponent } from './clubagility/clubagility.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NavbarComponent, ToastComponent, MatSidenavModule, CommonModule, DatePipe, ClubagilityComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = computed(() => this.tenantService.tenantInfo()?.name || 'Club Agility');
  authService = inject(AuthService);
  tenantService = inject(TenantService);
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

  licenseWarningsList = computed(() => {
      const warnings: { type: string, name: string, dateStr: string, isExpired: boolean, daysLeft: number }[] = [];
      
      const user = this.authService.currentUserSignal();
      // Only proceed if user is logged in
      if (!user) return warnings;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const warningDays = 15;

      const getWarningInfo = (dateStr: string | null | undefined, type: 'rfec'|'rsce', name: string) => {
          if (!dateStr) return null;
          const expirationDate = new Date(dateStr);
          expirationDate.setHours(0,0,0,0);
          const diffDiff = expirationDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffDiff / (1000 * 60 * 60 * 24));
          
          if (diffDays <= warningDays) {
              return { type, name, dateStr, isExpired: diffDays < 0, daysLeft: diffDays };
          }
          return null;
      };

      const rfecWarn = getWarningInfo(user.rfec_expiration_date, 'rfec', 'Tu Licencia RFEC personal');
      if (rfecWarn) warnings.push(rfecWarn);

      const dogs = this.dogService.getDogs()();
      if (dogs && dogs.length > 0) {
          for (const dog of dogs) {
             const rsceWarn = getWarningInfo(dog.pivot?.rsce_expiration_date, 'rsce', `Licencia RSCE de ${dog.name}`);
             if (rsceWarn) warnings.push(rsceWarn);
          }
      }

      return warnings;
  });

  showLicenseWarning() {
      if (this.isProfileRoute()) return false;
      return this.licenseWarningsList().length > 0;
  }

  hasRfecWarning = computed(() => this.licenseWarningsList().some(w => w.type === 'rfec'));
  hasRsceWarning = computed(() => this.licenseWarningsList().some(w => w.type === 'rsce'));

  goToProfile() {
      this.router.navigate(['/perfil']);
      this.isWarningMinimized.set(false);
  }

  goToDogsManagement() {
      this.router.navigate(['/gestionar-perros']);
      this.isWarningMinimized.set(false);
  }

  minimizeWarning() {
      this.isWarningMinimized.set(true);
  }

  maximizeWarning() {
      this.isWarningMinimized.set(false);
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
