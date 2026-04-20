import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminSaludMonitor } from './admin-salud-monitor';

describe('AdminSaludMonitor', () => {
  let component: AdminSaludMonitor;
  let fixture: ComponentFixture<AdminSaludMonitor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSaludMonitor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminSaludMonitor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
