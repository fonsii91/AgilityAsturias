import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { TenantService } from '../../services/tenant.service';

@Component({
    selector: 'app-contacto',
    standalone: true,
    templateUrl: './contacto.component.html',
    styleUrl: './contacto.component.css'
})
export class ContactoComponent { 
    clubConfig = environment.clubConfig;
    private sanitizer = inject(DomSanitizer);
    tenantService = inject(TenantService);
    
    get phone() {
        return this.tenantService.tenantInfo()?.settings?.contact?.phone || this.clubConfig.contact.phone;
    }

    get whatsappId() {
        const phone = this.phone;
        return phone.replace(/\D/g, '');
    }

    get email() {
        return this.tenantService.tenantInfo()?.settings?.contact?.email || this.clubConfig.contact.email;
    }

    get addressLine1() {
        return this.tenantService.tenantInfo()?.settings?.contact?.addressLine1 || this.clubConfig.contact.addressLine1;
    }

    get addressLine2() {
        return this.tenantService.tenantInfo()?.settings?.contact?.addressLine2 || this.clubConfig.contact.addressLine2;
    }

    get instagram() {
        const url = this.tenantService.tenantInfo()?.settings?.social?.instagram || this.clubConfig.social.instagram;
        return url && !url.startsWith('http') ? `https://instagram.com/${url}` : url;
    }

    get facebook() {
        const url = this.tenantService.tenantInfo()?.settings?.social?.facebook || this.clubConfig.social.facebook;
        return url && !url.startsWith('http') ? `https://facebook.com/${url}` : url;
    }

    get safeMapUrl(): SafeResourceUrl {
        const mapUrl = this.tenantService.tenantInfo()?.settings?.contact?.mapUrl || this.clubConfig.contact.mapUrl;
        return this.sanitizer.bypassSecurityTrustResourceUrl(mapUrl);
    }
}
