import { Component, inject, signal } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrls: ['../../auth/login/login.component.css'] // Reutilizamos los estilos del login
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  constructor() {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  async onSubmit() {
    if (this.forgotForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const res = await this.authService.forgotPassword(this.forgotForm.value.email);
      this.successMessage.set(res.message || 'Si el correo está registrado, te hemos enviado un enlace para restablecer tu contraseña.');
    } catch (error: any) {
      if (error.status === 429) {
        this.errorMessage.set('Has hecho demasiados intentos. Espera un minuto y vuelve a probar.');
      } else {
        this.errorMessage.set(error.error?.message || 'No se pudo procesar la solicitud. Inténtalo de nuevo.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
