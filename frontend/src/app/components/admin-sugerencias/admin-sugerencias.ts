import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { SuggestionService } from '../../services/suggestion.service';
import { Suggestion } from '../../models/suggestion.model';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-sugerencias',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './admin-sugerencias.html',
  styleUrls: ['./admin-sugerencias.css']
})
export class AdminSugerencias implements OnInit {
  suggestions = signal<Suggestion[]>([]);
  isLoading = signal(true);
  filter = signal<'all' | 'pending' | 'resolved'>('pending');

  filteredSuggestions = computed(() => {
    const f = this.filter();
    const s = this.suggestions();
    if (f === 'all') return s;
    return s.filter(item => item.status === f);
  });

  constructor(
    private suggestionService: SuggestionService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadSuggestions();
  }

  loadSuggestions() {
    this.isLoading.set(true);
    this.suggestionService.getSuggestions().subscribe({
      next: (data) => {
        this.suggestions.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error fetching suggestions', error);
        this.toastService.error('Error al cargar las sugerencias');
        this.isLoading.set(false);
      }
    });
  }

  setFilter(newFilter: 'all' | 'pending' | 'resolved') {
      this.filter.set(newFilter);
  }

  markAsResolved(id: number) {
    if(!confirm('¿Estás seguro de marcar este reporte como resuelto?')) {
      return;
    }

    this.suggestionService.resolveSuggestion(id).subscribe({
      next: () => {
        this.toastService.success('Reporte marcado como resuelto');
        this.suggestions.update(sugs => {
            const ix = sugs.findIndex(s => s.id === id);
            if (ix !== -1) {
                const updated = [...sugs];
                updated[ix] = { ...updated[ix], status: 'resolved' };
                return updated;
            }
            return sugs;
        });
      },
      error: (err) => {
        console.error('Error resolving suggestion', err);
        this.toastService.error('Error al actualizar el reporte');
      }
    });
  }
}
