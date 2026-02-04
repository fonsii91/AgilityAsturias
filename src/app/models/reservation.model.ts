export interface Reservation {
    id: string;
    slotId: number;
    userId: string;
    userName: string;
    userEmail: string;
    day: string;
    startTime: string;
    date?: string; // YYYY-MM-DD to handle weeks
    createdAt: number;
    selectedDogs?: string[]; // Names of the dogs
}
