import { TrainingTrack } from './training-track.model';

export interface TimeSlot {
    id: number;
    day: string;
    name?: string | null;
    start_time: string;
    end_time: string;
    max_bookings: number;
    color?: string | null;
    training_track_id?: number | null;
    training_track?: TrainingTrack | null;
    // Front-end only properties (optional)
    currentBookings?: number;
    isBookedByCurrentUser?: boolean;
    userReservationId?: number;
    reservations?: any[];
    date?: string | null;
}
