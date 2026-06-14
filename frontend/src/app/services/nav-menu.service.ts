import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { TenantService } from './tenant.service';

/**
 * FUENTE ÚNICA del menú de navegación.
 *
 * El menú se define UNA sola vez aquí (NAV_SECTIONS) y lo renderizan tanto el
 * navbar de escritorio como el sidenav móvil (app.html) iterando `sections()`.
 * Así, al añadir/quitar un enlace, aparece en ambos sitios automáticamente y no
 * vuelven a desincronizarse.
 *
 * Para añadir un enlace: edita NAV_SECTIONS. Nada más.
 */

export type NavRole = 'public' | 'member' | 'staff' | 'manager' | 'admin';

export interface NavItem {
  label: string;
  icon: string;
  /** Ruta destino. Admite el marcador :clubId, que se sustituye por el club actual. */
  route?: string;
  /** Coincidencia exacta para routerLinkActive (p.ej. la home '/'). */
  exact?: boolean;
  /** Solo visible si el plan incluye esta feature (TenantService.hasFeature). */
  feature?: string;
  /** Solo visible si este flag de settings del club está activo. */
  setting?: string;
  /** Cabecera no clicable dentro de una sección (subtítulo). */
  header?: boolean;
}

export interface NavSection {
  id: string;
  title: string;
  icon: string;
  role: NavRole;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'publico', title: 'Público', icon: 'public', role: 'public',
    items: [
      { label: 'Bienvenida', icon: 'home', route: '/', exact: true },
      { label: 'Galería', icon: 'photo_library', route: '/galeria' },
      { label: 'Videoteca', icon: 'videocam', route: '/videos-publicos', feature: 'galeria-videos' },
      { label: 'Patrocinadores', icon: 'handshake', route: '/patrocinadores', setting: 'sponsors_enabled' },
      { label: 'Contacto', icon: 'contact_support', route: '/contacto' },
    ],
  },
  {
    id: 'miembros', title: 'Miembros', icon: 'apps', role: 'member',
    items: [
      { label: 'Reservas', icon: 'event', route: '/reservas', feature: 'reservas-pistas' },
      { label: 'Calendario', icon: 'calendar_month', route: '/calendario' },
      { label: 'Clasificación', icon: 'emoji_events', route: '/ranking', setting: 'gamification_enabled' },
      { label: 'Vídeos', icon: 'movie', route: '/galeria-videos', feature: 'galeria-videos' },
      { label: 'Fotos', icon: 'photo_library', route: '/galeria-fotos' },
    ],
  },
  {
    id: 'staff', title: 'Staff', icon: 'badge', role: 'staff',
    items: [
      { label: 'Eventos', icon: 'sports_score', route: '/gestionar-competiciones' },
      { label: 'Monitor Reservas', icon: 'visibility', route: '/info-reservas', feature: 'reservas-pistas' },
      { label: 'Verificar Asistencia', icon: 'fact_check', route: '/admin/asistencia' },
      { label: 'Historial Asistencia', icon: 'history', route: '/staff/historial-asistencia' },
      { label: 'Puntos Extra', icon: 'military_tech', route: '/admin/puntos-extra', setting: 'gamification_enabled' },
      { label: 'Gestión Miembros', icon: 'people', route: '/gestionar-miembros' },
      { label: 'Gestión Horarios', icon: 'calendar_month', route: '/gestionar-horarios', feature: 'reservas-pistas' },
    ],
  },
  {
    id: 'gestor', title: 'Gestor', icon: 'business', role: 'manager',
    items: [
      { label: 'Configurar Club', icon: 'settings', route: '/admin/clubs/edit/:clubId' },
      { label: 'Funcionalidades', icon: 'widgets', route: '/configuracion/modulos' },
      { label: 'P. Bienvenida', icon: 'design_services', route: '/gestor/landing-page' },
      { label: 'Facturación', icon: 'credit_card', route: '/configuracion/facturacion' },
      { label: 'Provisión Fondos', icon: 'payments', route: '/admin/finanzas', setting: 'provision_fondos_enabled' },
    ],
  },
  {
    id: 'administrar', title: 'Administrar', icon: 'admin_panel_settings', role: 'admin',
    items: [
      { label: 'Roles', icon: 'admin_panel_settings', route: '/admin/usuarios' },
      { label: 'Gestión de Clubes', icon: 'domain', route: '/admin/clubs' },
      { label: 'Planes y Funciones', icon: 'card_membership', route: '/admin/suscripciones' },
      { label: 'Ver sugerencias', icon: 'report_problem', route: '/admin/sugerencias' },
      { label: 'Revisar', icon: '', header: true },
      { label: 'Revisar vídeos', icon: 'video_library', route: '/admin/videos', feature: 'galeria-videos' },
      { label: 'Vídeos Borrados', icon: 'auto_delete', route: '/admin/videos-borrados', feature: 'galeria-videos' },
      { label: 'Monitor ACWR', icon: 'monitor_heart', route: '/admin/salud-monitor' },
      { label: 'Canina (RSCE)', icon: 'query_stats', route: '/admin/rsce-monitor' },
      { label: 'Monitor Scraping', icon: 'sync', route: '/admin/scraper-monitor' },
      { label: 'Liga Norte', icon: 'emoji_events', route: '/admin/liga-norte', setting: 'liga_norte_enabled' },
      { label: 'Avatares IA', icon: 'auto_awesome', route: '/admin/avatares' },
      { label: 'Monitor Onboarding', icon: 'checklist_rtl', route: '/admin/onboarding-monitor' },
    ],
  },
  {
    id: 'explorar', title: 'Explorar', icon: 'explore', role: 'member',
    items: [
      { label: 'Salud Deportiva', icon: 'favorite', route: '/explorar/salud-deportiva', feature: 'salud-canina' },
      { label: 'Liga Norte', icon: 'emoji_events', route: '/explorar/liga-norte', setting: 'liga_norte_enabled' },
      { label: 'Canina (RSCE)', icon: 'analytics', route: '/bitacora-rsce', feature: 'modulo-canina' },
      { label: 'Caza (RFEC)', icon: 'pets', route: '/bitacora-rfec', feature: 'modulo-caza' },
      { label: 'Tablón de Anuncios', icon: 'campaign', route: '/tablon-anuncios' },
      { label: 'Recursos', icon: 'folder_shared', route: '/recursos' },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class NavMenuService {
  private auth = inject(AuthService);
  private tenant = inject(TenantService);

  /**
   * Secciones visibles para el usuario actual, con sus items ya filtrados por
   * rol, feature de plan y flags de módulos, y con :clubId resuelto.
   */
  readonly sections = computed<NavSection[]>(() => {
    const clubId = this.tenant.tenantInfo()?.id;
    return NAV_SECTIONS
      .filter((s) => this.roleVisible(s.role))
      .map((s) => ({
        ...s,
        items: s.items
          .filter((i) => this.itemVisible(i))
          .map((i) => ({ ...i, route: this.resolveRoute(i.route, clubId) })),
      }))
      // No mostrar una sección que se ha quedado sin items reales.
      .filter((s) => s.items.some((i) => !i.header));
  });

  private roleVisible(role: NavRole): boolean {
    switch (role) {
      case 'public': return true;
      case 'member': return this.auth.isMember();
      case 'staff': return this.auth.isStaff();
      case 'manager': return this.auth.isManager();
      case 'admin': return this.auth.isAdmin();
    }
  }

  private itemVisible(i: NavItem): boolean {
    if (i.header) return true;
    if (i.feature && !this.tenant.hasFeature(i.feature)) return false;
    if (i.setting && !this.settingOn(i.setting)) return false;
    return true;
  }

  private settingOn(key: string): boolean {
    const v: any = this.tenant.tenantInfo()?.settings?.[key];
    return v === true || v === 1 || v === '1';
  }

  private resolveRoute(route: string | undefined, clubId?: number): string | undefined {
    return route ? route.replace(':clubId', String(clubId ?? '')) : route;
  }
}
