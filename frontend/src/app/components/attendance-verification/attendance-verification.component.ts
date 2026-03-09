import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReservationService } from '../../services/reservation.service';
import { ToastService } from '../../services/toast.service';
import { AuthService, User } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';
import { Dog } from '../../models/dog.model';

@Component({
    selector: 'app-attendance-verification',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './attendance-verification.component.html',
    styleUrls: ['./attendance-verification.component.css']
})
export class AttendanceVerificationComponent {
    private reservationService = inject(ReservationService);
    private toastService = inject(ToastService);
    private authService = inject(AuthService);
    private dogService = inject(DogService);

    pendingSessions = signal<any[]>([]);
    pendingCompetitions = signal<any[]>([]);
    isLoading = signal(true);

    // External Data for 'Añadir participante no listado'
    allUsers = signal<User[]>([]);
    allDogs = this.dogService.getAllDogs();

    // State for tracking checked reservations in each session
    // Map<SlotKey, Set<ReservationId>>
    checkedState = new Map<string, Set<number>>();

    // Modal State
    isConfirmModalOpen = false;
    sessionToConfirm: any = null;
    isCompetitionConfirm = false;
    attendeesCountFn = 0;

    // State for Competitions
    // competition_id -> set of dog_id
    checkedCompetitionDogs = new Map<number, Set<number>>();
    // compId_dogId -> position
    dogPositions = new Map<string, string>();
    // newAttendees Array: { competition_id, user_id, dog_id, position }
    extraAttendees = signal<any[]>([]);

    selectedUserIdForExtra: number | null = null;
    selectedDogIdForExtra: number | null = null;
    selectedPositionForExtra: string = '';

    constructor() {
        this.loadPending();
        this.loadUsersAndDogs();
    }

    async loadUsersAndDogs() {
        try {
            const users = await this.authService.getAllUsers();
            this.allUsers.set(users);
            this.dogService.loadAllDogs();
        } catch (err) {
            console.error('Error loading users/dogs', err);
        }
    }

    loadPending() {
        this.isLoading.set(true);
        let pendingCount = 2; // For both requests

        const checkDone = () => {
            pendingCount--;
            if (pendingCount <= 0) {
                this.isLoading.set(false);
            }
        };

        this.reservationService.getPendingAttendance().subscribe({
            next: (data) => {
                this.pendingSessions.set(data);
                this.initializeChecks(data);
                checkDone();
            },
            error: (err) => {
                console.error('Error loading pending attendance', err);
                checkDone();
            }
        });

        this.reservationService.getPendingCompetitions().subscribe({
            next: (data) => {
                this.pendingCompetitions.set(data);
                this.initializeCompetitionChecks(data);
                checkDone();
            },
            error: (err) => {
                console.error('Error loading pending competitions', err);
                checkDone();
            }
        });
    }

    // Auto-check all users by default
    initializeChecks(sessions: any[]) {
        this.checkedState.clear();
        sessions.forEach(session => {
            const key = this.getSessionKey(session);
            const set = new Set<number>();
            session.reservations.forEach((r: any) => set.add(r.id));
            this.checkedState.set(key, set);
        });
    }

    initializeCompetitionChecks(competitions: any[]) {
        this.checkedCompetitionDogs.clear();
        competitions.forEach(comp => {
            const set = new Set<number>();
            (comp.attending_dogs || []).forEach((dog: any) => set.add(dog.id));
            this.checkedCompetitionDogs.set(comp.id, set);
        });
    }

    getSessionKey(session: any): string {
        return `${session.date}_${session.slot?.id}`;
    }

    isChecked(session: any, resId: number): boolean {
        const key = this.getSessionKey(session);
        return this.checkedState.get(key)?.has(resId) || false;
    }

    toggleCheck(session: any, resId: number) {
        const key = this.getSessionKey(session);
        const set = this.checkedState.get(key);
        if (!set) return;

        if (set.has(resId)) {
            set.delete(resId);
        } else {
            set.add(resId);
        }
    }

    // --- Competition Methods ---
    isCompChecked(compId: number, dogId: number): boolean {
        return this.checkedCompetitionDogs.get(compId)?.has(dogId) || false;
    }

    toggleCompCheck(compId: number, dogId: number) {
        const set = this.checkedCompetitionDogs.get(compId);
        if (!set) return;

        if (set.has(dogId)) {
            set.delete(dogId);
        } else {
            set.add(dogId);
        }
    }

    getDogPosition(compId: number, dogId: number): string {
        return this.dogPositions.get(`${compId}_${dogId}`) || '';
    }

    setDogPosition(compId: number, dogId: number, position: string) {
        this.dogPositions.set(`${compId}_${dogId}`, position);
    }

