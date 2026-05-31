import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TenantService } from '../services/tenant.service';
import { gamificationGuard } from './gamification.guard';
import { signal } from '@angular/core';
import { vi } from 'vitest';

describe('gamificationGuard', () => {
  let mockTenantService: any;
  let mockRouter: any;
  let mockSnackBar: any;

  beforeEach(() => {
    mockTenantService = {
      isTenantLoading: signal(false),
      tenantInfo: signal<any>({
        id: 1,
        name: 'Test Club',
        settings: {
          gamification_enabled: true
        }
      })
    };

    mockRouter = {
      navigate: vi.fn()
    };

    mockSnackBar = {
      open: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: TenantService, useValue: mockTenantService },
        { provide: Router, useValue: mockRouter },
        { provide: MatSnackBar, useValue: mockSnackBar }
      ]
    });
  });

  const executeGuard = () => TestBed.runInInjectionContext(() => gamificationGuard({} as any, {} as any));

  it('should allow access if gamification is enabled', async () => {
    mockTenantService.tenantInfo.set({
      id: 1,
      name: 'Test Club',
      settings: {
        gamification_enabled: true
      }
    });

    const result = await executeGuard();

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(mockSnackBar.open).not.toHaveBeenCalled();
  });

  it('should deny access, show snackbar, and redirect to home if gamification is disabled', async () => {
    mockTenantService.tenantInfo.set({
      id: 1,
      name: 'Test Club',
      settings: {
        gamification_enabled: false
      }
    });

    const result = await executeGuard();

    expect(result).toBe(false);
    expect(mockSnackBar.open).toHaveBeenCalledWith('El sistema de gamificación está desactivado.', 'Cerrar', {
      duration: 3000,
      panelClass: ['error-snackbar']
    });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should allow access if gamification_enabled setting is missing (defaults to true)', async () => {
    mockTenantService.tenantInfo.set({
      id: 1,
      name: 'Test Club',
      settings: {}
    });

    const result = await executeGuard();

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});
