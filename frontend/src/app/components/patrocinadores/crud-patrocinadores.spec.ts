import { TestBed } from '@angular/core/testing';
import { CrudPatrocinadoresComponent } from './crud-patrocinadores';
import { SponsorService } from '../../services/sponsor.service';
import { ImageCompressorService } from '../../services/image-compressor.service';
import { ToastService } from '../../services/toast.service';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { signal } from '@angular/core';

describe('CrudPatrocinadoresComponent', () => {
  let sponsorServiceMock: any;
  let imageCompressorMock: any;
  let toastServiceMock: any;
  let sponsorsSignal = signal<any[]>([]);

  beforeEach(() => {
    sponsorsSignal.set([]);
    sponsorServiceMock = {
      getSponsors: vi.fn().mockReturnValue(sponsorsSignal),
      addSponsor: vi.fn().mockResolvedValue({}),
      updateSponsor: vi.fn().mockResolvedValue({}),
      deleteSponsor: vi.fn().mockResolvedValue({})
    };

    imageCompressorMock = {
      compress: vi.fn().mockResolvedValue(new File([], 'logo.png'))
    };

    toastServiceMock = {
      success: vi.fn(),
      error: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [CrudPatrocinadoresComponent],
      providers: [
        { provide: SponsorService, useValue: sponsorServiceMock },
        { provide: ImageCompressorService, useValue: imageCompressorMock },
        { provide: ToastService, useValue: toastServiceMock },
        provideRouter([])
      ]
    });
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(CrudPatrocinadoresComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should initialize with sponsors list and allow toggling form view', () => {
    const fixture = TestBed.createComponent(CrudPatrocinadoresComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.showForm()).toBe(false);

    component.initNewSponsor();
    expect(component.showForm()).toBe(true);
    expect(component.isEditing()).toBe(false);

    component.toggleView();
    expect(component.showForm()).toBe(false);
  });

  it('should patch form when editing a sponsor', () => {
    const fixture = TestBed.createComponent(CrudPatrocinadoresComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const sponsorToEdit = { id: 42, nombre: 'Sponsor Edit', descripcion: 'Desc Edit', enlace: 'https://edit.com', imagen: 'edit.png' };
    component.editSponsor(sponsorToEdit);

    expect(component.showForm()).toBe(true);
    expect(component.isEditing()).toBe(true);
    expect(component.sponsorForm.value.nombre).toBe('Sponsor Edit');
    expect(component.sponsorForm.value.enlace).toBe('https://edit.com');
  });

  it('should submit form and call addSponsor for new sponsor', async () => {
    const fixture = TestBed.createComponent(CrudPatrocinadoresComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.initNewSponsor();
    component.sponsorForm.patchValue({
      nombre: 'Nuevo Sponsor',
      enlace: 'https://nuevo.com',
      descripcion: 'Nueva Descripcion'
    });

    component.onSubmit();
    expect(sponsorServiceMock.addSponsor).toHaveBeenCalledWith({
      nombre: 'Nuevo Sponsor',
      enlace: 'https://nuevo.com',
      descripcion: 'Nueva Descripcion',
      imagen: null
    });
  });

  it('should trigger delete confirmation flow', async () => {
    const fixture = TestBed.createComponent(CrudPatrocinadoresComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.deleteSponsor(123);
    expect(component.showDeleteModal()).toBe(true);
    expect(component.sponsorToDeleteId).toBe(123);

    component.confirmDelete();
    expect(sponsorServiceMock.deleteSponsor).toHaveBeenCalledWith(123);
  });
});
