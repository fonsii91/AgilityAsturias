import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionarMiembrosComponent } from './gestionar-miembros';

describe('GestionarMiembrosComponent', () => {
  let component: GestionarMiembrosComponent;
  let fixture: ComponentFixture<GestionarMiembrosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionarMiembrosComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(GestionarMiembrosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
