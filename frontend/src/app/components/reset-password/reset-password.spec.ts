
import { getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';



import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResetPasswordComponent } from './reset-password';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let authServiceMock: any;
  let activatedRouteMock: any;

  beforeEach(async () => {
    authServiceMock = {
      resetPassword: vi.fn()
    };

    activatedRouteMock = {
      queryParams: of({ token: 'test-token-123' })
    };

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and read token from URL', () => {
    expect(component).toBeTruthy();
    expect(component.token()).toBe('test-token-123');
  });

  it('should invalidate form if passwords do not match', () => {
    component.resetForm.controls['password'].setValue('password123');
    component.resetForm.controls['password_confirmation'].setValue('different');
    
    expect(component.resetForm.invalid).toBe(true);
    expect(component.resetForm.hasError('mismatch')).toBe(true);
  });

  it('should validate form if passwords match', () => {
    component.resetForm.controls['password'].setValue('password123');
    component.resetForm.controls['password_confirmation'].setValue('password123');
    
    expect(component.resetForm.valid).toBe(true);
  });

  it('should call authService.resetPassword on valid form submission', async () => {
    authServiceMock.resetPassword.mockResolvedValue({ message: 'Success' });
    
    component.resetForm.controls['password'].setValue('password123');
    component.resetForm.controls['password_confirmation'].setValue('password123');
    
    await component.onSubmit();
    
    expect(authServiceMock.resetPassword).toHaveBeenCalledWith({
      token: 'test-token-123',
      password: 'password123',
      password_confirmation: 'password123'
    });
    
    expect(component.successMessage()).toBe('Success');
    expect(component.isLoading()).toBe(false);
  });

  it('should display error message on API failure', async () => {
    authServiceMock.resetPassword.mockRejectedValue({
      error: { message: 'Invalid token' }
    });
    
    component.resetForm.controls['password'].setValue('password123');
    component.resetForm.controls['password_confirmation'].setValue('password123');
    
    await component.onSubmit();
    
    expect(component.errorMessage()).toBe('Invalid token');
    expect(component.isLoading()).toBe(false);
  });
});

describe('ResetPasswordComponent without token', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show error if token is missing', () => {
    expect(component.token()).toBe('');
    expect(component.errorMessage()).toContain('Token no encontrado');
  });
});
