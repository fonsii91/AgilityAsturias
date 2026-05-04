import { Component, inject, computed, effect } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { Location as AngularLocation } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { TenantService } from '../../services/tenant.service';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [RouterLink, MatIconModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent {
    private router = inject(Router);
    authService = inject(AuthService);

    // Se ha eliminado la redirección automática a /calendario para que los usuarios logueados
    // también puedan visitar la página de bienvenida.
    location = inject(AngularLocation);
    tenantService = inject(TenantService);
    clubConfig = environment.clubConfig;
    clubName = computed(() => this.tenantService.tenantInfo()?.name || this.clubConfig.name);

    get heroImage() {
        const tenantImg = this.tenantService.tenantInfo()?.settings?.homeConfig?.heroImage;
        const imagePath = tenantImg || (this.clubConfig as any).homeConfig?.heroImage || 'Images/Perros/Pumba.jpeg';
        return imagePath.startsWith('http') ? imagePath : this.location.prepareExternalUrl(imagePath);
    }

    get ctaImage() {
        const tenantImg = this.tenantService.tenantInfo()?.settings?.homeConfig?.ctaImage;
        const imagePath = tenantImg || (this.clubConfig as any).homeConfig?.ctaImage || 'Images/Perros/perro_saltando.jpg';
        return imagePath.startsWith('http') ? imagePath : this.location.prepareExternalUrl(imagePath);
    }

    get slogan() {
        return this.tenantService.tenantInfo()?.settings?.slogan || this.clubConfig.slogan;
    }

    get instagram() {
        const url = this.tenantService.tenantInfo()?.settings?.social?.instagram || this.clubConfig.social.instagram;
        return url && !url.startsWith('http') ? `https://instagram.com/${url}` : url;
    }

    get facebook() {
        const url = this.tenantService.tenantInfo()?.settings?.social?.facebook || this.clubConfig.social.facebook;
        return url && !url.startsWith('http') ? `https://facebook.com/${url}` : url;
    }


    get cta() {
        return this.tenantService.tenantInfo()?.settings?.homeConfig?.cta || this.clubConfig.homeConfig.cta;
    }
}
