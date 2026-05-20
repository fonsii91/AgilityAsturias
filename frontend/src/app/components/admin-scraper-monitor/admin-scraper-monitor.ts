import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScraperAdminService } from '../../services/scraper-admin.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-scraper-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-scraper-monitor.html',
  styleUrl: './admin-scraper-monitor.css'
})
export class AdminScraperMonitorComponent implements OnInit, OnDestroy {
  private scraperService = inject(ScraperAdminService);
  private toast = inject(ToastService);

  competitions = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  scrapingIds = signal<number[]>([]);
  selectedError = signal<{ nombre: string; error: string } | null>(null);
  consoleOutput = signal<{ nombre: string; output: string } | null>(null);
  
  activeTab = signal<'competitions' | 'last-tracks'>('competitions');
  lastTracks = signal<any[]>([]);
  isLoadingTracks = signal<boolean>(false);

  private pollInterval: any = null;

  ngOnInit(): void {
    this.loadCompetitions();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadCompetitions(): void {
    this.isLoading.set(true);
    this.scraperService.getPastCompetitions().subscribe({
      next: (data) => {
        this.competitions.set(data);
        this.isLoading.set(false);
        this.checkAndStartPolling();
      },
      error: (err) => {
        console.error('Error loading past competitions', err);
        this.toast.error('Error al cargar la lista de competiciones.');
        this.isLoading.set(false);
      }
    });
  }

  loadLastTracks(): void {
    this.isLoadingTracks.set(true);
    this.scraperService.getLastScrapedTracks().subscribe({
      next: (data) => {
        this.lastTracks.set(data);
        this.isLoadingTracks.set(false);
      },
      error: (err) => {
        console.error('Error loading last scraped tracks', err);
        this.toast.error('Error al cargar los últimos registros scrapeados.');
        this.isLoadingTracks.set(false);
      }
    });
  }

  setTab(tab: 'competitions' | 'last-tracks'): void {
    this.activeTab.set(tab);
    if (tab === 'last-tracks') {
      this.loadLastTracks();
    } else {
      this.loadCompetitions();
    }
  }

  hasFlowAgilityLink(enlace: string): boolean {
    return !!enlace && enlace.includes('flowagility.com');
  }

  runScraper(comp: any): void {
    if (this.scrapingIds().includes(comp.id)) return;

    this.scrapingIds.update(ids => [...ids, comp.id]);
    this.toast.info(`Iniciando extracción para "${comp.nombre}" en segundo plano...`);

    this.scraperService.runScraper(comp.id).subscribe({
      next: (res) => {
        this.toast.success(`Scraping encolado para "${comp.nombre}".`);
        this.scrapingIds.update(ids => ids.filter(id => id !== comp.id));
        
        // Recargamos para ver el estado 'processing' e iniciar el polling
        this.loadCompetitions();
      },
      error: (err) => {
        console.error('Error running scraper', err);
        const errMsg = err.error?.message || 'Error desconocido';
        this.toast.error(`Falló el inicio del scraping de "${comp.nombre}": ${errMsg}`);
        this.scrapingIds.update(ids => ids.filter(id => id !== comp.id));
        this.loadCompetitions();
      }
    });
  }

  refreshCompetitionsSilently(): void {
    this.scraperService.getPastCompetitions().subscribe({
      next: (data) => {
        this.competitions.set(data);
        this.checkAndStartPolling();
      },
      error: (err) => {
        console.error('Error silently refreshing competitions', err);
      }
    });
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private checkAndStartPolling(): void {
    const hasActiveScraping = this.competitions().some(
      comp => comp.scrape_status === 'processing' || comp.scrape_status === 'running'
    );

    if (hasActiveScraping) {
      if (!this.pollInterval) {
        this.pollInterval = setInterval(() => {
          this.refreshCompetitionsSilently();
        }, 5000); // Polling cada 5 segundos
      }
    } else {
      this.stopPolling();
    }
  }

  viewError(comp: any): void {
    this.selectedError.set({
      nombre: comp.nombre,
      error: comp.scrape_error || 'No se registró ningún mensaje de error.'
    });
  }

  closeErrorModal(): void {
    this.selectedError.set(null);
  }

  closeConsoleModal(): void {
    this.consoleOutput.set(null);
  }
}
