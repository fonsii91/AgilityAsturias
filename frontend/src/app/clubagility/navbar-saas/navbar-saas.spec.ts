import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavbarSaas } from './navbar-saas';

describe('NavbarSaas', () => {
  let component: NavbarSaas;
  let fixture: ComponentFixture<NavbarSaas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarSaas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavbarSaas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
