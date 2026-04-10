import { Component, computed, Signal, signal, inject, ChangeDetectorRef, NgZone, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompetitionService } from '../../services/competition.service';
import { AuthService } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';

interface CalendarDay {
    date: Date;
    isCompetition: boolean;
    isOtherEvent: boolean;
    isWeekend: boolean;
    isOtherMonth: boolean;
    isToday: boolean;
    isAttending?: boolean;
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
export class CalendarioComponent implements AfterViewInit {
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
    isHelpModalOpen = false;
    activeModalTab: 'info' | 'asistencia' = 'info'; // Tab state

    // Attendance state
    authService = inject(AuthService);
    dogService = inject(DogService);
    isConfirmingAttendance = false;
    selectedDogIds = new Set<number>();
    selectedAttendanceDays = new Set<string>();
    viewingAttendees = false;
    attendees = signal<any[]>([]);
    isLoadingAttendees = signal<boolean>(false);
    userDogs = this.dogService.getDogs();
    cdr = inject(ChangeDetectorRef);
    ngZone = inject(NgZone);

    constructor(private competitionService: CompetitionService) {
        this.competitions = this.competitionService.getCompetitions();
    }

    ngAfterViewInit() {
        setTimeout(() => this.scrollToCurrentMonth(), 300);
    }

