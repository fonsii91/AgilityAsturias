import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoinSaas } from './join-saas';

describe('JoinSaas', () => {
  let component: JoinSaas;
  let fixture: ComponentFixture<JoinSaas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinSaas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JoinSaas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
