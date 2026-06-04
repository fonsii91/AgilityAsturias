import { TestBed } from '@angular/core/testing';
import { PatrocinadoresComponent } from './patrocinadores';
import { SponsorService } from '../../services/sponsor.service';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { signal } from '@angular/core';

describe('PatrocinadoresComponent', () => {
  let sponsorServiceMock: any;
  let sponsorsSignal = signal<any[]>([]);

  beforeEach(() => {
    sponsorsSignal.set([]);
    sponsorServiceMock = {
      getSponsors: vi.fn().mockReturnValue(sponsorsSignal)
    };

    TestBed.configureTestingModule({
      imports: [PatrocinadoresComponent],
      providers: [
        { provide: SponsorService, useValue: sponsorServiceMock },
        provideRouter([])
      ]
    });
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(PatrocinadoresComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should show empty state when no sponsors are registered', () => {
    const fixture = TestBed.createComponent(PatrocinadoresComponent);
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
    expect(compiled.querySelector('.empty-state p')?.textContent).toContain('Aún no se han registrado patrocinadores');
  });

  it('should render sponsors grid when sponsors exist', () => {
    sponsorsSignal.set([
      { id: 1, nombre: 'Sponsor Test 1', descripcion: 'Desc 1', enlace: 'https://test1.com', imagen: 'logo1.png' },
      { id: 2, nombre: 'Sponsor Test 2', descripcion: 'Desc 2', enlace: '', imagen: '' }
    ]);
    
    const fixture = TestBed.createComponent(PatrocinadoresComponent);
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.sponsors-grid')).toBeTruthy();
    
    const cards = compiled.querySelectorAll('.sponsor-card');
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('h3')?.textContent).toContain('Sponsor Test 1');
    expect(cards[1].querySelector('h3')?.textContent).toContain('Sponsor Test 2');
  });
});
