import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionarMiembros } from './gestionar-miembros';

describe('GestionarMiembros', () => {
  let component: GestionarMiembros;
  let fixture: ComponentFixture<GestionarMiembros>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionarMiembros]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionarMiembros);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
