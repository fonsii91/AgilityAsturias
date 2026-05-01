import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SugerenciaDialog } from './sugerencia-dialog';
import { MatDialogRef } from '@angular/material/dialog';
import { SuggestionService } from '../../../services/suggestion.service';
import { TenantService } from '../../../services/tenant.service';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vitest } from 'vitest';

describe('SugerenciaDialog', () => {
  let component: SugerenciaDialog;
  let fixture: ComponentFixture<SugerenciaDialog>;
  let mockDialogRef: any;
  let mockSuggestionService: any;
  let mockTenantService: any;

  beforeEach(async () => {
    mockDialogRef = {
      close: vitest.fn()
    };

    mockSuggestionService = {
      createSuggestion: vitest.fn()
    };

    mockTenantService = {
      tenantInfo: signal({ name: 'Test Club' })
    };

    // spy on alert
    vitest.spyOn(window, 'alert').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [SugerenciaDialog, FormsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: SuggestionService, useValue: mockSuggestionService },
        { provide: TenantService, useValue: mockTenantService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SugerenciaDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vitest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not submit if content is empty', () => {
    component.content = '   ';
    component.submit();
    expect(mockSuggestionService.createSuggestion).not.toHaveBeenCalled();
  });

  it('should submit successfully and close dialog', () => {
    component.content = 'Great feature idea';
    component.type = 'suggestion';
    mockSuggestionService.createSuggestion.mockReturnValue(of({ message: 'Success' }));

    component.submit();

    expect(component.isSubmitting).toBe(false);
    expect(mockSuggestionService.createSuggestion).toHaveBeenCalledWith({
      type: 'suggestion',
      content: 'Great feature idea'
    });
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should handle error when submitting', () => {
    // Suppress console.error for this test
    vitest.spyOn(console, 'error').mockImplementation(() => {});
    
    component.content = 'Found a bug';
    component.type = 'bug';
    mockSuggestionService.createSuggestion.mockReturnValue(throwError(() => new Error('Server error')));

    component.submit();

    expect(component.isSubmitting).toBe(false);
    expect(window.alert).toHaveBeenCalledWith('Hubo un error al enviar tu reporte, por favor intenta más tarde.');
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('should close dialog when cancel is called', () => {
    component.cancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });
});
