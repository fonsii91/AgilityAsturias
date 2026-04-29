import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DogHealthComponent } from './dog-health.component';
import { DogStateService } from '../../services/dog-state.service';
import { signal } from '@angular/core';

describe('DogHealthComponent', () => {
  let component: DogHealthComponent;
  let fixture: ComponentFixture<DogHealthComponent>;

  const mockDog = {
    id: 1,
    name: 'Toby'
  };

  const mockDogStateService = {
    getDog: vi.fn().mockReturnValue(signal(mockDog))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DogHealthComponent],
      providers: [
        { provide: DogStateService, useValue: mockDogStateService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DogHealthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe mostrar el nombre del perro en el mensaje de "Pronto podrás gestionar..."', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.coming-soon p')?.textContent).toContain('Toby');
  });

  it('debe renderizar la lista de futuras características', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const listItems = compiled.querySelectorAll('.feature-list li');
    expect(listItems.length).toBe(3);
    expect(listItems[0].textContent).toContain('Control de Vacunas y Desparasitaciones');
  });
});
