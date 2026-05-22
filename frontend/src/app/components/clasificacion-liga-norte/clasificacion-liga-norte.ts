import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LigaNorteService } from '../../services/liga-norte.service';
import { ToastService } from '../../services/toast.service';
import { TenantService } from '../../services/tenant.service';

@Component({
  selector: 'app-clasificacion-liga-norte',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './clasificacion-liga-norte.html',
  styleUrl: './clasificacion-liga-norte.css'
})
export class ClasificacionLigaNorteComponent implements OnInit {
  private ligaNorteService = inject(LigaNorteService);
  private toast = inject(ToastService);
  public tenantService = inject(TenantService);

  standings = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  
  // Active type filter: 'liga' or 'excelentes'
  activeType = signal<'liga' | 'excelentes'>('liga');

  // Active class filter tab: null means "All"
  activeClassFilter = signal<number | null>(null);

  // Available height classes
  classes = [60, 50, 40, 30, 20];

  // Filtered standings based on selected class tab
  filteredStandings = computed(() => {
    const all = this.standings();
    const filter = this.activeClassFilter();
    
    const filtered = filter === null 
      ? all 
      : all.filter(s => s.clase === filter);

    // Sort by class descending (for the 'All' tab), then by position ascending
    return [...filtered].sort((a, b) => {
      if (a.clase !== b.clase) {
        return b.clase - a.clase;
      }
      return (a.posicion || 0) - (b.posicion || 0);
    });
  });

  // Count entries per class for badges
  classCounts = computed(() => {
    const all = this.standings();
    const counts: { [key: number]: number } = { 20: 0, 30: 0, 40: 0, 50: 0, 60: 0 };
    
    all.forEach(s => {
      if (s.clase && counts[s.clase] !== undefined) {
        counts[s.clase]++;
      }
    });
    
    return counts;
  });

  ngOnInit(): void {
    this.loadStandings();
  }

  loadStandings(): void {
    this.isLoading.set(true);
    this.ligaNorteService.getStandings(undefined, this.activeType()).subscribe({
      next: (data) => {
        this.standings.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading standings:', err);
        this.toast.error('Error al cargar la clasificación de la Liga Norte.');
        this.isLoading.set(false);
      }
    });
  }

  setType(tipo: 'liga' | 'excelentes'): void {
    this.activeType.set(tipo);
    this.loadStandings();
  }

  setClassFilter(clase: number | null): void {
    this.activeClassFilter.set(clase);
  }

  expandedRows = signal<Set<number>>(new Set());

  toggleRow(rowId: number): void {
    const current = new Set(this.expandedRows());
    if (current.has(rowId)) {
      current.delete(rowId);
    } else {
      current.add(rowId);
    }
    this.expandedRows.set(current);
  }

  isRowExpanded(rowId: number): boolean {
    return this.expandedRows().has(rowId);
  }

  selectedDog = signal<any | null>(null);
  isPhotoModalOpen = signal<boolean>(false);

  openPhotoModal(row: any): void {
    if (row.dog) {
      this.selectedDog.set(row.dog);
      this.isPhotoModalOpen.set(true);
      document.body.style.overflow = 'hidden'; // Lock background scrolling
    }
  }

  closePhotoModal(): void {
    this.isPhotoModalOpen.set(false);
    this.selectedDog.set(null);
    document.body.style.overflow = 'auto'; // Restore scrolling
  }

  getOwnerNames(dog: any): string {
    if (!dog?.users || dog.users.length === 0) return '';
    return dog.users.map((u: any) => u.name).join(' & ');
  }

  isAsturias(row: any): boolean {
    const activeClubId = this.tenantService.tenantInfo()?.id;
    if (row.dog && activeClubId) {
      return row.dog.club_id === activeClubId;
    }
    
    // Fallback to name check
    const club = (row.club_nombre || '').toUpperCase().trim();
    const activeClubName = (this.tenantService.tenantInfo()?.name || '').toUpperCase().trim();
    return club === activeClubName || 
           club === 'ASTURIAS' || 
           club === 'AGILITY ASTURIAS' || 
           club === 'C.A. ASTURIAS';
  }
}
