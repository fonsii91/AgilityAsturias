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
  selectedPlan = signal<string | null>(null);

  constructor() {
    this.leadForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]]
    });
  }

  selectPlan(planName: string) {
    this.selectedPlan.set(planName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBackToPlans() {
    this.selectedPlan.set(null);
  }

  onSubmit() {
    if (this.leadForm.valid) {
      this.isSubmitting = true;
      const leadData = { ...this.leadForm.value, plan_selected: this.selectedPlan() };
      
      this.http.post(`${environment.apiUrl}/club-leads`, leadData).subscribe({
        next: (res) => {
          this.isSubmitted = true;
          this.isSubmitting = false;
          console.log('Lead request submitted:', res);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Error submitting lead:', err);
          alert('Hubo un error al enviar tu solicitud. Inténtalo de nuevo más tarde.');
        }
      });
    } else {
      this.leadForm.markAllAsTouched();
    }
  }
}
