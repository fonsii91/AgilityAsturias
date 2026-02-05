import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';

export const memberGuard: CanActivateFn = async (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Wait for auth loading to complete
    if (authService.checkAuthLoading()) {
        await firstValueFrom(
            toObservable(authService.checkAuthLoading).pipe(
                filter(loading => !loading)
            )
        );
    }

    if (authService.isMember()) {
        return true;
    } else {
        // Optional: Redirect to landing or specific upsell page
        router.navigate(['/']);
        return false;
    }
};
