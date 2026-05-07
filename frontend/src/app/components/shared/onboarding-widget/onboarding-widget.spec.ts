import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OnboardingWidgetComponent } from './onboarding-widget';

import { OnboardingService } from '../../../services/onboarding';
import { signal } from '@angular/core';

describe('OnboardingWidget', () => {
  let component: OnboardingWidgetComponent;
  let fixture: ComponentFixture<OnboardingWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingWidgetComponent],
      providers: [
        provideRouter([]),
        provideAnimations(),
        { provide: OnboardingService, useValue: { isTutorialCompleted: signal(false), currentProgress: signal(0), activeTutorialType: signal(null), activeSteps: signal([]), activeTutorialProgress: signal(0) } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OnboardingWidgetComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
