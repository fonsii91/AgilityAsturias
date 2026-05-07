import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { TenantService } from '../services/tenant.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';

export function featureGuard(featureSlug: string): CanActivateFn {
    return async (route, state) => {
        const tenantService = inject(TenantService);
        const router = inject(Router);

        // Wait for tenant info loading to complete
        if (tenantService.isTenantLoading()) {
            await firstValueFrom(
                toObservable(tenantService.isTenantLoading).pipe(
                    filter(loading => !loading)
                )
            );
        }

        if (tenantService.hasFeature(featureSlug)) {
            return true;
        }

        // Redirect to home if they don't have the feature
        router.navigate(['/']);
        return false;
    };
}
