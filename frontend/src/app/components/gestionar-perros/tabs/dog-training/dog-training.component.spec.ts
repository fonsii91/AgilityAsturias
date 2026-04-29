import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DogTrainingComponent } from './dog-training.component';
import { DogStateService } from '../../services/dog-state.service';
import { DogService } from '../../../../services/dog.service';
import { ToastService } from '../../../../services/toast.service';
import { signal } from '@angular/core';

describe('DogTrainingComponent', () => {
  let component: DogTrainingComponent;
  let fixture: ComponentFixture<DogTrainingComponent>;

  const mockDog = {
    id: 1,
    name: 'Toby',
    breed: 'Border Collie',
    birth_date: '2020-01-01',
    has_previous_injuries: false,
    sterilized_at: null as string | null,
    weight_kg: 16.5,
    height_cm: 52,
    rsce_category: 'L'
  };

  const dogSignal = signal(mockDog);

  const mockDogStateService = {
    getDog: vi.fn().mockReturnValue(dogSignal),
    setDog: vi.fn()
  };

  const mockDogService = {
    updateDog: vi.fn().mockResolvedValue({ ...mockDog, weight_kg: 17 })
  };

  const mockToastService = {
    success: vi.fn(),
    error: vi.fn()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DogTrainingComponent],
      providers: [
        { provide: DogStateService, useValue: mockDogStateService },
        { provide: DogService, useValue: mockDogService },
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DogTrainingComponent);
    component = fixture.componentInstance;
    
    // Reset state for each test
    dogSignal.set(mockDog);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe inicializar el formulario con los datos biométricos del perro', () => {
    expect(component.formData.weight_kg).toBe(16.5);
    expect(component.formData.height_cm).toBe(52);
    expect(component.formData.has_previous_injuries).toBe(false);
  });

  it('debe calcular correctamente la fecha de esterilización al inicializar si existe', () => {
    dogSignal.set({
      ...mockDog,
      sterilized_at: '2021-01-01T00:00:00Z'
    });
    // Forzar actualización del effect()
    TestBed.flushEffects();
    fixture.detectChanges();

    // 2021-01-01 - 2020-01-01 = 1 año (12 meses)
    expect(component.formData.sterilized_years).toBe(1);
    expect(component.formData.sterilized_months).toBeNull(); // El resto es 0
  });

  it('debe autocalcular la categoría RSCE basada en la altura antes de guardar', async () => {
    component.formData.height_cm = 40; // Menos de 43 es M
    component.formData.weight_kg = 10;

    await component.saveHealthData();

    expect(mockDogService.updateDog).toHaveBeenCalledWith(1, expect.objectContaining({
      rsce_category: 'M',
      height_cm: 40,
      weight_kg: 10
    }));
    expect(mockToastService.success).toHaveBeenCalledWith('Perfil deportivo actualizado');
    expect(mockDogStateService.setDog).toHaveBeenCalled();
  });

  it('debe calcular la fecha de esterilización correctamente para enviar al backend', () => {
    // Si nació en 2020-01-01 y se esterilizó con 1 año y 6 meses: -> 2021-07-01
    const result = component.calculateSterilizedDate('2020-01-01T00:00:00Z', 1, 6);
    expect(result).toBe('2021-07-01');
  });

  it('debe manejar errores al guardar los datos deportivos', async () => {
    mockDogService.updateDog.mockRejectedValueOnce(new Error('Network error'));
    
    await component.saveHealthData();

    expect(mockToastService.error).toHaveBeenCalledWith('Error al guardar datos deportivos');
    expect(component.isSaving()).toBe(false);
  });
});
