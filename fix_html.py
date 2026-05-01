import re

html_path = 'c:\\Users\\Usuario\\Desktop\\AgilityAsturiass\\frontend\\src\\app\\components\\explorar\\salud-deportiva\\salud-deportiva.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Replace pending reviews section
pending_section_regex = re.compile(r'(@if \(pendingReviews\(\)\.length > 0\) \{.*?)(@if \(pendingReviews\(\)\.length === 0\) \{)', re.DOTALL)

pending_banner = '''@if (pendingReviews().length > 0) {
      <div class="pending-action-banner bento-card border-left-warning fade-in cursor-pointer mb-4" (click)="openPendingModal()">
        <div class="d-flex align-items-center gap-3 p-3">
            <div class="alert-icon-wrapper warning-bg"><span class="material-icons warning-text pulse-animation">notifications_active</span></div>
            <div class="alert-content flex-grow-1">
              <h4 class="m-0" style="font-weight: 700; color: var(--text-main);">{{pendingReviews().length}} Entrenamiento(s) por validar</h4>
              <p class="m-0 text-muted text-small mt-1">Requieren tu confirmación de intensidad.</p>
            </div>
            <div class="action-arrow">
              <span class="material-icons text-primary">chevron_right</span>
            </div>
        </div>
      </div>
      }

      '''
html = pending_section_regex.sub(pending_banner + r'\2', html)

# 2. Update History section
# Change title to "Actividad Reciente" and add "Ver todo"
html = html.replace('<h3 class="m-0">Historial (28 días)</h3>', '<h3 class="m-0">Actividad Reciente</h3>')
html = html.replace('<div class="section-title-wrap mb-4 d-flex align-items-center gap-2">', '''<div class="section-title-wrap mb-4 d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-2">''')
html = html.replace('</div>\n        \n        @if (acwrData()!.recent_history && acwrData()!.recent_history.length > 0) {', '''</div>
          @if (acwrData()!.recent_history && acwrData()!.recent_history.length > 2) {
             <button class="btn-text-primary text-small" (click)="openHistoryModal()">Ver todo</button>
          }
        </div>
        
        @if (visibleHistory().length > 0) {''')

html = html.replace('@for (history of acwrData()!.recent_history; track history.id) {', '@for (history of visibleHistory(); track history.id) {')

# Add "Ver Historial Completo" button
old_button_target = '''            </div>
          </div>
          }
        </div>
        } @else {'''
new_button_content = '''            </div>
          </div>
          }
        </div>
        @if (acwrData()!.recent_history && acwrData()!.recent_history.length > 2) {
           <button class="btn-outline-primary full-width mt-3" (click)="openHistoryModal()">
             Ver Historial Completo ({{acwrData()!.recent_history.length}})
           </button>
        }
        } @else {'''
html = html.replace(old_button_target, new_button_content)

