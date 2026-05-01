const fs = require('fs');

const htmlPath = 'C:\\Users\\Usuario\\Desktop\\AgilityAsturiass\\frontend\\src\\app\\components\\explorar\\salud-deportiva\\salud-deportiva.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// 1. Pending Banner Replacement
const pendingStart = `      @if (pendingReviews().length > 0) {`;
const pendingEnd = `      </div>\n      }`;
const startIndex = html.indexOf(pendingStart);
// find the correct ending block
const endRegex = /      <\/div>\r?\n      \}/g;
let match;
let endIndex = -1;
endRegex.lastIndex = startIndex;
if ((match = endRegex.exec(html)) !== null) {
    endIndex = match.index + match[0].length;
}

if (startIndex !== -1 && endIndex !== -1) {
    const originalPendingBlock = html.substring(startIndex, endIndex);
    // Extract the loop part inside it to put in the modal later
    const loopStartIndex = originalPendingBlock.indexOf('        @for (pending of pendingReviews()');
    let loopContent = '';
    if (loopStartIndex !== -1) {
        const loopMatch = originalPendingBlock.match(/(        @for \(pending of pendingReviews\(\); track pending\.id\) \{[\s\S]*?        \}\r?\n)/);
        if (loopMatch) loopContent = loopMatch[1];
    }

    const banner = `      @if (pendingReviews().length > 0) {
      <div class="pending-action-banner bento-card fade-in cursor-pointer mb-4" (click)="openPendingModal()">
        <div class="d-flex align-items-center gap-3 p-3">
            <div class="alert-icon-wrapper warning-bg" style="border-radius: 50%;"><span class="material-icons warning-text pulse-animation">notifications_active</span></div>
            <div class="alert-content flex-grow-1">
              <h4 class="m-0" style="font-weight: 700; color: var(--text-main);">{{pendingReviews().length}} Entrenamiento(s) por validar</h4>
              <p class="m-0 text-muted text-small mt-1">Requieren tu confirmación de intensidad.</p>
            </div>
            <div class="action-arrow">
              <span class="material-icons text-primary">chevron_right</span>
            </div>
        </div>
      </div>
      }`;
      
    html = html.substring(0, startIndex) + banner + html.substring(endIndex);

    // 2. Update History title and loop
    html = html.replace('<h3 class="m-0">Historial (28 días)</h3>', '<h3 class="m-0">Actividad Reciente</h3>');
    html = html.replace('<div class="section-title-wrap mb-4 d-flex align-items-center gap-2">', 
`<div class="section-title-wrap mb-4 d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-2">`);
    html = html.replace(/<\/div>\r?\n\s*@if \(acwrData\(\)!\.recent_history && acwrData\(\)!\.recent_history\.length > 0\) \{/,
`</div>
          @if (acwrData()!.recent_history && acwrData()!.recent_history.length > 2) {
             <button class="btn-text-primary text-small" (click)="openHistoryModal()">Ver todo</button>
          }
        </div>
        
        @if (visibleHistory().length > 0) {`);
        
    html = html.replace('@for (history of acwrData()!.recent_history; track history.id) {', '@for (history of visibleHistory(); track history.id) {');

    // Add "Ver Historial Completo" button
    const oldButtonTarget = `            </div>\r\n          </div>\r\n          }\r\n        </div>\r\n        } @else {`;
    const oldButtonTarget2 = `            </div>\n          </div>\n          }\n        </div>\n        } @else {`;
    const newButtonContent = `            </div>
          </div>
          }
        </div>
        @if (acwrData()!.recent_history && acwrData()!.recent_history.length > 2) {
           <button class="btn-outline-primary full-width mt-3" (click)="openHistoryModal()">
             Ver Historial Completo ({{acwrData()!.recent_history.length}})
           </button>
        }
        } @else {`;
    
    if (html.includes(oldButtonTarget)) {
        html = html.replace(oldButtonTarget, newButtonContent);
    } else {
        html = html.replace(oldButtonTarget2, newButtonContent);
    }

    // 3. Append modals BEFORE the last </div>
    const modals = `
  <!-- Pending Reviews Modal -->
  @if (isPendingModalOpen()) {
  <div class="modal-overlay slide-fade-in" (click)="closePendingModal()">
    <div class="modal-card pending-modal-card bento-card" (click)="$event.stopPropagation()" style="max-width: 650px; max-height: 90vh; overflow-y: auto;">
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
${loopContent}        </div>
      </div>
    </div>
  </div>
  }

  <!-- History Modal -->
  @if (isHistoryModalOpen()) {
  <div class="modal-overlay slide-fade-in" (click)="closeHistoryModal()">
    <div class="modal-card pending-modal-card bento-card" (click)="$event.stopPropagation()" style="max-width: 650px; max-height: 90vh; overflow-y: auto;">
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
`;

    const lastDiv = html.lastIndexOf('</div>');
    if (lastDiv !== -1) {
        html = html.substring(0, lastDiv) + modals + '\n</div>';
    }
    
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log("SUCCESS");
} else {
    console.log("ERROR FINDING PENDING BLOCK");
}
