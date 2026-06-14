import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { OnboardingService } from './onboarding';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { TenantService } from './tenant.service';
import { signal } from '@angular/core';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let httpMock: HttpTestingController;
  let authServiceMock: any;
  let toastServiceMock: any;

  beforeAll(() => {
    if (!HTMLElement.prototype.animate) {
      HTMLElement.prototype.animate = vi.fn().mockReturnValue({
        finished: Promise.resolve(),
        cancel: vi.fn(),
      });
    }
  });

  beforeEach(() => {
    authServiceMock = {
      currentUserSignal: signal(null),
      isLoading: signal(false)
    };

    toastServiceMock = {
      success: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        OnboardingService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastServiceMock }
      ]
    });

    service = TestBed.inject(OnboardingService);
    httpMock = TestBed.inject(HttpTestingController);

    // Club con todos los módulos del tutorial de miembro activos, para que
    // activeSteps no filtre pasos por feature/setting (eso se prueba aparte).
    const tenant = TestBed.inject(TenantService);
    tenant.tenantInfo.set({
      id: 1, name: 'Test', slug: 'test', logo_url: null,
      settings: { gamification_enabled: true } as any,
      features: ['reservas-pistas'],
      subscribed: true,
    });
  });

  afterEach(() => {
    if (httpMock) {
      httpMock.verify();
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should activeTutorialType return gestor for admin user with unfinished progress', () => {
    authServiceMock.currentUserSignal.set({ role: 'admin' });
    service.progress.set({});
    
    expect(service.activeTutorialType()).toBe('gestor');
  });

  it('should activeTutorialType return staff if admin has finished gestor tutorial', () => {
    authServiceMock.currentUserSignal.set({ role: 'admin' });
    service.progress.set({ gestor_finished: true });
    
    expect(service.activeTutorialType()).toBe('staff');
  });

  it('should infer tutorial type from stepId correctly during markStepCompleted', () => {
    authServiceMock.currentUserSignal.set({ role: 'member' });
    service.progress.set({});

    service.markStepCompleted('staff_perros');
    
    const req = httpMock.expectOne(req => req.url.includes('/user/onboarding/step'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      tutorial: 'staff',
      step: 'staff_perros',
      completed: true
    });
    
    req.flush({ onboarding_progress: { staff: { staff_perros: true } } });
    
    expect(service.progress().staff.staff_perros).toBe(true);
  });

  it('marks a dependent step as blocked when the club lacks the required data', () => {
    authServiceMock.currentUserSignal.set({ role: 'member' });
    service.clubState.set({ has_bookable_classes: false });

    const claseStep = service.activeSteps().find(s => s.id === 'miembro_clase')!;
    expect(service.isStepBlocked(claseStep)).toBe(true);
  });

  it('does not block a dependent step until club_state is known (optimistic)', () => {
    authServiceMock.currentUserSignal.set({ role: 'member' });
    service.clubState.set({}); // desconocido

    const claseStep = service.activeSteps().find(s => s.id === 'miembro_clase')!;
    expect(service.isStepBlocked(claseStep)).toBe(false);
  });

  it('removes module-gated steps when the plan/feature or club setting is off', () => {
    authServiceMock.currentUserSignal.set({ role: 'member' });
    const tenant = TestBed.inject(TenantService);
    // Plan sin reservas y gamificación desactivada por el gestor.
    tenant.tenantInfo.set({
      id: 1, name: 'Test', slug: 'test', logo_url: null,
      settings: { gamification_enabled: false } as any,
      features: [],
      subscribed: true,
    });

    const ids = service.activeSteps().map(s => s.id);
    expect(ids).not.toContain('miembro_clase');        // feature 'reservas-pistas' ausente
    expect(ids).not.toContain('miembro_clasificacion'); // setting 'gamification_enabled' off
    // Los pasos sin módulo siguen presentes.
    expect(ids).toContain('miembro_perros');
    expect(ids).toContain('miembro_anuncios');
  });

  it('lets a member reach 100% even if dependent steps are blocked (referral metric invariant)', () => {
    authServiceMock.currentUserSignal.set({ role: 'member' });
    // Club vacío: apuntarse a clase/evento queda bloqueado.
    service.clubState.set({ has_bookable_classes: false, has_events: false });

    // Completar solo los pasos NO dependientes (personal/explorar).
    const progress: any = { miembro: {} };
    service.activeSteps().forEach(s => {
      if (s.kind !== 'dependiente') progress.miembro[s.id] = true;
    });
    service.progress.set(progress);

    expect(service.activeTutorialProgress()).toBe(100);
  });

  it('should call finishTutorial and show congratulations when member completes all steps', () => {
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });
    
    authServiceMock.currentUserSignal.set({ role: 'member' });
    
    // Simulate that all member steps are completed except one
    const steps = service.activeSteps();
    const mockProgress: any = { miembro: {} };
    steps.forEach(s => {
      if (s.id !== 'miembro_instrucciones') {
        mockProgress.miembro[s.id] = true;
      }
    });
    service.progress.set(mockProgress);

    // Complete the last step
    service.markStepCompleted('miembro_instrucciones');
    
    // Request for markStepCompleted
    const stepReq = httpMock.expectOne(req => req.url.includes('/user/onboarding/step'));
    
    // Respond to step request
    mockProgress.miembro['miembro_instrucciones'] = true;
    stepReq.flush({ onboarding_progress: mockProgress });
    
    // Auto-finish should be triggered now
    const finishReq = httpMock.expectOne(req => req.url.includes('/user/onboarding/tutorial-finish'));
    expect(finishReq.request.body).toEqual({ tutorial: 'miembro' });
    
    finishReq.flush({ onboarding_progress: { ...mockProgress, miembro_finished: true } });
    
    // Verify toast was called for member finish
    expect(toastServiceMock.success).not.toHaveBeenCalled(); // Wait, the toast is no longer in checkAutoFinish, it's just DOM overlay!
    // But we know appendChild was called to add the overlay
    expect(document.body.appendChild).toHaveBeenCalled();
  });
});
