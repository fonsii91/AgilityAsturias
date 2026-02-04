import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompetitionService } from '../../services/competition.service';

interface CalendarDay {
    date: Date;
    isCompetition: boolean;
    isWeekend: boolean;
    isOtherMonth: boolean;
    competitionDetails?: any;
}

@Component({
    selector: 'app-calendario',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './calendario.component.html',
    styleUrls: ['./calendario.component.css']
})
export class CalendarioComponent implements OnInit {
    currentYear = 2026;
    months: { name: string; days: CalendarDay[] }[] = [];
    monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Signals are available if needed, but for now accessing the array directly in getDaysInMonth
    // Note: If competitions change dynamically, we might need an effect to regenerate the calendar.
    private competitions: any;

    // Modal state
    selectedCompetition: any = null;
    isModalOpen = false;

    constructor(private competitionService: CompetitionService) {
        this.competitions = this.competitionService.getCompetitions();
    }

    ngOnInit() {
        this.generateCalendar();
    }

    generateCalendar() {
        this.months = []; // Clear
        for (let i = 0; i < 12; i++) {
            this.months.push({
                name: this.monthNames[i],
                days: this.getDaysInMonth(i)
            });
        }
    }

    getDaysInMonth(monthIndex: number): CalendarDay[] {
        const days: CalendarDay[] = [];
        const date = new Date(this.currentYear, monthIndex, 1);
        const firstDayIndex = (date.getDay() + 6) % 7; // 0 = Mon, 6 = Sun

        // Previous month padding
        for (let i = 0; i < firstDayIndex; i++) {
            days.push({
                date: new Date(this.currentYear, monthIndex, -i),
                isCompetition: false,
                isWeekend: false,
                isOtherMonth: true
            });
        }

        // Days in current month
        while (date.getMonth() === monthIndex) {
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // Check if there is a competition on this date
            // Format date to YYYY-MM-DD to match the service format
            // Note: date.getMonth() is 0-indexed, so we add 1.
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;

            const competition = this.competitions().find((c: any) => c.fechaEvento === dateString);
            const isCompetition = !!competition;

            days.push({
                date: new Date(date),
                isCompetition: isCompetition,
                isWeekend: isWeekend,
                isOtherMonth: false,
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
