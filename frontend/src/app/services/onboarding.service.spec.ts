import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { OnboardingService } from './onboarding';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
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
