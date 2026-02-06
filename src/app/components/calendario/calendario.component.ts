import { Component, computed, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompetitionService } from '../../services/competition.service';

interface CalendarDay {
    date: Date;
    isCompetition: boolean;
    isOtherEvent: boolean;
    isWeekend: boolean;
    isOtherMonth: boolean;
    isToday: boolean;
    deadlines: any[];
    competitions: any[]; // List of all competitions on this day
    competitionDetails?: any; // Primary/First competition for backward compat
}

@Component({
    selector: 'app-calendario',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './calendario.component.html',
    styleUrls: ['./calendario.component.css']
})
export class CalendarioComponent {
    currentYear = signal(new Date().getFullYear());
    monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    private competitions: Signal<any[]>;

    // Computed signal for calendar data
    months = computed(() => {
        const monthsData = [];
        // Tracks competitions signal
        const comps = this.competitions();
        const year = this.currentYear();

        for (let i = 0; i < 12; i++) {
            monthsData.push({
                name: this.monthNames[i],
                days: this.getDaysInMonth(i, year, comps)
            });
        }
        return monthsData;
    });

    changeYear(offset: number) {
        this.currentYear.update(y => y + offset);
    }

    // Modal state
    selectedCompetition: any = null;
    selectedCompetitions: any[] = []; // List to show in modal if multiple
    selectedDeadlines: any[] = [];
    isModalOpen = false;

    constructor(private competitionService: CompetitionService) {
        this.competitions = this.competitionService.getCompetitions();
    }

    openModal(day: CalendarDay) {
        this.selectedCompetitions = day.competitions || [];
        this.selectedDeadlines = day.deadlines || [];

        if (this.selectedCompetitions.length === 1) {
            this.selectedCompetition = this.selectedCompetitions[0];
        } else {
            this.selectedCompetition = null; // Show list if multiple or none
        }

        // Only open if there is something to show
        if (this.selectedCompetitions.length > 0 || this.selectedDeadlines.length > 0) {
            this.isModalOpen = true;
            document.body.style.overflow = 'hidden';
        }
    }

    selectCompetitionFromList(comp: any) {
        this.selectedCompetition = comp;
    }

    backToList() {
        this.selectedCompetition = null;
    }

    getDaysInMonth(monthIndex: number, year: number, competitions: any[]): CalendarDay[] {
        const days: CalendarDay[] = [];
        const date = new Date(year, monthIndex, 1);
        const firstDayIndex = (date.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
        const today = new Date();

        // Previous month padding
        for (let i = 0; i < firstDayIndex; i++) {
            days.push({
                date: new Date(year, monthIndex, -i),
                isCompetition: false,
                isOtherEvent: false,
                isWeekend: false,
                isOtherMonth: true,
                isToday: false,
                deadlines: [],
                competitions: []
            });
        }

        // Days in current month
        while (date.getMonth() === monthIndex) {
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;

            // Find ALL competitions for this day
            const dailyCompetitions = competitions.filter((c: any) => {
                const start = c.fechaEvento;
                const end = c.fechaFinEvento || c.fechaEvento; // Fallback to single day
                return dateString >= start && dateString <= end;
            });

            // Determine indicators
            // Default type is 'competicion'
            const isCompetition = dailyCompetitions.some((c: any) => !c.tipo || c.tipo === 'competicion');
            const isOtherEvent = dailyCompetitions.some((c: any) => c.tipo === 'otros');

            const isToday = date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();

            // Check if this day is a registration deadline for any event(s)
            const deadlines = competitions.filter((c: any) => c.fechaLimite === dateString);

            days.push({
                date: new Date(date),
                isCompetition: isCompetition,
                isOtherEvent: isOtherEvent,
                isWeekend: isWeekend,
                isOtherMonth: false,
                isToday: isToday,
                deadlines: deadlines,
                competitions: dailyCompetitions,
                competitionDetails: dailyCompetitions[0] // Fallback
            });
            date.setDate(date.getDate() + 1);
        }

        return days;
    }

    closeModal() {
        this.isModalOpen = false;
        this.selectedCompetition = null;
        this.selectedCompetitions = [];
        this.isImageExpanded = false; // Reset expansion
        document.body.style.overflow = 'auto';
    }

    // Image Expansion
    isImageExpanded = false;

    expandImage() {
        this.isImageExpanded = true;
    }

    closeImage() {
        this.isImageExpanded = false;
    }
}
