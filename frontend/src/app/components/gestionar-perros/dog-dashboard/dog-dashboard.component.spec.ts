import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DogDashboardComponent } from './dog-dashboard.component';
import { provideRouter } from '@angular/router';
import { DogStateService } from '../services/dog-state.service';
import { DogService } from '../../../services/dog.service';
import { ToastService } from '../../../services/toast.service';
import { ImageCompressorService } from '../../../services/image-compressor.service';
import { signal } from '@angular/core';

describe('DogDashboardComponent', () => {
  let component: DogDashboardComponent;
  let fixture: ComponentFixture<DogDashboardComponent>;

  const mockDog = {
    id: 1,
    name: 'Toby',
    breed: 'Border Collie',
    birth_date: '2020-05-15',
    photo_url: 'http://test.com/photo.jpg',
    points: 150,
    pivot: {
      rsce_grade: 'Grado 2'
    }
  };

  const mockDogStateService = {
    getDog: vi.fn().mockReturnValue(signal(mockDog)),
    loadDog: vi.fn().mockResolvedValue(true),
    setDog: vi.fn(),
    clear: vi.fn()
  };

  const mockDogService = {
    updateDogPhoto: vi.fn().mockResolvedValue({ ...mockDog, photo_url: 'http://test.com/new.jpg' })
  };

  const mockToastService = {
    success: vi.fn(),
    error: vi.fn()
  };

  const mockImageCompressor = {
    compress: vi.fn().mockResolvedValue(new File([''], 'test.jpg', { type: 'image/jpeg' }))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DogDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: DogStateService, useValue: mockDogStateService },
        { provide: DogService, useValue: mockDogService },
        { provide: ToastService, useValue: mockToastService },
        { provide: ImageCompressorService, useValue: mockImageCompressor }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DogDashboardComponent);
    component = fixture.componentInstance;
    
    // Simulate that the dog was already loaded by route params for the test view
    component.isLoading.set(false);
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe mostrar los datos principales del perro en el header', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    
    expect(compiled.querySelector('h2')?.textContent).toContain('Toby');
    expect(compiled.querySelector('.subtitle')?.textContent).toContain('Border Collie');
    expect(compiled.querySelector('.badge.grade')?.textContent).toContain('Grado 2');
    expect(compiled.querySelector('.pts')?.textContent).toBe('150');
    expect(compiled.querySelector('img')?.getAttribute('src')).toBe('http://test.com/photo.jpg');
  });

  it('debe calcular la edad correctamente', () => {
    // Para simplificar, probamos el método directamente
    const date = new Date();
    date.setFullYear(date.getFullYear() - 3);
    const ageString = component.calculateAge(date.toISOString());
    expect(ageString).toBe('3 años');
  });

  it('debe limpiar el estado al destruirse', () => {
    component.ngOnDestroy();
    expect(mockDogStateService.clear).toHaveBeenCalled();
  });

  it('debe subir una nueva foto correctamente', async () => {
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const mockEvent = { target: { files: [mockFile] } };

    await component.onFileSelected(mockEvent);

    expect(mockImageCompressor.compress).toHaveBeenCalledWith(mockFile);
    expect(mockDogService.updateDogPhoto).toHaveBeenCalledWith(1, expect.any(File));
    expect(mockDogStateService.setDog).toHaveBeenCalled();
    expect(mockToastService.success).toHaveBeenCalledWith('Foto actualizada correctamente');
  });
});
