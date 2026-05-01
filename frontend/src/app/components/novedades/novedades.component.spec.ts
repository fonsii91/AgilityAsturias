import { TestBed } from '@angular/core/testing';
import { NovedadesComponent, ReleaseNote } from './novedades.component';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { vi } from 'vitest';

describe('NovedadesComponent', () => {
  let httpTestingController: HttpTestingController;

  const mockReleases: ReleaseNote[] = [
    {
      version: '1.0.0',
      date: '2024-01-01',
      features: ['Feature 1', 'Feature 2'],
      bugfixes: ['Fix 1'],
      warnings: ['Warning 1']
    },
    {
      version: '0.9.0',
      date: '2023-12-01',
      features: ['Initial release'],
      bugfixes: []
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        NovedadesComponent
      ]
    });
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create', () => {
    TestBed.runInInjectionContext(() => {
      const component = new NovedadesComponent(TestBed.inject(HttpClient));
      expect(component).toBeTruthy();
    });
  });

  it('should fetch releases on init and update the signal', () => {
    TestBed.runInInjectionContext(() => {
      const component = new NovedadesComponent(TestBed.inject(HttpClient));
      component.ngOnInit();

      const req = httpTestingController.expectOne('novedades.json');
      expect(req.request.method).toEqual('GET');
      
      // Simulate server response
      req.flush(mockReleases);

      // Verify signal is updated
      expect(component.releases()).toEqual(mockReleases);
    });
  });

  it('should handle error when fetching releases without crashing', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    TestBed.runInInjectionContext(() => {
      const component = new NovedadesComponent(TestBed.inject(HttpClient));
      component.ngOnInit();

      const req = httpTestingController.expectOne('novedades.json');
      
      // Simulate server error
      req.flush('Error fetching', { status: 500, statusText: 'Server Error' });

      // Ensure it handled the error (e.g. logged to console, signal remains empty)
      expect(consoleSpy).toHaveBeenCalledWith('Error loading Novedades', expect.anything());
      expect(component.releases()).toEqual([]);
    });

    consoleSpy.mockRestore();
  });
});
