import { Component, inject, signal, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Feature {
  id: number;
  slug: string;
  name: string;
  type: string;
  description: string;
}

interface Plan {
  id: number;
  name: string;
  slug: string;
  price: string;
  description: string;
  is_active: boolean;
  video_storage_limit_gb?: number;
  features?: Feature[];
  promo_price?: string | null;
  promo_duration_months?: number | null;
  promo_label?: string | null;
  is_featured?: boolean;
  marketing_features?: string | null;
}

@Component({
  selector: 'app-join-saas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './join-saas.html',
  styleUrl: './join-saas.css',
})
export class JoinSaas implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  
  leadForm: FormGroup;
  isSubmitted = false;
  isSubmitting = false;
  isProvisioning = false;
  sslTimeout = false;
  provisioningProgress = 0;
  provisioningMessage = '';
  selectedPlan = signal<string | null>(null);

  plans = signal<Plan[]>([]);
  isLoading = signal<boolean>(true);

  constructor() {
    this.leadForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-]+$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    this.loadPlans();
  }

  async loadPlans() {
    this.isLoading.set(true);
    try {
      const plansData = await this.http.get<Plan[]>(`${environment.apiUrl}/plans-public`).toPromise();
      if (plansData) {
        this.plans.set(plansData.filter(p => p.is_active));
      }
    } catch (error) {
      console.error('Error loading plans', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  getPlanBySlug(slug: string): Plan | undefined {
    return this.plans().find(p => p.slug === slug);
  }

  getMarketingFeatures(plan: Plan | undefined): { text: string; subtext?: string; status: 'check' | 'cross' | 'gift' }[] {
    if (!plan || !plan.marketing_features) return [];
    return plan.marketing_features.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        if (line.startsWith('+')) {
          const textVal = line.substring(1).trim();
          return { text: textVal, status: 'check' };
        } else if (line.startsWith('-')) {
          const textVal = line.substring(1).trim();
          return { text: textVal, status: 'cross' };
        } else if (line.startsWith('*')) {
          const textVal = line.substring(1).trim();
          const parenIdx = textVal.indexOf('(');
          if (parenIdx !== -1 && textVal.endsWith(')')) {
            const main = textVal.substring(0, parenIdx).trim();
            const sub = textVal.substring(parenIdx + 1, textVal.length - 1).trim();
            return { text: main, subtext: sub, status: 'gift' };
          }
          return { text: textVal, status: 'gift' };
        } else {
          return { text: line, status: 'check' };
        }
      });
  }

  getIntegerPart(price: string | number | undefined): string {
    if (price === undefined) return '0';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return Math.floor(num).toString();
  }

  getDecimalPart(price: string | number | undefined): string {
    if (price === undefined) return '00';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    const decimal = (num - Math.floor(num)).toFixed(2);
    return decimal.split('.')[1] || '00';
  }

  selectPlan(plan: Plan) {
    this.selectedPlan.set(plan.name);
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
    this.cdr.detectChanges();

    const maxDuration = 55000; // 55 seconds max timeout
    const intervalTime = 100; // Update progress every 100ms
    const totalSteps = maxDuration / intervalTime;
    let currentStep = 0;
    let isSslReady = false;

    // Start polling the backend SSL status endpoint every 2.5 seconds
    const pollIntervalTime = 2500;
    const pollInterval = setInterval(() => {
      try {
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
      } catch (pollErr) {
        console.error('Error during status poll initiation:', pollErr);
      }
    }, pollIntervalTime);

    // Smooth progress bar animation
    const progressInterval = setInterval(() => {
      try {
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

        // Force Angular to render the updated state
        this.cdr.detectChanges();
      } catch (progressErr) {
        console.error('Error inside progressInterval callback:', progressErr);
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
