export interface Dog {
    id: number;
    userId: number;
    name: string;
    breed?: string; // Raza opcional
    age?: number;
    createdAt?: string; // Laravel uses timestamps, string
    updatedAt?: string;
}
