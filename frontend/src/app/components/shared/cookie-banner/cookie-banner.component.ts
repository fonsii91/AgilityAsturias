import { Component, inject, OnInit, signal } from '@angular/core';
import { AnalyticsService } from '../../../services/analytics.service';
import { NgIf } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [NgIf],
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ])
  ],
  template: `
    <div *ngIf="showBanner()" @slideUp class="cookie-banner-overlay">
      <div class="cookie-banner-content">
        <div class="text-content">
          <h3>Valoramos tu privacidad</h3>
          <p>
            Utilizamos cookies propias y de terceros para analizar el uso de la plataforma, 
            mejorar la experiencia (como diferenciar PWA de Web) y medir el tráfico de cada club deportivo.
            Puedes aceptarlas todas o rechazarlas (solo usaremos las necesarias para que funcione la web).
          </p>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" (click)="denyCookies()">Rechazar</button>
          <button class="btn btn-primary" (click)="acceptCookies()">Aceptar todas</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cookie-banner-overlay {
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      justify-content: center;
      pointer-events: none;
    }
    
    .cookie-banner-content {
      background: var(--surface-card, #ffffff);
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 800px;
      width: 100%;
      pointer-events: auto;
      border: 1px solid var(--border-color, #e0e0e0);
    }
    
    @media (min-width: 768px) {
      .cookie-banner-content {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .text-content {
      flex: 1;
    }

    h3 {
      margin: 0 0 8px 0;
      font-size: 1.1rem;
      color: var(--text-color, #333);
      font-weight: 600;
    }

    p {
      margin: 0;
      font-size: 0.9rem;
      color: var(--text-secondary, #666);
      line-height: 1.5;
    }

    .actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: opacity 0.2s;
    }
    
    .btn:hover {
      opacity: 0.9;
    }

    .btn-primary {
      background-color: var(--primary-color, #0073CF);
      color: white;
    }

    .btn-secondary {
      background-color: transparent;
      color: var(--text-color, #333);
      border: 1px solid var(--border-color, #ccc);
    }
  `]
})
export class CookieBannerComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  public showBanner = signal(false);

  ngOnInit() {
    // Comprobar si ya tomó una decisión previa
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Si no hay decisión, mostrar el banner
      // Por defecto AnalyticsService ya ha puesto el estado 'denied'
      setTimeout(() => this.showBanner.set(true), 1000); // Pequeño retraso para que no asalte nada más entrar
    } else {
      // Si ya hay decisión guardada, actualizar el servicio
      if (consent === 'granted') {
         this.analyticsService.updateConsent(true);
      }
    }
  }

  acceptCookies() {
    this.analyticsService.updateConsent(true);
    localStorage.setItem('cookie_consent', 'granted');
    this.showBanner.set(false);
  }

  denyCookies() {
    this.analyticsService.updateConsent(false);
    localStorage.setItem('cookie_consent', 'denied');
    this.showBanner.set(false);
  }
}
