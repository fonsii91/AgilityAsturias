import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';

interface BillingStatus {
  subscribed: boolean;
  plan_name: string;
  plan_slug: string | null;
  stripe_status: string;
  pm_type: string | null;
  pm_last_four: string | null;
  ends_at: string | null;
  on_courtesy?: boolean;
  courtesy_until?: string | null;
  has_stripe_customer?: boolean;
}

interface Invoice {
  id: string;
  date: string;
  total: string;
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
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './facturacion.html',
  styleUrls: ['./facturacion.css']
})
export class FacturacionComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
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

    // Al volver del Checkout de Stripe, el webhook puede no haber llegado aún
    // (en local nunca llega): confirmamos la sesión contra Stripe ANTES de
    // pintar el estado, o el gestor vería "suscripción requerida" tras pagar.
    const sessionId = this.route.snapshot.queryParams['session_id'];
    if (this.route.snapshot.queryParams['success'] && sessionId) {
      this.confirmCheckout(sessionId);
    } else {
      this.loadBillingData();
    }
  }

  /** Verifica la sesión de Checkout con el backend y recarga el estado de facturación. */
  private async confirmCheckout(sessionId: string) {
    this.isLoading.set(true);
    try {
      await this.http.post(`${this.apiUrl}/sync-checkout`, { session_id: sessionId }).toPromise();
    } catch (error) {
      console.error('Error confirmando la sesión de pago', error);
      // No bloqueamos la página: el estado real se pinta igualmente al recargar.
    } finally {
      this.loadBillingData();
    }
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
        this.notifyError('No se pudo generar la sesión de pago.');
        this.isRedirecting.set(false);
      }
    } catch (error) {
      console.error('Error al iniciar suscripción', error);
      this.notifyError(this.extractErrorMessage(error, 'Ocurrió un error al conectar con Stripe.'));
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
        this.notifyError('No se pudo generar el portal de facturación.');
        this.isRedirecting.set(false);
      }
    } catch (error) {
      console.error('Error al abrir portal de facturación', error);
      this.notifyError(this.extractErrorMessage(error, 'Ocurrió un error al conectar con el portal de Stripe.'));
      this.isRedirecting.set(false);
    }
  }

  /** Extrae el mensaje del backend (JSON { message }) si existe; si no, usa el genérico. */
  private extractErrorMessage(error: unknown, fallback: string): string {
    const backendMessage = (error as HttpErrorResponse)?.error?.message;
    return typeof backendMessage === 'string' && backendMessage.length > 0 ? backendMessage : fallback;
  }

  private notifyError(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
  }

  async downloadInvoice(invoice: Invoice) {
    // Descarga vía HttpClient para que el interceptor adjunte el token Bearer
    // (abrir la URL en una pestaña nueva devolvía 401 al no viajar el header).
    try {
      const blob = await this.http
        .get(`${this.apiUrl}/invoices/${invoice.id}/download`, { responseType: 'blob' })
        .toPromise();

      if (!blob) {
        throw new Error('Respuesta vacía');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `factura-${invoice.date}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando la factura', error);
      this.notifyError('No se pudo descargar la factura. Inténtalo de nuevo.');
    }
  }

  /**
   * Hay suscripción de pago REAL: activa, con cliente en Stripe y fuera de cortesía.
   * Solo en este caso tiene sentido mostrar la tarjeta "Activo" con el portal de Stripe.
   * Un club en cortesía (o con datos mock sin cliente) debe ver los planes para pagar.
   */
  hasPaidSubscription(): boolean {
    const s = this.status();
    return !!s?.subscribed && !!s?.has_stripe_customer && !s?.on_courtesy;
  }

  /** Días restantes del periodo de cortesía (0 si no aplica o ya pasó). */
  courtesyDaysLeft(): number {
    const until = this.status()?.courtesy_until;
    if (!until) return 0;
    const diffMs = new Date(until).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
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
