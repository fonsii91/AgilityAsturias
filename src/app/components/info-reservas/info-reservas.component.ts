import { Component, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReservationService } from '../../services/reservation.service';
import { Reservation } from '../../models/reservation.model';

@Component({
    selector: 'app-info-reservas',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './info-reservas.component.html',
    styleUrls: ['./info-reservas.component.css']
})
export class InfoReservasComponent {
    private reservationService = inject(ReservationService);

    // Get all reservations from service
    allReservations = this.reservationService.getReservations();

    todayStr = new Date().toISOString().split('T')[0];

    // Raw today reservations for stats
    todayReservationsRaw = computed(() => {
        const today = this.todayStr;
        return this.allReservations()
            .filter(r => r.date === today);
    });

    // Grouped by Time for Display
    todayTimeSlots = computed(() => {
        const raw = this.todayReservationsRaw();
        const map = new Map<string, Reservation[]>();

        raw.forEach(r => {
            const time = r.startTime || 'Unknown';
            if (!map.has(time)) map.set(time, []);
            map.get(time)!.push(r);
        });

        return Array.from(map.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([time, reservations]) => ({ time, reservations }));
    });

    // Compute future reservations (Tomorrow onwards)
    futureReservationsGrouped = computed(() => {
        const today = this.todayStr;

        // Filter for dates strictly greater than today
        const futureRes = this.allReservations()
            .filter(r => r.date && r.date > today);

        // Group by Date first
        const dateMap = new Map<string, Reservation[]>();
        futureRes.forEach(r => {
            const date = r.date || 'Sin Fecha';
            if (!dateMap.has(date)) dateMap.set(date, []);
            dateMap.get(date)!.push(r);
        });

        // Transform to Date -> TimeSlots structure
        return Array.from(dateMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, dayReservations]) => {
                // Group this day's reservations by time
                const timeMap = new Map<string, Reservation[]>();
                dayReservations.forEach(r => {
                    const time = r.startTime || 'Unknown';
                    if (!timeMap.has(time)) timeMap.set(time, []);
                    timeMap.get(time)!.push(r);
                });

                const timeSlots = Array.from(timeMap.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([time, reservations]) => ({ time, reservations }));

                return {
                    date,
                    timeSlots,
                    totalCount: dayReservations.length
                };
            });
    });

    // Stats
    statsHoje = computed(() => ({
        totalReservas: this.todayReservationsRaw().length,
        totalPerros: this.todayReservationsRaw().reduce((acc, curr) => acc + (curr.selectedDogs?.length || 0), 0)
    }));

    constructor() { }
}
