import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';

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

    loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]]
    });

    isLoading = signal(false);
    errorMessage = signal('');

    constructor() { }

    login() {
        if (this.loginForm.invalid) return;

        this.isLoading.set(true);
        this.errorMessage.set('');

        const { email, password } = this.loginForm.value;

        this.authService.login({ email: email!, password: password! }).subscribe({
            next: () => {
                this.isLoading.set(false);
                // Navigation is handled in AuthService
            },
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);
                this.errorMessage.set('Email o contraseña incorrectos.');
            }
        });
    }

    logout() {
        this.authService.logout();
    }
}

