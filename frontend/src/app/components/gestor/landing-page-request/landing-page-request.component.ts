import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SuggestionService } from '../../../services/suggestion.service';
import { ToastService } from '../../../services/toast.service';
import { TenantService } from '../../../services/tenant.service';
import { ClubAdminService, Club } from '../../../services/club-admin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-landing-page-request',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatButtonModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './landing-page-request.component.html',
  styleUrls: ['./landing-page-request.component.css']
})
export class LandingPageRequestComponent implements OnInit {
  private fb = inject(FormBuilder);
  private suggestionService = inject(SuggestionService);
  private toast = inject(ToastService);
  private tenantService = inject(TenantService);
  private clubAdminService = inject(ClubAdminService);
  public authService = inject(AuthService);

  form!: FormGroup;
  clubId: number | null = null;
  clubData: Club | null = null;

  isLoading = signal<boolean>(true);
  isSendingRequest = signal<boolean>(false);
  requestSent = signal<boolean>(false);

  ngOnInit() {
    this.form = this.fb.group({
      customizationRequest: ['', [Validators.required, Validators.maxLength(10000)]]
    });

    const tenantInfo = this.tenantService.tenantInfo();
    if (tenantInfo && tenantInfo.id) {
      this.clubId = tenantInfo.id;
      this.loadClub(this.clubId);
    } else {
      this.toast.error('No se pudo identificar el club activo.');
      this.isLoading.set(false);
    }
  }

  loadClub(id: number) {
    this.clubAdminService.getClub(id).subscribe({
      next: (club: Club) => {
        if (club) {
          this.clubData = club;
          const settings = club.settings || {};
          
          if (settings.landing_page_requested) {
            this.requestSent.set(true);
            this.form.get('customizationRequest')?.disable();
            this.form.patchValue({ customizationRequest: settings.customizationRequest || '' });
          } else {
            this.requestSent.set(false);
            this.form.get('customizationRequest')?.enable();
          }
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar datos del club');
        this.isLoading.set(false);
      }
    });
  }

  sendLandingPageRequest(event: Event) {
    event.preventDefault();
    if (this.form.invalid) return;

    const content = this.form.get('customizationRequest')?.value;
    if (!content || !this.clubId || !this.clubData) return;
    
    this.isSendingRequest.set(true);
    
    // Primero creamos la sugerencia
    this.suggestionService.createSuggestion({ type: 'landing_page', content }).subscribe({
      next: () => {
        // Al tener éxito, actualizamos el club para marcarlo como enviado
        const updatedSettings = {
          ...(this.clubData?.settings || {}),
          customizationRequest: content,
          landing_page_requested: true
        };

        const updateData = new FormData();
        updateData.append('name', this.clubData?.name || '');
        updateData.append('slug', this.clubData?.slug || '');
        if (this.clubData?.domain) {
          updateData.append('domain', this.clubData.domain);
        }
        updateData.append('settings', JSON.stringify(updatedSettings));

        this.clubAdminService.updateClubWithFormData(this.clubId!, updateData).subscribe({
          next: () => {
            this.toast.success('Petición de landing page enviada con éxito');
            this.requestSent.set(true);
            this.form.get('customizationRequest')?.disable();
            this.isSendingRequest.set(false);
          },
          error: () => {
            this.toast.error('La petición se envió, pero hubo un error al bloquear el formulario.');
            this.isSendingRequest.set(false);
          }
        });
      },
      error: () => {
        this.toast.error('Error al enviar la petición. Inténtalo de nuevo.');
        this.isSendingRequest.set(false);
      }
    });
  }
}
