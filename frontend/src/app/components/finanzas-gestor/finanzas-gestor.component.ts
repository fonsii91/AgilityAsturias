import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FundTransactionService, FundTransaction } from '../../services/fund-transaction.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastService } from '../../services/toast.service';
import { EmptyStateComponent } from '../ui/empty-state/empty-state';

export interface UserWithBalance {
  id: number;
  name: string;
  email: string;
  balance: number;
}

@Component({
  selector: 'app-finanzas-gestor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    EmptyStateComponent
  ],
  template: `
    <div class="finanzas-gestor-container" 
         [class.user-selected]="selectedUserId() !== null"
         [class.mobile-tab-dashboard]="activeMobileTab() === 'dashboard'"
         [class.mobile-tab-socios]="activeMobileTab() === 'socios'">
      
      <!-- Selector de Pestañas para Móvil (Elimina scroll excesivo) -->
      <div class="mobile-tabs-switcher">
        <button type="button" class="mobile-tab-btn" [class.active]="activeMobileTab() === 'dashboard'" (click)="setMobileTab('dashboard')">
          <mat-icon>dashboard</mat-icon> Resumen
        </button>
        <button type="button" class="mobile-tab-btn" [class.active]="activeMobileTab() === 'socios'" (click)="setMobileTab('socios')">
          <mat-icon>people</mat-icon> Socios
        </button>
      </div>

      <div class="dashboard-layout">
        
        <!-- BARRA LATERAL: Buscador de Socios -->
        <div class="sidebar-panel">
          <div class="sidebar-header">
            <h2>👥 Socios</h2>
            <p class="subtitle">Selecciona un socio para gestionar</p>
          </div>

          <mat-form-field appearance="outline" class="w-full search-field">
            <mat-label>Buscar socio...</mat-label>
            <mat-icon matPrefix>search</mat-icon>
            <input matInput placeholder="Ej: Alfonso" [(ngModel)]="searchQuery" (input)="filterUsers()">
          </mat-form-field>

          <div class="sidebar-filter-tabs">
            <button class="filter-tab" [class.active]="sidebarFilter() === 'todos'" (click)="setSidebarFilter('todos')">
              Todos
            </button>
            <button class="filter-tab" [class.active]="sidebarFilter() === 'saldo'" (click)="setSidebarFilter('saldo')">
              Con Saldo
            </button>
            <button class="filter-tab" [class.active]="sidebarFilter() === 'deudores'" (click)="setSidebarFilter('deudores')">
              Deudores 🔴
            </button>
          </div>

          <div class="users-vertical-list">
            @for (user of filteredUsers(); track user.id) {
              <div class="user-chip-row" [class.selected]="selectedUserId() === user.id" (click)="selectUser(user.id)">
                <div class="user-avatar-circle" [class.selected]="selectedUserId() === user.id">
                  {{ user.name.charAt(0) }}
                </div>
                <div class="user-row-info">
                  <div class="user-name-text">{{ user.name }}</div>
                  <div class="user-email-text">{{ user.email }}</div>
                </div>
                <div class="user-row-balance" [class.positive]="user.balance > 0" [class.negative]="user.balance < 0">
                  {{ user.balance | currency:'EUR':'symbol':'1.2-2' }}
                </div>
              </div>
            } @empty {
              <div class="no-users-box">No se encontraron socios.</div>
            }
          </div>
        </div>

        <!-- CONTENIDO PRINCIPAL -->
        <div class="main-content-panel">
          
          @if (selectedUserId()) {
            <!-- DETALLE DEL SOCIO SELECCIONADO -->
            <div class="member-detail-view">
              
              <div class="detail-header-nav">
                <button mat-button class="btn-back" (click)="deselectUser()">
                  <mat-icon>arrow_back</mat-icon> 
                  <span class="desktop-back-text">Ver Dashboard General</span>
                  <span class="mobile-back-text">Volver</span>
                </button>
                <div class="active-member-badge" *ngIf="selectedUser()">
                  <span class="active-member-name">{{ selectedUser()?.name }}</span>
                  <span class="active-member-balance" [class.positive]="balance() > 0" [class.negative]="balance() < 0">
                    ({{ balance() | currency:'EUR':'symbol':'1.2-2' }})
                  </span>
                </div>
              </div>

              @if (isLoadingTransactions()) {
                <div class="loading-spinner">
                  <mat-spinner diameter="40"></mat-spinner>
                </div>
              } @else {
                <!-- Saldo Destacado -->
                <mat-card class="balance-card" [class.negative]="balance() < 0" [class.positive]="balance() > 0">
                  <mat-card-content class="balance-content">
                    <span class="balance-label">Saldo de {{ selectedUser()?.name }}</span>
                    <h2 class="balance-amount">{{ balance() | currency:'EUR':'symbol':'1.2-2' }}</h2>
                    <p class="balance-sub">
                      @if (balance() > 0) {
                        Saldo positivo. Cubre futuras cuotas y actividades.
                      } @else if (balance() === 0) {
                        Sin fondos acumulados.
                      } @else {
                        Saldo deudor. Pendiente de ingresar fondos.
                      }
                    </p>
                  </mat-card-content>
                </mat-card>

                <!-- Historial de Movimientos -->
                <div class="tx-section-header">
                  <div class="tx-title-group">
                    <h3>Historial de Movimientos</h3>
                    <span class="tx-count-badge">{{ filteredTransactions().length }}</span>
                  </div>
                  <button mat-flat-button color="accent" class="add-tx-btn" (click)="openAddPanel()">
                    <mat-icon>add</mat-icon> Registrar Movimiento
                  </button>
                </div>

                <!-- Filtros de transacciones -->
                <div class="tx-filters-bar">
                  <mat-form-field appearance="outline" class="tx-search-input">
                    <mat-label>Filtrar por concepto...</mat-label>
                    <mat-icon matPrefix>filter_list</mat-icon>
                    <input matInput placeholder="Ej: Cuota" [value]="txSearchQuery()" (input)="onTxSearchChange($event)">
                  </mat-form-field>

                  <mat-button-toggle-group [value]="txTypeFilter()" (change)="onTxTypeFilterChange($event)" class="tx-type-toggle" [hideSingleSelectionIndicator]="true">
                    <mat-button-toggle value="todos">Todos</mat-button-toggle>
                    <mat-button-toggle value="ingreso">Ingresos</mat-button-toggle>
                    <mat-button-toggle value="gasto">Gastos</mat-button-toggle>
                  </mat-button-toggle-group>
                </div>

                <div class="transactions-list">
                  @for (tx of filteredTransactions(); track tx.id) {
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
                            <span class="tx-creator" *ngIf="tx.creator">
                              por {{ tx.creator.name }}
                            </span>
                          </div>
                        </div>

                        <div class="tx-right">
                          <div class="tx-amount" [class.ingreso]="tx.type === 'ingreso'" [class.gasto]="tx.type === 'gasto'">
                            {{ tx.type === 'ingreso' ? '+' : '-' }} {{ tx.amount }} €
                          </div>
                          @if (tx.attachment_path) {
                            <a [href]="tx.attachment_path" target="_blank" mat-icon-button color="primary" title="Ver justificante">
                              <mat-icon>receipt</mat-icon>
                            </a>
                          }
                          <button mat-icon-button color="warn" (click)="askDeleteTransaction(tx)" title="Anular movimiento">
                            <mat-icon>delete</mat-icon>
                          </button>
                        </div>
                      </mat-card-content>
                    </mat-card>
                  } @empty {
                    <app-empty-state
                      icon="account_balance_wallet"
                      variant="no-results"
                      title="Sin movimientos"
                      message="No se encontraron movimientos con los criterios aplicados.">
                    </app-empty-state>
                  }
                </div>
              }
            </div>
          } @else {
            <!-- DASHBOARD FINANCIERO GLOBAL (HOME STATE) -->
            <div class="dashboard-home-view">
              <div class="dashboard-welcome">
                <div class="welcome-header-row">
                  <div>
                    <h1>💰 Panel de Provisión de Fondos</h1>
                    <p class="subtitle">Administra los depósitos y gastos de los socios del club de un vistazo</p>
                  </div>
                  <button mat-flat-button color="primary" class="add-bulk-tx-btn" (click)="openBulkAddPanel()">
                    <mat-icon>group_add</mat-icon> Registro Múltiple
                  </button>
                </div>
              </div>

              <!-- Bento Grid de KPIs -->
              <div class="bento-grid">
                <div class="bento-item kpi-card">
                  <div class="bento-icon-wrapper blue">
                    <mat-icon>account_balance</mat-icon>
                  </div>
                  <span class="kpi-label">Caja Total del Club</span>
                  <h2 class="kpi-value" [class.positive]="totalCaja() > 0" [class.negative]="totalCaja() < 0">
                    {{ totalCaja() | currency:'EUR':'symbol':'1.2-2' }}
                  </h2>
                  <p class="kpi-sub">Fórmula: Ingresos - Gastos totales</p>
                </div>

                <div class="bento-item kpi-card">
                  <div class="bento-icon-wrapper green">
                    <mat-icon>trending_up</mat-icon>
                  </div>
                  <span class="kpi-label">Fondos a Favor</span>
                  <h2 class="kpi-value positive">
                    {{ totalFondos() | currency:'EUR':'symbol':'1.2-2' }}
                  </h2>
                  <p class="kpi-sub">Suma de saldos positivos de socios</p>
                </div>

                <div class="bento-item kpi-card negative-box" (click)="filterSidebarToDeudores()">
                  <div class="bento-icon-wrapper red">
                    <mat-icon>trending_down</mat-icon>
                  </div>
                  <span class="kpi-label">Deuda Acumulada</span>
                  <h2 class="kpi-value negative">
                    {{ totalDeuda() | currency:'EUR':'symbol':'1.2-2' }}
                  </h2>
                  <p class="kpi-sub">Suma de descubiertos. Clic para filtrar.</p>
                </div>

                <div class="bento-item kpi-card warning-box" (click)="filterSidebarToDeudores()">
                  <div class="bento-icon-wrapper orange">
                    <mat-icon>error_outline</mat-icon>
                  </div>
                  <span class="kpi-label">Socios Deudores</span>
                  <h2 class="kpi-value warning">
                    {{ deudoresCount() }}
                  </h2>
                  <p class="kpi-sub">Socios en números rojos. Clic para ver.</p>
                </div>
              </div>

              <!-- Actividad Reciente Global -->
              <div class="recent-feed-section">
                <h3>Feed de Actividad Reciente</h3>
                <div class="feed-list">
                  @for (tx of recentTransactions(); track tx.id) {
                    <div class="feed-item-row" (click)="selectUser(tx.user_id)">
                      <div class="feed-icon" [class.ingreso]="tx.type === 'ingreso'" [class.gasto]="tx.type === 'gasto'">
                        <mat-icon>{{ tx.type === 'ingreso' ? 'add' : 'remove' }}</mat-icon>
                      </div>
                      <div class="feed-body">
                        <div class="feed-title">
                          <strong>{{ tx.user?.name }}</strong>: {{ tx.concept }}
                        </div>
                        <div class="feed-meta">
                          {{ tx.fecha | date:'dd/MM/yyyy HH:mm' }} • Método: {{ tx.payment_method | titlecase }} • por {{ tx.creator?.name }}
                        </div>
                      </div>
                      <div class="feed-amount" [class.ingreso]="tx.type === 'ingreso'" [class.gasto]="tx.type === 'gasto'">
                        {{ tx.type === 'ingreso' ? '+' : '-' }} {{ tx.amount }} €
                      </div>
                    </div>
                  } @empty {
                    <app-empty-state
                      icon="account_balance_wallet"
                      title="La caja del club está vacía"
                      message="Todavía no se ha registrado ningún ingreso ni gasto. Registra el primer movimiento para empezar a llevar las cuentas de tus socios."
                      ctaLabel="Registrar el primer movimiento"
                      (ctaClick)="openBulkAddPanel()">
                    </app-empty-state>
                  }
                </div>
              </div>
            </div>
          }

        </div>
      </div>
    </div>

    <!-- Hojas inferiores / Modal de registro de transacciones -->
    <div class="bottom-sheet-backdrop" [class.show]="isAddPanelOpen()" (click)="closeAddPanel()"></div>
    <div class="bottom-sheet-panel" [class.show]="isAddPanelOpen()">
      <div class="sheet-drag-handle"></div>
      <div class="sheet-header">
        <h2>{{ isBulkMode() ? 'Registro Múltiple de Movimientos' : 'Registrar Movimiento' }}</h2>
        <button mat-icon-button (click)="closeAddPanel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="txForm" (ngSubmit)="saveTransaction()" class="sheet-form">
        <div class="sheet-body">
          
          <!-- Selección Múltiple de Socios (Solo en modo bulk) -->
          @if (isBulkMode()) {
            <div class="bulk-members-section">
              <label class="section-label">Seleccionar Socios ({{ bulkSelectedUserIds().length }} seleccionados)</label>
              
              <div class="bulk-select-actions">
                <button type="button" mat-stroked-button class="btn-bulk-select" (click)="toggleAllBulkUsers(true)">
                  Todos
                </button>
                <button type="button" mat-stroked-button class="btn-bulk-select" (click)="selectDebtorsInBulk()">
                  Deudores 🔴
                </button>
                <button type="button" mat-stroked-button class="btn-bulk-select" (click)="toggleAllBulkUsers(false)">
                  Ninguno
                </button>
              </div>

              <mat-form-field appearance="outline" class="w-full bulk-search">
                <mat-label>Filtrar socios en la lista...</mat-label>
                <mat-icon matPrefix>search</mat-icon>
                <input matInput placeholder="Buscar por nombre o email" [value]="bulkSearchQuery()" (input)="onBulkSearchChange($event)">
              </mat-form-field>

              <div class="bulk-members-scroll">
                @for (user of filteredBulkUsers(); track user.id) {
                  <div class="bulk-member-checkbox-row" [class.selected]="bulkSelectedUserIds().includes(user.id)" (click)="toggleBulkUser(user.id)">
                    <div class="checkbox-wrapper">
                      <mat-icon class="checkbox-icon">
                        {{ bulkSelectedUserIds().includes(user.id) ? 'check_box' : 'check_box_outline_blank' }}
                      </mat-icon>
                    </div>
                    <div class="bulk-member-info">
                      <span class="bulk-member-name">{{ user.name }}</span>
                      <span class="bulk-member-balance" [class.positive]="user.balance > 0" [class.negative]="user.balance < 0">
                        ({{ user.balance | currency:'EUR':'symbol':'1.2-2' }})
                      </span>
                    </div>
                  </div>
                } @empty {
                  <div class="no-members-found">No se encontraron socios.</div>
                }
              </div>
            </div>
          }

          <!-- Tipo de Movimiento (Toggle) -->
          <div class="input-group">
            <label>Tipo de Movimiento</label>
            <mat-button-toggle-group formControlName="type" class="w-full toggle-group" [hideSingleSelectionIndicator]="true">
              <mat-button-toggle value="ingreso" class="w-half btn-ingreso">
                <mat-icon>add_circle_outline</mat-icon> Ingreso
              </mat-button-toggle>
              <mat-button-toggle value="gasto" class="w-half btn-gasto">
                <mat-icon>remove_circle_outline</mat-icon> Gasto
              </mat-button-toggle>
            </mat-button-toggle-group>
          </div>

          <!-- Concepto -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Concepto / Explicación</mat-label>
            <input matInput formControlName="concept" placeholder="Ej: Pago cuota Junio 2026">
            <mat-error *ngIf="txForm.get('concept')?.hasError('required')">El concepto es obligatorio</mat-error>
          </mat-form-field>

          <!-- Importe -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Importe (€)</mat-label>
            <input matInput type="number" formControlName="amount" placeholder="0.00" inputmode="decimal" min="0.01">
            <mat-error *ngIf="txForm.get('amount')?.hasError('required')">El importe es obligatorio</mat-error>
            <mat-error *ngIf="txForm.get('amount')?.hasError('min')">Debe ser mayor de 0.00 €</mat-error>
          </mat-form-field>

          <!-- Método de Pago (MatSelect) -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Método de Pago</mat-label>
            <mat-select formControlName="payment_method" required>
              <mat-option value="transferencia">Transferencia Bancaria</mat-option>
              <mat-option value="bizum">Bizum</mat-option>
              <mat-option value="efectivo">Efectivo</mat-option>
              <mat-option value="tarjeta">Tarjeta de Crédito</mat-option>
              <mat-option value="otro">Otro</mat-option>
            </mat-select>
            <mat-error *ngIf="txForm.get('payment_method')?.hasError('required')">El método de pago es obligatorio</mat-error>
          </mat-form-field>

          <!-- Justificante / Archivo Drag and Drop -->
          <div class="file-upload-group">
            <label>Justificante (Imagen o PDF, máx. 5MB)</label>
            <div class="file-drop-area" 
                 [class.has-file]="selectedFile()" 
                 [class.drag-over]="isDraggingOver()"
                 (click)="fileInput.click()"
                 (dragover)="onDragOver($event)"
                 (dragleave)="onDragLeave($event)"
                 (drop)="onDrop($event)">
              <mat-icon class="upload-icon">upload_file</mat-icon>
              <span>{{ selectedFileName() || 'Subir justificante/recibo' }}</span>
              <p class="drag-hint">o arrastra y suelta el archivo aquí</p>
              <input #fileInput type="file" accept="image/*,application/pdf" class="hidden-input" (change)="onFileSelected($event)">
            </div>
            <button type="button" *ngIf="selectedFile()" mat-button color="warn" (click)="clearFile($event)">Quitar archivo</button>
          </div>

        </div>

        <div class="sheet-actions">
          <button type="button" mat-button (click)="closeAddPanel()">Cancelar</button>
          <button type="submit" mat-flat-button color="accent" class="btn-submit" [disabled]="txForm.invalid || isSaving()">
            @if (isSaving()) {
              <mat-spinner diameter="20" style="margin-right: 8px;"></mat-spinner> Guardando...
            } @else {
              Registrar
            }
          </button>
        </div>
      </form>
    </div>

    <!-- Modal de confirmación personalizado de borrado/anulación -->
    <div class="confirm-modal-backdrop" [class.show]="confirmDeleteTx() !== null" (click)="cancelDeleteTransaction()"></div>
    <div class="confirm-modal-panel" [class.show]="confirmDeleteTx() !== null">
      <div class="confirm-modal-icon-wrapper">
        <mat-icon>warning</mat-icon>
      </div>
      <h2>¿Anular Movimiento?</h2>
      <p class="confirm-text">
        ¿Estás seguro de que deseas anular el movimiento <strong>"{{ confirmDeleteTx()?.concept }}"</strong> por valor de <strong>{{ confirmDeleteTx()?.amount }} €</strong>?
      </p>
      <p class="confirm-warning">
        Esta acción es irreversible y afectará al saldo del socio.
      </p>
      <div class="confirm-actions">
        <button mat-button class="btn-cancel" (click)="cancelDeleteTransaction()">Cancelar</button>
        <button mat-flat-button color="warn" class="btn-confirm" (click)="executeDeleteTransaction()">Anular Movimiento</button>
      </div>
    </div>
  `,
  styles: [`
    .finanzas-gestor-container {
      padding: 1.5rem;
      font-family: 'Inter', Roboto, sans-serif;
      max-width: 1400px;
      margin: 0 auto;
      min-height: calc(100vh - 120px);
    }
    
    /* Layout split view */
    .dashboard-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 2rem;
      align-items: start;
    }

    @media (max-width: 1024px) {
      .dashboard-layout {
        grid-template-columns: 280px 1fr;
        gap: 1.5rem;
      }
    }

    .mobile-tabs-switcher {
      display: none;
    }

    @media (max-width: 768px) {
      .dashboard-layout {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .main-content-panel {
        order: 1;
      }
      .sidebar-panel {
        order: 2;
      }

      .mobile-tabs-switcher {
        display: flex;
        background: #f1f5f9;
        padding: 4px;
        border-radius: 0.75rem;
        margin-bottom: 1.25rem;
        gap: 4px;
        border: 1px solid #cbd5e1;
      }

      .mobile-tab-btn {
        flex: 1;
        border: none;
        background: transparent;
        padding: 10px 16px;
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-secondary);
        border-radius: 0.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s ease;
      }

      .mobile-tab-btn mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .mobile-tab-btn.active {
        background: white;
        color: var(--primary-color);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
      }

      /* Control de visibilidad según pestaña activa en móvil (cuando no hay socio seleccionado) */
      .finanzas-gestor-container:not(.user-selected).mobile-tab-dashboard .sidebar-panel {
        display: none !important;
      }

      .finanzas-gestor-container:not(.user-selected).mobile-tab-socios .main-content-panel {
        display: none !important;
      }

      /* Ocultar el selector de pestañas en móvil cuando hay un socio seleccionado (para maximizar espacio) */
      .finanzas-gestor-container.user-selected .mobile-tabs-switcher {
        display: none !important;
      }
    }

    /* Sidebar styles */
    .sidebar-panel {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 1.25rem;
      padding: 1.25rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
      height: calc(100vh - 160px);
      position: sticky;
      top: 24px;
    }

    @media (max-width: 768px) {
      .sidebar-panel {
        height: auto;
        position: relative;
        top: 0;
      }
    }

    .sidebar-header h2 {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
      color: var(--text-main);
    }

    .sidebar-header .subtitle {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-top: 0.15rem;
      margin-bottom: 1rem;
    }

    .search-field {
      margin-bottom: 0.75rem;
    }

    /* Sidebar Tabs */
    .sidebar-filter-tabs {
      display: flex;
      gap: 0.25rem;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 0.75rem;
      margin-bottom: 1rem;
    }

    .filter-tab {
      flex: 1;
      border: none;
      background: transparent;
      padding: 6px 4px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }

    .filter-tab:hover {
      color: var(--text-main);
    }

    .filter-tab.active {
      background: white;
      color: var(--primary-color);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    /* Vertical Users List */
    .users-vertical-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-right: 2px;
    }

    .users-vertical-list::-webkit-scrollbar {
      width: 4px;
    }

    .users-vertical-list::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 2px;
    }

    .user-chip-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.75rem;
      border-radius: 0.75rem;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .user-chip-row:hover {
      background: white;
      border-color: #cbd5e1;
      transform: translateY(-1px);
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
    }

    .user-chip-row.selected {
      background: color-mix(in srgb, var(--primary-color) 8%, white);
      border-color: var(--primary-color);
      box-shadow: 0 4px 10px color-mix(in srgb, var(--primary-color) 8%, transparent);
    }

    .user-avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--primary-color) 10%, white);
      color: var(--primary-color);
      font-weight: 700;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
      text-transform: uppercase;
      transition: all 0.2s;
    }

    .user-avatar-circle.selected {
      background: var(--primary-color);
      color: white;
    }

    .user-chip-row.selected .user-avatar-circle {
      background: var(--primary-color);
      color: white;
    }

    .user-row-info {
      flex: 1;
      min-width: 0;
    }

    .user-name-text {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email-text {
      font-size: 0.7rem;
      color: var(--text-light);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-row-balance {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-secondary);
    }

    .user-row-balance.positive {
      color: var(--success-color);
    }

    .user-row-balance.negative {
      color: var(--error-color);
    }

    .no-users-box {
      text-align: center;
      padding: 1.5rem;
      font-size: 0.8rem;
      color: var(--text-light);
    }

    /* Main content panel */
    .main-content-panel {
      min-width: 0;
    }

    /* Dashboard Home State */
    .dashboard-home-view {
      animation: fadeIn 0.4s ease-out;
    }

    .dashboard-welcome h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
      letter-spacing: -0.5px;
    }

    .dashboard-welcome .subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
      margin-bottom: 1.75rem;
    }

    .welcome-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    @media (max-width: 576px) {
      .welcome-header-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }
      .add-bulk-tx-btn {
        width: 100%;
      }
    }

    .add-bulk-tx-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0.5rem !important;
      background-color: var(--primary-color) !important;
      color: white !important;
      border-radius: 0.75rem !important;
      font-weight: 700 !important;
      height: 40px !important;
      padding: 0 1.25rem !important;
      border: none !important;
      box-shadow: 0 4px 10px color-mix(in srgb, var(--primary-color) 30%, transparent) !important;
      transition: all 0.2s !important;
      cursor: pointer !important;
    }

    .add-bulk-tx-btn:hover {
      background-color: var(--primary-blue-dark) !important;
      transform: translateY(-1px) !important;
    }

    .add-bulk-tx-btn mat-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
    }

    /* Bento Grid */
    .bento-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 1200px) {
      .bento-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 480px) {
      .bento-grid {
        grid-template-columns: 1fr;
      }
    }

    .bento-item {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 1.25rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.01), 0 2px 4px -1px rgba(0, 0, 0, 0.01);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .bento-item:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.08);
      border-color: #cbd5e1;
    }

    .bento-icon-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .bento-icon-wrapper mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .bento-icon-wrapper.blue {
      background: color-mix(in srgb, var(--primary-color) 12%, transparent);
      color: var(--primary-color);
    }

    .bento-icon-wrapper.green {
      background: color-mix(in srgb, var(--success-color) 12%, transparent);
      color: var(--success-color);
    }

    .bento-icon-wrapper.red {
      background: color-mix(in srgb, var(--error-color) 12%, transparent);
      color: var(--error-color);
    }

    .bento-icon-wrapper.orange {
      background: rgba(246, 211, 18, 0.15);
      color: #b39700;
    }

    .kpi-label {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-light);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .kpi-value {
      font-size: 1.75rem;
      font-weight: 800;
      margin: 0.5rem 0;
      color: var(--text-main);
      letter-spacing: -0.5px;
    }

    .kpi-value.positive {
      color: var(--success-color);
    }

    .kpi-value.negative {
      color: var(--error-color);
    }

    .kpi-value.warning {
      color: #b39700;
    }

    .kpi-sub {
      font-size: 0.7rem;
      color: var(--text-light);
      margin: 0;
    }

    .negative-box, .warning-box {
      cursor: pointer;
    }

    /* Recent feed global */
    .recent-feed-section {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 1.25rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.01);
    }

    .recent-feed-section h3 {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0 0 1.25rem 0;
      color: var(--text-main);
    }

    .feed-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .feed-item-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      background: #f8fafc;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
    }

    .feed-item-row:hover {
      border-color: #cbd5e1;
      background: white;
      transform: translateX(3px);
      box-shadow: 0 2px 5px rgba(0,0,0,0.02);
    }

    .feed-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .feed-icon mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .feed-icon.ingreso {
      background: color-mix(in srgb, var(--success-color) 12%, transparent);
      color: var(--success-color);
    }

    .feed-icon.gasto {
      background: color-mix(in srgb, var(--error-color) 12%, transparent);
      color: var(--error-color);
    }

    .feed-body {
      flex: 1;
      min-width: 0;
    }

    .feed-title {
      font-size: 0.85rem;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .feed-meta {
      font-size: 0.7rem;
      color: var(--text-light);
      margin-top: 0.15rem;
    }

    .feed-amount {
      font-size: 0.9rem;
      font-weight: 700;
    }

    .feed-amount.ingreso {
      color: var(--success-color);
    }

    .feed-amount.gasto {
      color: var(--error-color);
    }

    .no-activity-box {
      text-align: center;
      padding: 2.5rem;
      color: var(--text-light);
    }

    .no-activity-box mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #cbd5e1;
      margin-bottom: 0.5rem;
    }

    .no-activity-box p {
      font-size: 0.85rem;
      margin: 0;
    }

    /* Detail View */
    .member-detail-view {
      animation: fadeIn 0.4s ease-out;
    }

    .detail-header-nav {
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .btn-back {
      font-size: 0.8rem !important;
      font-weight: 600 !important;
      color: var(--text-secondary) !important;
      padding-left: 0 !important;
    }

    .btn-back mat-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      margin-right: 4px !important;
    }

    .desktop-back-text {
      display: inline;
    }

    .mobile-back-text {
      display: none;
    }

    .active-member-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: white;
      border: 1px solid #cbd5e1;
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }

    .active-member-name {
      color: var(--text-main);
    }

    .active-member-balance {
      font-weight: 700;
    }

    .active-member-balance.positive {
      color: var(--success-color);
    }

    .active-member-balance.negative {
      color: var(--error-color);
    }

    @media (max-width: 768px) {
      .detail-header-nav {
        position: sticky;
        top: 0;
        z-index: 100;
        background: var(--surface-background);
        padding: 0.65rem 0;
        border-bottom: 1px solid #cbd5e1;
        margin-bottom: 1rem;
      }

      .desktop-back-text {
        display: none;
      }

      .mobile-back-text {
        display: inline;
      }

      .active-member-badge {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
      }

      /* Hide sidebar on mobile when a user is selected */
      .finanzas-gestor-container.user-selected .sidebar-panel {
        display: none !important;
      }
    }

    /* Balance Card Premium */
    .balance-card {
      border-radius: 1.25rem;
      border: none;
      box-shadow: 0 10px 25px -10px rgba(0, 0, 0, 0.08);
      margin-bottom: 1.5rem;
      background: linear-gradient(135deg, #64748b 0%, #475569 100%);
      color: white;
      position: relative;
      overflow: hidden;
      transition: all 0.3s;
    }

    .balance-card::before {
      content: '';
      position: absolute;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      filter: blur(25px);
      top: -60px;
      right: -60px;
    }

    .balance-card::after {
      content: '';
      position: absolute;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.04);
      filter: blur(15px);
      bottom: -30px;
      left: -20px;
    }

    .balance-card.positive {
      background: linear-gradient(135deg, #10b981 0%, #047857 100%) !important;
    }

    .balance-card.negative {
      background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%) !important;
    }

    .balance-content {
      padding: 1.75rem !important;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      position: relative;
      z-index: 2;
    }

    .balance-label {
      font-size: 0.8rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.8) !important;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .balance-amount {
      font-size: 2.5rem;
      font-weight: 900;
      color: white !important;
      margin: 0.5rem 0;
      letter-spacing: -1px;
      text-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .balance-sub {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.9) !important;
      margin: 0;
      max-width: 400px;
    }

    /* History section headers */
    .tx-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .tx-title-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tx-title-group h3 {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0;
      color: var(--text-main);
    }

    .tx-count-badge {
      font-size: 0.7rem;
      font-weight: 700;
      background: #f1f5f9;
      color: var(--text-secondary);
      padding: 2px 8px;
      border-radius: 10px;
    }

    .add-tx-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0.5rem !important;
      background-color: var(--accent-orange, #F6D312) !important;
      color: var(--text-main) !important;
      border-radius: 0.75rem !important;
      font-weight: 700 !important;
      height: 38px !important;
      padding: 0 1rem !important;
      border: none !important;
      box-shadow: 0 4px 10px color-mix(in srgb, var(--accent-orange, #F6D312) 30%, transparent) !important;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      cursor: pointer !important;
    }

    .add-tx-btn:hover {
      background-color: color-mix(in srgb, var(--accent-orange, #F6D312) 85%, black) !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 6px 14px color-mix(in srgb, var(--accent-orange, #F6D312) 40%, transparent) !important;
    }

    .add-tx-btn mat-icon {
      margin: 0 !important;
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
    }

    /* Filters bar for transactions */
    .tx-filters-bar {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 1rem;
      margin-bottom: 1rem;
      align-items: center;
    }

    @media (max-width: 576px) {
      .tx-filters-bar {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
    }

    .tx-search-input {
      width: 100%;
    }

    ::ng-deep .tx-filters-bar .mat-mdc-form-field-subscript-wrapper {
      display: none !important;
    }

    .tx-type-toggle {
      height: 48px;
      display: flex;
      align-items: center;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 3px;
      background: #f8fafc;
    }

    ::ng-deep .tx-type-toggle .mat-button-toggle {
      border: none !important;
      border-radius: 0.5rem;
      background: transparent;
    }

    ::ng-deep .tx-type-toggle .mat-button-toggle-checked {
      background: white !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    ::ng-deep .tx-type-toggle .mat-button-toggle-label-content {
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0 12px !important;
      color: var(--text-secondary);
    }

    ::ng-deep .tx-type-toggle .mat-button-toggle-checked .mat-button-toggle-label-content {
      color: var(--primary-color);
    }

    /* Transactions list inside selected user view */
    .transactions-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      max-height: 60vh;
      overflow-y: auto;
      padding-right: 2px;
    }

    .transactions-list::-webkit-scrollbar {
      width: 4px;
    }

    .transactions-list::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 2px;
    }

    .tx-card {
      border-radius: 0.85rem;
      border: 1px solid #f1f5f9;
      background: white;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.01);
      transition: all 0.2s;
    }

    .tx-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
      border-color: #cbd5e1;
    }

    .tx-content {
      padding: 0.75rem 1rem !important;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .tx-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tx-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
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
      min-width: 0;
    }

    .tx-concept {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tx-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.7rem;
      color: var(--text-light);
      margin-top: 0.15rem;
    }

    .tx-date {
      color: var(--text-light);
    }

    .tx-method, .tx-creator {
      background-color: #f1f5f9;
      color: var(--text-secondary);
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 500;
      font-size: 0.65rem;
    }

    .tx-right {
      display: flex;
      align-items: center;
      gap: 0.15rem;
    }

    .tx-amount {
      font-size: 0.95rem;
      font-weight: 700;
      margin-right: 0.5rem;
    }

    .tx-amount.ingreso {
      color: var(--success-color);
    }

    .tx-amount.gasto {
      color: var(--error-color);
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 3rem 1.5rem;
      background: white;
      border-radius: 1.25rem;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .empty-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      border: 1px solid #e2e8f0;
    }

    .empty-icon {
      font-size: 24px !important;
      width: 24px !important;
      height: 24px !important;
      color: var(--text-light) !important;
      margin: 0 !important;
    }

    .empty-state h4 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-main);
      margin: 0;
    }

    .empty-state p {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
      margin-bottom: 0;
    }

    /* Bottom Sheet Panel sliding Drawer */
    .bottom-sheet-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(15, 23, 42, 0.4);
      z-index: 10000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      backdrop-filter: blur(4px);
    }

    .bottom-sheet-backdrop.show {
      opacity: 1;
      pointer-events: auto;
    }

    .bottom-sheet-panel {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: white;
      border-top-left-radius: 1.5rem;
      border-top-right-radius: 1.5rem;
      box-shadow: 0 -10px 25px -5px rgba(0, 0, 0, 0.08);
      z-index: 10001;
      transform: translateY(100%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      max-height: 85vh;
      max-width: 500px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .bottom-sheet-panel.show {
      transform: translateY(0);
    }

    .sheet-drag-handle {
      width: 32px;
      height: 4px;
      background-color: #cbd5e1;
      border-radius: 2px;
      margin: 8px auto 0 auto;
    }

    .sheet-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .sheet-header h2 {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
    }

    .sheet-form {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }

    .sheet-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem;
    }

    /* Bulk members selection styles in modal */
    .bulk-members-section {
      display: flex;
      flex-direction: column;
      margin-bottom: 1.25rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.75rem;
      padding: 0.85rem;
      background: #f8fafc;
    }

    .section-label {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-secondary);
      margin-bottom: 0.65rem;
    }

    .bulk-select-actions {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .btn-bulk-select {
      flex: 1;
      height: 32px !important;
      font-size: 0.7rem !important;
      font-weight: 600 !important;
      border-radius: 6px !important;
      border-color: #cbd5e1 !important;
      color: var(--text-secondary) !important;
      background: white !important;
    }

    .bulk-search {
      margin-bottom: 0.5rem;
    }

    ::ng-deep .bulk-search .mat-mdc-form-field-subscript-wrapper {
      display: none !important;
    }

    .bulk-members-scroll {
      max-height: 180px;
      overflow-y: auto;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      background: white;
      display: flex;
      flex-direction: column;
    }

    .bulk-members-scroll::-webkit-scrollbar {
      width: 4px;
    }

    .bulk-members-scroll::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 2px;
    }

    .bulk-member-checkbox-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;
    }

    .bulk-member-checkbox-row:last-child {
      border-bottom: none;
    }

    .bulk-member-checkbox-row:hover {
      background: #f8fafc;
    }

    .bulk-member-checkbox-row.selected {
      background: color-mix(in srgb, var(--primary-color) 5%, white);
    }

    .checkbox-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .checkbox-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      color: #94a3b8;
    }

    .bulk-member-checkbox-row.selected .checkbox-icon {
      color: var(--primary-color);
    }

    .bulk-member-info {
      display: flex;
      justify-content: space-between;
      flex: 1;
      font-size: 0.8rem;
    }

    .bulk-member-name {
      font-weight: 600;
      color: var(--text-main);
    }

    .bulk-member-balance {
      font-weight: 700;
      color: var(--text-secondary);
    }

    .bulk-member-balance.positive {
      color: var(--success-color);
    }

    .bulk-member-balance.negative {
      color: var(--error-color);
    }

    .no-members-found {
      padding: 1rem;
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-light);
    }

    .toggle-group {
      border: 1px solid #e2e8f0;
      background-color: #f8fafc;
      border-radius: 0.75rem;
      padding: 3px;
      display: flex;
      margin-bottom: 1.25rem;
    }

    .w-half {
      flex: 1;
    }

    ::ng-deep .toggle-group .mat-button-toggle {
      border: none !important;
      background: transparent;
      border-radius: 0.5rem;
    }

    ::ng-deep .toggle-group .mat-button-toggle-button {
      border-radius: 0.5rem;
    }

    .btn-ingreso.mat-button-toggle-checked {
      background-color: color-mix(in srgb, var(--success-color) 12%, transparent) !important;
    }

    .btn-ingreso.mat-button-toggle-checked ::ng-deep .mat-button-toggle-label-content {
      color: var(--success-color) !important;
    }

    .btn-gasto.mat-button-toggle-checked {
      background-color: color-mix(in srgb, var(--error-color) 12%, transparent) !important;
    }

    .btn-gasto.mat-button-toggle-checked ::ng-deep .mat-button-toggle-label-content {
      color: var(--error-color) !important;
    }

    .file-upload-group {
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .file-upload-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .file-drop-area {
      border: 2px dashed #cbd5e1;
      border-radius: 0.75rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      cursor: pointer;
      background-color: #f8fafc;
      color: var(--text-secondary);
      transition: all 0.2s;
      text-align: center;
    }

    .file-drop-area:hover {
      border-color: var(--primary-color);
      background-color: color-mix(in srgb, var(--primary-color) 6%, transparent);
    }

    .file-drop-area.drag-over {
      border-color: var(--primary-color);
      background-color: color-mix(in srgb, var(--primary-color) 12%, transparent);
      transform: scale(1.02);
    }

    .file-drop-area.has-file {
      border-color: var(--success-color);
      background-color: color-mix(in srgb, var(--success-color) 5%, transparent);
      color: var(--success-color);
    }

    .upload-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--text-light);
    }

    .drag-hint {
      font-size: 0.7rem;
      color: var(--text-light);
      margin: 0;
    }

    .hidden-input {
      display: none;
    }

    .sheet-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid #f1f5f9;
      background: white;
    }

    .sheet-actions button {
      height: 40px;
      border-radius: 0.75rem !important;
      font-weight: 600 !important;
    }

    .sheet-actions .btn-submit {
      background-color: var(--accent-orange, #F6D312) !important;
      color: var(--text-main) !important;
      box-shadow: 0 4px 10px color-mix(in srgb, var(--accent-orange, #F6D312) 30%, transparent) !important;
      border: none !important;
    }

    .sheet-actions .btn-submit:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--accent-orange, #F6D312) 85%, black) !important;
      transform: translateY(-1px) !important;
    }

    .sheet-actions .btn-submit:disabled {
      background-color: #cbd5e1 !important;
      color: #94a3b8 !important;
      box-shadow: none !important;
      cursor: not-allowed !important;
    }

    /* Custom Confirm Modal styling */
    .confirm-modal-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(15, 23, 42, 0.4);
      z-index: 20000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
      backdrop-filter: blur(4px);
    }

    .confirm-modal-backdrop.show {
      opacity: 1;
      pointer-events: auto;
    }

    .confirm-modal-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      width: calc(100% - 32px);
      max-width: 400px;
      background: white;
      border-radius: 1.25rem;
      padding: 1.5rem;
      z-index: 20001;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      opacity: 0;
      pointer-events: none;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      text-align: center;
    }

    .confirm-modal-panel.show {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
      pointer-events: auto;
    }

    .confirm-modal-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--error-color) 10%, white);
      color: var(--error-color);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem auto;
    }

    .confirm-modal-icon-wrapper mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .confirm-modal-panel h2 {
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      color: var(--text-main);
    }

    .confirm-text {
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.4;
      margin: 0 0 0.5rem 0;
    }

    .confirm-warning {
      font-size: 0.75rem;
      color: var(--error-color);
      font-weight: 600;
      margin: 0 0 1.25rem 0;
      background: color-mix(in srgb, var(--error-color) 5%, white);
      padding: 6px 12px;
      border-radius: 6px;
    }

    .confirm-actions {
      display: flex;
      justify-content: center;
      gap: 0.75rem;
    }

    .confirm-actions button {
      height: 38px;
      font-size: 0.8rem !important;
      font-weight: 600 !important;
      border-radius: 8px !important;
    }

    .btn-cancel {
      border: 1px solid #cbd5e1 !important;
      color: var(--text-secondary) !important;
    }

    .btn-confirm {
      background-color: var(--error-color) !important;
      color: white !important;
    }

    /* Utility */
    .w-full {
      width: 100%;
    }

    .hidden-input {
      display: none;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Centrar Material Wrapper inputs */
    ::ng-deep .mat-mdc-text-field-wrapper {
      padding-bottom: 6px !important;
      padding-left: 14px !important;
      padding-right: 14px !important;
    }
    ::ng-deep .mat-mdc-form-field-infix {
      padding-top: 16px !important;
      padding-bottom: 8px !important;
    }
  `]
})
export class FinanzasGestorComponent implements OnInit {
  private fundService = inject(FundTransactionService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private http = inject(HttpClient);

  usersList = signal<UserWithBalance[]>([]);
  filteredUsers = signal<UserWithBalance[]>([]);
  searchQuery = '';

  sidebarFilter = signal<'todos' | 'saldo' | 'deudores'>('todos');

  selectedUserId = signal<number | null>(null);
  selectedUser = signal<UserWithBalance | null>(null);
  transactions = signal<FundTransaction[]>([]);
  balance = signal<number>(0);

  // Bulk mode signals
  isBulkMode = signal<boolean>(false);
  bulkSelectedUserIds = signal<number[]>([]);
  bulkSearchQuery = signal<string>('');

  // Mobile navigation tabs
  activeMobileTab = signal<'dashboard' | 'socios'>('dashboard');

  setMobileTab(tab: 'dashboard' | 'socios') {
    this.activeMobileTab.set(tab);
  }

  // Stats
  totalCaja = signal<number>(0);
  totalFondos = signal<number>(0);
  totalDeuda = signal<number>(0);
  deudoresCount = signal<number>(0);
  recentTransactions = signal<any[]>([]);

  isLoadingTransactions = signal<boolean>(false);
  isAddPanelOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // Transaction Filters
  txSearchQuery = signal<string>('');
  txTypeFilter = signal<'todos' | 'ingreso' | 'gasto'>('todos');

  // Custom confirmation
  confirmDeleteTx = signal<FundTransaction | null>(null);

  // Drag and drop file upload
  selectedFile = signal<File | null>(null);
  selectedFileName = signal<string | null>(null);
  isDraggingOver = signal<boolean>(false);

  txForm!: FormGroup;

  // Filtered transactions computed property
  filteredTransactions = computed(() => {
    const list = this.transactions();
    const query = this.txSearchQuery().toLowerCase().trim();
    const type = this.txTypeFilter();

    return list.filter(tx => {
      const matchesQuery = !query || tx.concept.toLowerCase().includes(query);
      const matchesType = type === 'todos' || tx.type === type;
      return matchesQuery && matchesType;
    });
  });

  // Filtered users for bulk checkbox scroll selection
  filteredBulkUsers = computed(() => {
    const q = this.bulkSearchQuery().toLowerCase().trim();
    const list = this.usersList();
    if (!q) return list;
    return list.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.initForm();
    this.loadDashboardData();
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: any) {
    if (this.isAddPanelOpen()) {
      this.closeAddPanel();
    }
    if (this.confirmDeleteTx()) {
      this.cancelDeleteTransaction();
    }
  }

  initForm() {
    this.txForm = this.fb.group({
      type: ['ingreso', Validators.required],
      concept: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      payment_method: ['transferencia', Validators.required]
    });
  }

  loadDashboardData() {
    this.fundService.getDashboard().then(res => {
      this.totalCaja.set(res.total_caja);
      this.totalFondos.set(res.total_fondos);
      this.totalDeuda.set(res.total_deuda);
      this.deudoresCount.set(res.deudores_count);
      this.recentTransactions.set(res.recent_transactions);
      
      const list = res.users_with_balances || [];
      this.usersList.set(list);
      this.filteredUsers.set(this.applySidebarFilters(list));
    }).catch(err => {
      this.toast.error('Error al cargar datos del dashboard financiero');
    });
  }

  refreshDashboardBackground() {
    this.fundService.getDashboard().then(res => {
      this.totalCaja.set(res.total_caja);
      this.totalFondos.set(res.total_fondos);
      this.totalDeuda.set(res.total_deuda);
      this.deudoresCount.set(res.deudores_count);
      this.recentTransactions.set(res.recent_transactions);
      
      const list = res.users_with_balances || [];
      this.usersList.set(list);
      this.filteredUsers.set(this.applySidebarFilters(list));
    }).catch(() => {});
  }

  setSidebarFilter(filter: 'todos' | 'saldo' | 'deudores') {
    this.sidebarFilter.set(filter);
    this.filterUsers();
  }

  filterSidebarToDeudores() {
    this.sidebarFilter.set('deudores');
    this.filterUsers();
    this.activeMobileTab.set('socios'); // Switch to members tab on mobile
  }

  filterUsers() {
    this.filteredUsers.set(this.applySidebarFilters(this.usersList()));
  }

  applySidebarFilters(list: UserWithBalance[]): UserWithBalance[] {
    const q = this.searchQuery.toLowerCase().trim();
    let result = list;

    if (q) {
      result = result.filter(u => 
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    const filter = this.sidebarFilter();
    if (filter === 'saldo') {
      result = result.filter(u => u.balance > 0);
    } else if (filter === 'deudores') {
      result = result.filter(u => u.balance < 0);
    }

    return result;
  }

  selectUser(userId: number) {
    this.selectedUserId.set(userId);
    const u = this.usersList().find(x => x.id === userId) || null;
    this.selectedUser.set(u);
    this.txSearchQuery.set('');
    this.txTypeFilter.set('todos');
    this.loadTransactions();
  }

  deselectUser() {
    this.selectedUserId.set(null);
    this.selectedUser.set(null);
    this.transactions.set([]);
    this.balance.set(0);
    this.loadDashboardData();
  }

  loadTransactions() {
    const userId = this.selectedUserId();
    if (!userId) return;

    this.isLoadingTransactions.set(true);
    this.fundService.getTransactions(userId).then(res => {
      this.transactions.set(res.transactions);
      this.balance.set(res.balance);
      this.isLoadingTransactions.set(false);
    }).catch(err => {
      this.toast.error('Error al cargar movimientos del socio');
      this.isLoadingTransactions.set(false);
    });
  }

  onTxSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.txSearchQuery.set(input.value);
  }

  onTxTypeFilterChange(event: any) {
    this.txTypeFilter.set(event.value);
  }

  openAddPanel() {
    this.isBulkMode.set(false);
    this.txForm.reset({
      type: 'ingreso',
      concept: '',
      amount: '',
      payment_method: 'transferencia'
    });
    this.clearFile();
    this.isAddPanelOpen.set(true);
  }

  openBulkAddPanel() {
    this.isBulkMode.set(true);
    this.bulkSelectedUserIds.set([]);
    this.bulkSearchQuery.set('');
    this.txForm.reset({
      type: 'gasto', // Default to gasto since bulk actions are usually fees
      concept: '',
      amount: '',
      payment_method: 'transferencia'
    });
    this.clearFile();
    this.isAddPanelOpen.set(true);
  }

  closeAddPanel() {
    this.isAddPanelOpen.set(false);
  }

  toggleBulkUser(userId: number) {
    const current = this.bulkSelectedUserIds();
    if (current.includes(userId)) {
      this.bulkSelectedUserIds.set(current.filter(id => id !== userId));
    } else {
      this.bulkSelectedUserIds.set([...current, userId]);
    }
  }

  toggleAllBulkUsers(checked: boolean) {
    if (checked) {
      this.bulkSelectedUserIds.set(this.usersList().map(u => u.id));
    } else {
      this.bulkSelectedUserIds.set([]);
    }
  }

  selectDebtorsInBulk() {
    const debtors = this.usersList().filter(u => u.balance < 0).map(u => u.id);
    this.bulkSelectedUserIds.set(debtors);
  }

  onBulkSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.bulkSearchQuery.set(input.value);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        this.toast.error('El justificante no puede superar los 5MB.');
        return;
      }
      this.selectedFile.set(file);
      this.selectedFileName.set(file.name);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        if (file.size > 5 * 1024 * 1024) {
          this.toast.error('El justificante no puede superar los 5MB.');
          return;
        }
        this.selectedFile.set(file);
        this.selectedFileName.set(file.name);
      } else {
        this.toast.error('Solo se admiten archivos PDF o imágenes.');
      }
    }
  }

  clearFile(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.selectedFile.set(null);
    this.selectedFileName.set(null);
  }

  saveTransaction() {
    if (this.txForm.invalid) return;

    const isBulk = this.isBulkMode();
    if (!isBulk && !this.selectedUserId()) return;
    if (isBulk && this.bulkSelectedUserIds().length === 0) {
      this.toast.error('Debes seleccionar al menos un socio.');
      return;
    }

    this.isSaving.set(true);
    const formVal = this.txForm.value;
    
    const formData = new FormData();
    formData.append('amount', formVal.amount.toString());
    formData.append('type', formVal.type);
    formData.append('concept', formVal.concept);
    formData.append('payment_method', formVal.payment_method);
    
    const file = this.selectedFile();
    if (file) {
      formData.append('attachment', file);
    }

    if (isBulk) {
      this.bulkSelectedUserIds().forEach(id => {
        formData.append('user_ids[]', id.toString());
      });
    } else {
      formData.append('user_id', this.selectedUserId()!.toString());
    }

    this.fundService.storeTransaction(formData).then(res => {
      this.toast.success(res.message || 'Movimiento registrado correctamente');
      if (!isBulk) {
        this.loadTransactions();
      }
      this.closeAddPanel();
      this.isSaving.set(false);
      this.refreshDashboardBackground();
    }).catch(err => {
      this.toast.error(err.error?.message || 'Error al guardar el movimiento');
      this.isSaving.set(false);
    });
  }

  askDeleteTransaction(tx: FundTransaction) {
    this.confirmDeleteTx.set(tx);
  }

  cancelDeleteTransaction() {
    this.confirmDeleteTx.set(null);
  }

  executeDeleteTransaction() {
    const tx = this.confirmDeleteTx();
    if (!tx) return;

    this.fundService.deleteTransaction(tx.id).then(res => {
      this.toast.success(res.message || 'Movimiento anulado correctamente');
      this.loadTransactions();
      this.cancelDeleteTransaction();
      this.refreshDashboardBackground();
    }).catch(err => {
      this.toast.error('Error al anular el movimiento');
      this.cancelDeleteTransaction();
    });
  }
}
