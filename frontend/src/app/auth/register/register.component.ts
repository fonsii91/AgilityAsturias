import { Component, inject, signal, computed } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { TenantService } from '../../services/tenant.service';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './register.component.html',
    styleUrl: './register.component.css'
})
export class RegisterComponent {
    authService = inject(AuthService);
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    tenantService = inject(TenantService);
    analyticsService = inject(AnalyticsService);
    clubConfig = environment.clubConfig;
    clubName = computed(() => this.tenantService.tenantInfo()?.name || this.clubConfig.name);

    registerForm = this.fb.group({
        name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]]
    });

    isLoading = signal(false);
    errorMessage = signal('');
    inviteToken: string | null = null;

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            if (params['invite']) {
                this.inviteToken = params['invite'];
            }
        });
    }

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

        const payload: any = { name: name!, email: email!, password: password! };
        if (this.inviteToken) {
            payload.invite_token = this.inviteToken;
        }

        this.authService.register(payload).subscribe({
            next: () => {
                this.analyticsService.logSignUp();
                this.isLoading.set(false);
                // Navigation is handled in AuthService, but we can do it here too if needed
            },
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);

                if (err.error && err.error.message) {
                    // Si el backend devuelve detalles de validación
                    if (err.status === 422 && err.error.errors) {
                        // Obtén el primer mensaje de error de validación
                        const firstErrorKey = Object.keys(err.error.errors)[0];
                        const firstErrorMessage = err.error.errors[firstErrorKey][0];
                        this.errorMessage.set(firstErrorMessage);
                    } else {
                        // Mensaje general del backend
                        this.errorMessage.set(err.error.message);
                    }
                } else {
                    this.errorMessage.set('Error al registrar. Inténtalo de nuevo.');
                }
            }
        });
    }
}
