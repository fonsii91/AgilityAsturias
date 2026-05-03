import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';

export const managerGuard: CanActivateFn = async (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.checkAuthLoading()) {
        await firstValueFrom(
            toObservable(authService.checkAuthLoading).pipe(
                filter(loading => !loading)
            )
        );
    }

    const user = authService.currentUserSignal();
    const isManagerOrAdmin = ['manager', 'admin'].includes(user?.role || '');

    if (isManagerOrAdmin) {
        return true;
    } else {
        router.navigate(['/']);
        return false;
    }
};
