/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vitest, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CrearAnuncioComponent } from './crear-anuncio.component';
import { AnnouncementService } from '../../../services/announcement.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('CrearAnuncioComponent', () => {
  let component: CrearAnuncioComponent;
  let announcementServiceSpy: any;
  let authServiceSpy: any;
  let toastServiceSpy: any;
  let routerSpy: any;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    announcementServiceSpy = {
      createAnnouncement: vitest.fn().mockReturnValue(of({}))
    };

    authServiceSpy = {
      getMinimalUsers: vitest.fn().mockResolvedValue([
        { id: 1, name: 'User One' },
        { id: 2, name: 'User Two' }
      ])
    };

    toastServiceSpy = {
      success: vitest.fn(),
      error: vitest.fn()
    };

    routerSpy = {
      navigate: vitest.fn()
    };

    await TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: AnnouncementService, useValue: announcementServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    TestBed.runInInjectionContext(() => {
      component = new CrearAnuncioComponent(
        TestBed.inject(FormBuilder),
        TestBed.inject(AnnouncementService),
        TestBed.inject(AuthService),
        TestBed.inject(ToastService),
        TestBed.inject(Router)
      );
    });
  });

  it('should initialize the form correctly', () => {
    expect(component.announcementForm).toBeDefined();
    expect(component.announcementForm.get('title')?.value).toBe('');
    expect(component.announcementForm.get('content')?.value).toBe('');
    expect(component.announcementForm.get('category')?.value).toBe('General');
  });

  it('should load users on init', async () => {
    await component.ngOnInit();
    expect(authServiceSpy.getMinimalUsers).toHaveBeenCalled();
    expect(component.usersList().length).toBe(2);
  });

  it('should toggle users in selectedUsers', () => {
    expect(component.selectedUsers().size).toBe(0);
    component.toggleUser(1);
    expect(component.selectedUsers().has(1)).toBe(true);
    component.toggleUser(1);
    expect(component.selectedUsers().has(1)).toBe(false);
  });

  it('should not submit if form is invalid', () => {
    component.onSubmit();
    expect(announcementServiceSpy.createAnnouncement).not.toHaveBeenCalled();
  });

  it('should submit and navigate on success', () => {
    component.announcementForm.patchValue({
      title: 'New Announcement',
      content: 'Important content',
      category: 'Importante'
    });

    component.setNotifyType('all');
    component.onSubmit();

    expect(announcementServiceSpy.createAnnouncement).toHaveBeenCalledWith({
      title: 'New Announcement',
      content: 'Important content',
      category: 'Importante',
      notify_all: true
    });
    expect(toastServiceSpy.success).toHaveBeenCalledWith('Anuncio publicado espectacularmente');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/tablon-anuncios']);
    expect(component.isSubmitting()).toBe(false);
  });

  it('should submit with specific users notification', () => {
    component.announcementForm.patchValue({
      title: 'New Announcement',
      content: 'Important content',
      category: 'Importante'
    });

    component.setNotifyType('specific');
    component.toggleUser(1);
    component.onSubmit();

    expect(announcementServiceSpy.createAnnouncement).toHaveBeenCalledWith({
      title: 'New Announcement',
      content: 'Important content',
      category: 'Importante',
      notify_users: [1]
    });
  });

  it('should handle submission errors', () => {
    announcementServiceSpy.createAnnouncement.mockReturnValue(throwError(() => new Error('API Error')));

    component.announcementForm.patchValue({
      title: 'Error Test',
      content: 'Will fail',
      category: 'General'
    });

    component.onSubmit();

    expect(toastServiceSpy.error).toHaveBeenCalledWith('Error al publicar el anuncio');
    expect(component.isSubmitting()).toBe(false);
  });
});
