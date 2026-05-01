/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GestionarHorariosComponent } from './gestionar-horarios.component';
import { TimeSlotService } from '../../services/time-slot.service';
import { ToastService } from '../../services/toast.service';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

describe('GestionarHorariosComponent Logic', () => {
  let component: GestionarHorariosComponent;
  let mockTimeSlotService: any;
  let mockToastService: any;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    mockTimeSlotService = {
      getTimeSlots: vi.fn().mockReturnValue(signal([
        { id: 1, day: 'Lunes', start_time: '10:00', end_time: '11:00', max_bookings: 5, name: 'Clase A' },
        { id: 2, day: 'Martes', start_time: '18:00', end_time: '19:00', max_bookings: 8, name: null }
      ])),
      fetchTimeSlots: vi.fn(),
      addTimeSlot: vi.fn().mockResolvedValue({}),
      updateTimeSlot: vi.fn().mockResolvedValue({}),
      deleteTimeSlot: vi.fn().mockResolvedValue({})
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    await TestBed.configureTestingModule({
      providers: [
        { provide: TimeSlotService, useValue: mockTimeSlotService },
        { provide: ToastService, useValue: mockToastService },
        { provide: ActivatedRoute, useValue: { snapshot: {} } }
      ]
    }).compileComponents();

    TestBed.runInInjectionContext(() => {
      component = new GestionarHorariosComponent();
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should group slots by day and sort them', () => {
    const groups = component.filteredAndGroupedSlots();
    
    expect(groups.length).toBe(2);
    expect(groups[0].day).toBe('Lunes');
    expect(groups[0].slots.length).toBe(1);
    
    expect(groups[1].day).toBe('Martes');
    expect(groups[1].slots.length).toBe(1);
  });

  it('should filter slots by active filter', () => {
    component.toggleFilter('Martes');
    const groups = component.filteredAndGroupedSlots();
    
    expect(groups.length).toBe(1);
    expect(groups[0].day).toBe('Martes');
  });

  it('should open modal for mass creation', () => {
    component.openModal();
    expect(component.isModalOpen).toBe(true);
    expect(component.editingSlot).toBeNull();
    expect(component.slotForm.days).toEqual(['Lunes']);
  });

  it('should open modal for editing specific slot', () => {
    const slotToEdit = { id: 1, day: 'Lunes', start_time: '10:00', end_time: '11:00', max_bookings: 5, name: 'Clase A', club_id: 1, created_at: '', updated_at: '' };
    component.editSlot(slotToEdit);
    
    expect(component.isModalOpen).toBe(true);
    expect(component.editingSlot).toEqual(slotToEdit);
    expect(component.slotForm.days).toEqual(['Lunes']);
    expect(component.slotForm.name).toBe('Clase A');
  });

  it('should toggle day selection for mass creation', () => {
    component.openModal();
    component.toggleDaySelection('Martes');
    expect(component.slotForm.days).toContain('Martes');
    
    component.toggleDaySelection('Martes');
    expect(component.slotForm.days).not.toContain('Martes');
  });

  it('should not allow empty days selection', () => {
    component.openModal();
    component.toggleDaySelection('Lunes');
    expect(component.slotForm.days).toContain('Lunes');
  });

  it('should delete slot when confirmed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    await component.deleteSlot(1);
    
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockTimeSlotService.deleteTimeSlot).toHaveBeenCalledWith(1);
    expect(mockTimeSlotService.fetchTimeSlots).toHaveBeenCalled();
    expect(mockToastService.success).toHaveBeenCalledWith('Horario eliminado.');
  });

  it('should not delete slot when cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    
    await component.deleteSlot(1);
    
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockTimeSlotService.deleteTimeSlot).not.toHaveBeenCalled();
  });

  it('should save edited slot', async () => {
    const slotToEdit = { id: 1, day: 'Lunes', start_time: '10:00', end_time: '11:00', max_bookings: 5, name: 'Clase A', club_id: 1, created_at: '', updated_at: '' };
    component.editSlot(slotToEdit);
    component.slotForm.maxBookings = 10;
    
    await component.saveSlot();
    
    expect(mockTimeSlotService.updateTimeSlot).toHaveBeenCalledWith(1, expect.objectContaining({ max_bookings: 10 }));
    expect(mockTimeSlotService.fetchTimeSlots).toHaveBeenCalled();
    expect(component.isModalOpen).toBe(false);
    expect(mockToastService.success).toHaveBeenCalledWith('Horario actualizado.');
  });

  it('should save multiple slots for mass creation', async () => {
    component.openModal();
    component.slotForm.days = ['Lunes', 'Martes'];
    
    await component.saveSlot();
    
    expect(mockTimeSlotService.addTimeSlot).toHaveBeenCalledTimes(2);
    expect(mockTimeSlotService.fetchTimeSlots).toHaveBeenCalled();
    expect(component.isModalOpen).toBe(false);
  });
});
