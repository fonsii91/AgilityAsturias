/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { CrudCompeticionComponent } from './crud-competicion.component';
import { CompetitionService } from '../../services/competition.service';
import { ImageCompressorService } from '../../services/image-compressor.service';
import { ToastService } from '../../services/toast.service';
import { FormBuilder } from '@angular/forms';
import { signal } from '@angular/core';

describe('CrudCompeticionComponent', () => {
    let component: CrudCompeticionComponent;

    beforeAll(() => {
        if (!getTestBed().platform) {
            getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
        }
    });

    const mockCompetitions = signal([
        { id: 1, nombre: 'Comp 1', fechaEvento: '2026-08-15' },
        { id: 2, nombre: 'Comp 2', fechaEvento: '2026-08-10' }
    ]);

    let competitionServiceMock: any;
    let toastServiceMock: any;
    let imageCompressorMock: any;

    beforeEach(async () => {
        TestBed.resetTestingModule();

        competitionServiceMock = {
            getCompetitions: vi.fn().mockReturnValue(mockCompetitions),
            addCompetition: vi.fn().mockResolvedValue({ id: 3, nombre: 'Comp 3' }),
            updateCompetition: vi.fn().mockResolvedValue({ id: 1, nombre: 'Comp 1 Modificada' }),
            deleteCompetition: vi.fn().mockResolvedValue(undefined)
        };

        toastServiceMock = {
            success: vi.fn(),
            error: vi.fn(),
            warning: vi.fn()
        };

        imageCompressorMock = {
            compress: vi.fn()
        };

        await TestBed.configureTestingModule({
            providers: [
                { provide: CompetitionService, useValue: competitionServiceMock },
                { provide: ToastService, useValue: toastServiceMock },
                { provide: ImageCompressorService, useValue: imageCompressorMock },
                FormBuilder
            ]
        });

        TestBed.runInInjectionContext(() => {
            component = new CrudCompeticionComponent(
                TestBed.inject(FormBuilder),
                TestBed.inject(CompetitionService)
            );
        });
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should split and sort competitions into proximos and pasados correctly', () => {
        const todayDate = new Date();
        const pastDate = new Date(todayDate);
        pastDate.setDate(todayDate.getDate() - 10);
        const futureDate1 = new Date(todayDate);
        futureDate1.setDate(todayDate.getDate() + 5);
        const futureDate2 = new Date(todayDate);
        futureDate2.setDate(todayDate.getDate() + 10);

        mockCompetitions.set([
            { id: 1, nombre: 'Past Comp', fechaEvento: pastDate.toISOString().replace('Z', '.000000Z') },
            { id: 2, nombre: 'Future Comp 1', fechaEvento: futureDate1.toISOString().replace('Z', '.000000Z') },
            { id: 3, nombre: 'Future Comp 2', fechaEvento: futureDate2.toISOString().replace('Z', '.000000Z') }
        ]);

        // Próximos: Future 1 then Future 2 (Ascending)
        const proximos = component.proximosEventos();
        expect(proximos.length).toBe(2);
        expect(proximos[0].id).toBe(2);
        expect(proximos[1].id).toBe(3);

        // Pasados: Past Comp (Descending)
        const pasados = component.eventosPasados();
        expect(pasados.length).toBe(1);
        expect(pasados[0].id).toBe(1);
    });

    it('should paginate displayedEvents correctly', () => {
        const todayDate = new Date();
        const comps = Array.from({ length: 15 }, (_, i) => {
            const futureDate = new Date(todayDate);
            futureDate.setDate(todayDate.getDate() + i + 1);
            return { id: i + 1, nombre: `Comp ${i}`, fechaEvento: futureDate.toISOString() };
        });
        
        mockCompetitions.set(comps);
        
        component.setTab('proximos');
        component.pageSize = 10;
        
        expect(component.displayedEvents().length).toBe(10);
        expect(component.totalPages()).toBe(2);
        
        component.nextPage();
        expect(component.displayedEvents().length).toBe(5);
        
        component.prevPage();
        expect(component.displayedEvents().length).toBe(10);
    });

    it('should init new competition form', () => {
        component.initNewCompetition();
        expect(component.showForm()).toBe(true);
        expect(component.isEditing()).toBe(false);
        expect(component.competitionForm.get('tipo')?.value).toBe('competicion');
        expect(component.currentCompetitionId).toBeNull();
    });

    it('should populate form when editing competition', () => {
        const compToEdit = { id: 1, nombre: 'Comp 1', fechaEvento: '2026-08-15', tipo: 'otros' };
        component.editCompetition(compToEdit as any);

        expect(component.showForm()).toBe(true);
        expect(component.isEditing()).toBe(true);
        expect(component.currentCompetitionId).toBe(1);
        expect(component.competitionForm.get('nombre')?.value).toBe('Comp 1');
        expect(component.competitionForm.get('tipo')?.value).toBe('otros');
    });

    it('should call addCompetition on submit if not editing', async () => {
        component.initNewCompetition();
        component.competitionForm.patchValue({
            nombre: 'Nueva Comp',
            fechaEvento: '2026-10-10',
            tipo: 'competicion'
        });

        await component.onSubmit();

        expect(competitionServiceMock.addCompetition).toHaveBeenCalled();
        expect(toastServiceMock.success).toHaveBeenCalledWith('Competición creada');
        expect(component.showForm()).toBe(false);
    });

    it('should call updateCompetition on submit if editing', async () => {
        const compToEdit = { id: 1, nombre: 'Comp 1', fechaEvento: '2026-08-15' };
        component.editCompetition(compToEdit as any);
        
        component.competitionForm.patchValue({
            nombre: 'Comp 1 Modificada'
        });

        await component.onSubmit();

        expect(competitionServiceMock.updateCompetition).toHaveBeenCalled();
        expect(toastServiceMock.success).toHaveBeenCalledWith('Competición actualizada');
        expect(component.showForm()).toBe(false);
    });

    it('should show delete modal on deleteCompetition', () => {
        component.deleteCompetition(1);
        expect(component.competitionToDeleteId).toBe(1);
        expect(component.showDeleteModal()).toBe(true);
    });

    it('should call deleteCompetition from service and hide modal on confirmDelete', async () => {
        component.deleteCompetition(1);
        await component.confirmDelete();

        expect(competitionServiceMock.deleteCompetition).toHaveBeenCalledWith(1);
        expect(toastServiceMock.success).toHaveBeenCalledWith('Competición eliminada correctamente');
        expect(component.showDeleteModal()).toBe(false);
        expect(component.competitionToDeleteId).toBeNull();
    });
});