    scrollToCurrentMonth() {
        const today = new Date();
        if (this.currentYear() === today.getFullYear()) {
            const currentMonthElement = document.getElementById(`month-${today.getMonth()}`);
            if (currentMonthElement && window.innerWidth <= 768) {
                currentMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    openModal(day: CalendarDay) {
        this.selectedCompetitions = day.competitions || [];
        this.selectedDeadlines = day.deadlines || [];

        const totalItems = this.selectedCompetitions.length + this.selectedDeadlines.length;

        if (totalItems === 1) {
            this.selectedCompetition = this.selectedCompetitions.length === 1
                ? this.selectedCompetitions[0]
                : this.selectedDeadlines[0];
            this.activeModalTab = 'info';
            this.resetAttendanceState();
        } else {
            this.selectedCompetition = null; // Show list if multiple items
        }

        // Only open if there is something to show
        if (totalItems > 0) {
            this.isModalOpen = true;
            document.body.style.overflow = 'hidden';
            if (this.authService.currentUserSignal()) {
                this.dogService.loadUserDogs();
            }
        }
    }

    selectCompetitionFromList(comp: any) {
        this.selectedCompetition = comp;
        this.activeModalTab = 'info';
        this.resetAttendanceState();
    }

    resetAttendanceState() {
        this.isConfirmingAttendance = false;
        this.viewingAttendees = false;
        this.attendees.set([]);
        this.selectedDogIds.clear();
        this.selectedAttendanceDays.clear();
        if (this.selectedCompetition?.attendingDogIds) {
            this.selectedDogIds = new Set(this.selectedCompetition.attendingDogIds);
        }
        if (this.selectedCompetition?.diasAsistencia) {
            this.selectedAttendanceDays = new Set(this.selectedCompetition.diasAsistencia);
        }
    }

    switchTab(tab: 'info' | 'asistencia') {
        this.activeModalTab = tab;
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
                isAttending: false,
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
            const isAttending = dailyCompetitions.some((c: any) => c.isAttending);

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
                isAttending: isAttending,
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
        this.activeModalTab = 'info';

        this.isConfirmingAttendance = false;
        this.viewingAttendees = false;
        this.attendees.set([]);
        this.selectedAttendanceDays.clear();

        document.body.style.overflow = 'auto';
    }

    openHelpModal() {
        this.isHelpModalOpen = true;
    }

    closeHelpModal(event?: Event) {
        if (event) {
            if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
                this.isHelpModalOpen = false;
            }
        } else {
            this.isHelpModalOpen = false;
        }
    }

    // Attendance Methods
    startAttendance() {
        this.isConfirmingAttendance = true;
        
        // Auto-select all user's dogs if it's a new attendance
        if (this.selectedCompetition && !this.selectedCompetition.isAttending) {
            const currentDogs = this.userDogs();
            if (currentDogs && currentDogs.length > 0) {
                currentDogs.forEach(dog => this.selectedDogIds.add(dog.id));
            }
        }
    }

    cancelAttendanceForm() {
        this.isConfirmingAttendance = false;
        // Revert selected dogs to whatever was saved
        this.selectedDogIds.clear();
        this.selectedAttendanceDays.clear();
        if (this.selectedCompetition?.attendingDogIds) {
            this.selectedDogIds = new Set(this.selectedCompetition.attendingDogIds);
        }
        if (this.selectedCompetition?.diasAsistencia) {
            this.selectedAttendanceDays = new Set(this.selectedCompetition.diasAsistencia);
        }
    }

    toggleDog(dogId: number) {
        if (this.selectedDogIds.has(dogId)) {
            this.selectedDogIds.delete(dogId);
        } else {
            this.selectedDogIds.add(dogId);
        }
    }

    toggleAttendanceDay(dayStr: string) {
        if (this.selectedAttendanceDays.has(dayStr)) {
            this.selectedAttendanceDays.delete(dayStr);
        } else {
            this.selectedAttendanceDays.add(dayStr);
        }
    }

    getEventDays(comp: any): Date[] {
        if (!comp) return [];
        const days: Date[] = [];
        const start = new Date(comp.fechaEvento);
        const end = comp.fechaFinEvento ? new Date(comp.fechaFinEvento) : new Date(comp.fechaEvento);
        
        const current = new Date(start);
        while (current <= end) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return days;
    }
    
    formatDateToIso(date: Date): string {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    async confirmAttendance() {
        if (!this.selectedCompetition) return;
        try {
            const dogIdsArray = Array.from(this.selectedDogIds);
            const daysArray = Array.from(this.selectedAttendanceDays);
            
            const eventDays = this.getEventDays(this.selectedCompetition);
            if (eventDays.length > 1 && daysArray.length === 0) {
                alert('Por favor, selecciona al menos un día para asistir al evento.');
                return;
            }

            if (eventDays.length === 1 && daysArray.length === 0) {
                daysArray.push(this.formatDateToIso(eventDays[0]));
            }

            await this.competitionService.attendCompetition(this.selectedCompetition.id, dogIdsArray, daysArray);

            // Update local state temporarily, or rely on a fresh refetch
            this.selectedCompetition.isAttending = true;
            this.selectedCompetition.attendingDogIds = dogIdsArray;
            this.selectedCompetition.diasAsistencia = daysArray;
            this.isConfirmingAttendance = false;

            if (this.viewingAttendees) {
                this.loadAttendees();
            }
        } catch (e) {
            console.error('Error confirming attendance', e);
        }
    }

    async removeAttendance() {
        if (!this.selectedCompetition) return;
        try {
            await this.competitionService.unattendCompetition(this.selectedCompetition.id);
            this.selectedCompetition.isAttending = false;
            this.selectedCompetition.attendingDogIds = [];
            this.selectedCompetition.diasAsistencia = [];
            this.selectedDogIds.clear();
            this.selectedAttendanceDays.clear();

            if (this.viewingAttendees) {
                this.loadAttendees();
            }
        } catch (e) {
            console.error('Error removing attendance', e);
        }
    }

    toggleAttendeesView() {
        this.viewingAttendees = !this.viewingAttendees;
        if (this.viewingAttendees && this.selectedCompetition) {
            this.loadAttendees();
        }
    }

    async loadAttendees() {
        this.isLoadingAttendees.set(true);
        this.cdr.detectChanges();
        try {
            const result = await this.competitionService.getAttendees(this.selectedCompetition.id);
            this.ngZone.run(() => {
                this.attendees.set(result);
                this.isLoadingAttendees.set(false);
                this.cdr.detectChanges();
            });
        } catch (e) {
            console.error('Error fetching attendees', e);
            this.ngZone.run(() => {
                this.isLoadingAttendees.set(false);
                this.cdr.detectChanges();
            });
        }
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
