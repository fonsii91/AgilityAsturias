import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { OnboardingService } from './onboarding';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { signal } from '@angular/core';

describe('OnboardingService', () => {
  let service: OnboardingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: { currentUserSignal: signal(null), isLoading: signal(false) } },
        { provide: ToastService, useValue: { success: vitest.fn(), error: vitest.fn() } }
      ]
    });
    service = TestBed.inject(OnboardingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
