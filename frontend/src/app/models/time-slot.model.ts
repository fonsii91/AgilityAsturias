export interface TimeSlot {
    id: number;
    day: string;
    name?: string | null;
    start_time: string;
    end_time: string;
    max_bookings: number;
    // Front-end only properties (optional)
    currentBookings?: number;
    isBookedByCurrentUser?: boolean;
    userReservationId?: number;
    reservations?: any[];
    date?: string;
}
