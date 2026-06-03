import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { TenantService } from '../services/tenant.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';

export const provisionFondosGuard: CanActivateFn = async (route, state) => {
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
    const val = info?.settings?.['provision_fondos_enabled'];
    if (val !== false && val !== 'false') {
        return true;
    }

    snackBar.open('El módulo de provisión de fondos está desactivado.', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
    });

    router.navigate(['/']);
    return false;
};
