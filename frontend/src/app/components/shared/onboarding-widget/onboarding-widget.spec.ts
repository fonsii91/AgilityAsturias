import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OnboardingWidget } from './onboarding-widget';

describe('OnboardingWidget', () => {
  let component: OnboardingWidget;
  let fixture: ComponentFixture<OnboardingWidget>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingWidget]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OnboardingWidget);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
