/**
 * @vitest-environment jsdom
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DogFamilyComponent } from './dog-family.component';
import { DogStateService } from '../../services/dog-state.service';
import { DogService } from '../../../../services/dog.service';
import { ToastService } from '../../../../services/toast.service';
import { AuthService } from '../../../../services/auth.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

describe('DogFamilyComponent', () => {
  let component: DogFamilyComponent;
  let fixture: ComponentFixture<DogFamilyComponent>;
  let mockDogState: any;
  let mockDogService: any;
  let mockToastService: any;
  let mockAuthService: any;

  

  beforeEach(async () => {
    TestBed.resetTestingModule();
    
    mockDogState = {
      getDog: vi.fn().mockReturnValue(signal({
        id: 1,
        name: 'Toby',
        users: [
          { id: 10, name: 'Alice Original', email: 'alice@test.com', pivot: { is_primary_owner: 1 } },
          { id: 20, name: 'Bob Shared', email: 'bob@test.com', pivot: { is_primary_owner: 0 } }
        ]
      })),
      setDog: vi.fn()
    };

    mockDogService = {
      shareDog: vi.fn().mockResolvedValue({ id: 1, name: 'Toby Updated' }),
      removeShare: vi.fn().mockResolvedValue({ id: 1, name: 'Toby Updated' })
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    mockAuthService = {
      currentUserSignal: vi.fn().mockReturnValue({ id: 10, name: 'Alice Original' })
    };

    // Mock confirm globally
    window.confirm = vi.fn().mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [DogFamilyComponent],
      providers: [
        { provide: DogStateService, useValue: mockDogState },
        { provide: DogService, useValue: mockDogService },
        { provide: ToastService, useValue: mockToastService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DogFamilyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and list co-owners', () => {
    expect(component).toBeTruthy();
    const chips = fixture.nativeElement.querySelectorAll('.user-chip');
    expect(chips.length).toBe(2);
    expect(chips[0].textContent).toContain('Alice Original');
    expect(chips[1].textContent).toContain('Bob Shared');
  });

  it('should determine correctly if user is primary owner', () => {
    expect(component.isPrimaryOwner()).toBe(true);
    
    mockAuthService.currentUserSignal.mockReturnValue({ id: 20 });
    expect(component.isPrimaryOwner()).toBe(false);
  });

  it('should share dog via shareDog method', async () => {
    component.shareEmail.set('charlie@test.com');
    await component.shareDog();

    expect(mockDogService.shareDog).toHaveBeenCalledWith(1, 'charlie@test.com');
    expect(mockDogState.setDog).toHaveBeenCalled();
    expect(mockToastService.success).toHaveBeenCalledWith('Perro compartido con charlie@test.com');
    expect(component.shareEmail()).toBe('');
  });

  it('should show error toast if sharing fails', async () => {
    component.shareEmail.set('invalid@test.com');
    mockDogService.shareDog.mockRejectedValue({
      error: { message: 'Este usuario ya es co-dueño del perro.' }
    });

    await component.shareDog();
    expect(mockToastService.error).toHaveBeenCalledWith('Este usuario ya es co-dueño del perro.');
  });

  it('should remove share user after confirm', async () => {
    await component.removeShareUser(20, 'Bob Shared');

    expect(window.confirm).toHaveBeenCalledWith('¿Estás seguro de que quieres revocar el acceso a Bob Shared?');
    expect(mockDogService.removeShare).toHaveBeenCalledWith(1, 20);
    expect(mockDogState.setDog).toHaveBeenCalled();
    expect(mockToastService.success).toHaveBeenCalledWith('Acceso de Bob Shared revocado exitosamente');
  });

  it('should not remove share user if cancelled', async () => {
    window.confirm = vi.fn().mockReturnValue(false);
    await component.removeShareUser(20, 'Bob Shared');

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDogService.removeShare).not.toHaveBeenCalled();
  });
});
