/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GestionarPistasComponent } from './gestionar-pistas.component';
import { TrainingTrackService } from '../../services/training-track.service';
import { ToastService } from '../../services/toast.service';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

describe('GestionarPistasComponent Logic', () => {
  let component: GestionarPistasComponent;
  let mockTrackService: any;
  let mockToastService: any;
  let mockDialog: any;
  let tracksSignal: any;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    tracksSignal = signal([
      { id: 1, name: 'Pista de entrenamiento', surface: 'otro', photo_url: null },
      { id: 2, name: 'Pista exterior', surface: 'cesped', photo_url: null }
    ]);

    mockTrackService = {
      getTracks: vi.fn().mockReturnValue(tracksSignal),
      fetchTracks: vi.fn(),
      addTrack: vi.fn().mockResolvedValue({}),
      updateTrack: vi.fn().mockResolvedValue({}),
      deleteTrack: vi.fn().mockResolvedValue(undefined)
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
        { provide: TrainingTrackService, useValue: mockTrackService },
        { provide: ToastService, useValue: mockToastService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: ActivatedRoute, useValue: { snapshot: {} } }
      ]
    }).compileComponents();

    TestBed.runInInjectionContext(() => {
      component = new GestionarPistasComponent();
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch tracks on init', () => {
    component.ngOnInit();
    expect(mockTrackService.fetchTracks).toHaveBeenCalled();
  });

  it('should open modal for creation with defaults', () => {
    component.openModal();
    expect(component.isModalOpen).toBe(true);
    expect(component.editingTrack).toBeNull();
    expect(component.trackForm.name).toBe('');
    expect(component.trackForm.surface).toBe('tierra');
  });

  it('should open modal for editing with track data', () => {
    const track = { id: 2, name: 'Pista exterior', surface: 'cesped' as const, photo_url: null };
    component.openModal(track);

    expect(component.isModalOpen).toBe(true);
    expect(component.editingTrack).toEqual(track);
    expect(component.trackForm.name).toBe('Pista exterior');
    expect(component.trackForm.surface).toBe('cesped');
  });

  it('should not save a track without name', async () => {
    component.openModal();
    component.trackForm.name = '   ';

    await component.saveTrack();

    expect(mockTrackService.addTrack).not.toHaveBeenCalled();
    expect(mockToastService.warning).toHaveBeenCalled();
  });

  it('should create a new track', async () => {
    component.openModal();
    component.trackForm.name = 'Pista cubierta';
    component.trackForm.surface = 'cesped_artificial';

    await component.saveTrack();

    expect(mockTrackService.addTrack).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Pista cubierta',
      surface: 'cesped_artificial'
    }));
    expect(component.isModalOpen).toBe(false);
    expect(mockToastService.success).toHaveBeenCalledWith('Pista creada.');
  });

  it('should update an existing track', async () => {
    const track = { id: 2, name: 'Pista exterior', surface: 'cesped' as const, photo_url: null };
    component.openModal(track);
    component.trackForm.name = 'Pista exterior renovada';

    await component.saveTrack();

    expect(mockTrackService.updateTrack).toHaveBeenCalledWith(2, expect.objectContaining({
      name: 'Pista exterior renovada'
    }));
    expect(mockToastService.success).toHaveBeenCalledWith('Pista actualizada.');
  });

  it('should delete a track when confirmed', async () => {
    component.deleteTrack({ id: 2, name: 'Pista exterior', surface: 'cesped', photo_url: null });
    await new Promise((resolve) => setTimeout(resolve)); // flush async subscribe callback

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockTrackService.deleteTrack).toHaveBeenCalledWith(2);
    expect(mockToastService.success).toHaveBeenCalledWith('Pista eliminada.');
  });

  it('should block deleting the last remaining track', () => {
    tracksSignal.set([{ id: 1, name: 'Pista de entrenamiento', surface: 'otro', photo_url: null }]);

    component.deleteTrack({ id: 1, name: 'Pista de entrenamiento', surface: 'otro', photo_url: null });

    expect(mockDialog.open).not.toHaveBeenCalled();
    expect(mockTrackService.deleteTrack).not.toHaveBeenCalled();
    expect(mockToastService.warning).toHaveBeenCalled();
  });
});
