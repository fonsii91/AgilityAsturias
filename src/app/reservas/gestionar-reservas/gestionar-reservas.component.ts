import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ReservationService } from '../../services/reservation.service';
import { DogService } from '../../services/dog.service';
import { Reservation } from '../../models/reservation.model';

interface TimeSlot {
    id: number;
    day: string;
    startTime: string;
    endTime: string;
    currentBookings: number;
    maxBookings: number;
    isBookedByCurrentUser: boolean;
    userReservationId?: string;
    reservations?: Reservation[];
    date?: string; // Add date field
}

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
    toastService = inject(ToastService);

    // Modal state
    isModalOpen = false;
    isSubmitting = signal(false);
    selectedSlotForBooking: TimeSlot | null = null;
    myDogs = this.dogService.getDogs();
    selectedDogIds: Set<string> = new Set(); // Store Dog NAMES

    // UI State for expanding attendees
    expandedSlots = signal<Set<number>>(new Set());

    // Week State
    selectedWeek = signal<'current' | 'next'>('current');

    // Static definition of slots
    private staticSlots = this.generateSlotsDefinition();

    constructor() {
        effect(() => {
            const user = this.authService.currentUserSignal();
            if (user) {
                this.dogService.subscribeToUserDogs(user.uid);
            }
        });
    }

    toggleWeek(week: 'current' | 'next') {
        this.selectedWeek.set(week);
        this.expandedSlots.set(new Set()); // Reset expansions when changing week
    }

    private getDatesForWeek(weekOffset: number): Record<string, string> {
        const dates: Record<string, string> = {};
        const today = new Date();
        const firstDay = today.getDate() - (today.getDay() || 7) + 1 + (weekOffset * 7);

        const daysMap = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

        for (let i = 0; i < 7; i++) {
            const d = new Date(today.setDate(firstDay + i));
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            dates[daysMap[i]] = `${yyyy}-${mm}-${dd}`;

            // Reset today for next iteration based on mutation, wait. 
            // Better to instantiate new Date from a fixed point.
            // Let's retry safer logic inside the loop
        }

        // Safer implementation
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

        const mappedSlots = this.staticSlots.map(slot => {
            const slotDate = weekDates[slot.day];

            // Filter reservations for this specific slot AND date
            const slotReservations = reservations.filter(r =>
                r.slotId === slot.id &&
                (r.date === slotDate) // Only show bookings for this specific date
            );

            // Calculate total booked spots (sum of dogs)
            const totalBookedSpots = slotReservations.reduce((acc, r) => {
                const dogsCount = r.selectedDogs?.length || 1;
                return acc + dogsCount;
            }, 0);

            // Check if current user has a reservation here
            const myReservation = currentUser
                ? slotReservations.find(r => r.userId === currentUser.uid)
                : undefined;

            return {
                ...slot,
                date: slotDate, // Add date to slot for booking usage
                currentBookings: totalBookedSpots,
                isBookedByCurrentUser: !!myReservation,
                userReservationId: myReservation?.id,
                reservations: slotReservations
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
            const firstSlotStart = parseInt(daySlots[0].startTime.split(':')[0]);
            const period = firstSlotStart < 16 ? 'Mañana' : 'Tarde';

            return {
                day,
                period,
                slots: daySlots
            };
        }).filter(g => g !== null);
    });

    generateSlotsDefinition() {
        const slots: TimeSlot[] = [];
        let idCounter = 1;

        // 1. Lunes y Jueves
        // Horario de 10:00 a 14:30 (aprox 15:00), clases de 1h 30min
        const monThu = ['Lunes', 'Jueves'];
        monThu.forEach(day => {
            // Slot 1: 10:00 - 11:30
            slots.push({
                id: idCounter++,
                day,
                startTime: '10:00',
                endTime: '11:30',
                currentBookings: 0,
                maxBookings: 5,
                isBookedByCurrentUser: false
            });
            // Slot 2: 11:30 - 13:00
            slots.push({
                id: idCounter++,
                day,
                startTime: '11:30',
                endTime: '13:00',
                currentBookings: 0,
                maxBookings: 5,
                isBookedByCurrentUser: false
            });
            // Slot 3: 13:00 - 14:30
            slots.push({
                id: idCounter++,
                day,
                startTime: '13:00',
                endTime: '14:30',
                currentBookings: 0,
                maxBookings: 5,
                isBookedByCurrentUser: false
            });
        });

        // 2. Martes, Miércoles y Viernes
        // 16:30 - 18:00 (7 plazas)
        // 18:00 - 19:30 (5 plazas)
        // 19:30 - 21:00 (6 plazas)
        const tueWedFri = ['Martes', 'Miércoles', 'Viernes'];
        tueWedFri.forEach(day => {
            // Slot 1
            slots.push({
                id: idCounter++,
                day,
                startTime: '16:30',
                endTime: '18:00',
                currentBookings: 0,
                maxBookings: 7,
                isBookedByCurrentUser: false
            });
            // Slot 2
            slots.push({
                id: idCounter++,
                day,
                startTime: '18:00',
                endTime: '19:30',
                currentBookings: 0,
                maxBookings: 5,
                isBookedByCurrentUser: false
            });
            // Slot 3
            slots.push({
                id: idCounter++,
                day,
                startTime: '19:30',
                endTime: '21:00',
                currentBookings: 0,
                maxBookings: 6,
                isBookedByCurrentUser: false
            });
        });

        return slots;
    }

    bookSlot(slot: TimeSlot) {
        const user = this.authService.currentUserSignal();
        if (!user) {
            this.toastService.warning('Debes iniciar sesión para reservar.');
            return;
        }

        if (slot.currentBookings >= slot.maxBookings) {
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

    toggleDogSelection(dogName: string) {
        // Create a new Set to force change detection
        const newSet = new Set(this.selectedDogIds);
        if (newSet.has(dogName)) {
            newSet.delete(dogName);
        } else {
            newSet.add(dogName);
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

        // Validation: At least one dog
        if (this.selectedDogIds.size === 0) {
            this.toastService.warning('Por favor, selecciona al menos un perro.');
            return;
        }

        const user = this.authService.currentUserSignal();
        if (!user) return;

        // Validation: Check capacity with latest state
        const currentSlotState = this.slots().find(s => s.id === this.selectedSlotForBooking!.id);
        if (currentSlotState) {
            const dogsCount = this.selectedDogIds.size;
            if (currentSlotState.currentBookings + dogsCount > currentSlotState.maxBookings) {
                const available = currentSlotState.maxBookings - currentSlotState.currentBookings;
                this.toastService.error(`No hay suficientes plazas. Intentas reservar para ${dogsCount} perro(s) pero solo quedan ${available} plazas.`);
                return;
            }
        }

        this.isSubmitting.set(true);

        try {
            const selectedDogsList = Array.from(this.selectedDogIds);

            await this.reservationService.addReservation({
                slotId: this.selectedSlotForBooking.id,
                userId: user.uid,
                userName: user.displayName || 'Usuario',
                userEmail: user.email || '',
                day: this.selectedSlotForBooking.day,
                startTime: this.selectedSlotForBooking.startTime,
                date: this.selectedSlotForBooking.date, // Add specific date
                selectedDogs: selectedDogsList,
                createdAt: Date.now()
            });
            this.closeModal();
            this.toastService.success('¡Reserva confirmada con éxito!');
        } catch (error) {
            console.error('Error al reservar:', error);
            this.toastService.error('Hubo un error al realizar la reserva.');
            this.isSubmitting.set(false);
        }
    }

    async cancelSlot(slot: TimeSlot) {
        if (!slot.userReservationId) return;

        if (confirm('¿Quieres cancelar tu reserva para esta clase?')) {
            try {
                await this.reservationService.deleteReservation(slot.userReservationId);
                this.toastService.success('Reserva cancelada correctamente.');
            } catch (error) {
                console.error(error);
                this.toastService.error('Error al cancelar.');
            }
        }
    }
}
