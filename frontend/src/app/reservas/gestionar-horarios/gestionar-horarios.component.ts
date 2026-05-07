import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { TimeSlotService } from '../../services/time-slot.service';
import { ToastService } from '../../services/toast.service';
import { TimeSlot } from '../../models/time-slot.model';
import { environment } from '../../../environments/environment';
import { OnboardingService } from '../../services/onboarding';

@Component({
  selector: 'app-gestionar-horarios',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterModule],
  templateUrl: './gestionar-horarios.component.html',
  styleUrl: './gestionar-horarios.component.css'
})
export class GestionarHorariosComponent {
  clubConfig = environment.clubConfig;
  timeSlotService = inject(TimeSlotService);
  toastService = inject(ToastService);
  onboardingService = inject(OnboardingService);

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
  slotForm = {
    days: ['Lunes'] as string[],
    name: '' as string | null,
    startTime: '10:00',
    endTime: '11:00',
    maxBookings: 5
  };

  openModal() {
    this.isModalOpen = true;
    this.editingSlot = null;
    this.slotForm = {
      days: ['Lunes'],
      name: '',
      startTime: '10:00',
      endTime: '11:00',
      maxBookings: 5
    };
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingSlot = null;
  }

  editSlot(slot: TimeSlot) {
    this.isModalOpen = true;
    this.editingSlot = slot;
    this.slotForm = {
      days: [slot.day],
      name: slot.name || '',
      startTime: slot.start_time,
      endTime: slot.end_time,
      maxBookings: slot.max_bookings
    };
  }

  cancelEdit() {
    this.closeModal();
  }

  async deleteSlot(id: number) {
    if (confirm('¿Estás seguro de eliminar este horario? Se perderán las reservas asociadas.')) {
      try {
        await this.timeSlotService.deleteTimeSlot(id);
        this.timeSlotService.fetchTimeSlots(); // Refresh
        this.toastService.success('Horario eliminado.');
      } catch (error) {
        console.error(error);
        this.toastService.error('Error al eliminar.');
      }
    }
  }

  async saveSlot() {
    try {
      if (this.editingSlot) {
        const slotData = {
          day: this.slotForm.days[0], // Edición no masiva
          name: this.slotForm.name || null,
          start_time: this.slotForm.startTime,
          end_time: this.slotForm.endTime,
          max_bookings: this.slotForm.maxBookings
        };
        await this.timeSlotService.updateTimeSlot(this.editingSlot.id, slotData);
        this.toastService.success('Horario actualizado.');
        this.onboardingService.markStepCompleted('staff_clase');
      } else {
        // Creación masiva
        for (const day of this.slotForm.days) {
          const slotData = {
            day: day,
            name: this.slotForm.name || null,
            start_time: this.slotForm.startTime,
            end_time: this.slotForm.endTime,
            max_bookings: this.slotForm.maxBookings
          };
          await this.timeSlotService.addTimeSlot(slotData as any);
        }
        this.toastService.success(`Horario(s) creado(s) para ${this.slotForm.days.length} día(s).`);
      }
      this.timeSlotService.fetchTimeSlots(); // Refresh
      this.onboardingService.markStepCompleted('gestor_horario');
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
