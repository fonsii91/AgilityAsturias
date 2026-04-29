/**
 * @vitest-environment jsdom
 */
import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DogDocsComponent } from './dog-docs.component';
import { DogStateService } from '../../services/dog-state.service';
import { DogService } from '../../../../services/dog.service';
import { ToastService } from '../../../../services/toast.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

describe('DogDocsComponent', () => {
  let component: DogDocsComponent;
  let fixture: ComponentFixture<DogDocsComponent>;
  let mockDogState: any;
  let mockDogService: any;
  let mockToastService: any;

  beforeAll(() => {
    try {
      TestBed.resetTestEnvironment();
      TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
    } catch (e) {
      // Ignore if already initialized
    }
  });

  beforeEach(async () => {
    TestBed.resetTestingModule();
    mockDogState = {
      getDog: vi.fn().mockReturnValue(signal({
        id: 1,
        name: 'Toby',
        height_cm: 45,
        microchip: '123456789012345',
        pedigree: 'LOE-123',
        pivot: {
          rsce_license: 'RSCE-123',
          rsce_expiration_date: '2025-12-31T00:00:00Z',
          rsce_grade: '2'
        }
      })),
      setDog: vi.fn()
    };

    mockDogService = {
      updateDog: vi.fn().mockResolvedValue({ id: 1, name: 'Toby Updated' })
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [DogDocsComponent],
      providers: [
        { provide: DogStateService, useValue: mockDogState },
        { provide: DogService, useValue: mockDogService },
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DogDocsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize with dog data', () => {
    expect(component).toBeTruthy();
    expect(component.formData.microchip).toBe('123456789012345');
    expect(component.formData.pedigree).toBe('LOE-123');
    expect(component.formData.rsce_license).toBe('RSCE-123');
    expect(component.formData.rsce_expiration_date).toBe('2025-12-31');
    expect(component.formData.rsce_grade).toBe('2');
  });

  it('should calculate category based on dog height', () => {
    // 45cm falls into "Intermediate (I) - 45cm"
    expect(component.calculatedCategory).toBe('Intermediate (I) - 45cm');
  });

  it('should call updateDog on saveChanges', async () => {
    component.formData.microchip = '999';
    await component.saveChanges();

    expect(mockDogService.updateDog).toHaveBeenCalledWith(1, expect.objectContaining({
      microchip: '999',
      pedigree: 'LOE-123',
      rsce_license: 'RSCE-123',
      rsce_expiration_date: '2025-12-31',
      rsce_grade: '2'
    }));

    expect(mockDogState.setDog).toHaveBeenCalled();
    expect(mockToastService.success).toHaveBeenCalledWith('Documentos actualizados');
  });

  it('should handle errors on saveChanges', async () => {
    mockDogService.updateDog.mockRejectedValueOnce(new Error('Failed'));
    await component.saveChanges();
    expect(mockToastService.error).toHaveBeenCalledWith('Error al guardar documentos');
  });
});
