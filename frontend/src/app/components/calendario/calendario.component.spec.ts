/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { CalendarioComponent } from './calendario.component';
import { CompetitionService } from '../../services/competition.service';
import { PersonalEventService } from '../../services/personal-event.service';
import { AuthService } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';
import { signal, ChangeDetectorRef, NgZone } from '@angular/core';

describe('CalendarioComponent Logic', () => {
    beforeAll(() => {
        if (!getTestBed().platform) {
            getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
        }
    });

    let component: CalendarioComponent;

    let mockCompetitionService: any;
    let mockPersonalEventService: any;
    let mockAuthService: any;
    let mockDogService: any;

    let competitionsSignal: any;
    let personalEventsSignal: any;
    let currentUserSignal: any;
    let userDogsSignal: any;

    beforeEach(async () => {
        TestBed.resetTestingModule();

        currentUserSignal = signal({ id: 1, name: 'Test User' });
        competitionsSignal = signal([
            { id: 1, nombre: 'Comp 1', fechaEvento: '2026-05-15', tipo: 'competicion', isAttending: false }
        ]);
        personalEventsSignal = signal([
            { id: 1, title: 'Vet', start_date: '2026-05-10', type: 'veterinario' }
        ]);
        userDogsSignal = signal([
            { id: 10, name: 'Rex' }
        ]);

        mockCompetitionService = {
            getCompetitions: () => competitionsSignal,
            attendCompetition: vi.fn(),
            unattendCompetition: vi.fn(),
            getAttendees: vi.fn().mockResolvedValue([])
        };
        mockPersonalEventService = {
            getEvents: () => personalEventsSignal,
            loadEvents: vi.fn(),
            createEvent: vi.fn(),
            updateEvent: vi.fn(),
            deleteEvent: vi.fn()
        };
        mockAuthService = { currentUserSignal: currentUserSignal };
        mockDogService = {
            getDogs: () => userDogsSignal,
            loadUserDogs: vi.fn()
        };

        await TestBed.configureTestingModule({
            providers: [
                { provide: CompetitionService, useValue: mockCompetitionService },
                { provide: PersonalEventService, useValue: mockPersonalEventService },
                { provide: AuthService, useValue: mockAuthService },
                { provide: DogService, useValue: mockDogService },
                { provide: ChangeDetectorRef, useValue: { detectChanges: vi.fn() } },
                { provide: NgZone, useValue: { run: (fn: any) => fn() } }
            ]
        });

        TestBed.runInInjectionContext(() => {
            component = new CalendarioComponent(TestBed.inject(CompetitionService));
            component.currentYear.set(2026);
        });
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should calculate months and days correctly', () => {
        const months = component.months();
        expect(months.length).toBe(12);
        
        const may = months[4]; // Mayo (0-indexed)
        expect(may.name).toBe('Mayo');
        
        // Find day 10 for personal event
        const day10 = may.days.find(d => !d.isOtherMonth && d.date.getDate() === 10);
        expect(day10).toBeDefined();
        expect(day10?.personalEvents.length).toBe(1);
        expect(day10?.personalEvents[0].title).toBe('Vet');

        // Find day 15 for competition
        const day15 = may.days.find(d => !d.isOtherMonth && d.date.getDate() === 15);
        expect(day15).toBeDefined();
        expect(day15?.isCompetition).toBe(true);
        expect(day15?.competitions.length).toBe(1);
        expect(day15?.competitions[0].nombre).toBe('Comp 1');
    });

    it('should open modal with proper data when clicking a day with events', () => {
        const mockDay = {
            date: new Date(2026, 4, 15),
            isCompetition: true,
            isOtherEvent: false,
            isWeekend: false,
            isOtherMonth: false,
            isToday: false,
            deadlines: [],
            competitions: [{ id: 1, nombre: 'Comp 1' }],
            personalEvents: []
        };

        component.handleDayClick(mockDay as any);

        expect(component.isModalOpen).toBe(true);
        expect(component.selectedCompetition).toBeDefined();
        expect(component.selectedCompetition.nombre).toBe('Comp 1');
        expect(component.activeModalTab).toBe('info');
    });

    it('should open personal event modal directly when clicking a day with exactly 1 personal event and no competitions', () => {
        const mockDay = {
            date: new Date(2026, 4, 10),
            isCompetition: false,
            isOtherEvent: false,
            isWeekend: false,
            isOtherMonth: false,
            isToday: false,
            deadlines: [],
            competitions: [],
            personalEvents: [{ id: 1, title: 'Vet' }]
        };

        component.handleDayClick(mockDay as any);

        expect(component.isPersonalEventModalOpen).toBe(true);
        expect(component.isModalOpen).toBe(false); // General modal is not opened
        expect(component.personalEventForm.title).toBe('Vet');
        expect(component.isViewingPersonalEvent).toBe(true);
    });

    it('should initiate attendance correctly', () => {
        component.selectedCompetition = { id: 1, isAttending: false };
        component.startAttendance();
        
        expect(component.isConfirmingAttendance).toBe(true);
        // Should auto-select all user dogs (Rex has id 10)
        expect(component.selectedDogIds.has(10)).toBe(true);
    });

    it('should call competitionService.attendCompetition when confirming attendance', async () => {
        component.selectedCompetition = { id: 1, fechaEvento: '2026-05-15', isAttending: false };
        component.selectedDogIds = new Set([10]);
        component.selectedAttendanceDays = new Set(['2026-05-15']);
        
        await component.confirmAttendance();
        
        expect(mockCompetitionService.attendCompetition).toHaveBeenCalledWith(1, [10], ['2026-05-15'], [{dog_id: 10, dias_asistencia: ['2026-05-15']}]);
        expect(component.selectedCompetition.isAttending).toBe(true);
        expect(component.isConfirmingAttendance).toBe(false);
    });

    it('should open and save new personal event', async () => {
        component.openPersonalEventModal();
        expect(component.isPersonalEventModalOpen).toBe(true);
        expect(component.personalEventForm.dog_id).toBe(10); // Auto selects first dog
        
        component.personalEventForm.title = 'New Event';
        component.personalEventForm.start_date = '2026-06-01';
        component.personalEventForm.type = 'veterinario';
        
        await component.savePersonalEvent();
        
        expect(mockPersonalEventService.createEvent).toHaveBeenCalled();
        expect(component.isPersonalEventModalOpen).toBe(false);
    });

});
