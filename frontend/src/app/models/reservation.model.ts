export interface Reservation {
    id: number;
    slotId: number;
    userId: number;
    userName: string;
    userEmail: string;
    day: string;
    start_time: string;
    date?: string; // YYYY-MM-DD to handle weeks
    createdAt?: string;
    selectedDogs?: string[]; // Names of the dogs
}
