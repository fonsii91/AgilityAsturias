import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { filter } from 'rxjs/operators';
import { TenantService } from './tenant.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private router = inject(Router);
  private tenantService = inject(TenantService);
  private measurementId = environment.firebase?.measurementId;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  public init() {
    if (!this.measurementId || this.isInitialized) return;

    // 1. Configurar gtag() base y Consent Mode
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).gtag = function() {
      (window as any).dataLayer.push(arguments);
    };

    // Consent Mode v2: Denied por defecto para cumplir GDPR
    (window as any).gtag('consent', 'default', {
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'analytics_storage': 'denied'
    });

    // 2. Inyectar script de GA4
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    document.head.appendChild(script);

    // 3. Configuración inicial
    (window as any).gtag('js', new Date());

    // Configurar propiedades de usuario (Fase 2)
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const platformMode = isPWA ? 'pwa' : 'browser';

    (window as any).gtag('config', this.measurementId, {
      send_page_view: false, // Lo enviamos manualmente con el router
      user_properties: {
        'platform_mode': platformMode,
        'club_slug': this.tenantService.getTenantSlug() || 'none'
      }
    });

    this.isInitialized = true;

    // 4. Suscribirse a cambios de ruta para Page Views
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      (window as any).gtag('event', 'page_view', {
        page_path: event.urlAfterRedirects,
      });
    });

    // 5. Detectar evento de instalación PWA
    window.addEventListener('appinstalled', () => {
      this.logEvent('pwa_installed');
    });
  }

  // Actualizar consentimiento cuando el usuario acepte cookies
  public updateConsent(granted: boolean) {
    if (!this.measurementId) return;
    const status = granted ? 'granted' : 'denied';
    (window as any).gtag('consent', 'update', {
      'ad_storage': status,
      'ad_user_data': status,
      'ad_personalization': status,
      'analytics_storage': status
    });
  }

  // Método genérico para enviar eventos
  public logEvent(eventName: string, eventParams?: any) {
    if (!this.isInitialized) return;
    (window as any).gtag('event', eventName, eventParams);
  }

  // Helpers específicos
  public logLogin(method: string = 'email') {
    this.logEvent('login', { method });
  }

  public logSignUp(method: string = 'email') {
    this.logEvent('sign_up', { method });
  }

  public logModuleAccess(moduleName: string) {
    this.logEvent('module_access', { module_name: moduleName });
  }

  public logReservation(action: 'made' | 'cancelled') {
    this.logEvent(`reservation_${action}`);
  }

  public logWorkload() {
    this.logEvent('workload_logged');
  }
}
