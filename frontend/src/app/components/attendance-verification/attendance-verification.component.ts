import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReservationService } from '../../services/reservation.service';
import { ToastService } from '../../services/toast.service';

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

    pendingSessions = signal<any[]>([]);
    isLoading = signal(true);

    // State for tracking checked reservations in each session
    // Map<SlotKey, Set<ReservationId>>
    checkedState = new Map<string, Set<number>>();

    // Modal State
    isConfirmModalOpen = false;
    sessionToConfirm: any = null;
    attendeesCountFn = 0;

    constructor() {
        this.loadPending();
    }

    loadPending() {
        this.isLoading.set(true);
        this.reservationService.getPendingAttendance().subscribe({
            next: (data) => {
                this.pendingSessions.set(data);
                this.initializeChecks(data);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading pending attendance', err);
                this.isLoading.set(false);
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

    openConfirmModal(session: any) {
        const key = this.getSessionKey(session);
        const attendedIds = Array.from(this.checkedState.get(key) || []);

        this.sessionToConfirm = session;
        this.attendeesCountFn = attendedIds.length;
        this.isConfirmModalOpen = true;
    }

    closeConfirmModal() {
        this.isConfirmModalOpen = false;
        this.sessionToConfirm = null;
    }

    executeConfirm() {
        if (!this.sessionToConfirm) return;

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
                // Remove confirmed session from list
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
