import { TestBed } from '@angular/core/testing';

import { Onboarding } from './onboarding';

describe('Onboarding', () => {
  let service: Onboarding;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Onboarding);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
