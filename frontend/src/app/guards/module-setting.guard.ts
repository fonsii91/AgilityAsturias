import { inject, Injector } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { TenantService } from '../services/tenant.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';

/**
 * Factoría de guards por flag de settings del club (módulos activables desde
 * Funcionalidades). Igual que gamificationGuard/ligaNorteGuard: la ausencia de
 * la clave cuenta como activado (solo un false explícito bloquea), para que los
 * clubes anteriores al switch no pierdan el acceso.
 */
export function moduleSettingGuard(settingKey: string, offMessage: string): CanActivateFn {
    return async () => {
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
        const val = info?.settings?.[settingKey];
        if (val !== false && val !== 'false') {
            return true;
        }

        snackBar.open(offMessage, 'Cerrar', {
            duration: 3000,
            panelClass: ['error-snackbar']
        });

        router.navigate(['/']);
        return false;
    };
}