# 3. Append Modals
modals = '''
  <!-- Pending Reviews Modal -->
  @if (isPendingModalOpen()) {
  <div class="modal-overlay slide-fade-in" (click)="closePendingModal()">
    <div class="modal-card pending-modal-card bento-card" (click)=".stopPropagation()" style="max-width: 650px; max-height: 90vh; overflow-y: auto;">
      <div class="form-card-header d-flex justify-content-between align-items-center border-bottom pb-3 mb-3" style="position: sticky; top: 0; background: var(--surface-card, #fff); z-index: 10;">
         <h3 class="m-0 text-xl d-flex align-items-center gap-2"><span class="material-icons text-warning">pending_actions</span> Pendientes de Validar</h3>
         <button class="btn-icon-close" (click)="closePendingModal()"><span class="material-icons">close</span></button>
      </div>
      <div class="form-card-body p-0">
        <div class="alert-box warning-alert premium-alert mb-4" style="flex-direction: row; text-align: left;">
            <div class="alert-icon-wrapper warning-bg" style="min-width: 40px; min-height: 40px; margin-bottom: 0;"><span class="material-icons warning-text text-md">info</span></div>
            <p class="m-0 text-small">El Staff ha validado asistencia. Ajusta la intensidad real hoy para regenerar las gráficas mecánicas.</p>
        </div>
        
        <div class="pending-list-scrollable" style="display: flex; flex-direction: column; gap: 1.5rem;">
          @for (pending of pendingReviews(); track pending.id) {
          <div class="form-card bento-card border-left-success fade-in-up">
            <div class="form-card-body" style="padding: 1.25rem;">
              <div class="pending-header mb-3">
                <div class="date"><span class="material-icons text-success align-middle mr-1">event_available</span> {{ pending.date | date:'dd MMM yyyy' }}</div>
                <div class="source-badge">
                  <span class="material-icons text-small mr-1">sell</span>
                  {{ pending.source_type === 'auto_attendance' ? 'Entrenamiento' : 'Competición' }}
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label>
                    Minutos Activos (En Pista)
                    <span class="trust-marker" (click)="showInfo('time')" title="Info">
                      <span class="material-icons-outlined">info</span>
                    </span>
                  </label>
                  <div class="time-stepper">
                    <button class="stepper-btn" (click)="decreasePendingDuration(pending)">
                      <span class="material-icons">remove</span>
                    </button>
                    <input type="number" class="stepper-input" [(ngModel)]="pending.duration_min" min="1">
                    <div class="stepper-label">min</div>
                    <button class="stepper-btn" (click)="increasePendingDuration(pending)">
                      <span class="material-icons">add</span>
                    </button>
                  </div>
                </div>

                <div class="form-group flex-2">
                  <div class="intensity-header">
                    <label>Esfuerzo Percibido</label>
                    <div class="intensity-badge">
                      <span class="material-icons emoji-indicator">{{ getIconForIntensity(pending.intensity_rpe) }}</span>
                      {{ pending.intensity_rpe }} <small>/ 10</small>
                    </div>
                  </div>
                  <div class="intensity-slider-wrap">
                    <span class="slider-label"><span class="material-icons align-middle text-small mr-1">pets</span> Fácil</span>
                    <input type="range" class="custom-range premium-range" [(ngModel)]="pending.intensity_rpe" min="1" max="10" step="1">
                    <span class="slider-label danger"><span class="material-icons align-middle text-small mr-1">local_fire_department</span> Max</span>
                  </div>
                </div>
              </div>

              <div class="pending-modifiers mt-4 d-flex gap-15">
                <div class="form-group flex-2 d-flex justify-content-between align-items-center form-modifier-row">
                  <label class="mb-0">
                    ¿Saltó a su máxima altura?
                    <span class="trust-marker" (click)="showInfo('jump')"><span class="material-icons-outlined">info</span></span>
                  </label>
                  <div class="toggle-switch-wrapper mini">
                    <label class="switch mini-switch">
                      <input type="checkbox" [(ngModel)]="pending.jumped_max_height">
                      <span class="slider round premium-slider"></span>
                    </label>
                  </div>
                </div>
                <div class="form-group flex-1">
                  <label>Salidas a pista</label>
                  <div class="run-selector d-flex gap-2 mt-1">
                    <button class="run-chip" [class.active]="pending.number_of_runs == 2" (click)="pending.number_of_runs = (pending.number_of_runs == 2 ? undefined : 2)">1-2</button>
                    <button class="run-chip" [class.active]="pending.number_of_runs == 4" (click)="pending.number_of_runs = (pending.number_of_runs == 4 ? undefined : 4)">3-5</button>
                    <button class="run-chip" [class.active]="pending.number_of_runs == 6" (click)="pending.number_of_runs = (pending.number_of_runs == 6 ? undefined : 6)">+5</button>
                  </div>
                </div>
              </div>

              <button class="btn-success btn-giant mt-3 full-width" (click)="confirmPending(pending)" [disabled]="confirmingIds().includes(pending.id)">
                @if(confirmingIds().includes(pending.id)) {
                <span class="spinner-small mr-2"></span> Regenerando Gráficas...
                } @else {
                <span class="material-icons mr-2">check_circle</span> Archivar Sesión
                }
              </button>
            </div>
          </div>
          }
        </div>
      </div>
    </div>
  </div>
  }

  <!-- History Modal -->
  @if (isHistoryModalOpen()) {
  <div class="modal-overlay slide-fade-in" (click)="closeHistoryModal()">
    <div class="modal-card pending-modal-card bento-card" (click)=".stopPropagation()" style="max-width: 650px; max-height: 90vh; overflow-y: auto;">
      <div class="form-card-header d-flex justify-content-between align-items-center border-bottom pb-3 mb-3" style="position: sticky; top: 0; background: var(--surface-card, #fff); z-index: 10;">
         <h3 class="m-0 text-xl d-flex align-items-center gap-2"><span class="material-icons text-primary">history</span> Historial Completo (28 días)</h3>
         <button class="btn-icon-close" (click)="closeHistoryModal()"><span class="material-icons">close</span></button>
      </div>
      <div class="form-card-body p-0">
        @if (acwrData()!.recent_history && acwrData()!.recent_history.length > 0) {
        <div class="history-vertical-list">
          @for (history of acwrData()!.recent_history; track history.id) {
          <div class="history-list-item">
            <div class="hi-left">
               <div class="hi-date">
                  <span class="date-day">{{ history.date | date:'dd' }}</span>
                  <span class="date-month">{{ history.date | date:'MMM' }}</span>
               </div>
               <div class="hi-details">
                  <span class="hi-type badge-light">{{ translateSourceType(history.source_type) }}</span>
                  <div class="hi-metrics d-flex gap-3 mt-1">
                     <span><span class="material-icons-outlined text-xsmall align-middle text-muted">timer</span> <strong>{{ history.duration_min }}m</strong></span>
                     <span title="sRPE"><span class="material-icons text-xsmall align-middle emoji-indicator">{{ getIconForIntensity(history.intensity_rpe) }}</span> <strong>{{ history.intensity_rpe }}</strong>/10</span>
                  </div>
               </div>
            </div>
            
            <div class="hi-middle">
              @if(history.jumped_max_height) { <span class="badge badge-warning text-xsmall mx-1"><span class="material-icons align-middle text-xsmall">keyboard_double_arrow_up</span> Salto Max</span> }
              @if(history.number_of_runs! >= 3) { <span class="badge badge-warning text-xsmall mx-1"><span class="material-icons align-middle text-xsmall">repeat</span> {{history.number_of_runs}} runs</span> }
              @if(history.is_staff_verified) { <span class="badge badge-success text-xsmall mx-1"><span class="material-icons align-middle text-xsmall">verified</span> Validado</span> }
            </div>

            <div class="hi-right d-flex gap-1">
              <button class="btn-icon-minimal text-primary" (click)="startEditWorkload(history); closeHistoryModal()" title="Modificar"><span class="material-icons">edit</span></button>
              <button class="btn-icon-minimal text-danger" (click)="promptDeleteWorkload(history.id); closeHistoryModal()" title="Eliminar"><span class="material-icons">delete</span></button>
            </div>
          </div>
          }
        </div>
        }
      </div>
    </div>
  </div>
  }
</div>'''

html = html.replace('</div>\n', modals, 1) if html.endswith('</div>\n') else html.replace('</div>', modals, 1)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)
