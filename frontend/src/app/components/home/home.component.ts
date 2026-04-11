import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Location as AngularLocation } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [RouterLink, MatIconModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent {
    authService = inject(AuthService);
    location = inject(AngularLocation);
    clubConfig = environment.clubConfig;

    get heroImage() {
        const imagePath = (this.clubConfig as any).homeConfig?.heroImage || 'Images/Perros/Pumba.jpeg';
        return this.location.prepareExternalUrl(imagePath);
    }
}
