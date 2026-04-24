import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface ClubSettings {
  primary_color?: string;
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

  constructor() {
    this.detectTenant();
  }

  private detectTenant() {
    const hostname = window.location.hostname;
    this.tenantDomain.set(hostname);

    const MAIN_DOMAINS = ['clubagility.com', 'www.clubagility.com', 'localhost'];
    const isMainDomain = MAIN_DOMAINS.includes(hostname);

    const parts = hostname.split('.');
    
    if (parts.length > 2 && parts[0] !== 'www' && hostname.endsWith('clubagility.com')) {
      this.tenantSlug.set(parts[0]);
    } else if (parts.length === 2 && hostname.includes('localhost') && parts[0] !== 'localhost') {
      this.tenantSlug.set(parts[0]);
    } else {
      this.tenantSlug.set(null);
    }
    
    console.log(`[TenantService] Hostname: ${hostname}, Slug detectado: ${this.tenantSlug() || 'Ninguno'}`);

    if (!isMainDomain || this.tenantSlug()) {
      this.loadTenantInfo();
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
        this.applyTheming(info);
      } else {
        this.redirectToMainDomain();
      }
    } catch (err) {
      console.error('[TenantService] Error loading tenant info', err);
      this.redirectToMainDomain();
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
    window.location.href = `${mainDomain}/login`;
  }

  private applyTheming(info: TenantInfo) {
    if (info.settings && info.settings.primary_color) {
      document.documentElement.style.setProperty('--primary-color', info.settings.primary_color);
      // Aquí se pueden setear más variables: --primary-hover, --accent, etc.
    }
    if (info.name) {
      document.title = info.name;
    }
  }

  public getTenantSlug(): string | null {
    return this.tenantSlug();
  }

  public getTenantDomain(): string | null {
    const domain = this.tenantDomain();
    const MAIN_DOMAINS = ['clubagility.com', 'www.clubagility.com', 'localhost'];
    if (domain && MAIN_DOMAINS.includes(domain)) {
      return null;
    }
    return domain;
  }
}
