import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SuggestionService } from './suggestion.service';
import { environment } from '../../environments/environment';
import { Suggestion } from '../models/suggestion.model';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('SuggestionService', () => {
  let service: SuggestionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SuggestionService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(SuggestionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all suggestions (admin)', () => {
    const mockSuggestions: Suggestion[] = [
      { id: 1, user_id: 2, type: 'bug', content: 'Test bug', status: 'pending', created_at: '2023-01-01', updated_at: '2023-01-01' }
    ];

    service.getSuggestions().subscribe((res) => {
      expect(res).toEqual(mockSuggestions);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/suggestions`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSuggestions);
  });

  it('should create a new suggestion', () => {
    const newSuggestionData = { type: 'suggestion' as const, content: 'A great idea' };
    const mockResponse = { message: 'Reporte enviado con éxito', data: { id: 1, ...newSuggestionData } };

    service.createSuggestion(newSuggestionData).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/suggestions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newSuggestionData);
    req.flush(mockResponse);
  });

  it('should mark a suggestion as resolved', () => {
    const mockResponse = { message: 'Marcado como resuelto' };

    service.resolveSuggestion(1).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/suggestions/1/resolve`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should mark a suggestion as unresolved', () => {
    const mockResponse = { message: 'Marcado como no resuelto' };

    service.unresolveSuggestion(1).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/suggestions/1/unresolve`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });
});
