/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CompetitionService } from './competition.service';
import { Competition } from '../models/competition.model';
import { environment } from '../../environments/environment';

describe('CompetitionService', () => {
    let service: CompetitionService;
    let httpMock: HttpTestingController;
    const apiUrl = `${environment.apiUrl}/competitions`;

    beforeAll(() => {
        if (!getTestBed().platform) {
            getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
        }
    });

    beforeEach(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                CompetitionService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(CompetitionService);
        httpMock = TestBed.inject(HttpTestingController);

        // Expect the initial fetch request from the constructor
        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('GET');
        req.flush([]); // Flush with empty array for initial setup
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should fetch and map competitions correctly', () => {
        const mockBackendData = [
            {
                id: 1,
                nombre: 'Agility Spring Cup',
                lugar: 'Madrid',
                fecha_evento: '2026-05-20',
                tipo: 'competicion',
                is_attending: 1,
                attending_dog_ids: [10],
                dias_asistencia: ['2026-05-20']
            },
            {
                id: 2,
                nombre: 'Agility Winter Cup',
                lugar: 'Barcelona',
                fecha_evento: '2026-01-10',
                tipo: 'competicion',
                is_attending: 0,
                attending_dog_ids: [],
                dias_asistencia: []
            }
        ];

        service.fetchCompetitions();

        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('GET');
        req.flush(mockBackendData);

        const competitions = service.getCompetitions()();
        
        expect(competitions.length).toBe(2);
        
        // They should be sorted descending by date (May then January)
        expect(competitions[0].nombre).toBe('Agility Spring Cup');
        expect(competitions[0].fechaEvento).toBe('2026-05-20');
        expect(competitions[0].isAttending).toBe(true);
        expect(competitions[0].attendingDogIds).toEqual([10]);
        expect(competitions[0].diasAsistencia).toEqual(['2026-05-20']);

        expect(competitions[1].nombre).toBe('Agility Winter Cup');
        expect(competitions[1].isAttending).toBe(false);
    });

    it('should add a competition and update signals', async () => {
        const newCompData = {
            nombre: 'New Competition',
            lugar: 'Valencia',
            fechaEvento: '2026-08-15',
            tipo: 'competicion' as const
        } as unknown as Omit<Competition, 'id'>;

        const mockResponse = {
            id: 3,
            nombre: 'New Competition',
            lugar: 'Valencia',
            fecha_evento: '2026-08-15',
            tipo: 'competicion'
        };

        const promise = service.addCompetition(newCompData);

        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            nombre: 'New Competition',
            lugar: 'Valencia',
            fecha_evento: '2026-08-15',
            fecha_fin_evento: undefined,
            fecha_limite: undefined,
            forma_pago: undefined,
            enlace: undefined,
            tipo: 'competicion',
            cartel: undefined,
            judge_name: undefined
        });

        req.flush(mockResponse);

        const result = await promise;
        expect(result.id).toBe(3);

        const signalComps = service.getCompetitions()();
        expect(signalComps.find(c => c.id === 3)).toBeTruthy();
    });

    it('should update a competition and update signals', async () => {
        // Initial setup to have a competition in the signal
        service.getCompetitions().set([{ id: 1, nombre: 'Old Name', tipo: 'competicion' } as unknown as Competition]);

        const updatedComp = {
            id: 1,
            nombre: 'Updated Name',
            tipo: 'competicion' as const
        } as unknown as Competition;

        const mockResponse = {
            id: 1,
            nombre: 'Updated Name',
            tipo: 'competicion'
        };

        const promise = service.updateCompetition(updatedComp);

        const req = httpMock.expectOne(`${apiUrl}/1`);
        expect(req.request.method).toBe('POST'); // API uses POST for update according to controller/service
        req.flush(mockResponse);

        const result = await promise;
        expect(result.nombre).toBe('Updated Name');

        const signalComps = service.getCompetitions()();
        expect(signalComps.find(c => c.id === 1)?.nombre).toBe('Updated Name');
    });

    it('should delete a competition and update signals', async () => {
        service.getCompetitions().set([{ id: 1, nombre: 'Comp 1', tipo: 'competicion' } as unknown as Competition]);

        const promise = service.deleteCompetition(1);

        const req = httpMock.expectOne(`${apiUrl}/1/delete`);
        expect(req.request.method).toBe('POST');
        req.flush({});

        await promise;

        const signalComps = service.getCompetitions()();
        expect(signalComps.length).toBe(0);
    });

    it('should call attend api correctly', async () => {
        const promise = service.attendCompetition(1, [10, 11], ['2026-05-20']);

        const req = httpMock.expectOne(`${apiUrl}/1/attend`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ dog_ids: [10, 11], dias_asistencia: ['2026-05-20'] });
        req.flush({ message: 'Attendance recorded' });

        const result = await promise;
        expect(result.message).toBe('Attendance recorded');
    });

    it('should call unattend api correctly', async () => {
        const promise = service.unattendCompetition(1);

        const req = httpMock.expectOne(`${apiUrl}/1/unattend`);
        expect(req.request.method).toBe('POST');
        req.flush({ message: 'Attendance removed' });

        const result = await promise;
        expect(result.message).toBe('Attendance removed');
    });

    it('should call getAttendees api correctly', async () => {
        const mockAttendees = [{ id: 1, name: 'User 1' }];
        const promise = service.getAttendees(1);

        const req = httpMock.expectOne(`${apiUrl}/1/attendees`);
        expect(req.request.method).toBe('GET');
        req.flush(mockAttendees);

        const result = await promise;
        expect(result).toEqual(mockAttendees);
    });
});
