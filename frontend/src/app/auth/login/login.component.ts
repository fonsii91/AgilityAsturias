import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent {
    authService = inject(AuthService);

    constructor() { }

    async login() {
        try {
            await this.authService.loginWithGoogle();
        } catch (error) {
            console.error(error);
        }
    }

    async logout() {
        await this.authService.logout();
    }
}

