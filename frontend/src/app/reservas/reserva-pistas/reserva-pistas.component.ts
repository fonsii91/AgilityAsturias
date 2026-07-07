import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialog, ConfirmDialogData } from '../../components/shared/confirm-dialog/confirm-dialog';
import { TrackReservationService, TrackAvailability, TrackSlotAvailability } from '../../services/track-reservation.service';
import { ToastService } from '../../services/toast.service';
import { surfaceLabel } from '../../models/training-track.model';

interface DayOption {
  date: string;   // YYYY-MM-DD
  dayName: string;
  dayNumber: string;
}

/**
 * Pestaña "Reserva de Pistas" dentro del módulo de reservas: entrenamientos
 * libres sin monitor. Muestra por pista las franjas de una hora y su estado
 * (libre, clase, ocupada por otro socio o reservada por mí).
 */
@Component({
  selector: 'app-reserva-pistas',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule],
  templateUrl: './reserva-pistas.component.html',
  styleUrl: './reserva-pistas.component.css'
})
export class ReservaPistasComponent implements OnInit {
  private trackReservationService = inject(TrackReservationService);
  private toastService = inject(ToastService);
  private dialog = inject(MatDialog);

  surfaceLabel = surfaceLabel;

  days: DayOption[] = [];
  selectedDate = signal<string>('');
  tracks = signal<TrackAvailability[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);

  private static readonly DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  ngOnInit() {
    this.days = this.buildNextDays(7);
    this.selectedDate.set(this.days[0].date);
    this.loadAvailability();
  }

  private buildNextDays(count: number): DayOption[] {
    const days: DayOption[] = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      days.push({
        date: `${yyyy}-${mm}-${dd}`,
        dayName: i === 0 ? 'Hoy' : ReservaPistasComponent.DAY_NAMES[d.getDay()],
        dayNumber: `${dd}/${mm}`
      });
    }
    return days;
  }

  selectDate(date: string) {
    if (this.selectedDate() === date) return;
    this.selectedDate.set(date);
    this.loadAvailability();
  }

  async loadAvailability() {
    this.isLoading.set(true);
    try {
      const res = await this.trackReservationService.getAvailability(this.selectedDate());
      this.tracks.set(res.tracks);
    } catch (error) {
      console.error(error);
      this.toastService.error('No se pudo cargar la disponibilidad de pistas.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Una franja de hoy cuya hora de inicio ya pasó no es reservable. */
  isPast(slot: TrackSlotAvailability): boolean {
    const now = new Date();
    const [year, month, day] = this.selectedDate().split('-').map(Number);
    const [hour, minute] = slot.start_time.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute) <= now;
  }

  slotTitle(slot: TrackSlotAvailability): string {
    switch (slot.status) {
      case 'class': return 'Clase' + (slot.class_name ? ': ' + slot.class_name : '');
      case 'booked': return 'Reservada' + (slot.reserved_by ? ' por ' + slot.reserved_by : '');
      case 'mine': return 'Tu reserva (pulsa para cancelar)';
      default: return this.isPast(slot) ? 'Franja pasada' : 'Libre (pulsa para reservar)';
    }
  }

  onSlotClick(track: TrackAvailability, slot: TrackSlotAvailability) {
    if (this.isSubmitting()) return;
    if (slot.status === 'mine') {
      this.cancelReservation(track, slot);
    } else if (slot.status === 'free' && !this.isPast(slot)) {
      this.reserveSlot(track, slot);
    }
  }

  private formattedDate(): string {
    const day = this.days.find(d => d.date === this.selectedDate());
    return day ? `${day.dayName} ${day.dayNumber}` : this.selectedDate();
  }

  private reserveSlot(track: TrackAvailability, slot: TrackSlotAvailability) {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Reservar pista',
        message: `¿Quieres reservar la pista "${track.name}" el ${this.formattedDate()} de ${slot.start_time} a ${slot.end_time} para entrenamiento libre?`,
        confirmText: 'Reservar',
        cancelText: 'Cancelar'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) return;
      this.isSubmitting.set(true);
      try {
        await this.trackReservationService.reserve(track.id, this.selectedDate(), slot.start_time);
        this.toastService.success('Pista reservada. ¡Buen entrenamiento!');
      } catch (error: any) {
        console.error(error);
        this.toastService.error(error?.error?.message || 'No se pudo reservar la pista.');
      } finally {
        this.isSubmitting.set(false);
        this.loadAvailability();
      }
    });
  }

  private cancelReservation(track: TrackAvailability, slot: TrackSlotAvailability) {
    if (!slot.reservation_id) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Cancelar reserva de pista',
        message: `¿Quieres cancelar tu reserva de la pista "${track.name}" el ${this.formattedDate()} de ${slot.start_time} a ${slot.end_time}?`,
        confirmText: 'Cancelar reserva',
        cancelText: 'Volver',
        isDestructive: true
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) return;
      this.isSubmitting.set(true);
      try {
        await this.trackReservationService.cancel(slot.reservation_id!);
        this.toastService.success('Reserva de pista cancelada.');
      } catch (error) {
        console.error(error);
        this.toastService.error('No se pudo cancelar la reserva.');
      } finally {
        this.isSubmitting.set(false);
        this.loadAvailability();
      }
    });
  }
}
