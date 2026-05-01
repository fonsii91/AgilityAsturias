import { TestBed } from '@angular/core/testing';
import { AdminSugerencias } from './admin-sugerencias';
import { SuggestionService } from '../../services/suggestion.service';
import { ToastService } from '../../services/toast.service';
import { of, throwError } from 'rxjs';
import { Suggestion } from '../../models/suggestion.model';
import { vi } from 'vitest';

describe('AdminSugerencias', () => {
  let mockSuggestionService: any;
  let mockToastService: any;

  const mockSuggestions: Suggestion[] = [
    { id: 1, type: 'bug', content: 'Bug 1', status: 'pending', created_at: '2024-01-01', user: { name: 'User 1' } },
    { id: 2, type: 'suggestion', content: 'Sugg 1', status: 'resolved', created_at: '2024-01-02', user: { name: 'User 2' } }
  ];

  beforeEach(() => {
    mockSuggestionService = {
      getSuggestions: vi.fn().mockReturnValue(of(mockSuggestions)),
      resolveSuggestion: vi.fn().mockReturnValue(of({})),
      unresolveSuggestion: vi.fn().mockReturnValue(of({}))
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SuggestionService, useValue: mockSuggestionService },
        { provide: ToastService, useValue: mockToastService },
        AdminSugerencias
      ]
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create and load suggestions on init', () => {
    TestBed.runInInjectionContext(() => {
      const component = new AdminSugerencias(
        TestBed.inject(SuggestionService),
        TestBed.inject(ToastService)
      );

      expect(component).toBeTruthy();
      
      component.ngOnInit();
      
      expect(mockSuggestionService.getSuggestions).toHaveBeenCalled();
      expect(component.suggestions()).toEqual(mockSuggestions);
      expect(component.isLoading()).toBe(false);
    });
  });

  it('should handle error when loading suggestions', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSuggestionService.getSuggestions.mockReturnValueOnce(throwError(() => new Error('Net Error')));

    TestBed.runInInjectionContext(() => {
      const component = new AdminSugerencias(
        TestBed.inject(SuggestionService),
        TestBed.inject(ToastService)
      );

      component.ngOnInit();

      expect(mockToastService.error).toHaveBeenCalledWith('Error al cargar las sugerencias');
      expect(component.isLoading()).toBe(false);
      expect(component.suggestions()).toEqual([]);
    });
  });

  it('should filter suggestions based on status', () => {
    TestBed.runInInjectionContext(() => {
      const component = new AdminSugerencias(
        TestBed.inject(SuggestionService),
        TestBed.inject(ToastService)
      );

      component.ngOnInit(); // loads mockSuggestions

      component.setFilter('pending');
      expect(component.filteredSuggestions().length).toBe(1);
      expect(component.filteredSuggestions()[0].id).toBe(1);

      component.setFilter('resolved');
      expect(component.filteredSuggestions().length).toBe(1);
      expect(component.filteredSuggestions()[0].id).toBe(2);

      component.setFilter('all');
      expect(component.filteredSuggestions().length).toBe(2);
    });
  });

  it('should mark suggestion as resolved with confirmation', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    TestBed.runInInjectionContext(() => {
      const component = new AdminSugerencias(
        TestBed.inject(SuggestionService),
        TestBed.inject(ToastService)
      );

      component.ngOnInit();

      component.markAsResolved(1);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockSuggestionService.resolveSuggestion).toHaveBeenCalledWith(1);
      expect(mockToastService.success).toHaveBeenCalledWith('Reporte marcado como resuelto');
      
      const updatedSugg = component.suggestions().find(s => s.id === 1);
      expect(updatedSugg?.status).toBe('resolved');
    });
  });

  it('should not mark suggestion as resolved if confirmation is cancelled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    TestBed.runInInjectionContext(() => {
      const component = new AdminSugerencias(
        TestBed.inject(SuggestionService),
        TestBed.inject(ToastService)
      );

      component.markAsResolved(1);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockSuggestionService.resolveSuggestion).not.toHaveBeenCalled();
    });
  });

  it('should mark suggestion as unresolved with confirmation', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    TestBed.runInInjectionContext(() => {
      const component = new AdminSugerencias(
        TestBed.inject(SuggestionService),
        TestBed.inject(ToastService)
      );

      component.ngOnInit(); // item 2 is resolved initially

      component.markAsUnresolved(2);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockSuggestionService.unresolveSuggestion).toHaveBeenCalledWith(2);
      expect(mockToastService.success).toHaveBeenCalledWith('Reporte marcado como no resuelto');
      
      const updatedSugg = component.suggestions().find(s => s.id === 2);
      expect(updatedSugg?.status).toBe('unresolved');
    });
  });
});
