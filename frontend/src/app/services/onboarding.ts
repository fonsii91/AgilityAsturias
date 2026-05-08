import { Injectable, signal, inject, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
}

export const GESTOR_TUTORIAL: OnboardingStep[] = [
  { id: 'gestor_logo', title: 'Personaliza tu Club', description: 'Desde configurar club sube el logotipo, el eslogan, las imagenes principales y define los colores.', icon: 'palette', route: 'DYNAMIC_CLUB_CONFIG' },
  { id: 'gestor_horario', title: 'Configura el Horario Base', description: 'Desde Gestión de horarios, establece las franjas horarias y crea al menos una clase.', icon: 'schedule', route: '/gestionar-horarios' },
  { id: 'gestor_equipo', title: 'Añade a tu Equipo', description: 'Desde Gestión de Miembros, genera enlaces de invitación.', icon: 'group_add', route: '/gestionar-miembros' },
  { id: 'gestor_galeria', title: 'Inaugura la Galería', description: 'Sube una foto a la galería pública o elimina las por defecto.', icon: 'photo_library', route: '/galeria' }
];

export const STAFF_TUTORIAL: OnboardingStep[] = [
  { id: 'staff_perros', title: 'Añade a tu perro', description: 'Desde "Mi Manada" crea el perfil de tu perro para gestionarlo.', icon: 'pets', route: '/gestionar-perros' },
  { id: 'staff_clase', title: 'Modifica el horario base', description: 'Ajusta la hora, el nombre o las plazas de una clase y comprueba los cambios.', icon: 'edit_calendar', route: '/gestionar-horarios' },
  { id: 'staff_evento', title: 'Crea tu primer evento', description: 'Crea una competición o evento de prueba en el calendario.', icon: 'emoji_events', route: '/gestionar-competiciones' },
  { id: 'staff_anuncio', title: 'Publica un anuncio', description: 'Escribe un saludo de bienvenida en el tablón para todos los socios.', icon: 'campaign', route: '/tablon-anuncios' },
  { id: 'staff_asistencia', title: 'Visita la clasificación', description: 'Visita la clasificación del club y lee las instrucciones para ver cómo funciona el sistema.', icon: 'leaderboard', route: '/ranking' },
  { id: 'staff_puntos', title: 'Dar puntos extra', description: 'Suma puntos de bonificación manuales a la clasificación general.', icon: 'stars', route: '/admin/puntos-extra' }
];

export const MIEMBRO_TUTORIAL: OnboardingStep[] = [
  { id: 'miembro_perros', title: 'Añade o edita a tu Compañero', description: 'Crea o modifica el perfil de tu perro.', icon: 'pets', route: '/gestionar-perros' },
  { id: 'miembro_clase', title: 'Apúntate a una clase', description: 'Reserva una plaza en una clase desde reservas.', icon: 'event_available', route: '/reservas' },
  { id: 'miembro_evento', title: 'Apúntate a un evento', description: 'Inscríbete en un evento o competición desde el calendario.', icon: 'emoji_events', route: '/calendario' },
  { id: 'miembro_anuncios', title: 'Revisa el tablón', description: 'Lee las noticias o informaciones publicadas para los miembros.', icon: 'campaign', route: '/tablon-anuncios' },
  { id: 'miembro_clasificacion', title: 'Revisa la clasificación', description: 'Visita el ranking del club y pulsa en Instrucciones para descubrir cómo funciona. Encontrarás este botón de Instrucciones en todas las secciones de la aplicación donde tendrás explicado como funciona esa sección', icon: 'leaderboard', route: '/ranking' },
  { id: 'miembro_perfil', title: 'Cuando quieras, completa los perfiles', description: 'Cuando completes tu perfil y el de tus perros irás desbloqueando nuevas funcionalidades.', icon: 'person', route: '/perfil' },
];

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private apiUrl = environment.apiUrl;

  progress = signal<any>({});

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
    if (type === 'gestor') return GESTOR_TUTORIAL;
    if (type === 'staff') return STAFF_TUTORIAL;
    if (type === 'miembro') return MIEMBRO_TUTORIAL;
    return [];
  });

  activeTutorialProgress = computed<number>(() => {
    const type = this.activeTutorialType();
    const steps = this.activeSteps();
    if (!type || steps.length === 0) return 0;

    const p = this.progress();
    const tutorialProgress = p[type] || {};
    let completedCount = 0;

    steps.forEach(step => {
      if (tutorialProgress[step.id]) completedCount++;
    });

    return Math.round((completedCount / steps.length) * 100);
  });

  isStepCompleted(stepId: string): boolean {
    const type = this.activeTutorialType();
    if (!type) return false;
    const p = this.progress();
    return !!(p[type] && p[type][stepId]);
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

  fetchProgress() {
    this.http.get<{ onboarding_progress: any }>(`${this.apiUrl}/user/onboarding`).subscribe(res => {
      this.progress.set(res.onboarding_progress || {});
      this.checkAutoFinish();
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
    }).subscribe(res => {
      this.progress.set(res.onboarding_progress || {});
      this.checkAutoFinish();
    });
  }

  private checkAutoFinish() {
    const type = this.activeTutorialType();
    const steps = this.activeSteps();
    if (!type || steps.length === 0) return;

    const p = this.progress();
    const tutorialProgress = p[type] || {};

    const allCompleted = steps.every(step => tutorialProgress[step.id]);

    if (allCompleted && !p[type + '_finished']) {
      this.finishTutorial(type);
      if (type === 'miembro') {
        this.showCongratulations();
      }
    }
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

  finishTutorial(type: string) {
    this.http.post<{ onboarding_progress: any }>(`${this.apiUrl}/user/onboarding/tutorial-finish`, {
      tutorial: type
    }).subscribe(res => {
      this.progress.set(res.onboarding_progress || {});
    });
  }
}
