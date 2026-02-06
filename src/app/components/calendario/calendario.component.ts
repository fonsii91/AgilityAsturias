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
    competitionDetails?: any;
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
    isModalOpen = false;

    constructor(private competitionService: CompetitionService) {
        this.competitions = this.competitionService.getCompetitions();
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
                isToday: false
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

            const competition = competitions.find((c: any) => c.fechaEvento === dateString);

            // Check type. Default to 'competicion' if undefined for backward compatibility
            const type = competition?.tipo || 'competicion';
            const isCompetition = !!competition && type === 'competicion';
            const isOtherEvent = !!competition && type === 'otros';

            const isToday = date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();

            days.push({
                date: new Date(date),
                isCompetition: isCompetition,
                isOtherEvent: isOtherEvent,
                isWeekend: isWeekend,
                isOtherMonth: false,
                isToday: isToday,
                competitionDetails: competition
            });
            date.setDate(date.getDate() + 1);
        }

        return days;
    }

    openModal(competition: any) {
        if (competition) {
            this.selectedCompetition = competition;
            this.isModalOpen = true;
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        this.isModalOpen = false;
        this.selectedCompetition = null;
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
