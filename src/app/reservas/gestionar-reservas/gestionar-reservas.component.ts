import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TimeSlot {
    id: number;
    day: string;
    startTime: string;
    endTime: string;
    currentBookings: number;
    maxBookings: number;
}

@Component({
    selector: 'app-gestionar-reservas',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './gestionar-reservas.component.html',
    styleUrl: './gestionar-reservas.component.css'
})
export class GestionarReservasComponent {
    slots = signal<TimeSlot[]>(this.generateSlots());

    groupedSlots = computed(() => {
        const slots = this.slots();
        const daysOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

        const groups = daysOrder.map(day => ({
            day,
            slots: slots.filter(s => s.day === day)
        })).filter(group => group.slots.length > 0);

        return groups;
    });

    generateSlots(): TimeSlot[] {
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const slots: TimeSlot[] = [];
        let idCounter = 1;

        days.forEach(day => {
            // Morning slots: Only Monday and Thursday
            if (day === 'Lunes' || day === 'Jueves') {
                slots.push(
                    { id: idCounter++, day, startTime: '10:00', endTime: '11:30', currentBookings: 0, maxBookings: 5 },
                    { id: idCounter++, day, startTime: '11:30', endTime: '13:00', currentBookings: 0, maxBookings: 5 }
                );
            }

            // Afternoon slots: Every day
            slots.push(
                { id: idCounter++, day, startTime: '14:00', endTime: '15:30', currentBookings: 0, maxBookings: 5 },
                { id: idCounter++, day, startTime: '15:30', endTime: '17:00', currentBookings: 0, maxBookings: 5 },
                { id: idCounter++, day, startTime: '17:00', endTime: '18:30', currentBookings: 0, maxBookings: 5 }
            );
        });

        return slots;
    }

    bookSlot(slotId: number) {
        this.slots.update(slots =>
            slots.map(slot => {
                if (slot.id === slotId && slot.currentBookings < slot.maxBookings) {
                    return { ...slot, currentBookings: slot.currentBookings + 1 };
                }
                return slot;
            })
        );
    }
}
