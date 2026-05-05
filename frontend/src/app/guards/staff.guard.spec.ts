import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { staffGuard } from './staff.guard';
import { AuthService } from '../services/auth.service';
import { signal } from '@angular/core';

describe('staffGuard', () => {
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(() => {
    mockAuthService = {
      checkAuthLoading: signal(false),
      isStaff: signal(false)
    };

    mockRouter = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  const executeGuard = () => TestBed.runInInjectionContext(() => staffGuard({} as any, {} as any));

  it('should allow access if user is staff (admin, manager, staff)', async () => {
    mockAuthService.isStaff.set(true);
    
    const result = await executeGuard();
    
    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should deny access and redirect to home if user is not staff (member, user)', async () => {
    mockAuthService.isStaff.set(false);
    
    const result = await executeGuard();
    
    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });
});
