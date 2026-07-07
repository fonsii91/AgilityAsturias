import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ClubAdminService, Club } from '../../../services/club-admin.service';
import { TenantService } from '../../../services/tenant.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';

interface ModuleDef {
  key: string;
  /** Feature del plan que desbloquea el módulo; sin ella el módulo está disponible en todos los planes. */
  feature?: string;
  /** Si la clave no existe aún en settings del club, el módulo cuenta como activado
      (módulos anteriores a su switch, que los clubes existentes ya usaban). */
  defaultOn?: boolean;
  /** Grupo semántico bajo el que se muestra (misma taxonomía que el menú de navegación). */
  group: string;
  title: string;
  description: string;
  icon: string;
  manageLink?: string;
  manageLabel?: string;
}

interface ModuleGroup {
  name: string;
  modules: ModuleDef[];
}

/**
 * "Funcionalidades del club": activación de los módulos opcionales del club,
 * separada de la configuración visual (Configurar club). Los módulos se muestran
 * como una lista de filas compactas agrupadas por área (misma taxonomía que el
 * menú, para reforzar un único modelo mental), con los módulos fuera del plan
 * apartados al final como zona de upsell. Reutiliza el endpoint de actualización
 * del club (whitelist de settings + gating del backend en ClubController::update).
 */
@Component({
  selector: 'app-funcionalidades-club',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatDialogModule],
  templateUrl: './funcionalidades.component.html',
  styleUrl: './funcionalidades.component.css',
})
export class FuncionalidadesClubComponent implements OnInit {
  private clubService = inject(ClubAdminService);
  private tenant = inject(TenantService);
  private toast = inject(ToastService);
  private dialog = inject(MatDialog);

  club = signal<Club | null>(null);
  isLoading = signal(true);
  savingKey = signal<string | null>(null);
  clearingDemo = signal(false);

  /** ¿El club todavía tiene datos de ejemplo sin limpiar? Flag autoritativo del
      backend (has_demo_data); una vez borrados no vuelve a aparecer. */
  hasDemoData = computed(() => !!(this.club() as any)?.has_demo_data);

  /** Orden de los grupos en pantalla (los módulos se declaran abajo con su `group`). */
  private readonly groupOrder = ['Competición', 'Comunidad y motivación', 'Dinero y cara pública', 'Reservas y clases'];

  readonly modules: ModuleDef[] = [
    {
      key: 'track_booking_enabled', group: 'Reservas y clases',
      title: 'Reserva de Pistas', icon: 'flag',
      description: 'Entrenamientos libres: tus socios podrán reservar una pista una hora para entrenar por su cuenta, en las franjas que no ocupen las clases. Aparece como una pestaña dentro de Reservas.',
      manageLink: '/reservas', manageLabel: 'Ir a Reservas',
    },
    {
      // El enlace va a Gestión de Miembros (recarga por socio, sin depender de
      // otros módulos); Administrar Finanzas mantiene su tarjeta de bono como
      // sitio secundario, pero requiere Provisión de Fondos activa.
      key: 'class_bonuses_enabled', group: 'Reservas y clases',
      title: 'Bonos de Clases', icon: 'confirmation_number',
      description: 'Cada socio tiene un contador de clases disponibles: apuntarse a una clase consume una y cancelar la devuelve. Sin clases en el bono no se puede reservar. Los bonos se recargan desde Gestión de Miembros (y también desde Administrar Finanzas si llevas la Provisión de Fondos).',
      manageLink: '/gestionar-miembros', manageLabel: 'Recargar bonos',
    },
    {
      key: 'liga_norte_enabled', feature: 'liga-norte', group: 'Competición',
      title: 'Liga Norte', icon: 'leaderboard',
      description: 'Clasificación y contenidos de la Liga Norte (competición regional). Solo relevante si tu club participa en ella.',
    },
    {
      key: 'rsce_tracker_enabled', feature: 'modulo-canina', defaultOn: true, group: 'Competición',
      title: 'Bitácora Canina (RSCE)', icon: 'analytics',
      description: 'Diario personal de competición RSCE: cada socio registra sus mangas, grados y progreso hacia el ascenso. Desactívalo si en tu club nadie compite en Canina.',
      manageLink: '/bitacora-rsce', manageLabel: 'Ver bitácora',
    },
    {
      key: 'rfec_tracker_enabled', feature: 'modulo-caza', defaultOn: true, group: 'Competición',
      title: 'Bitácora de Caza (RFEC)', icon: 'pets',
      description: 'Diario personal de competición RFEC: resultados por manga, clases y grados autonómicos. Desactívalo si en tu club nadie compite en Caza.',
      manageLink: '/bitacora-rfec', manageLabel: 'Ver bitácora',
    },
    {
      key: 'gamification_enabled', feature: 'gamificacion', group: 'Comunidad y motivación',
      title: 'Gamificación', icon: 'emoji_events',
      description: 'Clasificación de perros, álbum de cromos y Tablón de Cazarrecompensas. Da vida al club y motiva la asistencia a clase.',
      manageLink: '/ranking', manageLabel: 'Ver clasificación',
    },
    {
      key: 'provision_fondos_enabled', feature: 'provision-fondos', group: 'Dinero y cara pública',
      title: 'Provisión de Fondos', icon: 'account_balance_wallet',
      description: 'Lleva las cuentas de tus socios: ingresos, gastos y saldo. Actívalo cuando vayas a gestionar el dinero del club.',
      manageLink: '/admin/finanzas', manageLabel: 'Gestionar fondos del club',
    },
    {
      key: 'sponsors_enabled', feature: 'patrocinadores', group: 'Dinero y cara pública',
      title: 'Patrocinadores', icon: 'handshake',
      description: 'Muestra a tus marcas colaboradoras en la cara pública del club. Actívalo cuando tengas patrocinadores que enseñar.',
      manageLink: '/admin/patrocinadores', manageLabel: 'Gestionar patrocinadores',
    },
  ];

