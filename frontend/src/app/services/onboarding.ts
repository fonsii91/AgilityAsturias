import { Injectable, signal, inject, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { TenantService } from './tenant.service';

/**
 * Naturaleza de cada paso (ver docs/05_Diseno_y_UX/estrategias-onboarding-ux.md):
 *  - 'personal'    : acción sobre datos propios, siempre realizable (añadir mi perro).
 *  - 'explorar'    : solo visitar una pantalla, siempre realizable (ver el ranking).
 *  - 'setup-club'  : configuración de club (logo, horario…), scope club [Fase 2].
 *  - 'dependiente' : requiere datos creados por el club (apuntarse a una clase/evento).
 *                    Si la precondición `requires` no se cumple, el paso NO bloquea el
 *                    100%: se muestra atenuado y se excluye del denominador.
 */
export type StepKind = 'personal' | 'explorar' | 'setup-club' | 'dependiente';

export type ClubStateFlag = 'has_bookable_classes' | 'has_events' | 'has_announcements' | 'has_gallery' | 'has_team';

export interface ClubState {
  has_bookable_classes?: boolean;
  has_events?: boolean;
  has_announcements?: boolean;
  has_gallery?: boolean;
  has_team?: boolean;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  kind?: StepKind;
  /** Solo para kind 'dependiente': flag de club_state que debe ser true para poder realizarlo. */
  requires?: ClubStateFlag;
  /**
   * Pasos de Staff/Gestor: si el club YA tiene este dato (lo creara quien lo creara),
   * el paso cuenta como completado automáticamente. Resuelve el "ya lo hizo otro del
   * staff" y hace que la cascada del gestor sea de baja fricción (los pasos de club
   * ya configurado se auto-marcan). Ver OnboardingController@getProgress.
   */
  satisfiedBy?: ClubStateFlag;
  /**
   * El paso solo existe si el plan del club incluye esta feature (TenantService.hasFeature).
   * Mismo criterio que el navbar (NAV_SECTIONS): si el módulo no está en el plan, el
   * paso se ELIMINA del tutorial (no se muestra ni cuenta), no es un simple "sin datos".
   */
  feature?: string;
  /** El paso solo existe si este flag de settings del club está activado por el gestor. */
  setting?: string;
}

/** Un miembro del club en el Reto de Activación. */
export interface ChallengeMember {
  id: number;
  name: string;
  photo_url?: string | null;
  role: string;
  finished: boolean;
  percent: number;
}

/** Estado del Reto de Activación del club (ver OnboardingController@challenge). */
export interface ChallengeData {
  deadline: string | null;
  target: number;
  total: number;
  achieved: boolean;
  finished_count: number;
  members: ChallengeMember[];
}

export const GESTOR_TUTORIAL: OnboardingStep[] = [
  { id: 'gestor_logo', title: 'Personaliza tu Club', description: 'Desde configurar club sube el logotipo, el eslogan, las imagenes principales y define los colores.', icon: 'palette', route: 'DYNAMIC_CLUB_CONFIG', kind: 'setup-club' },
  { id: 'gestor_horario', title: 'Configura el Horario Base', description: 'Desde Gestión de horarios, establece las franjas horarias y crea al menos una clase.', icon: 'schedule', route: '/gestionar-horarios', kind: 'setup-club', feature: 'reservas-pistas', satisfiedBy: 'has_bookable_classes' },
  { id: 'gestor_equipo', title: 'Añade a tu Equipo', description: 'Desde Gestión de Miembros, genera enlaces de invitación.', icon: 'group_add', route: '/gestionar-miembros', kind: 'setup-club', satisfiedBy: 'has_team' },
  { id: 'gestor_galeria', title: 'Inaugura la Galería', description: 'Sube una foto a la galería pública o elimina las por defecto.', icon: 'photo_library', route: '/galeria', kind: 'setup-club', satisfiedBy: 'has_gallery' }
];

export const STAFF_TUTORIAL: OnboardingStep[] = [
  { id: 'staff_perros', title: 'Añade a tu perro', description: 'Desde "Mi Manada" crea el perfil de tu perro para gestionarlo.', icon: 'pets', route: '/gestionar-perros', kind: 'personal' },
  { id: 'staff_clase', title: 'Configura el horario', description: 'Crea o ajusta una clase del horario del club. Si ya hay clases creadas, este paso está hecho.', icon: 'edit_calendar', route: '/gestionar-horarios', kind: 'setup-club', feature: 'reservas-pistas', satisfiedBy: 'has_bookable_classes' },
  { id: 'staff_evento', title: 'Programa un evento', description: 'Crea una competición o evento en el calendario. Si ya hay eventos creados, este paso está hecho.', icon: 'emoji_events', route: '/gestionar-competiciones', kind: 'setup-club', satisfiedBy: 'has_events' },
  { id: 'staff_anuncio', title: 'Publica un anuncio', description: 'Escribe un aviso en el tablón para los socios. Si ya hay anuncios publicados, este paso está hecho.', icon: 'campaign', route: '/tablon-anuncios', kind: 'setup-club', satisfiedBy: 'has_announcements' },
  { id: 'staff_asistencia', title: 'Visita la clasificación', description: 'Visita la clasificación del club y lee las instrucciones para ver cómo funciona el sistema.', icon: 'leaderboard', route: '/ranking', kind: 'explorar', setting: 'gamification_enabled' },
  { id: 'staff_puntos', title: 'Dar puntos extra', description: 'Desde la Clasificación, usa "Dar puntos" para sumar bonificaciones manuales a un perro.', icon: 'stars', route: '/ranking', kind: 'explorar', setting: 'gamification_enabled' }
];

export const MIEMBRO_TUTORIAL: OnboardingStep[] = [
  { id: 'miembro_perros', title: 'Añade o edita a tu Compañero', description: 'Crea o modifica el perfil de tu perro.', icon: 'pets', route: '/gestionar-perros', kind: 'personal' },
  { id: 'miembro_clase', title: 'Apúntate a una clase', description: 'Reserva una plaza en una clase desde reservas.', icon: 'event_available', route: '/reservas', kind: 'dependiente', requires: 'has_bookable_classes', feature: 'reservas-pistas' },
  { id: 'miembro_evento', title: 'Apúntate a un evento', description: 'Inscríbete en un evento o competición desde el calendario.', icon: 'emoji_events', route: '/calendario', kind: 'dependiente', requires: 'has_events' },
  { id: 'miembro_anuncios', title: 'Revisa el tablón', description: 'Lee las noticias o informaciones publicadas para los miembros.', icon: 'campaign', route: '/tablon-anuncios', kind: 'explorar' },
  { id: 'miembro_clasificacion', title: 'Revisa la clasificación', description: 'Visita el ranking del club y pulsa en Instrucciones para descubrir cómo funciona. Encontrarás este botón de Instrucciones en todas las secciones de la aplicación donde tendrás explicado como funciona esa sección', icon: 'leaderboard', route: '/ranking', kind: 'explorar', setting: 'gamification_enabled' },
  { id: 'miembro_perfil', title: 'Cuando quieras, completa los perfiles', description: 'Cuando completes tu perfil y el de tus perros irás desbloqueando nuevas funcionalidades.', icon: 'person', route: '/perfil', kind: 'personal' },
];

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private tenantService = inject(TenantService);
  private apiUrl = environment.apiUrl;

  progress = signal<any>({});
  /** Estado del club (¿hay clases?, ¿hay eventos?), llega junto al progreso. */
  clubState = signal<ClubState>({});

  activeTutorialType = computed<'gestor' | 'staff' | 'miembro' | null>(() => {
    const user = this.authService.currentUserSignal();
    if (!user) return null;
    const p = this.progress();

    if (user.role === 'manager' || user.role === 'admin') {
      if (!p.gestor_finished) return 'gestor';
      if (!p.staff_finished) return 'staff';
      if (!p.miembro_finished) return 'miembro';
      return null;
    }

    if (user.role === 'staff') {
      if (!p.staff_finished) return 'staff';
      if (!p.miembro_finished) return 'miembro';
      return null;
    }

    if (user.role === 'member') {
      if (!p.miembro_finished) return 'miembro';
      return null;
    }

    return null;
  });

  activeSteps = computed<OnboardingStep[]>(() => {
    const type = this.activeTutorialType();
    let steps: OnboardingStep[] = [];
    if (type === 'gestor') steps = GESTOR_TUTORIAL;
    else if (type === 'staff') steps = STAFF_TUTORIAL;
    else if (type === 'miembro') steps = MIEMBRO_TUTORIAL;
    // Mismo filtrado que el navbar: si el módulo no está en el plan (feature) o el
    // gestor lo desactivó (setting), el paso no aplica y se quita del tutorial.
    return steps.filter(step => this.isStepAvailable(step));
  });

  /** ¿El módulo al que pertenece el paso está disponible en este club? */
  private isStepAvailable(step: OnboardingStep): boolean {
    if (step.feature && !this.tenantService.hasFeature(step.feature)) return false;
    if (step.setting && !this.settingOn(step.setting)) return false;
    return true;
  }

  private settingOn(key: string): boolean {
    const v: any = this.tenantService.tenantInfo()?.settings?.[key];
    return v === true || v === 1 || v === '1';
  }

  /**
   * Un paso 'dependiente' está bloqueado solo si SABEMOS que el club aún no tiene
   * el dato que necesita. Mientras el club_state no haya cargado (undefined), no se
   * bloquea (optimista). Los pasos bloqueados se muestran pero no cuentan.
   */
  isStepBlocked(step: OnboardingStep): boolean {
    if (step.kind !== 'dependiente' || !step.requires) return false;
    return this.clubState()[step.requires] === false;
  }

  /** Pasos que sí cuentan para el progreso/100% (excluye los bloqueados). */
  countableSteps = computed<OnboardingStep[]>(() =>
    this.activeSteps().filter(step => !this.isStepBlocked(step))
  );

  activeTutorialProgress = computed<number>(() => {
    const type = this.activeTutorialType();
    const steps = this.countableSteps();
    if (!type || steps.length === 0) return 0;

    const completedCount = steps.filter(step => this.isStepDone(step)).length;

    return Math.round((completedCount / steps.length) * 100);
  });

  /**
   * Un paso está hecho si el usuario lo completó O si el club ya cumple su
   * `satisfiedBy` (p.ej. ya existen clases/eventos/anuncios creados por otro).
   */
  private isStepDone(step: OnboardingStep): boolean {
    const type = this.activeTutorialType();
    if (!type) return false;
    const p = this.progress();
    if (p[type] && p[type][step.id]) return true;
    if (step.satisfiedBy && this.clubState()[step.satisfiedBy]) return true;
    return false;
  }

  isStepCompleted(stepId: string): boolean {
    const step = this.activeSteps().find(s => s.id === stepId);
    return step ? this.isStepDone(step) : false;
  }

  constructor() {
    effect(() => {
      const user = this.authService.currentUserSignal();
      if (user && !this.authService.isLoading()) {
        this.fetchProgress();
      } else if (!user) {
        this.progress.set({});
      }
    });
  }

  /** Estado del Reto de Activación del club (progreso de onboarding de los miembros). */
  getChallenge() {
    return this.http.get<ChallengeData>(`${this.apiUrl}/user/onboarding/challenge`);
  }

  fetchProgress() {
    if (this.tenantService.tenantInfo()?.subscribed === false) {
      return;
    }
    this.http.get<{ onboarding_progress: any; club_state?: ClubState }>(`${this.apiUrl}/user/onboarding`).subscribe({
      next: (res) => {
        this.progress.set(res.onboarding_progress || {});
        this.clubState.set(res.club_state || {});
        this.checkAutoFinish();
      },
      error: (err) => {
        // Silently ignore errors (e.g., during tests or if unauthenticated)
      }
    });
  }

  markStepCompleted(stepId: string, specificType?: 'gestor' | 'staff' | 'miembro') {
    const inferredType = stepId.split('_')[0] as 'gestor' | 'staff' | 'miembro';
    const type = specificType || inferredType || this.activeTutorialType();
    if (!type) return;

    const p = this.progress();
    if (p[type] && p[type][stepId]) return;

    const newProgress = { ...p };
    if (!newProgress[type]) newProgress[type] = {};
    newProgress[type][stepId] = true;
    this.progress.set(newProgress);

    this.http.post<{ onboarding_progress: any }>(`${this.apiUrl}/user/onboarding/step`, {
      tutorial: type,
      step: stepId,
      completed: true
    }).subscribe({
      next: (res) => {
        // Fusionar (no reemplazar): si una acción marca dos pasos a la vez, la
        // respuesta de uno puede no incluir aún el otro. La unión conserva ambos.
        this.progress.set(this.mergeProgress(this.progress(), res.onboarding_progress || {}));
        this.checkAutoFinish();
      },
      error: (err) => {
        // Silently ignore errors
      }
    });
  }

  /**
   * Une el progreso local (optimista) con el del servidor: un paso o flag marcado
   * en cualquiera de los dos se conserva (los pasos solo pasan de no-hecho a hecho).
   */
  private mergeProgress(local: any, server: any): any {
    const out: any = { ...(server || {}) };
    for (const [k, lv] of Object.entries(local || {})) {
      if (lv && typeof lv === 'object' && !Array.isArray(lv)) {
        out[k] = { ...(lv as object), ...(out[k] || {}) };
      } else if (!out[k]) {
        out[k] = lv;
      }
    }
    return out;
  }

  private checkAutoFinish() {
    const type = this.activeTutorialType();
    // Solo se evalúan los pasos realizables: un paso 'dependiente' bloqueado
    // (p.ej. apuntarse a una clase cuando el club aún no tiene clases) no debe
    // impedir cerrar el tutorial al 100%.
    const steps = this.countableSteps();
    if (!type || steps.length === 0) return;

    const p = this.progress();
    const allCompleted = steps.every(step => this.isStepDone(step));

    if (allCompleted && !p[type + '_finished']) {
      // Solo celebramos al cerrar el tutorial de Miembro (final de la cascada).
      // En Gestor/Staff el cierre es silencioso (encadena al siguiente tutorial).
      this.finishTutorial(type, type === 'miembro');
    }
  }

  /**
   * Omitir un paso = marcarlo como completado. En el tutorial de Miembro esto
   * cuenta para la métrica del reto de activación de referidos (decisión de
   * producto: mejor un salto consciente que un paso que bloquea el 100%).
   */
  skipStep(step: OnboardingStep) {
    this.markStepCompleted(step.id);
  }

  /** Saltar el tutorial activo: lo marca como finalizado y oculta el widget. */
  skipTutorial() {
    const type = this.activeTutorialType();
    if (!type) return;
    this.finishTutorial(type);
  }

  private showCongratulations() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(15, 23, 42, 0.85)';
    overlay.style.backdropFilter = 'blur(6px)';
    overlay.style.zIndex = '99998';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.color = 'white';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.5s ease';

    overlay.innerHTML = `
      <style>
        @keyframes customBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      </style>
      <div style="transform: scale(0.5); transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); text-align: center; display: flex; flex-direction: column; align-items: center;" id="congratulations-modal">
        <span class="material-icons-outlined" style="font-size: 80px; color: #f59e0b; margin-bottom: 20px; animation: customBounce 2s infinite;">emoji_events</span>
        <h1 style="font-size: 3rem; margin: 0; text-shadow: 0 4px 10px rgba(0,0,0,0.5);">¡Felicidades!</h1>
        <p style="font-size: 1.2rem; color: #cbd5e1; margin-top: 15px;">Has completado el tutorial de inicio.</p>
        <p style="font-size: 1rem; color: #94a3b8; margin-top: 5px;">¡Es hora de disfrutar de la plataforma al máximo!</p>
      </div>
    `;

    document.body.appendChild(overlay);

    // Trigger animation
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      const modal = document.getElementById('congratulations-modal');
      if (modal) modal.style.transform = 'scale(1)';
      this.triggerConfetti();
    });

    // Remove after 5 seconds
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 500);
    }, 5000);
  }

  private triggerConfetti() {
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];
    for (let i = 0; i < 150; i++) {
      const confetti = document.createElement('div');
      confetti.style.position = 'fixed';
      confetti.style.width = Math.random() * 8 + 6 + 'px';
      confetti.style.height = Math.random() * 16 + 8 + 'px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.top = '-20px';
      confetti.style.opacity = '1';
      confetti.style.zIndex = '99999';
      confetti.style.pointerEvents = 'none';
      if (Math.random() > 0.5) confetti.style.borderRadius = '50%';

      document.body.appendChild(confetti);

      const duration = Math.random() * 3 + 2;
      const delay = Math.random() * 0.5;

      confetti.animate([
        { transform: `translate3d(0, 0, 0) rotate(0deg) scale(1)`, opacity: 1 },
        { transform: `translate3d(${Math.random() * 300 - 150}px, 100vh, 0) rotate(${Math.random() * 720}deg) scale(0.5)`, opacity: 0 }
      ], {
        duration: duration * 1000,
        delay: delay * 1000,
        easing: 'cubic-bezier(.25,.46,.45,.94)',
        fill: 'forwards'
      });

      setTimeout(() => confetti.remove(), (duration + delay) * 1000 + 100);
    }
  }

  finishTutorial(type: string, celebrate = false) {
    this.http.post<{ onboarding_progress: any }>(`${this.apiUrl}/user/onboarding/tutorial-finish`, {
      tutorial: type
    }).subscribe({
      next: (res) => {
        this.progress.set(this.mergeProgress(this.progress(), res.onboarding_progress || {}));
        if (celebrate) this.showCongratulations();
        // Encadena la cascada: si el siguiente tutorial ya está satisfecho por el
        // estado del club (Gestor/Staff de un club configurado), se auto-finaliza
        // también y avanzamos hasta el primer tutorial que requiera acción real.
        this.checkAutoFinish();
      },
      error: (err) => {
        // Silently ignore errors
      }
    });
  }
}
