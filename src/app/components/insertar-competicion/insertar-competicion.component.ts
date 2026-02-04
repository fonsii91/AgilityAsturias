import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
    selector: 'app-insertar-competicion',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './insertar-competicion.component.html',
    styleUrl: './insertar-competicion.component.css'
})
export class InsertarCompeticionComponent {
    competitionForm: FormGroup;
    submitted = false;

    constructor(private fb: FormBuilder) {
        this.competitionForm = this.fb.group({
            lugar: ['', Validators.required],
            fechaEvento: ['', Validators.required],
            fechaLimite: ['', Validators.required],
            formaPago: ['', Validators.required],
            cartel: [null, Validators.required], // Store the file or path
            enlace: ['', [Validators.required, Validators.pattern('https?://.+')]]
        });
    }

    get f() { return this.competitionForm.controls; }

    onFileChange(event: any) {
        if (event.target.files.length > 0) {
            const file = event.target.files[0];
            this.competitionForm.patchValue({
                cartel: file
            });
        }
    }

    onSubmit() {
        this.submitted = true;

        if (this.competitionForm.invalid) {
            return;
        }

        // Here you would typically call a service to save the data
        console.log('Competición enviada:', this.competitionForm.value);
        alert('¡Competición añadida con éxito! (Simulación)');
        this.submitted = false;
        this.competitionForm.reset();
    }
}
