import { Component, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReservationService } from '../../services/reservation.service';
import { AuthService } from '../../services/auth.service';
import { Reservation } from '../../models/reservation.model';

@Component({
    selector: 'app-mis-reservas',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './mis-reservas.component.html',
    styleUrls: ['./mis-reservas.component.css']
})
export class MisReservasComponent {
    private reservationService = inject(ReservationService);
    private authService = inject(AuthService);

    todayStr = new Date().toISOString().split('T')[0];

    // Filtramos todas las reservas para quedarnos sólo con las del usuario actual
    myReservations = computed(() => {
        const user = this.authService.currentUserSignal();
        if (!user) return [];

        return this.reservationService.getReservations()()
            .filter(r => r.userId === user.id);
    });

    // Reservas de hoy
    todayReservations = computed(() => {
        return this.myReservations()
            .filter(r => r.date === this.todayStr)
            .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    });

    // Reservas agrupadas por perrito y hora para hoy (por si va con varios perros a la misma hora)
    todayTimeSlots = computed(() => {
        const raw = this.todayReservations();
        const map = new Map<string, Reservation[]>();

        raw.forEach(r => {
            const time = r.startTime || 'Unknown';
            if (!map.has(time)) map.set(time, []);
            map.get(time)!.push(r);
        });

        return Array.from(map.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([time, reservations]) => {
                const dogs = reservations.map(r => r.dog?.name).filter(n => n) as string[];
                return {
                    time,
                    dogs,
                    status: reservations[0]?.status || 'active'
                };
            });
    });

    // Próximas reservas (Futuras)
    futureReservationsGrouped = computed(() => {
        const futureRes = this.myReservations()
            .filter(r => r.date && r.date > this.todayStr);

        const dateMap = new Map<string, Reservation[]>();
        futureRes.forEach(r => {
            const date = r.date || 'Sin Fecha';
            if (!dateMap.has(date)) dateMap.set(date, []);
            dateMap.get(date)!.push(r);
        });

        return Array.from(dateMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, dayReservations]) => {
                const timeMap = new Map<string, Reservation[]>();
                dayReservations.forEach(r => {
                    const time = r.startTime || 'Unknown';
                    if (!timeMap.has(time)) timeMap.set(time, []);
                    timeMap.get(time)!.push(r);
                });

                const timeSlots = Array.from(timeMap.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([time, reservations]) => {
                        const dogs = reservations.map(r => r.dog?.name).filter(n => n) as string[];
                        return { time, dogs };
                    });

                return {
                    date,
                    timeSlots,
                    totalCount: dayReservations.length
                };
            });
    });

    constructor() { }
}
