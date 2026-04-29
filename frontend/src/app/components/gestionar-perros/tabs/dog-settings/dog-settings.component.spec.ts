import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DogSettingsComponent } from './dog-settings.component';
import { DogStateService } from '../../services/dog-state.service';
import { AuthService } from '../../../../services/auth.service';
import { DogService } from '../../../../services/dog.service';
import { ToastService } from '../../../../services/toast.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';

describe('DogSettingsComponent', () => {
  let component: DogSettingsComponent;
  let fixture: ComponentFixture<DogSettingsComponent>;

  const mockDogPrimary = {
    id: 1,
    name: 'Toby',
    users: [
      { id: 99, pivot: { is_primary_owner: 1 } }
    ]
  };

  const mockDogSecondary = {
    id: 2,
    name: 'Luna',
    users: [
      { id: 99, pivot: { is_primary_owner: 0 } }
    ]
  };

  const dogSignal = signal(mockDogPrimary);

  const mockDogStateService = {
    getDog: vi.fn().mockReturnValue(dogSignal),
    clear: vi.fn()
  };

  const mockAuthService = {
    currentUserSignal: vi.fn().mockReturnValue({ id: 99 })
  };

  const mockDogService = {
    deleteDog: vi.fn().mockResolvedValue(true),
    loadUserDogs: vi.fn().mockResolvedValue(true)
  };

  const mockToastService = {
    success: vi.fn(),
    error: vi.fn()
  };

  const mockRouter = {
    navigate: vi.fn()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DogSettingsComponent],
      providers: [
        { provide: DogStateService, useValue: mockDogStateService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DogService, useValue: mockDogService },
        { provide: ToastService, useValue: mockToastService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DogSettingsComponent);
    component = fixture.componentInstance;
    
    // Reset signals for each test
    dogSignal.set(mockDogPrimary);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe identificar al propietario primario', () => {
    expect(component.isPrimaryOwner()).toBe(true);
  });

  it('debe identificar al propietario secundario', () => {
    dogSignal.set(mockDogSecondary);
    fixture.detectChanges();
    expect(component.isPrimaryOwner()).toBe(false);
  });

  it('debe abrir y cerrar el modal de confirmación', () => {
    component.promptDelete();
    expect(component.deleteModalOpen()).toBe(true);

    component.closeDeleteModal();
    expect(component.deleteModalOpen()).toBe(false);
  });

  it('debe borrar el perro si es propietario principal y navegar a la lista', async () => {
    component.promptDelete();
    component.deleteConfirmText.set('BORRAR');
    
    await component.confirmDelete();

    expect(mockDogService.deleteDog).toHaveBeenCalledWith(1);
    expect(mockToastService.success).toHaveBeenCalledWith('Perfil de Toby borrado');
    expect(mockDogStateService.clear).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/gestionar-perros']);
    expect(mockDogService.loadUserDogs).toHaveBeenCalled();
  });

  it('debe desvincularse del perro si es propietario secundario y navegar a la lista', async () => {
    dogSignal.set(mockDogSecondary);
    fixture.detectChanges();

    component.promptDelete();
    component.deleteConfirmText.set('DESVINCULAR');
    
    await component.confirmDelete();

    expect(mockDogService.deleteDog).toHaveBeenCalledWith(2);
    expect(mockToastService.success).toHaveBeenCalledWith('Te has desvinculado de Luna');
    expect(mockDogStateService.clear).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/gestionar-perros']);
    expect(mockDogService.loadUserDogs).toHaveBeenCalled();
  });
});
