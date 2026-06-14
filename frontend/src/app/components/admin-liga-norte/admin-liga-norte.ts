import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LigaNorteService } from '../../services/liga-norte.service';
import { DogService } from '../../services/dog.service';
import { ToastService } from '../../services/toast.service';
import { EmptyStateComponent } from '../ui/empty-state/empty-state';

@Component({
  selector: 'app-admin-liga-norte',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  templateUrl: './admin-liga-norte.html',
  styleUrl: './admin-liga-norte.css'
})
export class AdminLigaNorteComponent implements OnInit {
  private ligaNorteService = inject(LigaNorteService);
  private dogService = inject(DogService);
  private toast = inject(ToastService);

  imports = signal<any[]>([]);
  selectedImport = signal<any | null>(null);
  isLoading = signal<boolean>(false);
  isProcessing = signal<boolean>(false);
  editableRows = signal<any[]>([]);
  
  // Computed counts for stats
  pendingCount = computed(() => this.imports().filter(i => i.status === 'pending').length);
  approvedCount = computed(() => this.imports().filter(i => i.status === 'approved').length);

  // Available classes for dropdown
  classes = [20, 30, 40, 50, 60];

  // Load all club dogs for mapping
  clubDogs = computed(() => {
    return this.dogService.getAllDogs()();
  });

  ngOnInit(): void {
    this.loadImports();
    this.dogService.loadAllDogs();
  }

  loadImports(): void {
    this.isLoading.set(true);
    this.ligaNorteService.getImports().subscribe({
      next: (data) => {
        this.imports.set(data);
        // If we currently have a selected import, update it from the fresh data
        const currentSelected = this.selectedImport();
        if (currentSelected) {
          const updated = data.find(i => i.id === currentSelected.id);
          if (updated) {
            this.selectImport(updated);
          }
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading imports:', err);
        this.toast.error('Error al cargar las capturas de la Liga Norte.');
        this.isLoading.set(false);
      }
    });
  }

  selectImport(imp: any): void {
    this.selectedImport.set(imp);
    if (imp && imp.extracted_data) {
      // Clone the extracted data so changes don't affect the original until approved
      try {
        const rows = typeof imp.extracted_data === 'string' 
          ? JSON.parse(imp.extracted_data) 
          : imp.extracted_data;
        
        // Ensure rows is an array
        this.editableRows.set(Array.isArray(rows) ? JSON.parse(JSON.stringify(rows)) : []);
      } catch (e) {
        console.error('Error parsing extracted_data:', e);
        this.editableRows.set([]);
      }
    } else {
      this.editableRows.set([]);
    }
  }

  deselectImport(): void {
    this.selectedImport.set(null);
    this.editableRows.set([]);
  }

  processWithIA(imp: any): void {
    if (this.isProcessing()) return;
    
    this.isProcessing.set(true);
    this.toast.info('Procesando imagen con Gemini 2.5 Flash Vision AI...');
    
    this.ligaNorteService.processImport(imp.id).subscribe({
      next: (res) => {
        this.isProcessing.set(false);
        if (res.success) {
          this.toast.success('Clasificación digitalizada correctamente.');
          this.loadImports(); // Refresh list to get updated status and data
        } else {
          this.toast.error(res.message || 'Error al procesar la imagen.');
        }
      },
      error: (err) => {
        this.isProcessing.set(false);
        console.error('Error processing import:', err);
        const errMsg = err.error?.message || 'Error desconocido del servidor.';
        this.toast.error(`Error al procesar: ${errMsg}`);
      }
    });
  }

  approveAndPublish(): void {
    const imp = this.selectedImport();
    if (!imp) return;

    const rows = this.editableRows();
    if (!rows || rows.length === 0) {
      this.toast.warning('No hay filas para guardar.');
      return;
    }

    // Basic validation
    for (const row of rows) {
      if (!row.clase) {
        this.toast.warning('Todas las filas deben tener una clase asignada.');
        return;
      }
      if (!row.perro_nombre || !row.guia_nombre) {
        this.toast.warning('Falta el nombre del perro o del guía en alguna fila.');
        return;
      }
    }

    this.isLoading.set(true);
    this.ligaNorteService.approveImport(imp.id, rows).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.toast.success('Clasificación aprobada y publicada en la sección pública.');
          this.loadImports();
        } else {
          this.toast.error(res.message || 'Error al aprobar la clasificación.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Error approving import:', err);
        this.toast.error('Error al guardar y aprobar la clasificación.');
      }
    });
  }

  deleteImport(imp: any): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta captura de pantalla? Esta acción no se puede deshacer.')) {
      return;
    }

    this.isLoading.set(true);
    this.ligaNorteService.deleteImport(imp.id).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.toast.success('Importación eliminada.');
          this.deselectImport();
          this.loadImports();
        } else {
          this.toast.error(res.message || 'Error al eliminar.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Error deleting import:', err);
        this.toast.error('Error al eliminar la importación.');
      }
    });
  }

  getOwnerNames(dog: any): string {
    if (!dog?.users || dog.users.length === 0) return '';
    return dog.users.map((u: any) => u.name).join(' & ');
  }

  addRow(): void {
    const currentRows = this.editableRows();
    const newRow = {
      clase: 60,
      posicion: currentRows.length + 1,
      club_nombre: 'ASTURIAS',
      guia_nombre: '',
      perro_nombre: '',
      dog_id: null,
      puntos_total: 0,
      excelentes_totales: 0,
      excelentes_cero: 0,
      excelentes_cinco: 0,
      agility_ex_0: 0,
      agility_ex_5: 0,
      jumping_ex_0: 0,
      jumping_ex_5: 0,
      total_agility: 0,
      total_jumping: 0
    };
    this.editableRows.set([...currentRows, newRow]);
  }

  removeRow(index: number): void {
    const currentRows = this.editableRows();
    this.editableRows.set(currentRows.filter((_, i) => i !== index));
  }
}
