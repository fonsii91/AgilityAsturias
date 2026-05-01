import re

file_path = 'c:\\Users\\Usuario\\Desktop\\AgilityAsturiass\\frontend\\src\\app\\components\\explorar\\salud-deportiva\\salud-deportiva.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# The regex to find the pending reviews section and extract the loop
pending_regex = re.compile(r'      @if \(pendingReviews\(\)\.length > 0\) \{\n      <div class="pending-reviews-section fade-in">\n        <div class="alert-box warning-alert premium-alert">\n          <div class="d-flex align-items-center gap-3">\n              <div class="alert-icon-wrapper"><span class="material-icons alert-icon pulse-animation">bolt</span></div>\n              <div class="alert-content">\n                <h4>\{\{pendingReviews\(\)\.length\}\} Entrenamiento\(s\) por validar</h4>\n                <p>El Staff ha validado asistencia\. Ajusta la intensidad real hoy para regenerar las gráficas mecánicas\.</p>\n              </div>\n          </div>\n        </div>\n\n(        @for \(pending of pendingReviews\(\); track pending\.id\) \{.*?)      </div>\n      \}', re.DOTALL)

match = pending_regex.search(html)
if match:
    loop_content = match.group(1)
    
    # Replace the block with the banner
    banner = '''      @if (pendingReviews().length > 0) {
      <div class="pending-action-banner bento-card fade-in cursor-pointer mb-4" (click)="openPendingModal()">
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
      }'''
    
    html = html[:match.start()] + banner + html[match.end():]
    
    # Create modals
    modals = f'''
  <!-- Pending Reviews Modal -->
  @if (isPendingModalOpen()) {{
  <div class="modal-overlay slide-fade-in" (click)="closePendingModal()">
    <div class="modal-card pending-modal-card bento-card" (click)=".stopPropagation()" style="max-width: 650px; max-height: 90vh; overflow-y: auto;">
      <div class="form-card-header d-flex justify-content-between align-items-center border-bottom pb-3 mb-3" style="position: sticky; top: 0; background: var(--surface-card, #fff); z-index: 10;">
         <h3 class="m-0 text-xl d-flex align-items-center gap-2"><span class="material-icons text-warning">pending_actions</span> Pendientes de Validar</h3>
         <button class="btn-icon-close" (click)="closePendingModal()"><span class="material-icons">close</span></button>
      </div>
      <div class="form-card-body p-0">
        <div class="alert-box warning-alert premium-alert mb-4" style="flex-direction: row; text-align: left;">
            <div class="alert-icon-wrapper warning-bg" style="min-width: 40px; min-height: 40px; margin-bottom: 0; box-shadow: none;"><span class="material-icons warning-text text-md">info</span></div>
            <p class="m-0 text-small">El Staff ha validado asistencia. Ajusta la intensidad real hoy para regenerar las gráficas mecánicas.</p>
        </div>
        
        <div class="pending-list-scrollable" style="display: flex; flex-direction: column; gap: 1.5rem;">
{loop_content}        </div>
      </div>
    </div>
  </div>
  }}

  <!-- History Modal -->
  @if (isHistoryModalOpen()) {{
  <div class="modal-overlay slide-fade-in" (click)="closeHistoryModal()">
    <div class="modal-card pending-modal-card bento-card" (click)=".stopPropagation()" style="max-width: 650px; max-height: 90vh; overflow-y: auto;">
      <div class="form-card-header d-flex justify-content-between align-items-center border-bottom pb-3 mb-3" style="position: sticky; top: 0; background: var(--surface-card, #fff); z-index: 10;">
         <h3 class="m-0 text-xl d-flex align-items-center gap-2"><span class="material-icons text-primary">history</span> Historial Completo (28 días)</h3>
         <button class="btn-icon-close" (click)="closeHistoryModal()"><span class="material-icons">close</span></button>
      </div>
      <div class="form-card-body p-0">
        @if (acwrData()!.recent_history && acwrData()!.recent_history.length > 0) {{
        <div class="history-vertical-list">
          @for (history of acwrData()!.recent_history; track history.id) {{
          <div class="history-list-item">
            <div class="hi-left">
               <div class="hi-date">
                  <span class="date-day">{{{{ history.date | date:'dd' }}}}</span>
                  <span class="date-month">{{{{ history.date | date:'MMM' }}}}</span>
               </div>
               <div class="hi-details">
                  <span class="hi-type badge-light">{{{{ translateSourceType(history.source_type) }}}}</span>
                  <div class="hi-metrics d-flex gap-3 mt-1">
                     <span><span class="material-icons-outlined text-xsmall align-middle text-muted">timer</span> <strong>{{{{ history.duration_min }}}}m</strong></span>
                     <span title="sRPE"><span class="material-icons text-xsmall align-middle emoji-indicator">{{{{ getIconForIntensity(history.intensity_rpe) }}}}</span> <strong>{{{{ history.intensity_rpe }}}}</strong>/10</span>
                  </div>
               </div>
            </div>
            
            <div class="hi-middle">
              @if(history.jumped_max_height) {{ <span class="badge badge-warning text-xsmall mx-1"><span class="material-icons align-middle text-xsmall">keyboard_double_arrow_up</span> Salto Max</span> }}
              @if(history.number_of_runs! >= 3) {{ <span class="badge badge-warning text-xsmall mx-1"><span class="material-icons align-middle text-xsmall">repeat</span> {{{{history.number_of_runs}}}} runs</span> }}
              @if(history.is_staff_verified) {{ <span class="badge badge-success text-xsmall mx-1"><span class="material-icons align-middle text-xsmall">verified</span> Validado</span> }}
            </div>

            <div class="hi-right d-flex gap-1">
              <button class="btn-icon-minimal text-primary" (click)="startEditWorkload(history); closeHistoryModal()" title="Modificar"><span class="material-icons">edit</span></button>
              <button class="btn-icon-minimal text-danger" (click)="promptDeleteWorkload(history.id); closeHistoryModal()" title="Eliminar"><span class="material-icons">delete</span></button>
            </div>
          </div>
          }}
        </div>
        }}
      </div>
    </div>
  </div>
  }}
'''
    if '</div>\n' in html[-20:]:
        html = html.rsplit('</div>\n', 1)
        html = html[0] + modals + '</div>\n'
    else:
        html = html.rsplit('</div>', 1)
        html = html[0] + modals + '</div>'
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("SUCCESS")
else:
    print("COULD NOT FIND PENDING SECTION")
