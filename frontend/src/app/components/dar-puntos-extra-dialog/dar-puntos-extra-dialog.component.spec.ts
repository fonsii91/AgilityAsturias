import { signal, Injector, runInInjectionContext } from '@angular/core';
import { DarPuntosExtraDialogComponent } from './dar-puntos-extra-dialog.component';
import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { DogService } from '../../services/dog.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('DarPuntosExtraDialogComponent', () => {
  let component: DarPuntosExtraDialogComponent;
  let mockDogService: any;
  let mockDialogRef: any;
  let mockSnackBar: any;

  beforeEach(() => {
    mockDogService = {
      getAllDogs: vi.fn().mockReturnValue(signal([
        { id: 1, name: 'Toby', users: [{ name: 'Juan' }] },
        { id: 2, name: 'Rex', users: [{ name: 'Ana' }] }
      ])),
      loadAllDogs: vi.fn(),
      giveExtraPoints: vi.fn().mockResolvedValue({})
    };

    mockDialogRef = {
      close: vi.fn()
    };

    mockSnackBar = {
      open: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: DogService, useValue: mockDogService },
        { provide: MatSnackBar, useValue: mockSnackBar }
      ]
    });

    const injector = TestBed.inject(Injector);
    runInInjectionContext(injector, () => {
      component = new DarPuntosExtraDialogComponent();
    });
  });

  it('should create', () => {
    component.ngOnInit();
    expect(component).toBeTruthy();
    expect(mockDogService.loadAllDogs).toHaveBeenCalled();
  });

  it('should invalidate form if required fields are missing', () => {
    component.selectedDogId = null;
    component.selectedCategory = '';
    component.selectedPoints = 1;
    expect(component.isFormValid()).toBe(false);

    component.selectedDogId = 1;
    component.selectedCategory = 'Puntualidad';
    expect(component.isFormValid()).toBe(true);
  });

  it('should validate correctly when custom category is used', () => {
    component.selectedDogId = 1;
    component.selectedCategory = 'Otro';
    component.customCategory = '';
    expect(component.isFormValid()).toBe(false);

    component.customCategory = 'Super salto';
    expect(component.isFormValid()).toBe(true);
  });

  it('should set appropriate categories based on action', () => {
    component.action = 'add';
    expect(component.categories).toEqual(component.positiveCategories);

    component.action = 'remove';
    expect(component.categories).toEqual(component.negativeCategories);
  });

  it('should clear categories when action changes', () => {
    component.selectedCategory = 'Puntualidad';
    component.customCategory = 'Test';
    
    component.onActionChange();
    
    expect(component.selectedCategory).toBe('');
    expect(component.customCategory).toBe('');
  });

  it('should call giveExtraPoints with correct positive points', async () => {
    component.action = 'add';
    component.selectedDogId = 1;
    component.selectedPoints = 2;
    component.selectedCategory = 'Puntualidad';

    await component.onSubmit();

    expect(mockDogService.giveExtraPoints).toHaveBeenCalledWith(1, 2, 'Puntualidad');
    expect(mockSnackBar.open).toHaveBeenCalledWith('¡Puntos otorgados exitosamente!', 'Cerrar', expect.any(Object));
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should call giveExtraPoints with negative points', async () => {
    component.action = 'remove';
    component.selectedDogId = 2;
    component.selectedPoints = 3;
    component.selectedCategory = 'Caca';

    await component.onSubmit();

    expect(mockDogService.giveExtraPoints).toHaveBeenCalledWith(2, -3, 'Caca');
    expect(mockSnackBar.open).toHaveBeenCalledWith('¡Puntos quitados exitosamente!', 'Cerrar', expect.any(Object));
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should handle custom category correctly in submit', async () => {
    component.action = 'add';
    component.selectedDogId = 1;
    component.selectedPoints = 1;
    component.selectedCategory = 'Otro';
    component.customCategory = ' Ayudó a montar pista ';

    await component.onSubmit();

    expect(mockDogService.giveExtraPoints).toHaveBeenCalledWith(1, 1, 'Ayudó a montar pista');
  });

  it('should handle error when giveExtraPoints fails', async () => {
    mockDogService.giveExtraPoints.mockRejectedValueOnce(new Error('API error'));
    
    component.selectedDogId = 1;
    component.selectedCategory = 'Puntualidad';
    component.selectedPoints = 1;

    await component.onSubmit();

    expect(mockSnackBar.open).toHaveBeenCalledWith('Error al modificar los puntos.', 'Cerrar', expect.any(Object));
    expect(mockDialogRef.close).not.toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
  });
});
