/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { AttendanceVerificationComponent } from './attendance-verification.component';
import { ReservationService } from '../../services/reservation.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('AttendanceVerificationComponent', () => {
    beforeAll(() => {
        if (!getTestBed().platform) {
            getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
        }
    });

    let component: AttendanceVerificationComponent;

    let mockReservationService: any;
    let mockToastService: any;
    let mockAuthService: any;
    let mockDogService: any;

    beforeEach(async () => {
        TestBed.resetTestingModule();

        mockReservationService = {
            getPendingAttendance: vi.fn().mockReturnValue(of([
                {
                    date: '2026-05-15',
                    slot: { id: 1, start_time: '10:00' },
                    reservations: [{ id: 101, dog_id: 10 }]
                }
            ])),
            getPendingCompetitions: vi.fn().mockReturnValue(of([
                {
                    id: 1,
                    nombre: 'Regional',
                    attending_dogs: [{ id: 10, position: '' }]
                }
            ])),
            confirmAttendance: vi.fn().mockReturnValue(of({})),
            confirmCompetitionAttendance: vi.fn().mockReturnValue(of({}))
        };

        mockToastService = {
            success: vi.fn(),
            error: vi.fn()
        };

        mockAuthService = {
            getAllUsers: vi.fn().mockResolvedValue([
                { id: 1, name: 'User 1' },
                { id: 2, name: 'User 2' }
            ])
        };

        mockDogService = {
            getAllDogs: vi.fn().mockReturnValue(signal([
                { id: 10, name: 'Rex', users: [{ id: 1 }] },
                { id: 11, name: 'Luna', users: [{ id: 2 }] }
            ])),
            loadAllDogs: vi.fn()
        };

        await TestBed.configureTestingModule({
            providers: [
                { provide: ReservationService, useValue: mockReservationService },
                { provide: ToastService, useValue: mockToastService },
                { provide: AuthService, useValue: mockAuthService },
                { provide: DogService, useValue: mockDogService }
            ]
        });

        TestBed.runInInjectionContext(() => {
            component = new AttendanceVerificationComponent();
        });
    });

    it('should create and load initial data', () => {
        expect(component).toBeTruthy();
        expect(component.pendingSessions().length).toBe(1);
        expect(component.pendingCompetitions().length).toBe(1);
    });

    it('should initialize check states for sessions and competitions', () => {
        // sessions
        const key = component.getSessionKey(component.pendingSessions()[0]);
        expect(component.checkedState.get(key)?.has(101)).toBe(true);
        expect(component.isChecked(component.pendingSessions()[0], 101)).toBe(true);

        // competitions
        expect(component.checkedCompetitionDogs.get(1)?.has(10)).toBe(true);
        expect(component.isCompChecked(1, 10)).toBe(true);
    });

    it('should toggle attendance check state for training session', () => {
        const session = component.pendingSessions()[0];
        
        // Uncheck
        component.toggleCheck(session, 101);
        expect(component.isChecked(session, 101)).toBe(false);

        // Check again
        component.toggleCheck(session, 101);
        expect(component.isChecked(session, 101)).toBe(true);
    });

    it('should add extra attendee to competition', async () => {
        component.selectedUserIdForExtra = 2;
        component.selectedDogIdForExtra = 11;
        component.selectedPositionForExtra = '3';

        component.addExtraAttendee(1);

        const extras = component.getExtraAttendees(1);
        expect(extras.length).toBe(1);
        expect(extras[0].user_id).toBe(2);
        expect(extras[0].dog_id).toBe(11);
        expect(extras[0].position).toBe('3');

        // Verify state reset
        expect(component.selectedUserIdForExtra).toBeNull();
        expect(component.selectedDogIdForExtra).toBeNull();
        expect(component.selectedPositionForExtra).toBe('');
    });

    it('should not add duplicate extra attendee', () => {
        component.selectedUserIdForExtra = 2;
        component.selectedDogIdForExtra = 11;
        component.addExtraAttendee(1);

        // Try again
        component.selectedUserIdForExtra = 2;
        component.selectedDogIdForExtra = 11;
        component.addExtraAttendee(1);

        expect(mockToastService.error).toHaveBeenCalledWith('Ese perro ya ha sido añadido extra');
        expect(component.getExtraAttendees(1).length).toBe(1);
    });

    it('should not add extra attendee if dog is already in original list', () => {
        // Dog 10 is already in original list
        component.selectedUserIdForExtra = 1;
        component.selectedDogIdForExtra = 10;
        component.addExtraAttendee(1);

        expect(mockToastService.error).toHaveBeenCalledWith('Ese perro ya está en la lista de apuntados');
        expect(component.getExtraAttendees(1).length).toBe(0);
    });

    it('should confirm training session attendance', () => {
        const session = component.pendingSessions()[0];
        component.openConfirmModal(session, false);
        
        expect(component.isConfirmModalOpen).toBe(true);
        expect(component.attendeesCountFn).toBe(1); // 1 checked

        component.executeConfirm();

        expect(mockReservationService.confirmAttendance).toHaveBeenCalledWith({
            date: '2026-05-15',
            slot_id: 1,
            attended_ids: [101]
        });

        expect(mockToastService.success).toHaveBeenCalled();
        expect(component.isConfirmModalOpen).toBe(false);
    });

    it('should confirm competition attendance with positions and extra attendees', () => {
        const comp = component.pendingCompetitions()[0];
        
        // Set position for original dog
        component.setDogPosition(comp.id, 10, '1');

        // Add extra dog
        component.selectedUserIdForExtra = 2;
        component.selectedDogIdForExtra = 11;
        component.selectedPositionForExtra = '3';
        component.addExtraAttendee(comp.id);

        component.openConfirmModal(comp, true);
        expect(component.isConfirmModalOpen).toBe(true);
        expect(component.attendeesCountFn).toBe(2); // 1 original + 1 extra

        component.executeConfirm();

        expect(mockReservationService.confirmCompetitionAttendance).toHaveBeenCalledWith({
            competition_id: 1,
            attended_dogs: [{ id: 10, position: '1' }],
            new_attendees: [{ user_id: 2, dog_id: 11, position: '3' }]
        });

        expect(mockToastService.success).toHaveBeenCalled();
        expect(component.isConfirmModalOpen).toBe(false);
    });

    it('should remove extra attendee', () => {
        component.selectedUserIdForExtra = 2;
        component.selectedDogIdForExtra = 11;
        component.addExtraAttendee(1);

        expect(component.getExtraAttendees(1).length).toBe(1);

        component.removeExtraAttendee(1, 11);
        expect(component.getExtraAttendees(1).length).toBe(0);
    });
});
