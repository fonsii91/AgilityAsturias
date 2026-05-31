import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { TenantService } from '../services/tenant.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';

export const gamificationGuard: CanActivateFn = async (route, state) => {
    const tenantService = inject(TenantService);
    const router = inject(Router);
    const snackBar = inject(MatSnackBar);

    // Wait for tenant info loading to complete
    if (tenantService.isTenantLoading()) {
        await firstValueFrom(
            toObservable(tenantService.isTenantLoading).pipe(
                filter(loading => !loading)
            )
        );
    }

    const info = tenantService.tenantInfo();
    if (info?.settings?.gamification_enabled !== false) {
        return true;
    }

    snackBar.open('El sistema de gamificación está desactivado.', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
    });

    router.navigate(['/']);
    return false;
};
