export interface Dog {
    id: string;
    userId: string;
    name: string;
    breed?: string; // Raza opcional
    age?: number;
    createdAt: number;
}
