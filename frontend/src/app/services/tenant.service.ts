import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface ClubSettings {
  primary_color?: string;
  colors?: {
    primary?: string;
    accent?: string;
  };
  slogan?: string;
  contact?: any;
  social?: any;
  homeConfig?: any;
  [key: string]: any;
}

export interface TenantInfo {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: ClubSettings | null;
}

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  public tenantSlug = signal<string | null>(null);
  public tenantDomain = signal<string | null>(null);
  public tenantInfo = signal<TenantInfo | null>(null);
  public isTenantLoading = signal<boolean>(true);

  constructor() {
    this.detectTenant();
  }

  private detectTenant() {
    let hostname = window.location.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    this.tenantDomain.set(hostname);

    const MAIN_DOMAINS = ['clubagility.com', 'localhost'];
    const isMainDomain = MAIN_DOMAINS.includes(hostname);

    const parts = hostname.split('.');

    if (parts.length > 2 && hostname.endsWith('clubagility.com')) {
      this.tenantSlug.set(parts[0]);
    } else if (parts.length === 2 && hostname.includes('localhost') && parts[0] !== 'localhost') {
      this.tenantSlug.set(parts[0]);
    } else {
      this.tenantSlug.set(null);
    }

    console.log(`[TenantService] Hostname: ${hostname}, Slug detectado: ${this.tenantSlug() || 'Ninguno'}`);

    if (!isMainDomain || this.tenantSlug()) {
      this.loadTenantInfo();
    } else {
      this.isTenantLoading.set(false);
    }
  }

  private async loadTenantInfo() {
    try {
      const headers: any = {};
      if (this.tenantSlug()) headers['X-Club-Slug'] = this.tenantSlug()!;
      const domain = this.getTenantDomain();
      if (domain) headers['X-Club-Domain'] = domain;

      const response = await fetch(`${environment.apiUrl}/tenant/info`, { headers });
      if (response.ok) {
        const info: TenantInfo = await response.json();
        this.tenantInfo.set(info);
        if (!this.tenantSlug()) {
          this.tenantSlug.set(info.slug);
        }
        this.applyTheming(info);
      } else {
        this.redirectToMainDomain();
      }
    } catch (err) {
      console.error('[TenantService] Error loading tenant info', err);
      this.redirectToMainDomain();
    } finally {
      this.isTenantLoading.set(false);
    }
  }

  private redirectToMainDomain() {
    const hostname = window.location.hostname;
    const isLocalhost = hostname.includes('localhost');
    const port = window.location.port ? `:${window.location.port}` : '';

    let mainDomain = '';
    if (isLocalhost) {
      mainDomain = `http://localhost${port}`;
    } else {
      mainDomain = `https://clubagility.com`;
    }

    // Redirigir a la principal (puedes conservar la ruta si quieres, o forzar al login como se pidió)
    window.location.href = `${mainDomain}`;
  }

  private applyTheming(info: TenantInfo) {
    if (info.settings && info.settings.colors) {
      if (info.settings.colors.primary) {
        document.documentElement.style.setProperty('--primary-color', info.settings.colors.primary);
        document.documentElement.style.setProperty('--primary-blue', info.settings.colors.primary);
      }
      if (info.settings.colors.accent) {
        document.documentElement.style.setProperty('--accent-orange', info.settings.colors.accent);
      }
    } else if (info.settings && info.settings.primary_color) {
      document.documentElement.style.setProperty('--primary-color', info.settings.primary_color);
      document.documentElement.style.setProperty('--primary-blue', info.settings.primary_color);
    }

    if (info.name) {
      document.title = info.name;
    }

    const logoUrl = info.logo_url || '/ClubAgilityBlue.png';

    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = logoUrl;

    let appleLink: HTMLLinkElement | null = document.querySelector("link[rel~='apple-touch-icon']");
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = logoUrl;

    // Actualizar dinámicamente el manifest de PWA desde el backend
    let manifestLink: HTMLLinkElement | null = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    
    let manifestUrl = `${environment.apiUrl}/manifest.json`;
    if (this.tenantSlug()) {
      manifestUrl += `?slug=${this.tenantSlug()}`;
    } else if (this.getTenantDomain()) {
      manifestUrl += `?domain=${this.getTenantDomain()}`;
    }
    manifestLink.href = manifestUrl;
  }

  public getTenantSlug(): string | null {
    return this.tenantSlug();
  }

  public getTenantDomain(): string | null {
    const domain = this.tenantDomain();
    const MAIN_DOMAINS = ['clubagility.com', 'localhost'];
    if (domain && MAIN_DOMAINS.includes(domain)) {
      return null;
    }
    return domain;
  }
}
