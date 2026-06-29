import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { ConfirmDialog, ConfirmDialogData } from '../../components/shared/confirm-dialog/confirm-dialog';
import { TimeSlotService } from '../../services/time-slot.service';
import { ToastService } from '../../services/toast.service';
import { TimeSlot } from '../../models/time-slot.model';
import { environment } from '../../../environments/environment';
import { OnboardingService } from '../../services/onboarding';
import { TenantService } from '../../services/tenant.service';
import { ClubAdminService } from '../../services/club-admin.service';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';
import { EmptyStateComponent } from '../../components/ui/empty-state/empty-state';

@Component({
  selector: 'app-gestionar-horarios',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule, RouterModule, EmptyStateComponent],
  templateUrl: './gestionar-horarios.component.html',
  styleUrl: './gestionar-horarios.component.css'
})
export class GestionarHorariosComponent {
  clubConfig = environment.clubConfig;
  timeSlotService = inject(TimeSlotService);
  toastService = inject(ToastService);
  onboardingService = inject(OnboardingService);
  tenantService = inject(TenantService);
  clubAdminService = inject(ClubAdminService);
  authService = inject(AuthService);
  dialog = inject(MatDialog);

  timeSlots = this.timeSlotService.getTimeSlots();

  activeFilter = signal('Todos');
  availableDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  filteredAndGroupedSlots = computed(() => {
    let slots = this.timeSlots();
    if (this.activeFilter() !== 'Todos') {
      slots = slots.filter(s => s.day === this.activeFilter());
    }

    const DAY_ORDER: Record<string, number> = {
      'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4,
      'Viernes': 5, 'Sábado': 6, 'Domingo': 7
    };

    // Sort by day and then by start time
    slots.sort((a, b) => {
      if (DAY_ORDER[a.day] !== DAY_ORDER[b.day]) {
        return DAY_ORDER[a.day] - DAY_ORDER[b.day];
      }
      return a.start_time.localeCompare(b.start_time);
    });

    // Group by day
    const groups: { day: string; slots: TimeSlot[] }[] = [];
    let currentDayGroup: { day: string; slots: TimeSlot[] } | null = null;

    slots.forEach(slot => {
      if (!currentDayGroup || currentDayGroup.day !== slot.day) {
        currentDayGroup = { day: slot.day, slots: [] };
        groups.push(currentDayGroup);
      }
      currentDayGroup.slots.push(slot);
    });

    return groups;
  });

  editingSlot: TimeSlot | null = null;
  isModalOpen = false;
  isSettingsModalOpen = false;
  isSubmittingSettings = signal(false);
  cancellationNoticeHours: number = 24;
  availableColors = [
    { value: '', label: 'Por defecto', bg: '#f1f5f9', border: '#cbd5e1' },
    { value: 'blue', label: 'Azul', bg: '#eff6ff', border: '#bfdbfe' },
    { value: 'green', label: 'Verde', bg: '#ecfdf5', border: '#a7f3d0' },
    { value: 'amber', label: 'Naranja/Amarillo', bg: '#fffbeb', border: '#fde68a' },
    { value: 'purple', label: 'Púrpura', bg: '#faf5ff', border: '#e9d5ff' },
    { value: 'rose', label: 'Rosa', bg: '#fff1f2', border: '#fecdd3' }
  ];

  getDayNameFromDate(dateStr: string): string {
    if (!dateStr) return 'Lunes';
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return daysMap[dateObj.getDay()];
  }

  slotForm = {
    days: ['Lunes'] as string[],
    name: '' as string | null,
    startTime: '10:00',
    endTime: '11:00',
    maxBookings: 5,
    isUnique: false,
    date: '',
    color: ''
  };

  openModal() {
    this.isModalOpen = true;
    this.editingSlot = null;
    this.slotForm = {
      days: ['Lunes'],
      name: '',
      startTime: '10:00',
      endTime: '11:00',
      maxBookings: 5,
      isUnique: false,
      date: '',
      color: ''
    };
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingSlot = null;
  }

  openSettingsModal() {
    this.cancellationNoticeHours = this.tenantService.tenantInfo()?.settings?.['cancellation_notice_hours'] ?? 24;
    this.isSettingsModalOpen = true;
  }

  closeSettingsModal() {
    this.isSettingsModalOpen = false;
  }

