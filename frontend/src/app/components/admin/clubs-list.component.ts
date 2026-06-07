import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubAdminService, Club, ClubLead } from '../../services/club-admin.service';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, Router } from '@angular/router';
import { ToastService } from '../../services/toast.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SafeDeleteDialog } from '../shared/safe-delete-dialog/safe-delete-dialog';

interface Plan {
  id: number;
  name: string;
  price: string;
}

@Component({
  selector: 'app-clubs-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, RouterModule, FormsModule, MatDialogModule],
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

      <!-- Seccion de Solicitudes de Alta (Leads) -->
      <div class="mt-12">
        <h2 class="text-2xl font-bold mb-4">Solicitudes de Registro (Alta)</h2>
        
        @if (leads().length === 0) {
          <div class="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500">
            No hay solicitudes de registro pendientes o procesadas.
          </div>
        } @else {
          <table mat-table [dataSource]="leads()" class="mat-elevation-z8 w-full mt-4">
            <!-- ID Column -->
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef> ID </th>
              <td mat-cell *matCellDef="let lead"> {{lead.id}} </td>
            </ng-container>

            <!-- Name Column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef> Nombre del Club </th>
              <td mat-cell *matCellDef="let lead"> {{lead.name}} </td>
            </ng-container>

            <!-- Slug Column -->
            <ng-container matColumnDef="slug">
              <th mat-header-cell *matHeaderCellDef> Subdominio Deseado </th>
              <td mat-cell *matCellDef="let lead"> {{lead.slug}} </td>
            </ng-container>

            <!-- Contact Column -->
            <ng-container matColumnDef="contact">
              <th mat-header-cell *matHeaderCellDef> Contacto </th>
              <td mat-cell *matCellDef="let lead">
                <div class="flex flex-col text-sm">
                  <span><strong>Email:</strong> {{lead.email}}</span>
                  <span><strong>Tlf:</strong> {{lead.phone}}</span>
                </div>
              </td>
            </ng-container>

            <!-- Plan Column -->
            <ng-container matColumnDef="plan">
              <th mat-header-cell *matHeaderCellDef> Plan </th>
              <td mat-cell *matCellDef="let lead">
                <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded uppercase">
                  {{lead.plan_selected || 'Pro'}}
                </span>
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef> Estado </th>
              <td mat-cell *matCellDef="let lead">
                <span [ngClass]="{
                  'bg-yellow-100 text-yellow-800': lead.status === 'pending',
                  'bg-green-100 text-green-800': lead.status === 'approved',
                  'bg-red-100 text-red-800': lead.status === 'rejected'
                }" class="px-2 py-1 text-xs font-semibold rounded capitalize">
                  {{lead.status === 'pending' ? 'Pendiente' : lead.status === 'approved' ? 'Aprobado' : 'Rechazado'}}
                </span>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef> Acciones </th>
              <td mat-cell *matCellDef="let lead">
                <div class="flex gap-2">
                  @if (lead.status === 'pending') {
                    <button mat-raised-button color="primary" (click)="approveLead(lead)">
                      <mat-icon>add_business</mat-icon> Crear Club
                    </button>
                    <button mat-raised-button color="warn" (click)="rejectLead(lead)">
                      <mat-icon>close</mat-icon> Rechazar
                    </button>
                  } @else {
                    <button mat-icon-button color="warn" (click)="deleteLead(lead)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="leadDisplayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: leadDisplayedColumns;"></tr>
          </table>
        }
      </div>
    </div>
  `,
  styles: [`
    .w-full { width: 100%; }
    .p-6 { padding: 1.5rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mt-12 { margin-top: 3rem; }
    .mt-4 { margin-top: 1rem; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .gap-2 { gap: 0.5rem; }
    .justify-between { justify-content: space-between; }
    .items-center { align-items: center; }
    .text-2xl { font-size: 1.5rem; line-height: 2rem; }
    .font-bold { font-weight: 700; }
    .text-blue-600 { color: #2563eb; }
    .hover\\:underline:hover { text-decoration: underline; }
    .plan-select { padding: 4px 8px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 0.875rem; background: white; outline: none; }
    .plan-select:focus { border-color: #3b82f6; }
    .bg-gray-50 { background-color: #f9fafb; }
    .border-gray-200 { border-color: #e5e7eb; }
    .rounded-lg { border-radius: 0.5rem; }
    .text-center { text-align: center; }
    .text-gray-500 { color: #6b7280; }
    .text-sm { font-size: 0.875rem; }
    .text-xs { font-size: 0.75rem; }
    .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .bg-blue-100 { background-color: #dbeafe; }
    .text-blue-800 { color: #1e40af; }
    .bg-yellow-100 { background-color: #fef3c7; }
    .text-yellow-800 { color: #92400e; }
    .bg-green-100 { background-color: #d1fae5; }
    .text-green-800 { color: #065f46; }
    .bg-red-100 { background-color: #fee2e2; }
    .text-red-800 { color: #991b1b; }
    .font-semibold { font-weight: 600; }
    .rounded { border-radius: 0.25rem; }
    .uppercase { text-transform: uppercase; }
    .capitalize { text-transform: capitalize; }
  `]
})
export class ClubsListComponent implements OnInit {
  private clubService = inject(ClubAdminService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  clubs = signal<Club[]>([]);
  plans = signal<Plan[]>([]);
  leads = signal<ClubLead[]>([]);
  
  displayedColumns: string[] = ['id', 'name', 'slug', 'domain', 'plan', 'actions'];
  leadDisplayedColumns: string[] = ['id', 'name', 'slug', 'contact', 'plan', 'status', 'actions'];

  ngOnInit(): void {
    this.loadClubs();
    this.loadPlans();
    this.loadLeads();
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
    const dialogRef = this.dialog.open(SafeDeleteDialog, {
      width: '450px',
      data: {
        title: 'Eliminar Club',
        expectedValue: club.name,
        placeholder: 'Escribe el nombre del club para confirmar'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.clubService.deleteClub(club.id).subscribe({
          next: () => {
            this.toast.success('Club eliminado');
            this.loadClubs();
          },
          error: () => this.toast.error('Error al eliminar club')
        });
      }
    });
  }

  loadLeads() {
    this.clubService.getLeads().subscribe({
      next: (data) => this.leads.set(data),
      error: (err) => this.toast.error('Error al cargar solicitudes')
    });
  }

  approveLead(lead: ClubLead) {
    this.router.navigate(['/admin/clubs/new'], {
      queryParams: {
        lead_id: lead.id,
        name: lead.name,
        slug: lead.slug,
        email: lead.email,
        phone: lead.phone
      }
    });
  }

  rejectLead(lead: ClubLead) {
    if (confirm(`¿Estás seguro de rechazar la solicitud de ${lead.name}?`)) {
      this.clubService.updateLeadStatus(lead.id, 'rejected').subscribe({
        next: () => {
          this.toast.success('Solicitud rechazada');
          this.loadLeads();
        },
        error: () => this.toast.error('Error al rechazar solicitud')
      });
    }
  }

  deleteLead(lead: ClubLead) {
    if (confirm(`¿Estás seguro de eliminar el registro de la solicitud de ${lead.name}?`)) {
      this.clubService.deleteLead(lead.id).subscribe({
        next: () => {
          this.toast.success('Registro de solicitud eliminado');
          this.loadLeads();
        },
        error: () => this.toast.error('Error al eliminar solicitud')
      });
    }
  }
}
