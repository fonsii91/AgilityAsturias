import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeaturesSaas } from './features-saas';

describe('FeaturesSaas', () => {
  let component: FeaturesSaas;
  let fixture: ComponentFixture<FeaturesSaas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeaturesSaas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeaturesSaas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
