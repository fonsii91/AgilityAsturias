import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DogSummaryComponent } from './dog-summary.component';
import { DogStateService } from '../../services/dog-state.service';
import { DogService } from '../../../../services/dog.service';
import { ToastService } from '../../../../services/toast.service';
import { signal } from '@angular/core';

describe('DogSummaryComponent', () => {
  let component: DogSummaryComponent;
  let fixture: ComponentFixture<DogSummaryComponent>;

  const mockDog = {
    id: 1,
    name: 'Toby',
    breed: 'Border Collie',
    birth_date: '2020-05-15T00:00:00Z',
    photo_url: 'http://test.com/photo.jpg',
    pivot: {}
  };

  const mockDogStateService = {
    getDog: vi.fn().mockReturnValue(signal(mockDog)),
    setDog: vi.fn()
  };

  const mockDogService = {
    updateDog: vi.fn().mockResolvedValue({ ...mockDog, name: 'Toby Junior' })
  };

  const mockToastService = {
    success: vi.fn(),
    error: vi.fn()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DogSummaryComponent],
      providers: [
        { provide: DogStateService, useValue: mockDogStateService },
        { provide: DogService, useValue: mockDogService },
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DogSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe inicializar el formulario con los datos del perro', () => {
    expect(component.formData.name).toBe('Toby');
    expect(component.formData.breed).toBe('Border Collie');
    expect(component.formData.birth_date).toBe('2020-05-15');
  });

  it('debe calcular correctamente el progreso del perfil', () => {
    // mockDog has name, breed, birth_date, photo_url -> 4 direct fields
    // pivot fields -> 0
    // total fields -> 6 direct + 2 pivot = 8
    // progress = (4 / 8) * 100 = 50%
    expect(component.calculateProgress()).toBe(50);
  });

  it('debe guardar los cambios correctamente', async () => {
    component.formData.name = 'Toby Junior';
    
    await component.saveChanges();

    expect(mockDogService.updateDog).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Toby Junior' }));
    expect(mockDogStateService.setDog).toHaveBeenCalled();
    expect(mockToastService.success).toHaveBeenCalledWith('Datos actualizados');
  });

  it('no debe guardar si el nombre está vacío', async () => {
    component.formData.name = '   ';
    
    await component.saveChanges();

    expect(mockDogService.updateDog).not.toHaveBeenCalled();
    expect(mockToastService.error).toHaveBeenCalledWith('El nombre es obligatorio');
  });
});
