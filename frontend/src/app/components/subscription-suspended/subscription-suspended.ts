import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TenantService } from '../../services/tenant.service';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-subscription-suspended',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './subscription-suspended.html',
  styleUrls: ['./subscription-suspended.css']
})
export class SubscriptionSuspendedComponent implements OnInit {
  tenantService = inject(TenantService);
  private router = inject(Router);

  clubName = signal<string>('Club Agility');
  clubLogo = signal<string | null>(null);

  ngOnInit() {
    const info = this.tenantService.tenantInfo();
    if (info) {
      this.clubName.set(info.name);
      this.clubLogo.set(info.logo_url);
    }
  }

  logout() {
    // In Angular, we can clear storage and navigate to login
    localStorage.removeItem('auth_token');
    this.router.navigate(['/login']);
  }
}
