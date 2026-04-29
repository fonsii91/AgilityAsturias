/**
 * @vitest-environment jsdom
 */
import 'zone.js';
import 'zone.js/testing';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { MisReservasComponent } from './mis-reservas.component';
import { ReservationService } from '../../services/reservation.service';
import { AuthService } from '../../services/auth.service';
import { TenantService } from '../../services/tenant.service';
import { signal } from '@angular/core';
import { Reservation } from '../../models/reservation.model';
import { CommonModule } from '@angular/common';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

describe('MisReservasComponent Logic', () => {
    let component: MisReservasComponent;

    let mockReservationService: any;
    let mockAuthService: any;
    let mockTenantService: any;

    let currentUserSignal: any;
    let reservationsSignal: any;

    beforeAll(() => {
        try {
            TestBed.resetTestEnvironment();
            TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
        } catch (e) {}
    });

    beforeEach(async () => {
        TestBed.resetTestingModule();
        currentUserSignal = signal({ id: 1, name: 'Test User' });
        
        const mockDate = new Date().toISOString().split('T')[0];
        
        reservationsSignal = signal<Reservation[]>([
            { id: 101, userId: 1, date: mockDate, startTime: '10:00:00', dog: { id: 10, name: 'Rex' }, status: 'active' } as any,
            { id: 102, userId: 1, date: mockDate, startTime: '10:00:00', dog: { id: 11, name: 'Max' }, status: 'active' } as any,
            { id: 103, userId: 2, date: mockDate, startTime: '11:00:00', dog: { id: 12, name: 'Buddy' }, status: 'active' } as any,
            { id: 104, userId: 1, date: '2099-01-01', startTime: '09:00:00', dog: { id: 10, name: 'Rex' }, status: 'active' } as any
        ]);

        mockReservationService = { getReservations: () => reservationsSignal };
        mockAuthService = { currentUserSignal: currentUserSignal };
        mockTenantService = { tenantInfo: signal({ name: 'Club Test' }) };

        await TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: ReservationService, useValue: mockReservationService },
                { provide: AuthService, useValue: mockAuthService },
                { provide: TenantService, useValue: mockTenantService }
            ]
        }).compileComponents();
        
        // Use runInInjectionContext to instantiate the component directly without TestBed compilation of imports
        TestBed.runInInjectionContext(() => {
            component = new MisReservasComponent();
            component.todayStr = mockDate;
        });
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should filter reservations for current user only', () => {
        const myRes = component.myReservations();
        expect(myRes.length).toBe(3);
        expect(myRes.find(r => r.id === 103)).toBeUndefined();
    });

    it('should group todays reservations by time correctly', () => {
        const todaySlots = component.todayTimeSlots();
        expect(todaySlots.length).toBe(1);
        expect(todaySlots[0].time).toBe('10:00:00');
        expect(todaySlots[0].dogs).toContain('Rex');
        expect(todaySlots[0].dogs).toContain('Max');
    });

    it('should group future reservations correctly', () => {
        const futureSlots = component.futureReservationsGrouped();
        expect(futureSlots.length).toBe(1);
        expect(futureSlots[0].date).toBe('2099-01-01');
        expect(futureSlots[0].totalCount).toBe(1);
        expect(futureSlots[0].timeSlots[0].time).toBe('09:00:00');
        expect(futureSlots[0].timeSlots[0].dogs).toContain('Rex');
    });
});
