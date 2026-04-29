import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '../../services/auth.service';
import { TenantService } from '../../services/tenant.service';
import { of } from 'rxjs';
import { signal } from '@angular/core';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let mockAuthService: any;
  let mockTenantService: any;

  beforeEach(async () => {
    mockAuthService = {
      isLoggedIn: signal(false),
      user: signal(null),
    };

    mockTenantService = {
      tenantInfo: signal({
        name: 'Club Test',
        settings: {
          slogan: 'Slogan de prueba',
          homeConfig: {
            heroImage: 'hero.jpg',
            services: { items: [{ title: 'Service 1', description: 'Desc 1', icon: 'star' }] }
          }
        }
      })
    };

    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: TenantService, useValue: mockTenantService }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the club slogan from tenant service', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.subtitle')?.textContent).toContain('Slogan de prueba');
  });

  it('should render services properly', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const services = compiled.querySelectorAll('.service-panel');
    expect(services.length).toBeGreaterThan(0);
    expect(services[0].textContent).toContain('Service 1');
  });
});
