import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TimeSlot {
    id: number;
    day: string;
    time: string;
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
    slots = signal<TimeSlot[]>([
        { id: 1, day: 'Lunes', time: '17:00', currentBookings: 3, maxBookings: 5 },
        { id: 2, day: 'Lunes', time: '18:00', currentBookings: 5, maxBookings: 5 },
        { id: 3, day: 'Miércoles', time: '17:00', currentBookings: 1, maxBookings: 5 },
        { id: 4, day: 'Viernes', time: '16:00', currentBookings: 0, maxBookings: 5 },
    ]);

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
