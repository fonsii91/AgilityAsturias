import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContactoComponent } from './contacto.component';
import { TenantService } from '../../services/tenant.service';
import { signal } from '@angular/core';

describe('ContactoComponent', () => {
  let component: ContactoComponent;
  let fixture: ComponentFixture<ContactoComponent>;
  let mockTenantService: any;

  beforeEach(async () => {
    mockTenantService = {
      tenantInfo: signal({
        settings: {
          contact: {
            phone: '600123456',
            email: 'contacto@clubtest.com',
            addressLine1: 'Calle Falsa 123',
            addressLine2: 'Ciudad Test',
            mapUrl: 'https://maps.google.com/test'
          },
          social: {
            instagram: 'clubtest',
            facebook: 'clubtestfb'
          }
        }
      })
    };

    await TestBed.configureTestingModule({
      imports: [ContactoComponent],
      providers: [
        { provide: TenantService, useValue: mockTenantService }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ContactoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the contact phone from tenant service', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.phone-number')?.textContent).toContain('600123456');
  });

  it('should display the contact email from tenant service', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.email-link')?.textContent).toContain('contacto@clubtest.com');
  });

  it('should display the contact address from tenant service', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const addressText = compiled.querySelector('address')?.textContent;
    expect(addressText).toContain('Calle Falsa 123');
    expect(addressText).toContain('Ciudad Test');
  });

  it('should generate valid social media links from tenant service', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const instagramBtn = compiled.querySelector('.social-btn.instagram');
    const facebookBtn = compiled.querySelector('.social-btn.facebook');
    
    expect(instagramBtn?.getAttribute('href')).toBe('https://instagram.com/clubtest');
    expect(facebookBtn?.getAttribute('href')).toBe('https://facebook.com/clubtestfb');
  });
});
