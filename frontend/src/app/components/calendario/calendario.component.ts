import { Component, computed, Signal, signal, inject, ChangeDetectorRef, NgZone, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompetitionService } from '../../services/competition.service';
import { AuthService } from '../../services/auth.service';
import { DogService } from '../../services/dog.service';
import { PersonalEventService } from '../../services/personal-event.service';
import { PersonalEvent } from '../../models/personal-event.model';
import { FormsModule } from '@angular/forms';

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
    personalEvents: PersonalEvent[]; // Lista de eventos personales
}

@Component({
    selector: 'app-calendario',
    standalone: true,
    imports: [CommonModule, FormsModule],
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
    private personalEventsSignal: Signal<PersonalEvent[]>;
    personalEventService = inject(PersonalEventService);

    // Computed signal for calendar data
    months = computed(() => {
        const monthsData = [];
        // Tracks signals
        const comps = this.competitions();
        const persEvents = this.personalEventsSignal();
        const year = this.currentYear();

        for (let i = 0; i < 12; i++) {
            monthsData.push({
                name: this.monthNames[i],
                days: this.getDaysInMonth(i, year, comps, persEvents)
            });
        }
        return monthsData;
    });

    changeYear(offset: number) {
        this.currentYear.update(y => y + offset);
    }

    selectedCompetition: any = null;
    selectedCompetitions: any[] = []; // List to show in modal if multiple
    selectedDeadlines: any[] = [];
    selectedPersonalEvents: PersonalEvent[] = []; // Personal events for the selected day
    selectedDay: CalendarDay | null = null; // Track the selected day
    isModalOpen = false;
    isHelpModalOpen = false;
    activeModalTab: 'info' | 'asistencia' = 'info'; // Tab state

    // Attendance state
    authService = inject(AuthService);
    dogService = inject(DogService);
    isConfirmingAttendance = false;
    selectedDogIds = new Set<number>();
    selectedAttendanceDays = new Set<string>();
    selectedDogAttendanceDays = new Map<number, Set<string>>(); // dogId -> Set of ISO dates
    viewingAttendees = false;
    attendees = signal<any[]>([]);
    isLoadingAttendees = signal<boolean>(false);
    userDogs = this.dogService.getDogs();
    cdr = inject(ChangeDetectorRef);
    ngZone = inject(NgZone);

    constructor(private competitionService: CompetitionService) {
        this.competitions = this.competitionService.getCompetitions();
        this.personalEventsSignal = this.personalEventService.getEvents();
        
        // Load personal events and dogs if user is logged in
        if (this.authService.currentUserSignal()) {
            this.personalEventService.loadEvents();
            this.dogService.loadUserDogs();
        }
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

    handleDayClick(day: CalendarDay) {
        if (day.isOtherMonth) return;

        const totalItems = day.competitions.length + day.deadlines.length + day.personalEvents.length;

        if (totalItems > 0) {
            this.openModal(day);
        } else {
            if (this.authService.currentUserSignal()) {
                this.openPersonalEventModal(day);
            }
        }
    }

    openModal(day: CalendarDay) {
        this.selectedDay = day;
        this.selectedCompetitions = day.competitions || [];
        this.selectedDeadlines = day.deadlines || [];
        this.selectedPersonalEvents = day.personalEvents || [];

        const totalItems = this.selectedCompetitions.length + this.selectedDeadlines.length + this.selectedPersonalEvents.length;

        if (totalItems === 1 && this.selectedPersonalEvents.length === 0) {
            if (this.selectedCompetitions.length === 1) {
                // Auto-expand only if it's a competition
                this.selectedCompetition = this.selectedCompetitions[0];
                this.activeModalTab = 'info';
                this.resetAttendanceState();
            } else {
                // It's a deadline, do not auto-expand so they see the warning message first
                this.selectedCompetition = null;
            }
        } else if (totalItems === 1 && this.selectedPersonalEvents.length === 1) {
            // Si solo hay 1 evento personal, abrimos directamente el modal de evento personal y no el modal general
            this.openPersonalEventModal(day, this.selectedPersonalEvents[0]);
            return;
        } else {
            this.selectedCompetition = null; // Show list if multiple items
        }

        // Only open general modal if there is something to show and it wasn't already handled (like a single personal event)
        if (totalItems > 0 && !(totalItems === 1 && this.selectedPersonalEvents.length === 1)) {
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

    getDaysInMonth(monthIndex: number, year: number, competitions: any[], personalEvents: PersonalEvent[]): CalendarDay[] {
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
                competitions: [],
                personalEvents: []
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

            // Find ALL personal events for this day
            const dailyPersonalEvents = personalEvents.filter(pe => pe.start_date && pe.start_date.startsWith(dateString));

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
                competitionDetails: dailyCompetitions[0], // Fallback
                personalEvents: dailyPersonalEvents
            });
            date.setDate(date.getDate() + 1);
        }

        return days;
    }

    closeModal() {
        this.isModalOpen = false;
        this.selectedDay = null;
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
            this.selectedDogAttendanceDays.delete(dogId);
        } else {
            this.selectedDogIds.add(dogId);
            // Si el usuario ya seleccionó días, le ponemos esos días por defecto
            this.selectedDogAttendanceDays.set(dogId, new Set(this.selectedAttendanceDays));
        }
    }

    toggleAttendanceDay(dayIso: string) {
        if (this.selectedAttendanceDays.has(dayIso)) {
            this.selectedAttendanceDays.delete(dayIso);
            // También lo quitamos de todos los perros
            this.selectedDogIds.forEach(dogId => {
                const dogDays = this.selectedDogAttendanceDays.get(dogId);
                if (dogDays) dogDays.delete(dayIso);
            });
        } else {
            this.selectedAttendanceDays.add(dayIso);
            // También lo añadimos a todos los perros seleccionados
            this.selectedDogIds.forEach(dogId => {
                const dogDays = this.selectedDogAttendanceDays.get(dogId);
                if (dogDays) dogDays.add(dayIso);
            });
        }
    }

    toggleDogAttendanceDay(dogId: number, dayIso: string) {
        let dogDays = this.selectedDogAttendanceDays.get(dogId);
        if (!dogDays) {
            dogDays = new Set<string>();
            this.selectedDogAttendanceDays.set(dogId, dogDays);
        }

        if (dogDays.has(dayIso)) {
            dogDays.delete(dayIso);
        } else {
            dogDays.add(dayIso);
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

            // Construct payload with per-dog specific days
            const dogsPayload = dogIdsArray.map(dogId => {
                const dogDays = this.selectedDogAttendanceDays.get(dogId);
                return {
                    dog_id: dogId,
                    dias_asistencia: dogDays ? Array.from(dogDays) : daysArray
                };
            });

            await this.competitionService.attendCompetition(this.selectedCompetition.id, dogIdsArray, daysArray, dogsPayload);

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

    // --- Personal Events Logic ---
    isPersonalEventModalOpen = false;
    personalEventForm: Partial<PersonalEvent> = {
        title: '',
        type: 'veterinario',
        start_date: '',
        notes: ''
    };
    isEditingPersonalEvent = false;
    isViewingPersonalEvent = false;

    openPersonalEventModal(day?: CalendarDay, eventToEdit?: PersonalEvent) {
        this.isPersonalEventModalOpen = true;
        document.body.style.overflow = 'hidden';
        
        if (eventToEdit) {
            this.isViewingPersonalEvent = true;
            this.isEditingPersonalEvent = false;
            this.personalEventForm = { ...eventToEdit };
        } else {
            this.isViewingPersonalEvent = false;
            this.isEditingPersonalEvent = false;
            this.personalEventForm = {
                title: '',
                type: 'veterinario',
                start_date: day ? this.formatDateToIso(day.date) : this.formatDateToIso(new Date()),
                notes: '',
                dog_id: this.userDogs()?.length > 0 ? this.userDogs()[0].id : undefined
            };
        }
    }

    editPersonalEvent() {
        this.isViewingPersonalEvent = false;
        this.isEditingPersonalEvent = true;
    }

    openNewPersonalEventSameDay() {
        const currentDate = this.personalEventForm.start_date;
        this.isViewingPersonalEvent = false;
        this.isEditingPersonalEvent = false;
        
        this.personalEventForm = {
            title: '',
            type: 'veterinario',
            start_date: currentDate,
            notes: '',
            dog_id: this.userDogs()?.length > 0 ? this.userDogs()[0].id : undefined
        };
    }

    closePersonalEventModal() {
        this.isPersonalEventModalOpen = false;
        this.isEditingPersonalEvent = false;
        this.isViewingPersonalEvent = false;
        document.body.style.overflow = 'auto';
    }

    async savePersonalEvent() {
        if (!this.personalEventForm.dog_id || !this.personalEventForm.title || !this.personalEventForm.start_date || !this.personalEventForm.type) {
            alert('Por favor, rellena todos los campos obligatorios.');
            return;
        }

        try {
            if (this.isEditingPersonalEvent && this.personalEventForm.id) {
                await this.personalEventService.updateEvent(this.personalEventForm.id, this.personalEventForm);
            } else {
                await this.personalEventService.createEvent(this.personalEventForm as PersonalEvent);
            }
            this.closePersonalEventModal();
        } catch (e) {
            console.error('Error saving personal event:', e);
            alert('Hubo un error al guardar el evento personal.');
        }
    }

    async deletePersonalEvent(id?: number) {
        if (!id) return;
        if (!confirm('¿Estás seguro de que deseas eliminar este evento personal?')) return;
        
        try {
            await this.personalEventService.deleteEvent(id);
            this.closePersonalEventModal();
            // Cierra también el modal general si estuviese abierto con este evento (aunque los mostraremos distinto)
            this.isModalOpen = false; 
            document.body.style.overflow = 'auto';
        } catch (e) {
            console.error('Error deleting personal event:', e);
            alert('Hubo un error al eliminar el evento.');
        }
    }

    getDogName(dogId?: number): string {
        if (!dogId) return 'Desconocido';
        const dogs = this.userDogs();
        if (!dogs) return dogId.toString();
        const dog = dogs.find(d => d.id === dogId);
        return dog ? dog.name : dogId.toString();
    }
}