    getExtraAttendees(compId: number) {
        return this.extraAttendees().filter(e => e.competition_id === compId);
    }

    addExtraAttendee(compId: number) {
        if (!this.selectedUserIdForExtra || !this.selectedDogIdForExtra) {
            this.toastService.error('Debes seleccionar un usuario y un perro');
            return;
        }

        const user = this.allUsers().find(u => u.id == this.selectedUserIdForExtra);
        const dog = this.allDogs().find(d => d.id == this.selectedDogIdForExtra);

        if (!user || !dog) return;

        // check if already attending (originally or as extra)
        const comp = this.pendingCompetitions().find(c => c.id === compId);
        if (comp && comp.attending_dogs?.some((d: any) => d.id === dog.id)) {
            this.toastService.error('Ese perro ya está en la lista de apuntados');
            return;
        }

        if (this.extraAttendees().some(e => e.competition_id === compId && e.dog_id === dog.id)) {
            this.toastService.error('Ese perro ya ha sido añadido extra');
            return;
        }

        this.extraAttendees.update(list => [...list, {
            competition_id: compId,
            user_id: user.id,
            dog_id: dog.id,
            user_name: user.name,
            dog_name: dog.name,
            position: this.selectedPositionForExtra || ''
        }]);

        this.selectedUserIdForExtra = null;
        this.selectedDogIdForExtra = null;
        this.selectedPositionForExtra = '';
    }

    removeExtraAttendee(compId: number, dogId: number) {
        this.extraAttendees.update(list => list.filter(e => !(e.competition_id === compId && e.dog_id === dogId)));
    }


    getUserDogs(userId: number | null): Dog[] {
        if (!userId) return [];
        return this.allDogs().filter(d => d.userId == userId);
    }

    // --- Modals ---
    openConfirmModal(session: any, isCompetition = false) {
        this.isCompetitionConfirm = isCompetition;
        this.sessionToConfirm = session;

        if (isCompetition) {
            const compId = session.id;
            const extraCount = this.getExtraAttendees(compId).length;
            const originalCount = this.checkedCompetitionDogs.get(compId)?.size || 0;
            this.attendeesCountFn = originalCount + extraCount;
        } else {
            const key = this.getSessionKey(session);
            const attendedIds = Array.from(this.checkedState.get(key) || []);
            this.attendeesCountFn = attendedIds.length;
        }

        this.isConfirmModalOpen = true;
    }

    closeConfirmModal() {
        this.isConfirmModalOpen = false;
        this.sessionToConfirm = null;
    }

    executeConfirm() {
        if (!this.sessionToConfirm) return;

        if (this.isCompetitionConfirm) {
            const comp = this.sessionToConfirm;
            const attendedSet = this.checkedCompetitionDogs.get(comp.id);
            const attendedDogsList: { id: number, position: string }[] = [];

            if (attendedSet) {
                attendedSet.forEach(dogId => {
                    const pos = this.getDogPosition(comp.id, dogId);
                    // It says position is nullable|string so if pos is empty we can send undefined or null. Let's send it or skip depending if empty.
                    attendedDogsList.push({ id: dogId, position: pos || '' });
                });
            }

            const newAttendeesCleaned = this.getExtraAttendees(comp.id).map(e => ({
                user_id: e.user_id,
                dog_id: e.dog_id,
                position: e.position
            }));

            this.reservationService.confirmCompetitionAttendance({
                competition_id: comp.id,
                attended_dogs: attendedDogsList,
                new_attendees: newAttendeesCleaned
            }).subscribe({
                next: () => {
                    this.toastService.success('Asistencia de competición confirmada correctamente');
                    this.pendingCompetitions.update(list => list.filter(item => item.id !== comp.id));
                    this.closeConfirmModal();
                },
                error: (err) => {
                    console.error('Error confirming competition attendance', err);
                    this.toastService.error('Error al confirmar asistencia de la competición');
                    this.closeConfirmModal();
                }
            });

        } else {
            const session = this.sessionToConfirm;
            const key = this.getSessionKey(session);
            const attendedIds = Array.from(this.checkedState.get(key) || []);

            this.reservationService.confirmAttendance({
                date: session.date,
                slot_id: session.slot.id,
                attended_ids: attendedIds
            }).subscribe({
                next: () => {
                    this.toastService.success('Asistencia confirmada correctamente');
                    this.pendingSessions.update(list => list.filter(item => this.getSessionKey(item) !== key));
                    this.closeConfirmModal();
                },
                error: (err) => {
                    console.error('Error confirming attendance', err);
                    this.toastService.error('Error al confirmar asistencia');
                    this.closeConfirmModal();
                }
            });
        }
    }
}
