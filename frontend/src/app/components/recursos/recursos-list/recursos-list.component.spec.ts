import { describe, it, expect, vitest, beforeEach } from 'vitest';
import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RecursosListComponent } from './recursos-list.component';
import { ResourceService } from '../../../services/resource.service';
import { AuthService } from '../../../services/auth.service';
import { of } from 'rxjs';

describe('RecursosListComponent', () => {
  let component: RecursosListComponent;
  let resourceServiceSpy: any;
  let authServiceSpy: any;

  beforeEach(() => {
    resourceServiceSpy = {
      getResources: vitest.fn().mockReturnValue(of([
        { id: 1, title: 'Doc 1', type: 'document', category: 'General', level: 'all', file_path: 'path1', is_global: false },
        { id: 2, title: 'Link 1', type: 'link', category: 'Reglamentos', level: 'advanced', url: 'http://example.com', is_global: true }
      ])),
      deleteResource: vitest.fn().mockReturnValue(of({})),
      toggleGlobal: vitest.fn().mockReturnValue(of({ id: 1, title: 'Doc 1', type: 'document', category: 'General', level: 'all', file_path: 'path1', is_global: true }))
    };

    authServiceSpy = {
      isStaff: vitest.fn().mockReturnValue(false),
      isAdmin: vitest.fn().mockReturnValue(false)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ResourceService, useValue: resourceServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    const injector = TestBed.inject(EnvironmentInjector);
    runInInjectionContext(injector, () => {
      component = new RecursosListComponent(resourceServiceSpy, authServiceSpy);
      component.ngOnInit();
    });
  });

  it('should create and load resources on init', () => {
    expect(component).toBeTruthy();
    expect(resourceServiceSpy.getResources).toHaveBeenCalledWith('', 'all');
    expect(component.resources().length).toBe(2);
    expect(component.isLoading()).toBe(false);
  });

  it('should reload resources when category changes', () => {
    component.selectedCategory.set('Reglamentos');
    component.onCategoryChange();
    expect(resourceServiceSpy.getResources).toHaveBeenCalledWith('Reglamentos', 'all');
  });

  it('should reload resources when level changes', () => {
    component.selectedLevel.set('advanced');
    component.onLevelChange();
    expect(resourceServiceSpy.getResources).toHaveBeenCalledWith('', 'advanced');
  });

  it('should return correct icon for type', () => {
    expect(component.getIconForType('document')).toBe('description');
    expect(component.getIconForType('video')).toBe('play_circle');
    expect(component.getIconForType('link')).toBe('link');
    expect(component.getIconForType('unknown')).toBe('insert_drive_file');
  });

  it('should allow staff to delete resources', () => {
    vitest.spyOn(window, 'confirm').mockReturnValue(true);
    const mockEvent = new Event('click');
    vitest.spyOn(mockEvent, 'stopPropagation');
    
    component.deleteResource(mockEvent, { id: 1, title: 'Doc 1', type: 'document', category: 'General', level: 'all' } as any);
    
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(resourceServiceSpy.deleteResource).toHaveBeenCalledWith(1);
    expect(resourceServiceSpy.getResources).toHaveBeenCalledTimes(2); // Once on init, once after delete
  });

  it('should return true for isAdmin if user is admin', () => {
    authServiceSpy.isAdmin.mockReturnValue(true);
    expect(component.isAdmin()).toBe(true);
  });

  it('should return false for isAdmin if user is not admin', () => {
    authServiceSpy.isAdmin.mockReturnValue(false);
    expect(component.isAdmin()).toBe(false);
  });

  it('should not allow toggleGlobal if not admin', () => {
    authServiceSpy.isAdmin.mockReturnValue(false);
    const mockEvent = new Event('click');
    vitest.spyOn(mockEvent, 'stopPropagation');
    
    component.toggleGlobal(mockEvent, { id: 1 } as any);
    
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(resourceServiceSpy.toggleGlobal).not.toHaveBeenCalled();
  });

  it('should allow toggleGlobal if admin and update resource in list', () => {
    authServiceSpy.isAdmin.mockReturnValue(true);
    const mockEvent = new Event('click');
    vitest.spyOn(mockEvent, 'stopPropagation');
    
    component.toggleGlobal(mockEvent, { id: 1 } as any);
    
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(resourceServiceSpy.toggleGlobal).toHaveBeenCalledWith(1);
    
    const resources = component.resources();
    expect(resources[0].is_global).toBe(true); // Should be updated locally
  });
});
