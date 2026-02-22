import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ReservationService } from '../../services/reservation.service';
import { DogService } from '../../services/dog.service';
import { TimeSlotService } from '../../services/time-slot.service';
import { Reservation } from '../../models/reservation.model';
import { TimeSlot } from '../../models/time-slot.model';

import { ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-gestionar-reservas',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './gestionar-reservas.component.html',
    styleUrl: './gestionar-reservas.component.css'
})
export class GestionarReservasComponent {
    authService = inject(AuthService);
    reservationService = inject(ReservationService);
    dogService = inject(DogService);
    timeSlotService = inject(TimeSlotService);
    toastService = inject(ToastService);

    // Modal state
    isModalOpen = false;
    isSubmitting = signal(false);
    selectedSlotForBooking: (TimeSlot & { date: string }) | null = null;
    myDogs = this.dogService.getDogs();
    selectedDogIds: Set<number> = new Set(); // Store Dog IDs

    // UI State for expanding attendees
    expandedSlots = signal<Set<number>>(new Set());

    // Week State
    selectedWeek = signal<'current' | 'next'>('current');

    // Dynamic definition of slots
    timeSlots = this.timeSlotService.getTimeSlots();

    // Management Modal State
    isManageModalOpen = false;
    editingSlot: TimeSlot | null = null; // null means creating new
    slotForm = {
        day: 'Lunes',
        startTime: '10:00',
        endTime: '11:00',
        maxBookings: 5
    };

    constructor() {
        effect(() => {
            const user = this.authService.currentUserSignal();
            if (user) {
                this.dogService.loadUserDogs();
            }
        });
    }

    toggleWeek(week: 'current' | 'next') {
        this.selectedWeek.set(week);
        this.expandedSlots.set(new Set()); // Reset expansions when changing week
    }

    private getDatesForWeek(weekOffset: number): Record<string, string> {
        const dates: Record<string, string> = {};
        const daysMap = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

        const startOfWeek = new Date();
        const currentDay = startOfWeek.getDay() || 7; // 1 (Mon) - 7 (Sun)
        startOfWeek.setDate(startOfWeek.getDate() - currentDay + 1 + (weekOffset * 7));
        startOfWeek.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            dates[daysMap[i]] = `${yyyy}-${mm}-${dd}`;
        }

