import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-contacto',
    standalone: true,
    templateUrl: './contacto.component.html',
    styleUrl: './contacto.component.css'
})
export class ContactoComponent { 
    clubConfig = environment.clubConfig;
    private sanitizer = inject(DomSanitizer);
    
    safeMapUrl: SafeResourceUrl;

    constructor() {
        this.safeMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.clubConfig.contact.mapUrl);
    }
}
