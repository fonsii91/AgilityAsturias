/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReservaPistasComponent } from './reserva-pistas.component';
import { TrackReservationService } from '../../services/track-reservation.service';
import { ToastService } from '../../services/toast.service';
import { ActivatedRoute } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

describe('ReservaPistasComponent Logic', () => {
  let component: ReservaPistasComponent;
  let mockService: any;
  let mockToastService: any;
  let mockDialog: any;

  const availability = {
    date: '2099-01-04',
    tracks: [
      {
        id: 1,
        name: 'Pista de entrenamiento',
        surface: 'otro',
        photo_url: null,
        slots: [
          { start_time: '10:00', end_time: '11:00', status: 'free' },
          { start_time: '11:00', end_time: '12:00', status: 'class', class_name: 'Iniciación' },
          { start_time: '12:00', end_time: '13:00', status: 'booked', reservation_id: 7, reserved_by: 'Otro Socio' },
          { start_time: '13:00', end_time: '14:00', status: 'mine', reservation_id: 8 }
        ]
      }
    ]
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    mockService = {
      getAvailability: vi.fn().mockResolvedValue(availability),
      getMyReservations: vi.fn().mockResolvedValue([]),
      reserve: vi.fn().mockResolvedValue({}),
      cancel: vi.fn().mockResolvedValue(undefined)
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn()
    };

    mockDialog = {
      open: vi.fn().mockReturnValue({ afterClosed: () => of(true) })
    };

    await TestBed.configureTestingModule({
      providers: [
        { provide: TrackReservationService, useValue: mockService },
        { provide: ToastService, useValue: mockToastService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: ActivatedRoute, useValue: { snapshot: {} } }
      ]
    }).compileComponents();

    TestBed.runInInjectionContext(() => {
      component = new ReservaPistasComponent();
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build 7 days starting today and load availability on init', async () => {
    component.ngOnInit();
    await new Promise((resolve) => setTimeout(resolve));

    expect(component.days.length).toBe(7);
    expect(component.days[0].dayName).toBe('Hoy');
    expect(component.selectedDate()).toBe(component.days[0].date);
    expect(mockService.getAvailability).toHaveBeenCalledWith(component.days[0].date);
    expect(component.tracks().length).toBe(1);
  });

  it('should reload availability when changing the selected day', async () => {
    component.ngOnInit();
    await new Promise((resolve) => setTimeout(resolve));

    component.selectDate(component.days[2].date);
    await new Promise((resolve) => setTimeout(resolve));

    expect(component.selectedDate()).toBe(component.days[2].date);
    expect(mockService.getAvailability).toHaveBeenCalledWith(component.days[2].date);
  });

  it('should reserve a free slot after confirmation', async () => {
    component.ngOnInit();
    await new Promise((resolve) => setTimeout(resolve));
    // Día futuro para que la franja no cuente como pasada
    component.selectedDate.set('2099-01-04');

    const track = component.tracks()[0];
    component.onSlotClick(track, track.slots[0]); // 10:00 free
    await new Promise((resolve) => setTimeout(resolve));

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockService.reserve).toHaveBeenCalledWith(1, '2099-01-04', '10:00');
    expect(mockToastService.success).toHaveBeenCalled();
  });

  it('should not reserve slots occupied by a class or another member', async () => {
    component.ngOnInit();
    await new Promise((resolve) => setTimeout(resolve));
    component.selectedDate.set('2099-01-04');

    const track = component.tracks()[0];
    component.onSlotClick(track, track.slots[1]); // class
    component.onSlotClick(track, track.slots[2]); // booked

    expect(mockDialog.open).not.toHaveBeenCalled();
    expect(mockService.reserve).not.toHaveBeenCalled();
  });

  it('should cancel own reservation after confirmation', async () => {
    component.ngOnInit();
    await new Promise((resolve) => setTimeout(resolve));
    component.selectedDate.set('2099-01-04');

    const track = component.tracks()[0];
    component.onSlotClick(track, track.slots[3]); // mine
    await new Promise((resolve) => setTimeout(resolve));

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockService.cancel).toHaveBeenCalledWith(8);
    expect(mockToastService.success).toHaveBeenCalled();
  });

  it('should mark past slots of today as not reservable', () => {
    component.ngOnInit();
    const today = component.days[0].date;
    component.selectedDate.set(today);

    expect(component.isPast({ start_time: '00:00', end_time: '01:00', status: 'free' })).toBe(true);
    expect(component.isPast({ start_time: '23:59', end_time: '24:00', status: 'free' })).toBe(false);
  });
});