  async saveSettings() {
    if (this.isSubmittingSettings()) return;
    const info = this.tenantService.tenantInfo();
    if (!info) return;

    this.isSubmittingSettings.set(true);
    try {
      const updatedSettings = { ...info.settings, cancellation_notice_hours: Number(this.cancellationNoticeHours) };
      await firstValueFrom(this.clubAdminService.updateClub(info.id, {
        name: info.name,
        slug: info.slug,
        settings: updatedSettings
      }));
      this.toastService.success('Reglas de reserva actualizadas.');
      await this.tenantService.reload(); // Refresh tenant info
      this.closeSettingsModal();
    } catch (err) {
      console.error(err);
      this.toastService.error('Error al guardar la configuración.');
    } finally {
      this.isSubmittingSettings.set(false);
    }
  }

  editSlot(slot: TimeSlot) {
    this.isModalOpen = true;
    this.editingSlot = slot;
    this.slotForm = {
      days: [slot.day],
      name: slot.name || '',
      startTime: slot.start_time,
      endTime: slot.end_time,
      maxBookings: slot.max_bookings,
      isUnique: !!slot.date,
      date: slot.date || '',
      color: slot.color || ''
    };
  }

  cancelEdit() {
    this.closeModal();
  }

  deleteSlot(id: number) {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Eliminar horario',
        message: '¿Estás seguro de eliminar este horario? Se perderán las reservas asociadas.',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        isDestructive: true
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) return;
      try {
        await this.timeSlotService.deleteTimeSlot(id);
        this.timeSlotService.fetchTimeSlots(); // Refresh
        this.toastService.success('Horario eliminado.');
      } catch (error) {
        console.error(error);
        this.toastService.error('Error al eliminar.');
      }
    });
  }

  async saveSlot() {
    try {
      if (this.editingSlot) {
        let dayValue = this.slotForm.days[0];
        let dateValue: string | null = null;
        if (this.slotForm.isUnique) {
          if (!this.slotForm.date) {
            this.toastService.warning('Por favor, selecciona una fecha para la clase única.');
            return;
          }
          dayValue = this.getDayNameFromDate(this.slotForm.date);
          dateValue = this.slotForm.date;
        }

        const slotData = {
          day: dayValue,
          name: this.slotForm.name || null,
          start_time: this.slotForm.startTime,
          end_time: this.slotForm.endTime,
          max_bookings: this.slotForm.maxBookings,
          color: this.slotForm.color || null,
          date: dateValue
        };
        await this.timeSlotService.updateTimeSlot(this.editingSlot.id, slotData);
        this.toastService.success('Horario actualizado.');
      } else {
        if (this.slotForm.isUnique) {
          if (!this.slotForm.date) {
            this.toastService.warning('Por favor, selecciona una fecha para la clase única.');
            return;
          }
          const dayValue = this.getDayNameFromDate(this.slotForm.date);
          const slotData = {
            day: dayValue,
            name: this.slotForm.name || null,
            start_time: this.slotForm.startTime,
            end_time: this.slotForm.endTime,
            max_bookings: this.slotForm.maxBookings,
            color: this.slotForm.color || null,
            date: this.slotForm.date
          };
          await this.timeSlotService.addTimeSlot(slotData as any);
        } else {
          // Creación masiva
          for (const day of this.slotForm.days) {
            const slotData = {
              day: day,
              name: this.slotForm.name || null,
              start_time: this.slotForm.startTime,
              end_time: this.slotForm.endTime,
              max_bookings: this.slotForm.maxBookings,
              color: this.slotForm.color || null,
              date: null
            };
            await this.timeSlotService.addTimeSlot(slotData as any);
          }
        }
        this.toastService.success('Clase(s) guardada(s) correctamente.');
      }
      this.timeSlotService.fetchTimeSlots(); // Refresh
      // Marca el paso tanto al CREAR como al EDITAR (antes staff_clase solo se
      // marcaba al editar, así que crear la primera clase no lo completaba).
      // El backend serializa los dos marcados concurrentes con lock.
      this.onboardingService.markStepCompleted('gestor_horario');
      this.onboardingService.markStepCompleted('staff_clase');
      this.closeModal();
    } catch (error) {
      console.error(error);
      this.toastService.error('Error al guardar.');
    }
  }

  toggleDaySelection(day: string) {
    if (this.editingSlot) return; // Solo modo creación masiva
    const idx = this.slotForm.days.indexOf(day);
    if (idx > -1) {
      if (this.slotForm.days.length > 1) { // Prevenir vaciar todo
        this.slotForm.days.splice(idx, 1);
      }
    } else {
      this.slotForm.days.push(day);
    }
  }

  toggleFilter(filter: string) {
    this.activeFilter.set(filter);
  }

  isAfternoonSlot(startTime: string): boolean {
    if (!startTime) return false;
    const parts = startTime.split(':');
    const hour = parseInt(parts[0], 10);
    const min = parseInt(parts[1], 10);
    return hour > 14 || (hour === 14 && min >= 30);
  }
}
