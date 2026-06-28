import { Component, inject, signal, computed, effect, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { TenantService } from '../../services/tenant.service';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent {
    authService = inject(AuthService);
    private fb = inject(FormBuilder);
    private router = inject(Router);
    tenantService = inject(TenantService);
    analyticsService = inject(AnalyticsService);
    clubConfig = environment.clubConfig;
    clubName = computed(() => this.tenantService.tenantInfo()?.name || this.clubConfig.name);

    loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]]
    });

    isLoading = signal(false);
    errorMessage = signal('');

    // Referencias a los inputs nativos para rescatar valores autocompletados
    // por el navegador (Brave/Safari en iOS) que no disparan el evento `input`.
    emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
    passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');

    constructor() {
        effect(() => {
            if (!this.authService.checkAuthLoading() && this.authService.isLoggedIn()) {
                this.router.navigate(['/calendario']);
            }
        });
    }

    login() {
        // Rescatamos del DOM los valores que el autocompletado/gestor de
        // contraseñas (Brave/Safari en iOS) rellena visualmente pero sin
        // disparar el evento `input`, dejando las FormControl vacías.
        const domEmail = this.emailInput()?.nativeElement.value ?? '';
        const domPassword = this.passwordInput()?.nativeElement.value ?? '';
        if (domEmail && domEmail !== this.loginForm.controls.email.value) {
            this.loginForm.controls.email.setValue(domEmail);
        }
        if (domPassword && domPassword !== this.loginForm.controls.password.value) {
            this.loginForm.controls.password.setValue(domPassword);
        }

        // Normalizamos el email: los teclados móviles y el autocompletado del
        // navegador suelen dejar un espacio sobrante que invalida Validators.email.
        const rawEmail = this.loginForm.value.email ?? '';
        const trimmedEmail = rawEmail.trim();
        if (trimmedEmail !== rawEmail) {
            this.loginForm.controls.email.setValue(trimmedEmail);
        }

        if (this.loginForm.invalid) {
            // Botón siempre pulsable: en vez de no hacer nada, avisamos de qué falta.
            this.loginForm.markAllAsTouched();
            const emailCtrl = this.loginForm.controls.email;
            const passCtrl = this.loginForm.controls.password;
            if (emailCtrl.hasError('required')) {
                this.errorMessage.set('Introduce tu correo electrónico.');
            } else if (emailCtrl.hasError('email')) {
                this.errorMessage.set('El correo electrónico no tiene un formato válido.');
            } else if (passCtrl.hasError('required')) {
                this.errorMessage.set('Introduce tu contraseña.');
            } else {
                this.errorMessage.set('Revisa los datos del formulario.');
            }
            return;
        }

        this.isLoading.set(true);
        this.errorMessage.set('');

        const { email, password } = this.loginForm.value;

        this.authService.login({ email: email!, password: password! }).subscribe({
            next: () => {
                this.analyticsService.logLogin();
                this.isLoading.set(false);
                // Navigation is handled in AuthService
            },
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);

                // Extract custom error message from backend if available
                if (err.error && err.error.message) {
                    this.errorMessage.set(err.error.message);
                } else {
                    this.errorMessage.set('Email o contraseña incorrectos o error en el servidor.');
                }
            }
        });
    }

    logout() {
        this.authService.logout();
    }
}

