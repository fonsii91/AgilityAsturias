import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-join-saas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './join-saas.html',
  styleUrl: './join-saas.css',
})
export class JoinSaas {
  private fb = inject(FormBuilder);
  
  leadForm: FormGroup;
  isSubmitted = false;

  constructor() {
    this.leadForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.leadForm.valid) {
      this.isSubmitted = true;
      // Aquí irá la llamada al backend
      console.log('Lead request submitted:', this.leadForm.value);
    } else {
      this.leadForm.markAllAsTouched();
    }
  }
}
