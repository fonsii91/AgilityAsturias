
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DogFormComponent } from './dog-form.component';
import { DogService } from '../../../services/dog.service';
import { ToastService } from '../../../services/toast.service';
import { ImageCompressorService } from '../../../services/image-compressor.service';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

import { provideRouter, ActivatedRoute } from '@angular/router';

describe('DogFormComponent', () => {
  let component: DogFormComponent;
  let fixture: ComponentFixture<DogFormComponent>;
  let mockDogService: any;
  let mockToastService: any;
  let mockRouter: any;
  let mockImageCompressor: any;

  

  beforeEach(async () => {
    TestBed.resetTestingModule();
    
    mockDogService = {
      addDog: vi.fn(),
      updateDogPhoto: vi.fn(),
      loadUserDogs: vi.fn()
    };
    mockToastService = {
      success: vi.fn(),
      error: vi.fn()
    };
    mockRouter = {
      navigate: vi.fn()
    };
    mockImageCompressor = {
      compress: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [DogFormComponent, FormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: {} },
        { provide: DogService, useValue: mockDogService },
        { provide: ToastService, useValue: mockToastService },
        { provide: Router, useValue: mockRouter },
        { provide: ImageCompressorService, useValue: mockImageCompressor }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DogFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should disable submit button if name is empty', () => {
    component.formData.name = '';
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.btn-save');
    expect(button.disabled).toBe(true);
  });

  it('should enable submit button if name is provided', () => {
    component.formData.name = 'Toby';
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.btn-save');
    expect(button.disabled).toBe(false);
  });

  it('should call DogService.addDog and navigate on success', async () => {
    component.formData.name = 'Toby';
    component.formData.breed = 'Border Collie';
    
    mockDogService.addDog.mockResolvedValue({ id: 1, name: 'Toby' });
    mockDogService.loadUserDogs.mockResolvedValue();

    await component.saveDog();

    expect(mockDogService.addDog).toHaveBeenCalledWith({
      name: 'Toby',
      breed: 'Border Collie',
      birth_date: null
    });
    
    expect(mockToastService.success).toHaveBeenCalledWith('Perro registrado');
    expect(mockDogService.loadUserDogs).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/gestionar-perros']);
  });

  it('should show error toast if creation fails', async () => {
    component.formData.name = 'Toby';
    
    mockDogService.addDog.mockRejectedValue({
      error: { errors: { name: ['El nombre ya existe'] } }
    });

    await component.saveDog();

    expect(mockDogService.addDog).toHaveBeenCalled();
    expect(mockToastService.error).toHaveBeenCalledWith('El nombre ya existe');
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});