  /** Fila con la descripción expandida (divulgación progresiva: 1 línea por defecto). */
  expandedKey = signal<string | null>(null);

  /** Grupos con sus módulos disponibles en el plan, omitiendo grupos vacíos. */
  groups = computed<ModuleGroup[]>(() => {
    this.club();
    return this.groupOrder
      .map((name) => ({ name, modules: this.modules.filter((m) => m.group === name && !this.isLocked(m)) }))
      .filter((g) => g.modules.length > 0);
  });

  /** Módulos fuera del plan contratado, apartados como zona de upsell. */
  lockedModules = computed<ModuleDef[]>(() => {
    this.club();
    return this.modules.filter((m) => this.isLocked(m));
  });

  activeCount = computed(() => {
    this.club();
    return this.modules.filter((m) => !this.isLocked(m) && this.isEnabled(m)).length;
  });

  availableCount = computed(() => {
    this.club();
    return this.modules.filter((m) => !this.isLocked(m)).length;
  });

  ngOnInit() {
    const id = this.tenant.tenantInfo()?.id;
    if (!id) { this.isLoading.set(false); return; }
    this.clubService.getClub(id).subscribe({
      next: (c) => { this.club.set(c); this.isLoading.set(false); },
      error: () => { this.toast.error('No se pudo cargar la configuración del club.'); this.isLoading.set(false); },
    });
  }

  isEnabled(m: ModuleDef): boolean {
    const v = (this.club()?.settings as any)?.[m.key];
    if (v === undefined || v === null) return !!m.defaultOn;
    return v === true || v === 1 || v === '1';
  }

  toggleExpanded(m: ModuleDef) {
    this.expandedKey.update((k) => (k === m.key ? null : m.key));
  }

  private planFeatures(): string[] {
    return ((this.club()?.plan as any)?.features || []).map((f: any) => f.slug);
  }

  /** Bloqueado si el club tiene plan y el plan no incluye la feature del módulo.
      Los módulos sin feature asociada están disponibles en todos los planes. */
  isLocked(m: ModuleDef): boolean {
    if (!m.feature) return false;
    const club = this.club();
    if (!club?.plan) return false;
    return !this.planFeatures().includes(m.feature);
  }

  toggle(m: ModuleDef) {
    const club = this.club();
    if (!club || this.isLocked(m) || this.savingKey()) return;

    const newVal = !this.isEnabled(m);
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

  clearDemo() {
    const club = this.club();
    if (!club || this.clearingDemo()) return;

    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Eliminar datos de ejemplo',
        message: 'Se borrarán los datos de prueba que se crearon al dar de alta el club (perro y socios de ejemplo, sus reservas, clasificación, bitácora, horario, anuncio y eventos de bienvenida). Tus datos reales no se tocan. Esta acción no se puede deshacer.',
        confirmText: 'Eliminar datos de ejemplo',
        cancelText: 'Cancelar',
        isDestructive: true,
      } as ConfirmDialogData,
    });

    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.clearingDemo.set(true);
      this.clubService.clearDemoData(club.id!).subscribe({
        next: (res) => {
          // Estado autoritativo del backend (has_demo_data = false) -> el botón
          // desaparece y no vuelve a salir.
          this.club.set(res.club);
          this.clearingDemo.set(false);
          this.toast.success('Datos de ejemplo eliminados.');
          this.tenant.reload();
        },
        error: () => {
          this.clearingDemo.set(false);
          this.toast.error('No se pudieron eliminar los datos de ejemplo.');
        },
      });
    });
  }
}
