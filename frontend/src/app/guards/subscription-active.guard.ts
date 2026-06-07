import { inject, Injector } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { TenantService } from '../services/tenant.service';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';

export const subscriptionActiveGuard: CanActivateFn = async (route, state) => {
    const tenantService = inject(TenantService);
    const authService = inject(AuthService);
    const router = inject(Router);
    const injector = inject(Injector);

    // Esperar a que cargue la autenticación si está en proceso
    if (authService.checkAuthLoading()) {
        await firstValueFrom(
            toObservable(authService.checkAuthLoading, { injector }).pipe(
                filter(loading => !loading)
            )
        );
    }

    // Esperar a que cargue la info del tenant si está en proceso
    if (tenantService.isTenantLoading()) {
        await firstValueFrom(
            toObservable(tenantService.isTenantLoading, { injector }).pipe(
                filter(loading => !loading)
            )
        );
    }

    const user = authService.currentUserSignal();
    const tenantInfo = tenantService.tenantInfo();

    // Si el usuario es administrador global, permitir acceso a todo
    if (user?.role === 'admin') {
        return true;
    }

    // Si el club tiene la suscripción inactiva
    if (tenantInfo && tenantInfo.subscribed === false) {
        if (user?.role === 'manager') {
            // Permitir al gestor ver la pantalla de facturación para pagar
            if (state.url.includes('/configuracion/facturacion')) {
                return true;
            }
            router.navigate(['/configuracion/facturacion']);
            return false;
        } else {
            // Redirigir a socios y entrenadores a la pantalla de suspensión
            if (state.url.includes('/suscripcion-suspendida')) {
                return true;
            }
            router.navigate(['/suscripcion-suspendida']);
            return false;
        }
    }

    // Si la suscripción está activa, no permitir entrar a la pantalla de suspensión
    if (state.url.includes('/suscripcion-suspendida')) {
        router.navigate(['/']);
        return false;
    }

    return true;
};