        return dates;
    }

    // Computed signal that merges static slots with live reservations
    slots = computed(() => {
        const reservations = this.reservationService.getReservations()();
        const availability = this.reservationService.getAvailability()(); // New data source
        const currentUser = this.authService.currentUserSignal();
        const week = this.selectedWeek();
        const weekOffset = week === 'current' ? 0 : 1;
        const weekDates = this.getDatesForWeek(weekOffset);

        // Calculate today string for comparison
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const mappedSlots = this.timeSlots().map(slot => {
            const slotDate = weekDates[slot.day];

            // 1. Find My Reservations (for "isBookedByCurrentUser" and attendees list if admin/self)
            const slotMyReservations = reservations.filter(r => {
                const isSameSlot = r.slotId == slot.id; // Loose equality for safety
                const isSameDate = r.date === slotDate;
                return isSameSlot && isSameDate;
            });

            // 2. Find Global Availability (for "currentBookings")
            const slotAvailability = availability.find(a =>
                a.slot_id === slot.id &&
                a.date === slotDate
            );

            // Use availability count and attendees
            let totalBookedSpots = slotAvailability ? slotAvailability.count : 0;

            // Map attendees from availability if present
            let allAttendees: any[] = [];

            if (slotAvailability && slotAvailability.attendees) {
                allAttendees = slotAvailability.attendees.map(a => ({
                    userName: a.user_name,
                    selectedDogs: a.dogs
                }));
            } else {
                allAttendees = slotMyReservations;
            }

            // Check if current user has a reservation here
            const myReservation = currentUser
                ? slotMyReservations.find(r => {
                    const sameUser = String(r.userId) === String(currentUser.id);
                    return sameUser;
                })
                : undefined;

            return {
                ...slot,
                date: slotDate,
                currentBookings: totalBookedSpots,
                isBookedByCurrentUser: !!myReservation,
                userReservationId: myReservation?.id,
                reservations: allAttendees
            } as TimeSlot & { date: string };
        });

        // Filter out slots from past days
        return mappedSlots.filter(s => s.date >= todayStr);
    });

    groupedSlots = computed(() => {
        const slots = this.slots();
        // Define info for all days we want to show, ordered.
        const daysOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

        return daysOrder.map(day => {
            const daySlots = slots.filter(s => s.day === day);
            if (daySlots.length === 0) return null;

            // Determine period based on the first slot's start time
            // Example assumption: if first slot starts before 16:00, it's mainly Morning/Day
            const firstSlotStart = parseInt(daySlots[0].start_time.split(':')[0]);
            const period = firstSlotStart < 16 ? 'Mañana' : 'Tarde';

            return {
                day,
                period,
                slots: daySlots
            };
        }).filter(g => g !== null);
    });

    openManageModal() {
        this.isManageModalOpen = true;
        this.editingSlot = null;
        this.slotForm = {
            day: 'Lunes',
            startTime: '10:00',
            endTime: '11:00',
            maxBookings: 5
        };
    }

    editSlot(slot: TimeSlot) {
        this.isManageModalOpen = true;
        this.editingSlot = slot;
        this.slotForm = {
            day: slot.day,
            startTime: slot.start_time, // Backend uses snake_case
            endTime: slot.end_time,
            maxBookings: slot.max_bookings
        };
    }

    closeManageModal() {
        this.isManageModalOpen = false;
        this.editingSlot = null;
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
            const slotData = {
                day: this.slotForm.day,
                start_time: this.slotForm.startTime,
                end_time: this.slotForm.endTime,
                max_bookings: this.slotForm.maxBookings
            };

            if (this.editingSlot) {
                await this.timeSlotService.updateTimeSlot(this.editingSlot.id, slotData);
                this.toastService.success('Horario actualizado.');
            } else {
                await this.timeSlotService.addTimeSlot(slotData as any);
                this.toastService.success('Horario creado.');
            }
            this.timeSlotService.fetchTimeSlots(); // Refresh
            this.closeManageModal();
        } catch (error) {
            console.error(error);
            this.toastService.error('Error al guardar.');
        }
    }

    bookSlot(slot: TimeSlot & { date: string }) {
        const user = this.authService.currentUserSignal();
        if (!user) {
            this.toastService.warning('Debes iniciar sesión para reservar.');
            return;
        }

        if (slot.currentBookings! >= slot.max_bookings) {
            this.toastService.error('Esta clase está completa.');
            return;
        }

        if (slot.isBookedByCurrentUser) {
            this.toastService.info('Ya tienes una reserva en este horario.');
            return;
        }

        // Open modal
        this.selectedSlotForBooking = slot;
        this.selectedDogIds.clear(); // Reset selection
        this.isSubmitting.set(false); // Reset submission state
        this.isModalOpen = true;
    }

    toggleAttendees(slotId: number) {
        const currentSet = new Set(this.expandedSlots());
        if (currentSet.has(slotId)) {
            currentSet.delete(slotId);
        } else {
            currentSet.add(slotId);
        }
        this.expandedSlots.set(currentSet);
    }

    toggleDogSelection(dogId: number) {
        const newSet = new Set(this.selectedDogIds);
        if (newSet.has(dogId)) {
            newSet.delete(dogId);
        } else {
            newSet.add(dogId);
        }
        this.selectedDogIds = newSet;
    }

    closeModal() {
        this.isModalOpen = false;
        this.selectedSlotForBooking = null;
        this.isSubmitting.set(false);
    }

    async confirmBooking() {
        if (!this.selectedSlotForBooking || this.isSubmitting()) return;

        if (this.selectedDogIds.size === 0) {
            this.toastService.warning('Por favor, selecciona al menos un perro.');
            return;
        }

        const user = this.authService.currentUserSignal();
        if (!user) return;

        const userName = user.name || 'Usuario';

        // 1. Find the current slot state in the computed "slots()"
        const currentSlotState = this.slots().find(s => s.id === this.selectedSlotForBooking!.id);
        if (currentSlotState) {
            const dogsCount = this.selectedDogIds.size;
            if (currentSlotState.currentBookings! + dogsCount > currentSlotState.max_bookings) {
                const available = currentSlotState.max_bookings - currentSlotState.currentBookings!;
                this.toastService.error(`No hay suficientes plazas. Intentas reservar para ${dogsCount} perro(s) pero solo quedan ${available} plazas.`);
                return;
            }
        }

        this.isSubmitting.set(true);

        try {
            const selectedDogsList = Array.from(this.selectedDogIds);

            await this.reservationService.addReservation({
                slotId: this.selectedSlotForBooking.id,
                userId: user.id,
                date: this.selectedSlotForBooking.date,
                dogIds: selectedDogsList
            });
            this.closeModal();
            this.toastService.success('¡Reserva confirmada con éxito!');
        } catch (error: any) {
            console.error('Error al reservar:', error);
            // Handle specific backend error message
            if (error.error && error.error.message) {
                this.toastService.error(error.error.message);
            } else {
                this.toastService.error('Hubo un error al realizar la reserva.');
            }
            this.isSubmitting.set(false);
        }
    }

    // Cancellation Modal State
    isCancelModalOpen = false;
    selectedSlotForCancellation: TimeSlot | null = null;

    openCancelModal(slot: TimeSlot & { date: string }) {
        if (!slot.isBookedByCurrentUser) return;
        this.selectedSlotForCancellation = slot;
        this.isCancelModalOpen = true;
    }

    closeCancelModal() {
        this.isCancelModalOpen = false;
        this.selectedSlotForCancellation = null;
    }

    async confirmCancellation() {
        // Now using slot_id and date to cancel all my reservations for this block
        if (!this.selectedSlotForCancellation) return;

        this.isSubmitting.set(true);
        try {
            await this.reservationService.deleteBlock(
                this.selectedSlotForCancellation.id,
                (this.selectedSlotForCancellation as any).date
            );
            this.toastService.success('Reserva cancelada correctamente.');
            this.closeCancelModal();
        } catch (error) {
            console.error(error);
            this.toastService.error('Error al cancelar.');
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
