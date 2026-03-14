import { Component, inject, effect, output } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DarPuntosExtraDialogComponent } from '../dar-puntos-extra-dialog/dar-puntos-extra-dialog.component';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, CommonModule, MatToolbarModule, MatDialogModule],
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
            }
        });
    }

    openExtraPointsDialog() {
        this.closeMenu();
        this.dialog.open(DarPuntosExtraDialogComponent, {
            width: '400px',
            maxWidth: '90vw'
        });
    }
}

