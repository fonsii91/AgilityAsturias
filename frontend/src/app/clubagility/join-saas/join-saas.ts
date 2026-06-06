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
  sslTimeout = false;
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

  startProvisioning(slug: string) {
    this.isProvisioning = true;
    this.sslTimeout = false;
    this.provisioningProgress = 0;
    this.provisioningMessage = 'Creando base de datos y configuraciones iniciales...';

    const maxDuration = 55000; // 55 seconds max timeout
    const intervalTime = 100; // Update progress every 100ms
    const totalSteps = maxDuration / intervalTime;
    let currentStep = 0;
    let isSslReady = false;

    // Start polling the backend SSL status endpoint every 2.5 seconds
    const pollIntervalTime = 2500;
    const pollInterval = setInterval(() => {
      this.http.get<{ ready: boolean }>(`${environment.apiUrl}/club-leads/status/${slug}`).subscribe({
        next: (res) => {
          if (res && res.ready) {
            isSslReady = true;
            clearInterval(pollInterval);
          }
        },
        error: (err) => {
          console.warn('Error checking SSL status:', err);
        }
      });
    }, pollIntervalTime);

    // Smooth progress bar animation
    const progressInterval = setInterval(() => {
      currentStep++;
      const timeElapsed = currentStep * intervalTime;

      if (isSslReady) {
        // SSL is ready! Quickly animate progress to 100% and finish
        this.provisioningProgress = Math.min(this.provisioningProgress + 10, 100);
        this.provisioningMessage = '¡Todo listo! Verificación de conexión segura completada.';
        
        if (this.provisioningProgress >= 100) {
          clearInterval(progressInterval);
          clearInterval(pollInterval);
          this.isProvisioning = false;
          this.isSubmitted = true;
        }
      } else {
        // SSL is not ready yet. Increase progress bar up to 90%
        if (this.provisioningProgress < 90) {
          // Slowly increase progress up to 90% over the first 40 seconds
          this.provisioningProgress = Math.min(Math.round((timeElapsed / 40000) * 90), 90);
        } else if (this.provisioningProgress >= 90 && this.provisioningProgress < 95) {
          // Even slower increase after 90%
          if (currentStep % 10 === 0) {
            this.provisioningProgress++;
          }
        }

        // Update messaging based on progress
        if (this.provisioningProgress < 25) {
          this.provisioningMessage = 'Creando base de datos y configuraciones iniciales...';
        } else if (this.provisioningProgress < 50) {
          this.provisioningMessage = 'Configurando subdominio y enrutamiento de red...';
        } else if (this.provisioningProgress < 85) {
          this.provisioningMessage = 'Generando certificado de seguridad SSL (Let\'s Encrypt)...';
        } else {
          this.provisioningMessage = 'Verificando conexión segura y finalizando...';
        }

        // Timeout fallback
        if (timeElapsed >= maxDuration) {
          clearInterval(progressInterval);
          clearInterval(pollInterval);
          this.sslTimeout = true;
          this.isProvisioning = false;
          this.isSubmitted = true;
        }
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
          const slug = this.leadForm.get('slug')?.value;
          this.startProvisioning(slug);
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
