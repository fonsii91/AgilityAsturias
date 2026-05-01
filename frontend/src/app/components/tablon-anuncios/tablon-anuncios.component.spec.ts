/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vitest, beforeEach, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TablonAnunciosComponent } from './tablon-anuncios.component';
import { AnnouncementService } from '../../services/announcement.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';

describe('TablonAnunciosComponent', () => {
  let component: TablonAnunciosComponent;
  let announcementServiceSpy: any;
  let authServiceSpy: any;
  let toastServiceSpy: any;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    
    announcementServiceSpy = {
      getAnnouncements: vitest.fn().mockReturnValue(of([
        { id: 1, title: 'Test 1', content: 'Content 1', is_pinned: true, category: 'Importante', created_at: new Date().toISOString(), reads_count: 0 },
        { id: 2, title: 'Test 2', content: 'Content 2', is_pinned: false, category: 'General', created_at: new Date().toISOString(), reads_count: 0 }
      ])),
      deleteAnnouncement: vitest.fn().mockReturnValue(of({})),
      markAsRead: vitest.fn().mockReturnValue(of({}))
    };

    authServiceSpy = {
      isAdmin: vitest.fn().mockReturnValue(false),
      isStaff: vitest.fn().mockReturnValue(false)
    };

    toastServiceSpy = {
      success: vitest.fn(),
      error: vitest.fn()
    };

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AnnouncementService, useValue: announcementServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    TestBed.runInInjectionContext(() => {
      component = new TablonAnunciosComponent(
        TestBed.inject(AnnouncementService),
        TestBed.inject(ToastService)
      );
      component.ngOnInit();
    });
  });

  it('should create and load announcements', () => {
    expect(component).toBeTruthy();
    expect(announcementServiceSpy.getAnnouncements).toHaveBeenCalled();
    expect(component.announcements().length).toBe(2);
    expect(component.isLoading()).toBe(false);
  });

  it('should filter announcements by search query', () => {
    component.searchQuery.set('Test 2');
    expect(component.displayedAnnouncements().length).toBe(1);
    expect(component.displayedAnnouncements()[0].title).toBe('Test 2');
  });

  it('should filter announcements by category', () => {
    component.setCategory('Importante');
    expect(component.displayedAnnouncements().length).toBe(1);
    expect(component.displayedAnnouncements()[0].title).toBe('Test 1');
  });

  it('should allow admin to delete an announcement', () => {
    authServiceSpy.isAdmin.mockReturnValue(true);
    // Reinicializar componente para que recoja el rol admin
    TestBed.runInInjectionContext(() => {
        component = new TablonAnunciosComponent(
            TestBed.inject(AnnouncementService),
            TestBed.inject(ToastService)
        );
        component.ngOnInit();
    });
    
    vitest.spyOn(window, 'confirm').mockReturnValue(true);
    
    component.deleteAnnouncement(1);
    
    expect(announcementServiceSpy.deleteAnnouncement).toHaveBeenCalledWith(1);
    expect(toastServiceSpy.success).toHaveBeenCalledWith('Anuncio eliminado');
    expect(component.announcements().length).toBe(1);
  });

  it('should not allow deletion if not admin', () => {
    component.canManage = false;
    vitest.spyOn(window, 'confirm').mockReturnValue(true);
    
    component.deleteAnnouncement(1);
    
    expect(announcementServiceSpy.deleteAnnouncement).not.toHaveBeenCalled();
  });

  it('should toggle expanded state', () => {
    expect(component.isExpanded(1)).toBe(false);
    component.toggleExpand(1);
    expect(component.isExpanded(1)).toBe(true);
    component.toggleExpand(1);
    expect(component.isExpanded(1)).toBe(false);
  });
});
