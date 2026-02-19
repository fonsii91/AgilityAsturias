import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = await authService.getAuthState();

    if (user) {
        return true;
    } else {
        // Redirect to login page with return url if needed, or just login
        router.navigate(['/login']);
        return false;
    }
};
