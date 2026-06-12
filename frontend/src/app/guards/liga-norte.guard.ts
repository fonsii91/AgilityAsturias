import { inject, Injector } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { TenantService } from '../services/tenant.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';

export const ligaNorteGuard: CanActivateFn = async (route, state) => {
    const tenantService = inject(TenantService);
    const router = inject(Router);
    const snackBar = inject(MatSnackBar);
    const injector = inject(Injector);

    // Wait for tenant info loading to complete
    if (tenantService.isTenantLoading()) {
        await firstValueFrom(
            toObservable(tenantService.isTenantLoading, { injector }).pipe(
                filter(loading => !loading)
            )
        );
    }

    const info = tenantService.tenantInfo();
    const val = info?.settings?.['liga_norte_enabled'];
    if (val !== false && val !== 'false') {
        return true;
    }

    snackBar.open('La sección Liga Norte está desactivada para este club.', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
    });

    router.navigate(['/']);
    return false;
};
