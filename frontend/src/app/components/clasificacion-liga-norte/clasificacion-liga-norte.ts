import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LigaNorteService } from '../../services/liga-norte.service';
import { ToastService } from '../../services/toast.service';

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

  standings = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  
  // Active class filter tab: null means "All"
  activeClassFilter = signal<number | null>(null);

  // Available height classes
  classes = [60, 50, 40, 30];

  // Filtered standings based on selected class tab
  filteredStandings = computed(() => {
    const all = this.standings();
    const filter = this.activeClassFilter();
    
    if (filter === null) {
      return all;
    }
    
    return all.filter(s => s.clase === filter);
  });

  // Count entries per class for badges
  classCounts = computed(() => {
    const all = this.standings();
    const counts: { [key: number]: number } = { 30: 0, 40: 0, 50: 0, 60: 0 };
    
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
    this.ligaNorteService.getStandings().subscribe({
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

  setClassFilter(clase: number | null): void {
    this.activeClassFilter.set(clase);
  }

  isAsturias(row: any): boolean {
    if (row.dog_id) return true;
    const club = (row.club_nombre || '').toUpperCase().trim();
    return club === 'ASTURIAS' || club === 'AGILITY ASTURIAS' || club === 'C.A. ASTURIAS';
  }
}
