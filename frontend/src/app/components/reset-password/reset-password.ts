import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrls: ['../../auth/login/login.component.css'] // Reutilizamos los estilos del login
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  token = signal<string>('');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  constructor() {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      password_confirmation: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.token.set(params['token']);
      } else {
        this.errorMessage.set('Token no encontrado en la URL. El enlace no es válido.');
      }
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('password_confirmation')?.value
      ? null : { 'mismatch': true };
  }

  async onSubmit() {
    if (this.resetForm.invalid || !this.token()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const data = {
        token: this.token(),
        password: this.resetForm.value.password,
        password_confirmation: this.resetForm.value.password_confirmation
      };

      const res = await this.authService.resetPassword(data);
      this.successMessage.set(res.message || 'Contraseña restablecida correctamente.');
    } catch (error: any) {
      this.errorMessage.set(error.error?.message || 'Error al restablecer la contraseña. El enlace puede haber caducado.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
