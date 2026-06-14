import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ClubAdminService, Club } from '../../../services/club-admin.service';
import { TenantService } from '../../../services/tenant.service';
import { ToastService } from '../../../services/toast.service';

interface ModuleDef {
  key: string;
  feature: string;
  title: string;
  description: string;
  icon: string;
  manageLink?: string;
  manageLabel?: string;
}

/**
 * "Funcionalidades del club": activación de los módulos opcionales del club,
 * separada de la configuración visual (Configurar club). Cada módulo es una
 * tarjeta con su descripción, estado y el gating del plan contratado. Reutiliza
 * el endpoint de actualización del club (whitelist de settings + gating del
 * backend en ClubController::update).
 */
@Component({
  selector: 'app-funcionalidades-club',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './funcionalidades.component.html',
  styleUrl: './funcionalidades.component.css',
})
export class FuncionalidadesClubComponent implements OnInit {
  private clubService = inject(ClubAdminService);
  private tenant = inject(TenantService);
  private toast = inject(ToastService);

  club = signal<Club | null>(null);
  isLoading = signal(true);
  savingKey = signal<string | null>(null);

  readonly modules: ModuleDef[] = [
    {
      key: 'gamification_enabled', feature: 'gamificacion',
      title: 'Gamificación', icon: 'emoji_events',
      description: 'Clasificación de perros, álbum de cromos y Tablón de Cazarrecompensas. Da vida al club y motiva la asistencia a clase.',
      manageLink: '/ranking', manageLabel: 'Ver clasificación',
    },
    {
      key: 'provision_fondos_enabled', feature: 'provision-fondos',
      title: 'Provisión de Fondos', icon: 'account_balance_wallet',
      description: 'Lleva las cuentas de tus socios: ingresos, gastos y saldo. Actívalo cuando vayas a gestionar el dinero del club.',
      manageLink: '/admin/finanzas', manageLabel: 'Gestionar fondos del club',
    },
    {
      key: 'sponsors_enabled', feature: 'patrocinadores',
      title: 'Patrocinadores', icon: 'handshake',
      description: 'Muestra a tus marcas colaboradoras en la cara pública del club. Actívalo cuando tengas patrocinadores que enseñar.',
      manageLink: '/admin/patrocinadores', manageLabel: 'Gestionar patrocinadores',
    },
    {
      key: 'liga_norte_enabled', feature: 'liga-norte',
      title: 'Liga Norte', icon: 'leaderboard',
      description: 'Clasificación y contenidos de la Liga Norte (competición regional). Solo relevante si tu club participa en ella.',
    },
  ];

  ngOnInit() {
    const id = this.tenant.tenantInfo()?.id;
    if (!id) { this.isLoading.set(false); return; }
    this.clubService.getClub(id).subscribe({
      next: (c) => { this.club.set(c); this.isLoading.set(false); },
      error: () => { this.toast.error('No se pudo cargar la configuración del club.'); this.isLoading.set(false); },
    });
  }

  isEnabled(key: string): boolean {
    return !!(this.club()?.settings as any)?.[key];
  }

  private planFeatures(): string[] {
    return ((this.club()?.plan as any)?.features || []).map((f: any) => f.slug);
  }

  /** Bloqueado si el club tiene plan y el plan no incluye la feature del módulo. */
  isLocked(m: ModuleDef): boolean {
    const club = this.club();
    if (!club?.plan) return false;
    return !this.planFeatures().includes(m.feature);
  }

  toggle(m: ModuleDef) {
    const club = this.club();
    if (!club || this.isLocked(m) || this.savingKey()) return;

    const newVal = !this.isEnabled(m.key);
    const settings: any = { ...(club.settings || {}) };
    settings[m.key] = newVal;

    this.savingKey.set(m.key);
    this.clubService.updateClub(club.id!, { name: club.name, slug: club.slug, settings } as any).subscribe({
      next: () => {
        // El backend devuelve el club sin plan cargado; actualizamos solo settings
        // en local para conservar el gating (plan.features).
        this.club.update((prev) => (prev ? ({ ...prev, settings }) : prev));
        this.savingKey.set(null);
        this.toast.success(`${m.title} ${newVal ? 'activado' : 'desactivado'}.`);
        this.tenant.reload();
      },
      error: () => {
        this.savingKey.set(null);
        this.toast.error('No se pudo guardar el cambio.');
      },
    });
  }
}
