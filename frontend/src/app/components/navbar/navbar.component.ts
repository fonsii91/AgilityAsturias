import { Component, inject, effect, output, computed } from '@angular/core';
import { TenantService } from '../../services/tenant.service';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SugerenciaDialog } from '../sugerencias/sugerencia-dialog/sugerencia-dialog';
import { environment } from '../../../environments/environment';
import { HasFeatureDirective } from '../../directives/has-feature.directive';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, CommonModule, MatToolbarModule, MatDialogModule, HasFeatureDirective],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.css'
})
export class NavbarComponent {
    isUserMenuOpen = false;
    isNotificationsOpen = false;
    authService = inject(AuthService);
    notificationService = inject(NotificationService);
    router = inject(Router);
    dialog = inject(MatDialog);
    tenantService = inject(TenantService);
    clubConfig = environment.clubConfig;
    
    clubName = computed(() => this.tenantService.tenantInfo()?.name || this.clubConfig.name);
    clubLogo = computed(() => this.tenantService.tenantInfo()?.logo_url || this.clubConfig.logoPath);

    toggleSidenav = output<void>();

    constructor() {
        effect(() => {
            const user = this.authService.userProfileSignal();
            if (user) {
                this.notificationService.loadNotifications();
            }
        });
    }

    toggleMenu() {
        this.toggleSidenav.emit();
    }

    closeMenu() {
        this.isUserMenuOpen = false;
        this.isNotificationsOpen = false;
    }

    toggleNotifications(event?: Event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.isNotificationsOpen = !this.isNotificationsOpen;
        this.isUserMenuOpen = false;
    }

    toggleUserMenu(event?: Event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.isUserMenuOpen = !this.isUserMenuOpen;
    }

    async logout() {
        await this.authService.logout();
        this.closeMenu();
    }

    markAllAsRead() {
        this.notificationService.markAllAsRead().subscribe();
    }

    handleNotificationClick(notif: AppNotification) {
        this.notificationService.markAsRead(notif.id).subscribe(() => {
            this.closeMenu();
            if (notif.data.action_url) {
                this.router.navigate([notif.data.action_url]);
            } else if (notif.data.competition_id) {
                this.router.navigate(['/calendario']);
            } else if (notif.type.includes('NewAnnouncementNotification') || notif.data.type === 'announcement') {
                this.router.navigate(['/tablon-anuncios']);
            }
        });
    }

    openSugerenciaDialog() {
        this.closeMenu();
        this.dialog.open(SugerenciaDialog, {
            width: '600px',
            maxWidth: '90vw'
        });
    }

    goToMyClub() {
        this.closeMenu();
        const clubId = this.tenantService.tenantInfo()?.id;
        if (clubId) {
            this.router.navigate(['/admin/clubs/edit', clubId]);
        }
    }
}

