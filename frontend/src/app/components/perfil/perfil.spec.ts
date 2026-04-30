import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Perfil } from './perfil';
import { AuthService } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';
import { ImageCompressorService } from '../../services/image-compressor.service';
import { ToastService } from '../../services/toast.service';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

describe('Perfil Component', () => {
    let component: Perfil;
    let fixture: ComponentFixture<Perfil>;
    let mockAuthService: any;
    let mockDogService: any;
    let mockImageCompressor: any;
    let mockToastService: any;

    

    beforeEach(async () => {
        TestBed.resetTestingModule();
        const mockUserSignal = signal({
            id: 1,
            name: 'Test User',
            displayName: 'Test User',
            email: 'test@example.com',
            role: 'user',
            rfec_license: 'LIC-123',
            rfec_expiration_date: '2025-12-31T00:00:00.000000Z'
        });

        mockAuthService = {
            currentUserSignal: mockUserSignal,
            userProfileSignal: mockUserSignal,
            updateProfileCalledWith: null,
            updateProfile: async function(...args: any[]) {
                this.updateProfileCalledWith = args;
            }
        };

        mockDogService = {
            getDogs: () => signal([]),
            loadUserDogs: () => {}
        };

        mockImageCompressor = {
            compress: async () => {}
        };

        mockToastService = {
            successCalledWith: null,
            success: function(msg: string) {
                this.successCalledWith = msg;
            },
            error: () => {}
        };

        await TestBed.configureTestingModule({
            imports: [Perfil],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService },
                { provide: DogService, useValue: mockDogService },
                { provide: ImageCompressorService, useValue: mockImageCompressor },
                { provide: ToastService, useValue: mockToastService }
            ]
        }).compileComponents();
        
        fixture = TestBed.createComponent(Perfil);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should render user data', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Test User');
        expect(compiled.textContent).toContain('LIC-123');
        expect(compiled.textContent).toContain('31/12/2025');
    });

    it('should allow editing and saving name', async () => {
        component.toggleEditName();
        fixture.detectChanges();

        component.editedName.set('New Name');
        await component.saveName();

        expect(mockAuthService.updateProfileCalledWith[0]).toBe('New Name');
        expect(mockToastService.successCalledWith).toBe('Nombre actualizado correctamente');
    });

    it('should allow editing and saving RFEC data', async () => {
        component.toggleEditRfec();
        fixture.detectChanges();

        component.rfecData = { license: 'LIC-999', expiration: '2026-01-01' };
        await component.saveRfec();

        expect(mockAuthService.updateProfileCalledWith[0]).toBe('Test User');
        expect(mockAuthService.updateProfileCalledWith[2]).toBe('LIC-999');
        expect(mockAuthService.updateProfileCalledWith[3]).toBe('2026-01-01');
        expect(mockToastService.successCalledWith).toBe('Licencia RFEC actualizada');
    });
});
