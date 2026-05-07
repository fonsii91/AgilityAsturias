import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { ReservationService } from '../../services/reservation.service';
import { DogService } from '../../services/dog.service';
import { TimeSlotService } from '../../services/time-slot.service';
import { Reservation } from '../../models/reservation.model';
import { TimeSlot } from '../../models/time-slot.model';

import { ToastService } from '../../services/toast.service';

import { RouterModule } from '@angular/router';
import { AthleticProfileCardComponent } from '../../components/ui/athletic-profile-card/athletic-profile-card.component';
import { FichaPerroComponent } from '../../components/ficha-perro/ficha-perro.component';
import { InstruccionesComponent } from '../../components/shared/instrucciones/instrucciones.component';
import { DogWorkloadService } from '../../services/dog-workload.service';
import { AcwrData } from '../../models/dog-workload.model';
import { OnboardingService } from '../../services/onboarding';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
    selector: 'app-gestionar-reservas',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule, RouterModule, AthleticProfileCardComponent, FichaPerroComponent, InstruccionesComponent],
    templateUrl: './gestionar-reservas.component.html',
    styleUrl: './gestionar-reservas.component.css'
})
export class GestionarReservasComponent {
    authService = inject(AuthService);
    reservationService = inject(ReservationService);
    dogService = inject(DogService);
    timeSlotService = inject(TimeSlotService);
    toastService = inject(ToastService);
    dogWorkloadService = inject(DogWorkloadService);
    onboardingService = inject(OnboardingService);
    analyticsService = inject(AnalyticsService);

    // Modal state
    isModalOpen = false;
    isSubmitting = signal(false);
    selectedSlotForBooking = signal<(TimeSlot & { date: string }) | null>(null);
    myDogs = this.dogService.getDogs();
    
    // Admin state
    adminUsers = signal<{id: number, name: string, email: string}[]>([]);
    selectedUserId = signal<number | null>(null);
    
    availableDogsForBooking = computed(() => {
        const currentUser = this.authService.currentUserSignal();
        if (!currentUser) return [];
        
        let dogsArray = [];
        if (this.authService.isStaff() && this.selectedUserId()) {
            const all = this.dogService.getAllDogs()();
            dogsArray = all.filter(d => (d as any).users?.some((u: any) => u.id === Number(this.selectedUserId())));
        } else {
            dogsArray = this.myDogs();
        }

        const currentSlot = this.selectedSlotForBooking();
        if (currentSlot) {
            const slotData = this.slots().find(s => s.id === currentSlot.id);
            if (slotData && slotData.reservations) {
                const reservedNames = new Set<string>();
                slotData.reservations.forEach((r: any) => {
                    if (r.selectedDogs) {
                        r.selectedDogs.forEach((dog: any) => reservedNames.add(dog.name));
                    }
                });
                dogsArray = dogsArray.filter(d => !reservedNames.has(d.name));
            }
        }

        return dogsArray;
    });

    selectedDogIds: Set<number> = new Set(); // Store Dog IDs

    // UI State for expanding attendees
    expandedSlots = signal<Set<number>>(new Set());
    editingSlots = signal<Set<number>>(new Set());

    // Week State
    selectedWeek = signal<'current' | 'next'>('current');

    // Dynamic definition of slots
    timeSlots = this.timeSlotService.getTimeSlots();

    onUserChange(userId: number | null) {
        this.selectedUserId.set(userId);
        this.selectedDogIds = new Set();
    }

    // Image Modal State
    enlargedImageStr: string | null = null;

    // Dog Profile State
    selectedDogForAcwr = signal<{id: number, name: string, image: string | null, acwrData: AcwrData | null} | null>(null);
    isLoadingProfile = signal(false);
    selectedDogModal = signal<any | null>(null);
    fichaModalOpen = signal(false);


