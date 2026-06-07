import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';

interface BillingStatus {
  subscribed: boolean;
  plan_name: string;
  plan_slug: string | null;
  stripe_status: string;
  pm_type: string | null;
  pm_last_four: string | null;
  ends_at: string | null;
}

interface Invoice {
  id: string;
  date: string;
  total: string;
  download_url: string;
}

interface Feature {
  id: number;
  slug: string;
  name: string;
  type: string;
  description: string;
}

interface Plan {
  id: number;
  name: string;
  slug: string;
  price: string;
  description: string;
  is_active: boolean;
  video_storage_limit_gb?: number;
  features?: Feature[];
  promo_price?: string | null;
  promo_duration_months?: number | null;
  promo_label?: string | null;
  is_featured?: boolean;
  marketing_features?: string | null;
}

@Component({
  selector: 'app-facturacion',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './facturacion.html',
  styleUrls: ['./facturacion.css']
})
export class FacturacionComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private apiUrl = `${environment.apiUrl}/billing`;

  status = signal<BillingStatus | null>(null);
  invoices = signal<Invoice[]>([]);
  plans = signal<Plan[]>([]);
  isLoading = signal<boolean>(true);
  isRedirecting = signal<boolean>(false);
  
  // URL params state
  successMsg = signal<boolean>(false);
  cancelMsg = signal<boolean>(false);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['success']) {
        this.successMsg.set(true);
      }
      if (params['cancel']) {
        this.cancelMsg.set(true);
      }
    });
    this.loadBillingData();
  }

  async loadBillingData() {
    this.isLoading.set(true);
    try {
      const [statusData, invoicesData, plansData] = await Promise.all([
        this.http.get<BillingStatus>(`${this.apiUrl}/status`).toPromise(),
        this.http.get<Invoice[]>(`${this.apiUrl}/invoices`).toPromise(),
        this.http.get<Plan[]>(`${environment.apiUrl}/plans-public`).toPromise()
      ]);
      
      this.status.set(statusData || null);
      this.invoices.set(invoicesData || []);
      this.plans.set(plansData || []);
    } catch (error) {
      console.error('Error cargando datos de facturación', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async subscribe(planSlug: string) {
    this.isRedirecting.set(true);
    try {
      const response = await this.http.post<{ url: string }>(`${this.apiUrl}/checkout`, {
        plan_slug: planSlug
      }).toPromise();

      if (response && response.url) {
        window.location.href = response.url;
      } else {
        alert('No se pudo generar la sesión de pago.');
        this.isRedirecting.set(false);
      }
    } catch (error) {
      console.error('Error al iniciar suscripción', error);
      alert('Ocurrió un error al conectar con Stripe.');
      this.isRedirecting.set(false);
    }
  }

  async openPortal() {
    this.isRedirecting.set(true);
    try {
      const response = await this.http.post<{ url: string }>(`${this.apiUrl}/portal`, {}).toPromise();
      if (response && response.url) {
        window.location.href = response.url;
      } else {
        alert('No se pudo generar el portal de facturación.');
        this.isRedirecting.set(false);
      }
    } catch (error) {
      console.error('Error al abrir portal de facturación', error);
      alert('Ocurrió un error al conectar con el portal de Stripe.');
      this.isRedirecting.set(false);
    }
  }

  downloadInvoice(invoice: Invoice) {
    window.open(invoice.download_url, '_blank');
  }

  getTranslateStatus(status: string): string {
    const translations: { [key: string]: string } = {
      'active': 'Suscrito',
      'trialing': 'Periodo de prueba',
      'past_due': 'Pago pendiente / Retrasado',
      'unpaid': 'Impagado',
      'canceled': 'Cancelado / Finalizado',
      'inactive': 'Inactivo'
    };
    return translations[status] || status;
  }

  getPlanBySlug(slug: string): Plan | undefined {
    return this.plans().find(p => p.slug === slug || (slug === 'profesional' && p.slug === 'pro'));
  }

  getIntegerPart(val: string | number | undefined | null): string {
    if (val === undefined || val === null) return '0';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return Math.floor(num).toString();
  }

  getDecimalPart(val: string | number | undefined | null): string {
    if (val === undefined || val === null) return '00';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    const decimals = (num % 1).toFixed(2).substring(2);
    return decimals;
  }

  getMarketingFeatures(plan: Plan): { text: string }[] {
    if (!plan.marketing_features) return [];
    return plan.marketing_features
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Strip leading markdown bullets like "- " or "* " if present
        let clean = line;
        if (line.startsWith('- ') || line.startsWith('* ')) {
          clean = line.substring(2);
        }
        return { text: clean };
      });
  }
}
