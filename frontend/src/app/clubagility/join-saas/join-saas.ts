import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-join-saas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './join-saas.html',
  styleUrl: './join-saas.css',
})
export class JoinSaas {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  
  leadForm: FormGroup;
  isSubmitted = false;
  isSubmitting = false;
  isProvisioning = false;
  provisioningProgress = 0;
  provisioningMessage = '';
  selectedPlan = signal<string | null>(null);

  constructor() {
    this.leadForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  selectPlan(planName: string) {
    this.selectedPlan.set(planName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBackToPlans() {
    this.selectedPlan.set(null);
  }

  startProvisioning() {
    this.isProvisioning = true;
    this.provisioningProgress = 0;
    this.provisioningMessage = 'Creando base de datos y configuraciones iniciales...';

    const duration = 45000; // 45 seconds
    const intervalTime = 100; // Update every 100ms
    const totalSteps = duration / intervalTime;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      this.provisioningProgress = Math.min(Math.round((currentStep / totalSteps) * 100), 100);

      // Update message based on progress
      if (this.provisioningProgress < 25) {
        this.provisioningMessage = 'Creando base de datos y configuraciones iniciales...';
      } else if (this.provisioningProgress < 50) {
        this.provisioningMessage = 'Configurando subdominio y enrutamiento de red...';
      } else if (this.provisioningProgress < 85) {
        this.provisioningMessage = 'Generando certificado de seguridad SSL (Let\'s Encrypt)...';
      } else {
        this.provisioningMessage = 'Verificando conexión segura y finalizando...';
      }

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        this.isProvisioning = false;
        this.isSubmitted = true;
      }
    }, intervalTime);
  }

  onSubmit() {
    if (this.leadForm.valid) {
      this.isSubmitting = true;
      const leadData = { ...this.leadForm.value, plan_selected: this.selectedPlan() };
      
      this.http.post(`${environment.apiUrl}/club-leads`, leadData).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.startProvisioning();
          console.log('Lead request submitted:', res);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Error submitting lead:', err);
          if (err.status === 422 && err.error?.errors) {
            const errors = err.error.errors;
            Object.keys(errors).forEach(key => {
              const control = this.leadForm.get(key);
              if (control) {
                control.setErrors({ backendError: errors[key][0] });
              }
            });
          } else {
            alert('Hubo un error al enviar tu solicitud. Inténtalo de nuevo más tarde.');
          }
        }
      });
    } else {
      this.leadForm.markAllAsTouched();
    }
  }
}
