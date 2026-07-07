import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FundTransactionService, FundTransaction } from '../../services/fund-transaction.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastService } from '../../services/toast.service';
import { TenantService } from '../../services/tenant.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-finanzas-socio',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="finanzas-container">
      <div class="header">
        <h1>🐾 Provisión de Fondos</h1>
        <p class="subtitle">Consulta tus depósitos y gastos en el club</p>
      </div>

      @if (isLoading()) {
        <div class="loading-spinner">
          <mat-spinner diameter="45"></mat-spinner>
        </div>
      } @else {
        <!-- Saldo Destacado -->
        <mat-card class="balance-card" [class.negative]="balance() < 0" [class.positive]="balance() > 0">
          <mat-card-content class="balance-content">
            <span class="balance-label">Tu Saldo Disponible</span>
            <h2 class="balance-amount">{{ balance() | currency:'EUR':'symbol':'1.2-2' }}</h2>
            <p class="balance-sub">
              @if (balance() > 0) {
                Tu cuenta está al día. ¡Gracias por tu provisión de fondos!
              } @else if (balance() === 0) {
                No tienes fondos acumulados. Contacta con el gestor para realizar un ingreso.
              } @else {
                Tienes un descubierto pendiente. Por favor, regulariza tu saldo con el gestor.
              }
            </p>
          </mat-card-content>
        </mat-card>

        <!-- Bono de Clases (solo con la funcionalidad activa) -->
        @if (classBonusesEnabled()) {
          <mat-card class="bonus-card" [class.empty-bonus]="bonusBalance() === 0">
            <mat-card-content class="balance-content">
              <span class="balance-label" style="display: inline-flex; align-items: center; gap: 6px;">
                <mat-icon style="font-size: 18px; width: 18px; height: 18px;">confirmation_number</mat-icon>
                Tu Bono de Clases
              </span>
              <h2 class="balance-amount">{{ bonusBalance() }} clase{{ bonusBalance() === 1 ? '' : 's' }}</h2>
              <p class="balance-sub">
                @if (bonusBalance() > 0) {
                  Cada vez que reserves plaza en una clase se consumirá una (se devuelve si cancelas). Tus clases no caducan.
                } @else {
                  No te quedan clases en el bono. Contacta con el club para recargarlo y poder reservar.
                }
              </p>
            </mat-card-content>
          </mat-card>
        }

        <h3 class="section-title">Historial de Movimientos</h3>

        <div class="transactions-list">
          @for (tx of transactions(); track tx.id) {
            <mat-card class="tx-card">
              <mat-card-content class="tx-content">
                <div class="tx-icon" [class.ingreso]="tx.type === 'ingreso'" [class.gasto]="tx.type === 'gasto'">
                  <mat-icon>{{ tx.type === 'ingreso' ? 'add_circle' : 'remove_circle' }}</mat-icon>
                </div>
                
                <div class="tx-details">
                  <div class="tx-concept">{{ tx.concept }}</div>
                  <div class="tx-meta">
                    <span class="tx-date">{{ tx.fecha | date:'dd/MM/yyyy HH:mm' }}</span>
                    <span class="tx-method" *ngIf="tx.payment_method">
                      {{ tx.payment_method | titlecase }}
                    </span>
                  </div>
                </div>

                <div class="tx-right">
                  <div class="tx-amount" [class.ingreso]="tx.type === 'ingreso'" [class.gasto]="tx.type === 'gasto'">
                    {{ tx.type === 'ingreso' ? '+' : '-' }} {{ tx.amount }} €
                  </div>
                  @if (tx.attachment_path) {
                    <a [href]="tx.attachment_path" target="_blank" mat-icon-button color="primary" class="tx-attachment-btn" title="Ver justificante">
                      <mat-icon>receipt</mat-icon>
                    </a>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          } @empty {
            <div class="empty-state">
              <div class="empty-icon-wrapper">
                <mat-icon class="empty-icon">account_balance_wallet</mat-icon>
              </div>
              <h4>Sin movimientos</h4>
              <p>Tu provisión de fondos no tiene movimientos registrados. Contacta con la directiva para realizar tu primer depósito.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .finanzas-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 1.5rem;
      padding-bottom: 5rem;
      font-family: 'Inter', Roboto, sans-serif;
    }
    .header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
    }
    .subtitle {
      color: var(--text-secondary);
      margin-top: 0.25rem;
      margin-bottom: 1.5rem;
    }
    .loading-spinner {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }
    .balance-card {
      border-radius: 1.25rem;
      border: none;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
      background: linear-gradient(135deg, #64748b 0%, #475569 100%);
      color: white;
      position: relative;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .balance-card::before {
      content: '';
      position: absolute;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      filter: blur(30px);
      top: -70px;
      right: -70px;
    }
    .balance-card::after {
      content: '';
      position: absolute;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.04);
      filter: blur(20px);
      bottom: -40px;
      left: -30px;
    }
    .balance-card.positive {
      background: linear-gradient(135deg, #10b981 0%, #047857 100%) !important;
    }
    .balance-card.negative {
      background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%) !important;
    }
    .bonus-card {
      border-radius: 1.25rem;
      border: none;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
      background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
      color: white;
      position: relative;
      overflow: hidden;
    }
    .bonus-card.empty-bonus {
      background: linear-gradient(135deg, #f59e0b 0%, #b45309 100%);
    }
    .balance-content {
      padding: 2rem !important;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      position: relative;
      z-index: 2;
    }
    .balance-label {
      font-size: 0.85rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.8) !important;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .balance-amount {
      font-size: 2.75rem;
      font-weight: 900;
      color: white !important;
      margin: 0.5rem 0;
      letter-spacing: -1px;
      text-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .balance-sub {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.9) !important;
      margin: 0;
      max-width: 400px;
    }
    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 1rem;
    }
    .transactions-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .tx-card {
      border-radius: 1rem;
      border: 1px solid #f1f5f9;
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .tx-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.04);
      border-color: #e2e8f0;
    }
    .tx-content {
      padding: 1rem !important;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .tx-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    }
    .tx-card:hover .tx-icon {
      transform: scale(1.05);
    }
    .tx-icon.ingreso {
      background-color: color-mix(in srgb, var(--success-color) 12%, transparent);
      color: var(--success-color);
    }
    .tx-icon.gasto {
      background-color: color-mix(in srgb, var(--error-color) 12%, transparent);
      color: var(--error-color);
    }
    .tx-details {
      flex: 1;
    }
    .tx-concept {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-main);
    }
    .tx-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--text-light);
      margin-top: 0.35rem;
    }
    .tx-date {
      color: var(--text-light);
    }
    .tx-method {
      background-color: #f1f5f9;
      color: var(--text-secondary);
      padding: 1px 8px;
      border-radius: 6px;
      font-weight: 500;
      font-size: 0.7rem;
    }
    .tx-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .tx-amount {
      font-size: 1.1rem;
      font-weight: 700;
    }
    .tx-amount.ingreso {
      color: var(--success-color);
    }
    .tx-amount.gasto {
      color: var(--error-color);
    }
    .tx-attachment-btn {
      width: 36px;
      height: 36px;
      line-height: 36px;
    }
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 1.25rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .empty-icon-wrapper {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background-color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
      border: 1px solid #e2e8f0;
    }
    .empty-icon {
      font-size: 32px !important;
      width: 32px !important;
      height: 32px !important;
      color: var(--text-light) !important;
      margin: 0 !important;
    }
    .empty-state h4 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-main);
      margin: 0;
    }
    .empty-state p {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-top: 0.5rem;
      margin-bottom: 0;
    }

  `]
})
export class FinanzasSocioComponent implements OnInit {
  private fundService = inject(FundTransactionService);
  private toast = inject(ToastService);
  private tenantService = inject(TenantService);
  private authService = inject(AuthService);

  transactions = signal<FundTransaction[]>([]);
  balance = signal<number>(0);
  isLoading = signal<boolean>(true);

  // Bono de clases (opt-in del gestor): el socio consulta aquí cuántas
  // clases le quedan, junto a su saldo de fondos.
  classBonusesEnabled = computed(() => {
    return this.tenantService.tenantInfo()?.settings?.['class_bonuses_enabled'] === true;
  });

  bonusBalance = computed(() => {
    return this.authService.currentUserSignal()?.class_bonus_balance ?? 0;
  });

  ngOnInit(): void {
    this.loadData();
    // Refresca el usuario para que el bono refleje recargas recientes del staff
    if (this.classBonusesEnabled()) {
      this.authService.refreshUserState().subscribe({ error: () => { } });
    }
  }

  loadData() {
    this.isLoading.set(true);
    this.fundService.getTransactions().then(res => {
      this.transactions.set(res.transactions);
      this.balance.set(res.balance);
      this.isLoading.set(false);
    }).catch(err => {
      this.toast.error('Error al cargar la provisión de fondos');
      this.isLoading.set(false);
    });
  }
}
