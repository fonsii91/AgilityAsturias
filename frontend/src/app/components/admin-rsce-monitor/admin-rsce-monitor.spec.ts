import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminRsceMonitor } from './admin-rsce-monitor';

describe('AdminRsceMonitor', () => {
  let component: AdminRsceMonitor;
  let fixture: ComponentFixture<AdminRsceMonitor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRsceMonitor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminRsceMonitor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
