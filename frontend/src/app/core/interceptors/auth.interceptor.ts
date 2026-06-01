import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TenantService } from '../../services/tenant.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    // Only intercept requests directed to our API/backend
    const isApiRequest = req.url.startsWith(environment.apiUrl) || 
                         (!req.url.startsWith('http://') && !req.url.startsWith('https://'));

    if (!isApiRequest) {
        return next(req);
    }

    const token = localStorage.getItem('access_token');
    const tenantService = inject(TenantService);
    const tenantSlug = tenantService.getTenantSlug();

    let headers = req.headers;

    if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
    }

    if (tenantSlug) {
        headers = headers.set('X-Club-Slug', tenantSlug);
    }

    const tenantDomain = tenantService.getTenantDomain();
    if (tenantDomain) {
        headers = headers.set('X-Club-Domain', tenantDomain);
    }

    const cloned = req.clone({ headers });
    return next(cloned);
};
