import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeSaas } from './home-saas';

describe('HomeSaas', () => {
  let component: HomeSaas;
  let fixture: ComponentFixture<HomeSaas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeSaas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeSaas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
