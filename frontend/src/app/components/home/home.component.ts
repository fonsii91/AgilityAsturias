import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Location as AngularLocation } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent {
    authService = inject(AuthService);
    isChecking = false;

    constructor(private location: AngularLocation) { }

    get heroBackground() {
        const imageUrl = this.location.prepareExternalUrl('Images/Perros/Pumba.jpeg');
        return `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${imageUrl}')`;
    }

    checkStatus() {
        if (this.isChecking) return;
        this.isChecking = true;
        this.authService.refreshUserState().subscribe({
            next: () => {
                setTimeout(() => this.isChecking = false, 500); // Pequeño delay para que se vea la animación
            },
            error: () => {
                this.isChecking = false;
            }
        });
    }
}
