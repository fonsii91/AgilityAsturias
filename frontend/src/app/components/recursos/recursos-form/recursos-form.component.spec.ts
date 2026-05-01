import { describe, it, expect, vitest, beforeEach } from 'vitest';
import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RecursosFormComponent } from './recursos-form.component';
import { ResourceService } from '../../../services/resource.service';
import { of, throwError } from 'rxjs';

describe('RecursosFormComponent', () => {
  let component: RecursosFormComponent;
  let resourceServiceSpy: any;
  let routerSpy: any;
  let routeSpy: any;

  beforeEach(() => {
    resourceServiceSpy = {
      getResources: vitest.fn().mockReturnValue(of([
        { id: 1, title: 'Doc 1', type: 'document', category: 'General', level: 'all', file_path: 'path1' }
      ])),
      createResource: vitest.fn().mockReturnValue(of({})),
      updateResource: vitest.fn().mockReturnValue(of({}))
    };

    routerSpy = {
      navigate: vitest.fn()
    };

    routeSpy = {
      snapshot: {
        paramMap: {
          get: vitest.fn().mockReturnValue(null) // Not editing by default
        }
      }
    };

    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: ResourceService, useValue: resourceServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: routeSpy }
      ]
    });

    const injector = TestBed.inject(EnvironmentInjector);
    const fb = TestBed.inject(FormBuilder);
    
    runInInjectionContext(injector, () => {
      component = new RecursosFormComponent(fb, resourceServiceSpy, routerSpy, routeSpy);
      component.ngOnInit();
    });
  });

  it('should initialize the form with default values', () => {
    expect(component.resourceForm).toBeDefined();
    expect(component.resourceForm.get('title')?.value).toBe('');
    expect(component.resourceForm.get('type')?.value).toBe('document');
  });

  it('should patch values if id is present in route', () => {
    routeSpy.snapshot.paramMap.get.mockReturnValue('1');
    const injector = TestBed.inject(EnvironmentInjector);
    const fb = TestBed.inject(FormBuilder);
    
    runInInjectionContext(injector, () => {
      component = new RecursosFormComponent(fb, resourceServiceSpy, routerSpy, routeSpy);
      component.ngOnInit();
    });

    expect(component.isEditing()).toBe(true);
    expect(component.resourceId()).toBe(1);
    expect(component.resourceForm.get('title')?.value).toBe('Doc 1');
  });

  it('should change url validators based on type', () => {
    const typeControl = component.resourceForm.get('type');
    const urlControl = component.resourceForm.get('url');

    typeControl?.setValue('video');
    expect(urlControl?.hasValidator).toBeTruthy();
    expect(urlControl?.valid).toBe(false); // Required now

    typeControl?.setValue('document');
    expect(urlControl?.valid).toBe(true); // No longer required
  });

  it('should handle file selection', () => {
    const mockFile = new File([''], 'test.pdf', { type: 'application/pdf' });
    const mockEvent = { target: { files: [mockFile] } };
    
    component.onFileSelected(mockEvent);
    expect(component.selectedFile()).toBe(mockFile);
  });

  it('should not submit if form is invalid', () => {
    component.onSubmit();
    expect(resourceServiceSpy.createResource).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
  });

  it('should submit valid form to createResource', () => {
    component.resourceForm.patchValue({
      title: 'New Doc',
      type: 'document',
      category: 'General',
      level: 'all'
    });
    
    const mockFile = new File([''], 'test.pdf', { type: 'application/pdf' });
    component.selectedFile.set(mockFile);

    component.onSubmit();

    expect(component.isSubmitting()).toBe(true);
    expect(resourceServiceSpy.createResource).toHaveBeenCalled();
    const args = resourceServiceSpy.createResource.mock.calls[0][0]; // FormData
    expect(args.get('title')).toBe('New Doc');
    expect(args.get('type')).toBe('document');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/recursos']);
  });

  it('should submit valid form to updateResource when editing', () => {
    component.isEditing.set(true);
    component.resourceId.set(1);
    
    component.resourceForm.patchValue({
      title: 'Updated Doc',
      type: 'document',
      category: 'General',
      level: 'all'
    });

    component.onSubmit();

    expect(resourceServiceSpy.updateResource).toHaveBeenCalledWith(1, expect.any(FormData));
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/recursos']);
  });

  it('should handle submit errors gracefully', () => {
    vitest.useFakeTimers();
    resourceServiceSpy.createResource.mockReturnValue(throwError(() => new Error('Error')));
    
    component.resourceForm.patchValue({
      title: 'New Doc',
      type: 'document',
      category: 'General',
      level: 'all'
    });

    component.onSubmit();

    expect(component.isSubmitting()).toBe(true);
    vitest.runAllTimers(); // clear setTimeout
    expect(component.isSubmitting()).toBe(false);
    vitest.useRealTimers();
  });
});