    constructor() {
        this.analyticsService.logModuleAccess('reservas');
        effect(() => {
            const user = this.authService.currentUserSignal();
            if (user) {
                this.dogService.loadUserDogs();
                if (this.authService.isStaff()) {
                    this.authService.getMinimalUsers().then(users => this.adminUsers.set(users));
                    this.dogService.loadAllDogs();
                }
            }
        });

        // Auto-switch to next week if current week has no grouped slots
        effect(() => {
            const currentWeek = this.selectedWeek();
            const groups = this.groupedSlots();
            const definedSlots = this.timeSlots();

            if (currentWeek === 'current' && definedSlots.length > 0 && groups.length === 0) {
                // Defer the state update to avoid ExpressionChangedAfterItHasBeenCheckedError
                setTimeout(() => {
                    this.selectedWeek.set('next');
                }, 0);
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
        const exceptions = this.reservationService.getExceptions()();
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
            const normalizedDay = slot.day === 'Sabado' ? 'Sábado' : slot.day;
            const slotDate = weekDates[normalizedDay] || weekDates['Lunes']; // Fallback to avoid crashes

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
                allAttendees = slotAvailability.attendees.map((a: any) => ({
                    userId: a.user_id,
                    userName: a.user_name,
                    userImage: a.user_image,
                    selectedDogs: a.dogs // already an array of { name, image } from backend
                }));
            } else {
                // Group my reservations manually
                const myGroups = new Map<string, any>();
                for (const r of slotMyReservations) {
                    const uName = r.userName || 'Usuario';
                    if (!myGroups.has(uName)) {
                        myGroups.set(uName, {
                            userId: r.userId,
                            userName: uName,
                            userImage: r.user?.photo_url || null, // Assuming user relationship has photo_url if loaded
                            selectedDogs: []
                        });
                    }
                    myGroups.get(uName).selectedDogs.push({
                        name: r.dog?.name || 'Perro Desconocido',
                        image: r.dog?.photo_url || null,
                        reservation_id: r.id
                    });
                }
                allAttendees = Array.from(myGroups.values());
            }

            // Check if current user has a reservation here
            const myReservation = currentUser
                ? slotMyReservations.find(r => {
                    const sameUser = String(r.userId) === String(currentUser.id);
                    const isMyDog = (r.dog as any)?.users?.some((u: any) => String(u.id) === String(currentUser.id));
                    return sameUser || isMyDog;
                })
                : undefined;

            const isCancelled = exceptions.some(e => e.slot_id === slot.id && e.date.substring(0, 10) === slotDate);

            return {
                ...slot,
                date: slotDate,
                currentBookings: totalBookedSpots,
                isBookedByCurrentUser: !!myReservation,
                userReservationId: myReservation?.id,
                reservations: allAttendees,
                isCancelled
            } as TimeSlot & { date: string, isCancelled: boolean };
        });

        // Filter out slots from past days
        return mappedSlots.filter(s => s.date >= todayStr);
    });

    groupedSlots = computed(() => {
        const slots = this.slots();
        // Define info for all days we want to show, ordered.
        const daysOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

        return daysOrder.map(day => {
            const daySlots = slots.filter(s => {
                const normDay = s.day === 'Sabado' ? 'Sábado' : s.day;
                return normDay === day;
            });
            if (daySlots.length === 0) return null;

            // Sort explicitly by start_time numerically
            const timeToMins = (t: string) => {
                if (!t) return 0;
                const parts = t.split(':').map(Number);
                return (parts[0] || 0) * 60 + (parts[1] || 0);
            };
            daySlots.sort((a, b) => timeToMins(a.start_time) - timeToMins(b.start_time));

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



    enlargeImage(imgUrl: string | undefined | null) {
        if (!imgUrl) return;
        this.enlargedImageStr = imgUrl;
    }

    closeImage() {
        this.enlargedImageStr = null;
    }

    getAcwrColorHex(color: string): string {
        switch (color) {
            case 'green': return '#22c55e';
            case 'yellow': return '#eab308';
            case 'red': return '#ef4444';
            case 'blue': return '#3b82f6';
            default: return '#64748b';
        }
    }

    openDogProfile(dogId: number | null, dogName: string, dogImage: string | null) {
        if (!dogId) {
            this.enlargeImage(dogImage);
            return;
        }

        const user = this.authService.currentUserSignal();
        if (!user) return;
        
        const isAdminOrStaff = this.authService.isStaff();
        const isOwner = this.myDogs().some(d => d.id === dogId);

        if (isAdminOrStaff || isOwner) {
            this.isLoadingProfile.set(true);
            this.selectedDogForAcwr.set({ id: dogId, name: dogName, image: dogImage, acwrData: null });
            
            this.dogWorkloadService.getAcwrData(dogId).subscribe({
                next: (data) => {
                    this.selectedDogForAcwr.set({ id: dogId, name: dogName, image: dogImage, acwrData: data });
                    this.isLoadingProfile.set(false);
                },
                error: (err) => {
                    this.toastService.error('Error al cargar datos de salud.');
                    this.selectedDogForAcwr.set(null);
                    this.isLoadingProfile.set(false);
                }
            });
        } else {
            this.isLoadingProfile.set(true);
            this.reservationService.getRanking().subscribe({
                next: (rankingData) => {
                    const dogData = rankingData.find((d: any) => d.id === dogId);
                    if (dogData) {
                        this.selectedDogModal.set(dogData);
                        this.fichaModalOpen.set(true);
                    } else {
                        this.enlargeImage(dogImage);
                    }
                    this.isLoadingProfile.set(false);
                },
                error: () => {
                    this.enlargeImage(dogImage);
                    this.isLoadingProfile.set(false);
                }
            });
        }
    }

    closeAcwrModal() {
        this.selectedDogForAcwr.set(null);
    }

    closeFicha() {
        this.fichaModalOpen.set(false);
        this.selectedDogModal.set(null);
    }



    bookSlot(slot: TimeSlot & { date: string }) {
        const user = this.authService.currentUserSignal();
        if (!user) {
            this.toastService.warning('Debes iniciar sesión para reservar.');
            return;
        }

        const isAdminOrStaff = this.authService.isStaff();

        if (!isAdminOrStaff) {
            if (slot.currentBookings! >= slot.max_bookings) {
                this.toastService.error('Esta clase está completa.');
                return;
            }

            if (slot.isBookedByCurrentUser) {
                this.toastService.info('Ya tienes una reserva en este horario.');
                return;
            }

            // Check 24 hour rule for booking
            const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
            const now = new Date();
            const diffMs = slotDateTime.getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours < 24) {
                // Check margin of 15 mins past the 24 hour limit
                const limitTime = new Date(slotDateTime.getTime() - (24 * 60 * 60 * 1000) + (15 * 60 * 1000));
                if (now > limitTime) {
                    this.toastService.warning('Las reservas se cierran 24 horas antes de su comienzo.');
                    return;
                }
            }
        }

        // Open modal
        this.selectedSlotForBooking.set(slot);
        this.selectedUserId.set(null); // Reset target user
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

    toggleEditMode(slotId: number, event: Event) {
        event.stopPropagation();
        const newSet = new Set(this.editingSlots());
        if (newSet.has(slotId)) {
            newSet.delete(slotId);
        } else {
            newSet.add(slotId);
            // Ensure expanded when editing
            const expSet = new Set(this.expandedSlots());
            expSet.add(slotId);
            this.expandedSlots.set(expSet);
        }
        this.editingSlots.set(newSet);
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
        this.selectedSlotForBooking.set(null);
        this.isSubmitting.set(false);
    }

    async confirmBooking() {
        if (!this.selectedSlotForBooking() || this.isSubmitting()) return;

        if (this.selectedDogIds.size === 0) {
            this.toastService.warning('Por favor, selecciona al menos un perro.');
            return;
        }

        const user = this.authService.currentUserSignal();
        if (!user) return;

        const userName = user.name || 'Usuario';

        const isAdminOrStaff = this.authService.isStaff();

        // 1. Find the current slot state in the computed "slots()"
        const currentSlotState = this.slots().find(s => s.id === this.selectedSlotForBooking()!.id);
        if (currentSlotState && !isAdminOrStaff) {
            const dogsCount = this.selectedDogIds.size;
            if (currentSlotState.currentBookings! + dogsCount > currentSlotState.max_bookings) {
                const available = currentSlotState.max_bookings - currentSlotState.currentBookings!;
                this.toastService.error(`No hay suficientes plazas. Intentas reservar para ${dogsCount} perro(s) pero solo quedan ${available} plazas.`);
                return;
            }
        }

        this.isSubmitting.set(true);

        const targetUserId = this.selectedUserId() ? Number(this.selectedUserId()) : user.id;

        try {
            const selectedDogsList = Array.from(this.selectedDogIds);

            await this.reservationService.addReservation({
                slotId: this.selectedSlotForBooking()!.id,
                userId: targetUserId,
                date: this.selectedSlotForBooking()!.date,
                dogIds: selectedDogsList
            });
            this.closeModal();
            this.toastService.success('¡Reserva confirmada con éxito!');
            this.onboardingService.markStepCompleted('miembro_clase');
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

        const user = this.authService.currentUserSignal();
        if (!user) return;

        const isAdminOrStaff = this.authService.isStaff();

        if (!isAdminOrStaff) {
            // Check 24 hour rule
            const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
            const now = new Date();

            // Difference in milliseconds
            const diffMs = slotDateTime.getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours < 24) {
                this.toastService.warning('No puedes cancelar tu reserva con menos de 24 horas de antelación. Contacta con administración en caso de urgencia.');
                return; // Block opening the modal
            }
        }

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

    // Staff Cancellation Modal State
    isStaffCancelModalOpen = false;
    slotToToggle: (TimeSlot & { date: string, isCancelled?: boolean }) | null = null;
    
    openStaffCancelModal(slot: TimeSlot & { date: string, isCancelled?: boolean }) {
        this.slotToToggle = slot;
        this.isStaffCancelModalOpen = true;
    }
    
    closeStaffCancelModal() {
        this.isStaffCancelModalOpen = false;
        this.slotToToggle = null;
    }

    async confirmStaffToggle() {
        if (!this.slotToToggle) return;
        const slot = this.slotToToggle;

        this.isSubmitting.set(true);
        try {
            if (slot.isCancelled) {
                await this.reservationService.deleteException(slot.id, slot.date);
                this.toastService.success('Clase restaurada con éxito.');
            } else {
                await this.reservationService.addException(slot.id, slot.date, 'Cancelada por el staff');
                this.toastService.success('Clase cancelada con éxito.');
            }
            this.closeStaffCancelModal();
        } catch (error) {
            console.error(error);
            this.toastService.error('Error al modificar el estado de la clase.');
        } finally {
            this.isSubmitting.set(false);
        }
    }

    // Admin User Deletion Modal
    userToDelete: { slotId: number, date: string, userId: number, userName: string } | null = null;
    isUserDeleteModalOpen = false;

    openStaffDeleteUserModal(slotId: number, date: string, userId: number, userName: string) {
        this.userToDelete = { slotId, date, userId, userName };
        this.isUserDeleteModalOpen = true;
    }

    closeStaffDeleteUserModal() {
        this.isUserDeleteModalOpen = false;
        this.userToDelete = null;
    }

    async confirmStaffDeleteUser() {
        if (!this.userToDelete) return;
        this.isSubmitting.set(true);
        try {
            await this.reservationService.deleteBlock(
                this.userToDelete.slotId,
                this.userToDelete.date,
                this.userToDelete.userId
            );
            this.toastService.success(`Plazas de ${this.userToDelete.userName} liberadas.`);
            this.closeStaffDeleteUserModal();
        } catch (error) {
            console.error(error);
            this.toastService.error('Error al liberar plazas del usuario.');
        } finally {
            this.isSubmitting.set(false);
        }
    }
    // Admin Dog Deletion Modal
    dogToDelete: { reservationId: number, dogName: string, userName: string } | null = null;
    isDogDeleteModalOpen = false;

    openStaffDeleteDogModal(reservationId: number, dogName: string, userName: string) {
        this.dogToDelete = { reservationId, dogName, userName };
        this.isDogDeleteModalOpen = true;
    }

    closeStaffDeleteDogModal() {
        this.isDogDeleteModalOpen = false;
        this.dogToDelete = null;
    }

    async confirmStaffDeleteDog() {
        if (!this.dogToDelete) return;
        this.isSubmitting.set(true);
        try {
            await this.reservationService.deleteReservation(this.dogToDelete.reservationId);
            this.toastService.success(`Reserva de ${this.dogToDelete.dogName} cancelada.`);
            this.closeStaffDeleteDogModal();
        } catch (error) {
            console.error(error);
            this.toastService.error('Error al cancelar la reserva del perro.');
        } finally {
            this.isSubmitting.set(false);
        }
    }
}
