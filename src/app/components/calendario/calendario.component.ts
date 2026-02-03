import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CalendarDay {
    date: Date;
    isCompetition: boolean;
    isWeekend: boolean;
    isOtherMonth: boolean;
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

    ngOnInit() {
        this.generateCalendar();
    }

    generateCalendar() {
        for (let month = 0; month < 12; month++) {
            const daysInMonth: CalendarDay[] = [];
            const firstDay = new Date(this.currentYear, month, 1);
            const lastDay = new Date(this.currentYear, month + 1, 0);

            // Add padding days from previous month
            let startDayOfWeek = firstDay.getDay(); // 0 is Sunday
            // Adjust to make Monday index 0 (if calendar starts on Monday)
            // Standard JS getDay(): 0=Sun, 1=Mon... 6=Sat
            // Let's assume calendar starts on Monday. 
            // Mon=1 -> 0, Tue=2 -> 1, ... Sun=0 -> 6
            let adjustedStartPayment = (startDayOfWeek === 0) ? 6 : startDayOfWeek - 1;

            for (let i = 0; i < adjustedStartPayment; i++) {
                daysInMonth.push({
                    date: new Date(this.currentYear, month, -i), // Dummy date
                    isCompetition: false,
                    isWeekend: false,
                    isOtherMonth: true
                });
            }
            // Reverse padding to be in correct order?
            // Actually simpler logic:
            // iterate from 1 to lastDay.getDate()

            // Let's rebuild the loop properly

        }
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

            // Mock competitions: every Saturday that is divisible by 2 or 3, and some Sundays
            // Deterministic "randomness"
            const isCompetition = isWeekend && (date.getDate() + monthIndex) % 4 === 0;

            days.push({
                date: new Date(date),
                isCompetition: isCompetition,
                isWeekend: isWeekend,
                isOtherMonth: false
            });
            date.setDate(date.getDate() + 1);
        }

        return days;
    }
}
