import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubAdminService, Club } from '../../services/club-admin.service';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ClubFormDialogComponent } from './club-form-dialog/club-form-dialog.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-clubs-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Gestión de Clubes</h1>
        <button mat-raised-button color="primary" (click)="openClubDialog()">
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
            <a [href]="'http://' + club.slug + '.clubagility.com'" target="_blank" class="text-blue-600 hover:underline">
              {{club.slug}}
            </a>
          </td>
        </ng-container>

        <!-- Domain Column -->
        <ng-container matColumnDef="domain">
          <th mat-header-cell *matHeaderCellDef> Dominio Propio </th>
          <td mat-cell *matCellDef="let club">
            <a *ngIf="club.domain" [href]="'http://' + club.domain" target="_blank" class="text-blue-600 hover:underline">
              {{club.domain}}
            </a>
            <span *ngIf="!club.domain" class="text-gray-400 italic">No asignado</span>
          </td>
        </ng-container>

        <!-- Actions Column -->
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef> Acciones </th>
          <td mat-cell *matCellDef="let club">
            <button mat-icon-button color="primary" (click)="openClubDialog(club)">
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
  `]
})
export class ClubsListComponent implements OnInit {
  private clubService = inject(ClubAdminService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  clubs = signal<Club[]>([]);
  displayedColumns: string[] = ['id', 'name', 'slug', 'domain', 'actions'];

  ngOnInit(): void {
    this.loadClubs();
  }

  loadClubs() {
    this.clubService.getClubs().subscribe({
      next: (data) => this.clubs.set(data),
      error: (err) => this.toast.error('Error al cargar clubes')
    });
  }

  openClubDialog(club?: Club) {
    const dialogRef = this.dialog.open(ClubFormDialogComponent, {
      width: '500px',
      data: { club }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadClubs();
      }
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
