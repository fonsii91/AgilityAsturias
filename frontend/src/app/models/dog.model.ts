export interface Dog {
    id: number;
    userId: number;
    name: string;
    breed?: string; // Raza opcional
    age?: number;
    photo_url?: string;
    createdAt?: string; // Laravel uses timestamps, string
    updatedAt?: string;
}
