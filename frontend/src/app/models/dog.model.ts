export interface Dog {
    id: number;
    name: string;
    breed?: string; // Raza opcional
    birth_date?: string;
    license_expiration_date?: string;
    microchip?: string;
    pedigree?: string;
    photo_url?: string;
    users?: Array<{ id: number; name: string }>;
    points?: number;
    pointHistories?: Array<{
        id: number;
        points: number;
        category: string;
        created_at: string;
    }>;
    createdAt?: string; // Laravel uses timestamps, string
    updatedAt?: string;
}
