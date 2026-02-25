export interface Reservation {
    id: number;
    slotId: number;
    userId: number;
    date?: string; // YYYY-MM-DD
    createdAt?: string;
    dogId?: number;
    status?: 'active' | 'cancelled';

    // Relationships
    dog?: {
        name: string;
        photo_url?: string;
    };

    // Relationships
    user?: {
        name: string;
        email: string;
        photo_url?: string;
    };
    timeSlot?: {
        day: string;
        start_time: string;
        end_time: string;
    };

    // Flattened properties for easier access in components (mapped)
    userName?: string;
    userImage?: string;
    day?: string;
    startTime?: string;
    selectedDogs?: { name: string, image?: string }[];
}
