import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubAdminService, Club } from '../../services/club-admin.service';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../services/toast.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

interface Plan {
  id: number;
  name: string;
  price: string;
}

@Component({
  selector: 'app-clubs-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, RouterModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Gestión de Clubes</h1>
        <button mat-raised-button color="primary" routerLink="/admin/clubs/new">
          <mat-icon>add</mat-icon> Nuevo Club
        </button>
      </div>

      <table mat-table [dataSource]="clubs()" class="mat-elevation-z8 w-full">
        <!-- ID Column -->
        <ng-container matColumnDef="id">
          <th mat-header-cell *matHeaderCellDef> ID </th>
          <td mat-cell *matCellDef="let club"> {{club.id}} </td>
        </ng-container>

        <!-- Name Column -->
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef> Nombre </th>
          <td mat-cell *matCellDef="let club"> {{club.name}} </td>
        </ng-container>

        <!-- Slug Column -->
        <ng-container matColumnDef="slug">
          <th mat-header-cell *matHeaderCellDef> Slug / Subdominio </th>
          <td mat-cell *matCellDef="let club"> 
            <a [href]="getClubBaseUrl(club)" (click)="openClub($event, club, getClubBaseUrl(club))" class="text-blue-600 hover:underline">
              {{club.slug}}
            </a>
          </td>
        </ng-container>

        <!-- Domain Column -->
        <ng-container matColumnDef="domain">
          <th mat-header-cell *matHeaderCellDef> Dominio Propio </th>
          <td mat-cell *matCellDef="let club">
            <a *ngIf="club.domain" [href]="'http://' + club.domain" (click)="openClub($event, club, 'http://' + club.domain)" class="text-blue-600 hover:underline">
              {{club.domain}}
            </a>
            <span *ngIf="!club.domain" class="text-gray-400 italic">No asignado</span>
          </td>
        </ng-container>

        <!-- Plan Column -->
        <ng-container matColumnDef="plan">
          <th mat-header-cell *matHeaderCellDef> Plan </th>
          <td mat-cell *matCellDef="let club">
            <select [ngModel]="club.plan_id" (ngModelChange)="changeClubPlan(club, $event)" class="plan-select">
              <option [ngValue]="null">Sin Plan (Restringido)</option>
              @for (plan of plans(); track plan.id) {
                <option [ngValue]="plan.id">{{ plan.name }}</option>
              }
            </select>
          </td>
        </ng-container>

        <!-- Actions Column -->
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef> Acciones </th>
          <td mat-cell *matCellDef="let club">
            <button mat-icon-button color="primary" [routerLink]="['/admin/clubs/edit', club.id]">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="deleteClub(club)" [disabled]="club.id === 1">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    </div>
  `,
  styles: [`
    .w-full { width: 100%; }
    .p-6 { padding: 1.5rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .items-center { align-items: center; }
    .text-2xl { font-size: 1.5rem; line-height: 2rem; }
    .font-bold { font-weight: 700; }
    .text-blue-600 { color: #2563eb; }
    .hover\\:underline:hover { text-decoration: underline; }
    .plan-select { padding: 4px 8px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 0.875rem; background: white; outline: none; }
    .plan-select:focus { border-color: #3b82f6; }
  `]
})
export class ClubsListComponent implements OnInit {
  private clubService = inject(ClubAdminService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);

  clubs = signal<Club[]>([]);
  plans = signal<Plan[]>([]);
  displayedColumns: string[] = ['id', 'name', 'slug', 'domain', 'plan', 'actions'];

  ngOnInit(): void {
    this.loadClubs();
    this.loadPlans();
  }

  loadPlans() {
    this.http.get<Plan[]>(`${environment.apiUrl}/admin/plans`).subscribe({
      next: (plans) => this.plans.set(plans),
      error: (err) => this.toast.error('Error al cargar los planes')
    });
  }

  changeClubPlan(club: Club, newPlanId: number | null) {
    this.http.put(`${environment.apiUrl}/admin/clubs/${club.id}/plan`, { plan_id: newPlanId }).subscribe({
      next: () => {
        this.toast.success(`Plan de ${club.name} actualizado`);
        club.plan_id = newPlanId;
      },
      error: () => {
        this.toast.error('Error al actualizar el plan');
        this.loadClubs(); // reload to revert UI
      }
    });
  }

  getClubBaseUrl(club: Club): string {
    const hostname = window.location.hostname;
    const isLocalhost = hostname.includes('localhost');
    const port = window.location.port ? `:${window.location.port}` : '';
    
    return isLocalhost
      ? `http://${club.slug}.localhost${port}`
      : `https://${club.slug}.clubagility.com`;
  }

  openClub(event: MouseEvent, club: Club, baseUrl: string): void {
    event.preventDefault();

    this.clubService.createClubHandoff(club.id).subscribe({
      next: ({ handoff }) => {
        const separator = baseUrl.includes('?') ? '&' : '?';
        window.open(`${baseUrl}${separator}handoff=${encodeURIComponent(handoff)}`, '_blank', 'noopener');
      },
      error: () => this.toast.error('No se pudo abrir el acceso temporal al club')
    });
  }

  loadClubs() {
    this.clubService.getClubs().subscribe({
      next: (data) => this.clubs.set(data),
      error: (err) => this.toast.error('Error al cargar clubes')
    });
  }

  deleteClub(club: Club) {
    if (confirm(`¿Estás seguro de eliminar el club ${club.name}? Esta acción no se puede deshacer.`)) {
      this.clubService.deleteClub(club.id).subscribe({
        next: () => {
          this.toast.success('Club eliminado');
          this.loadClubs();
        },
        error: () => this.toast.error('Error al eliminar club')
      });
    }
  }
}
