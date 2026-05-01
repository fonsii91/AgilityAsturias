import sys

file_path = 'c:\\Users\\Usuario\\Desktop\\AgilityAsturiass\\frontend\\src\\app\\components\\explorar\\salud-deportiva\\salud-deportiva.html'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Update Title and Add Ver todo
    title_target = '''        <div class="section-title-wrap mb-4 d-flex align-items-center gap-2">
          <div class="icon-circle"><span class="material-icons text-primary">history</span></div>
          <h3 class="m-0">Historial (28 días)</h3>
        </div>
        
        @if (acwrData()!.recent_history && acwrData()!.recent_history.length > 0) {
        <div class="history-vertical-list">
          @for (history of acwrData()!.recent_history; track history.id) {'''

    title_replacement = '''        <div class="section-title-wrap mb-4 d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-2">
            <div class="icon-circle"><span class="material-icons text-primary">history</span></div>
            <h3 class="m-0">Actividad Reciente</h3>
          </div>
          @if (acwrData()!.recent_history && acwrData()!.recent_history.length > 2) {
             <button class="btn-text-primary text-small" (click)="openHistoryModal()">Ver todo</button>
          }
        </div>
        
        @if (visibleHistory().length > 0) {
        <div class="history-vertical-list">
          @for (history of visibleHistory(); track history.id) {'''

    html = html.replace(title_target, title_replacement)

    # 2. Add Ver Historial Completo button
    btn_target = '''            </div>
          </div>
          }
        </div>
        } @else {'''

    btn_replacement = '''            </div>
          </div>
          }
        </div>
        @if (acwrData()!.recent_history && acwrData()!.recent_history.length > 2) {
           <button class="btn-outline-primary full-width mt-3" (click)="openHistoryModal()">
             Ver Historial Completo ({{acwrData()!.recent_history.length}})
           </button>
        }
        } @else {'''

    html = html.replace(btn_target, btn_replacement)

    # Write it back safely
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {e}")
