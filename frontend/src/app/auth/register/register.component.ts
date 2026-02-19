import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './register.component.html',
    styleUrl: './register.component.css'
})
export class RegisterComponent {
    authService = inject(AuthService);
    private fb = inject(FormBuilder);
    private router = inject(Router);

    registerForm = this.fb.group({
        name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]]
    });

    isLoading = signal(false);
    errorMessage = signal('');

    constructor() { }

    onSubmit() {
        if (this.registerForm.invalid) return;

        const { name, email, password, confirmPassword } = this.registerForm.value;

        if (password !== confirmPassword) {
            this.errorMessage.set('Las contraseñas no coinciden.');
            return;
        }

        this.isLoading.set(true);
        this.errorMessage.set('');

        this.authService.register({ name: name!, email: email!, password: password! }).subscribe({
            next: () => {
                this.isLoading.set(false);
                // Navigation is handled in AuthService, but we can do it here too if needed
            },
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);
                if (err.status === 422) {
                    this.errorMessage.set('El email ya está registrado o los datos son inválidos.');
                } else {
                    this.errorMessage.set('Error al registrar. Inténtalo de nuevo.');
                }
            }
        });
    }
}
