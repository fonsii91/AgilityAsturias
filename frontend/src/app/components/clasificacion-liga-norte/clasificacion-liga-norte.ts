import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LigaNorteService } from '../../services/liga-norte.service';
import { ToastService } from '../../services/toast.service';
import { TenantService } from '../../services/tenant.service';
import { DogService } from '../../services/dog.service';
import { EmptyStateComponent } from '../ui/empty-state/empty-state';

@Component({
  selector: 'app-clasificacion-liga-norte',
  standalone: true,
  imports: [CommonModule, RouterModule, EmptyStateComponent],
  templateUrl: './clasificacion-liga-norte.html',
  styleUrl: './clasificacion-liga-norte.css'
})
export class ClasificacionLigaNorteComponent implements OnInit {
  private ligaNorteService = inject(LigaNorteService);
  private toast = inject(ToastService);
  public tenantService = inject(TenantService);
  private dogService = inject(DogService);

  standings = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  
  // Active type filter: 'liga' or 'excelentes'
  activeType = signal<'liga' | 'excelentes'>('liga');

  // Active class filter tab
  activeClassFilter = signal<number>(60);

  // Available height classes
  classes = [60, 50, 40, 30, 20];

  // Filtered standings based on selected class tab
  filteredStandings = computed(() => {
    const all = this.standings();
    const filter = this.activeClassFilter();
    
    const filtered = all.filter(s => s.clase === filter);

    // Sort by position ascending
    return [...filtered].sort((a, b) => {
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
    this.initializeDefaultClassFromFirstDog();
  }

  initializeDefaultClassFromFirstDog(): void {
    this.dogService.loadUserDogs().then((dogs) => {
      if (dogs && dogs.length > 0) {
        const firstDog = dogs[0];
        let defaultClass = 60;
        
        if (firstDog.rfec_category) {
          const parsed = parseInt(firstDog.rfec_category, 10);
          if ([20, 30, 40, 50, 60].includes(parsed)) {
            defaultClass = parsed;
          }
        } else if (firstDog.height_cm) {
          const height = Number(firstDog.height_cm);
          if (height < 28) defaultClass = 20;
          else if (height < 35) defaultClass = 30;
          else if (height < 43) defaultClass = 40;
          else if (height < 51) defaultClass = 50;
          else defaultClass = 60;
        } else if (firstDog.rsce_category) {
          const cat = firstDog.rsce_category;
          if (cat === 'S') defaultClass = 30;
          else if (cat === 'M') defaultClass = 40;
          else if (cat === 'I') defaultClass = 50;
          else if (cat === 'L') defaultClass = 60;
        }
        
        this.activeClassFilter.set(defaultClass);
      }
    }).catch(err => {
      console.error('Error loading user dogs for defaulting category:', err);
    });
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

  setClassFilter(clase: number): void {
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

  getClubColor(club: any): string {
    if (!club) return 'var(--primary-color, #2563eb)';
    
    let settings = club.settings;
    if (typeof settings === 'string') {
      try {
        settings = JSON.parse(settings);
      } catch (e) {
        settings = null;
      }
    }
    
    if (settings) {
      if (settings.colors?.primary) {
        return settings.colors.primary;
      }
      if (settings.primary_color) {
        return settings.primary_color;
      }
    }
    
    return 'var(--primary-color, #2563eb)';
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

  isQualified(row: any, index: number): boolean {
    const list = this.filteredStandings();
    const total = list.length;
    if (total === 0) return false;
    
    const limitCount = Math.ceil(total / 2);
    if (index < limitCount) {
      return true;
    }
    
    // Handle ties at the boundary line
    const lastQualifiedIndex = limitCount - 1;
    const lastQualifiedRow = list[lastQualifiedIndex];
    if (lastQualifiedRow && row.posicion && row.posicion === lastQualifiedRow.posicion) {
      return true;
    }
    
    return false;
  }
}
